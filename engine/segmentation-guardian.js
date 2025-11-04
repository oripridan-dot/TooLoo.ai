// Segmentation Guardian
// - Monitors latency/segments drift from health logs
// - Gating: runs benchmark suites before enabling riskier configs

import fs from 'fs';
import path from 'path';

function p95(arr){ if(!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b); return s[Math.min(s.length-1, Math.floor(0.95*s.length))]; }
function avg(arr){ if(!arr.length) return 0; return arr.reduce((a,b)=>a+b,0)/arr.length; }

export default class SegmentationGuardian {
  constructor({
    unifier,
    healthLogPath = path.join(process.cwd(),'quality','segmentation-health.jsonl'),
    statePath = path.join(process.cwd(),'quality','segmentation-guardian-state.json'),
    alertManager = null,
    thresholds = {
      p95LatencyMs: 200,
      avgSegmentsMax: 8,
      minBenchmarkAccuracy: 75
    },
    monitorIntervalMs = 10*60*1000 // 10 minutes
  } = {}){
    this.unifier = unifier;
    this.healthLogPath = healthLogPath;
    this.statePath = statePath;
  this.alerts = alertManager;
    this.thresholds = thresholds;
    this.monitorIntervalMs = monitorIntervalMs;
    this.lastStatus = null;
    this.lastAction = null;
    this.timer = null;
    this.nightlyTimer = null;
    this.state = this.loadState();
  }

  start(){
    if (this.timer) return;
    this.timer = setInterval(()=>{
      this.monitorAndAdjust().catch(()=>{});
    }, this.monitorIntervalMs);
  }

  stop(){ if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  startNightly(hour=2, minute=0){
    if (this.nightlyTimer) return;
    const scheduleNext = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(hour, minute, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const ms = next.getTime() - now.getTime();
      this.nightlyTimer = setTimeout(async () => {
        try { await this.runNightlyCycle(); } catch {}
        this.nightlyTimer = null; scheduleNext();
      }, ms);
    };
    scheduleNext();
  }
  stopNightly(){ if (this.nightlyTimer) { clearTimeout(this.nightlyTimer); this.nightlyTimer = null; } }

  readRecent(n=300){
    try {
      if (!fs.existsSync(this.healthLogPath)) return [];
      const lines = fs.readFileSync(this.healthLogPath,'utf8').trim().split('\n');
      return lines.slice(-n).map(l=>{ try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    } catch { return []; }
  }

  analyze(){
    const recs = this.readRecent();
    const durs = recs.map(r=>r.durationMs||0);
    const segs = recs.map(r=>r.totalSegments||0);
    const status = {
      samples: recs.length,
      avgLatencyMs: +avg(durs).toFixed(2),
      p95LatencyMs: p95(durs),
      avgSegments: +avg(segs).toFixed(2),
      thresholds: this.thresholds
    };
    this.lastStatus = status;
    return status;
  }

  async monitorAndAdjust(){
    const s = this.analyze();
    if (!s.samples) return { ok:true, action: null, status: s };
    let action = null;
    if (s.p95LatencyMs > this.thresholds.p95LatencyMs || s.avgSegments > this.thresholds.avgSegmentsMax) {
      // First step: reduce canary; if already very low, force rule mode
      const current = this.unifier.config;
      if ((current.mode === 'hybrid' || current.mode === 'ml') && (current.canaryRatio ?? 0.1) > 0.02) {
        const next = Math.max(0.01, Math.round((current.canaryRatio * 0.5) * 100) / 100);
        this.unifier.saveConfig({ canaryRatio: next, mode: 'hybrid' });
        action = { type: 'reduce-canary', newCanary: next };
        if (this.alerts) this.alerts.alert('segmentation.guardian.reduce_canary', `Reduced canary to ${next}`, { status: s });
      } else if (current.mode !== 'rule') {
        this.unifier.saveConfig({ mode: 'rule', rule: { variant: 'advanced' } });
        action = { type: 'switch-rule' };
        if (this.alerts) this.alerts.alert('segmentation.guardian.switch_rule', 'Switched to rule-only advanced due to drift', { status: s });
      }
    }
    if (action) this.lastAction = { ...action, at: new Date().toISOString() };
    return { ok:true, action, status: this.lastStatus };
  }

  async gateConfigChange({ baseUrl, suites=['basic-segmentation'], minAccuracy }){
    // Run benchmark to validate change
    try {
      const { default: BenchmarkRunner } = await import(path.join(process.cwd(),'datasets/benchmarks/runner.js'));
      const runner = new BenchmarkRunner({ baseUrl, verbose: false });
      const results = await runner.runBenchmarkSuite(suites);
      const acc = results.summary?.accuracy || 0;
      const passed = acc >= (minAccuracy ?? this.thresholds.minBenchmarkAccuracy);
  if (!passed && this.alerts) this.alerts.alert('segmentation.guardian.gate_failed', `Benchmark failed at ${acc.toFixed(2)}% (min ${(minAccuracy ?? this.thresholds.minBenchmarkAccuracy)}%)`, { suites, baseUrl });
  return { passed, accuracy: acc, results };
    } catch (e) {
      return { passed: false, error: e.message };
    }
  }

  // Nightly: gate rollout up/down, persist last good config, rollback on failure
  async runNightlyCycle({ baseUrl = 'http://localhost:3001', suites=['basic-segmentation','segmentation-100'], minAccuracy } = {}){
    const current = this.unifier.config;
    // Evaluate current config
    const evalRes = await this.gateConfigChange({ baseUrl, suites, minAccuracy });
    const actions = [];
    if (evalRes.passed) {
      // Persist as last good
      this.noteGoodConfig(current, evalRes.accuracy);
      // Consider ramp-up if room (stable + below canary max)
      if ((current.mode === 'hybrid' || current.mode === 'ml') && (current.canaryRatio ?? 0.1) < 0.5) {
        const bumped = Math.min(0.5, Math.round(((current.canaryRatio ?? 0.1) * 1.25) * 100) / 100);
        this.unifier.saveConfig({ mode: 'hybrid', canaryRatio: bumped });
        actions.push({ type: 'increase-canary', newCanary: bumped });
        if (this.alerts) this.alerts.alert('segmentation.guardian.increase_canary', `Increased canary to ${bumped}`, { accuracy: evalRes.accuracy });
      }
    } else {
      // Roll back to last good if exists, else safe default (rule advanced)
      const lastGood = this.state.lastGood;
      if (lastGood?.config) {
        this.unifier.saveConfig(lastGood.config);
        actions.push({ type: 'rollback', to: lastGood.config, accuracyWas: evalRes.accuracy });
        if (this.alerts) this.alerts.alert('segmentation.guardian.rollback', 'Rolled back to last known good config', { accuracy: evalRes.accuracy, lastGood });
      } else {
        const safe = { mode: 'rule', rule: { variant: 'advanced' }, canaryRatio: 0 };
        this.unifier.saveConfig(safe);
        actions.push({ type: 'fallback-safe', to: safe, accuracyWas: evalRes.accuracy });
        if (this.alerts) this.alerts.alert('segmentation.guardian.fallback', 'Fallback to safe rule-only config', { accuracy: evalRes.accuracy });
      }
    }
    return { ok:true, actions, accuracy: evalRes.accuracy, passed: evalRes.passed };
  }

  loadState(){
    try { if (fs.existsSync(this.statePath)) return JSON.parse(fs.readFileSync(this.statePath,'utf8')); } catch {}
    return { lastGood: null };
  }
  saveState(){ try { fs.mkdirSync(path.dirname(this.statePath), { recursive: true }); fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2)); } catch {} }
  noteGoodConfig(config, accuracy){ this.state.lastGood = { at: new Date().toISOString(), config, accuracy }; this.saveState(); }

  getStatus(){ return { lastStatus: this.lastStatus, lastAction: this.lastAction, thresholds: this.thresholds, timerActive: !!this.timer, nightlyActive: !!this.nightlyTimer, state: this.state }; }
}
