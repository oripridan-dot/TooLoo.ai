// @version 2.1.11
// Segmentation Unifier
// Centralizes strategy selection (rule, ml, hybrid), config, and health logging

import fs from 'fs';
import path from 'path';

function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch {} }

export default class SegmentationUnifier {
  constructor({ strategies = {}, configPath } = {}) {
    this.strategies = new Map();
    Object.entries(strategies).forEach(([name, fn]) => this.register(name, fn));

    this.configPath = configPath || path.join(process.cwd(), 'engine', 'segmentation-config.json');
    this.healthLogPath = path.join(process.cwd(), 'quality', 'segmentation-health.jsonl');
    ensureDir(path.dirname(this.configPath));
    ensureDir(path.dirname(this.healthLogPath));
    this.config = this.loadConfig();
  }

  loadConfig() {
    const defaults = {
      mode: 'hybrid', // 'rule' | 'ml' | 'hybrid'
      rule: { variant: 'basic' }, // 'basic' | 'advanced'
      canaryRatio: 0.1, // 10% shadow ML in hybrid
      thresholds: { maxSegments: 20, minMessagesPerSegment: 2 },
      version: 1
    };
    try {
      if (fs.existsSync(this.configPath)) {
        const cfg = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return { ...defaults, ...cfg };
      }
    } catch {}
    // persist defaults on first run
    try { fs.writeFileSync(this.configPath, JSON.stringify(defaults, null, 2)); } catch {}
    return defaults;
  }

  saveConfig(next) {
    this.config = { ...this.config, ...next };
    const backup = this.configPath + '.bak';
    try { if (fs.existsSync(this.configPath)) fs.copyFileSync(this.configPath, backup); } catch {}
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    return this.config;
  }

  register(name, fn) { this.strategies.set(name, fn); }
  available() { return Array.from(this.strategies.keys()); }

  // Core entrypoint
  async segment(messages, { strategy, context, shadowMl = true } = {}) {
    const start = Date.now();
    const chosen = this.chooseStrategy(messages, strategy);
    const handler = this.strategies.get(chosen);
    if (!handler) throw new Error(`Strategy not registered: ${chosen}`);

    const segments = await handler(messages);
    const cleaned = this.enforceContract(segments, messages);
    const duration = Date.now() - start;

    // Shadow run (canary ML) for hybrid, non-blocking
    if (this.config.mode === 'hybrid' && shadowMl && Math.random() < (this.config.canaryRatio || 0)) {
      const ml = this.strategies.get('ml-heuristic') || this.strategies.get('ml');
      if (ml) {
        Promise.resolve()
          .then(async () => {
            const mlStart = Date.now();
            const mlSegs = await ml(messages);
            const mlClean = this.enforceContract(mlSegs, messages);
            this.logHealth(messages, cleaned, duration, chosen, { shadow: true, altSegments: mlClean, altDuration: Date.now() - mlStart });
          })
          .catch(() => {});
      }
    }

    this.logHealth(messages, cleaned, duration, chosen);
    return cleaned;
  }

  chooseStrategy(messages, override) {
    if (override && this.strategies.has(override)) return override;
    const mode = this.config.mode || 'hybrid';
    if (mode === 'rule') {
      return this.config.rule?.variant === 'advanced' ? 'rule-advanced' : 'rule-basic';
    }
    if (mode === 'ml') return this.strategies.has('ml-heuristic') ? 'ml-heuristic' : 'ml';
    // hybrid: pick by message length
    const len = Array.isArray(messages) ? messages.length : 0;
    if (len <= 6) return 'rule-basic';
    if (len <= 20) return 'rule-advanced';
    return this.strategies.has('ml-heuristic') ? 'ml-heuristic' : 'rule-advanced';
  }

  enforceContract(segments, messages) {
    const total = messages.length;
    const out = [];
    let cursor = 0;
    const maxSeg = this.config.thresholds?.maxSegments || 20;
    for (const s of (segments || [])) {
      if (out.length >= maxSeg) break;
      let start = Math.max(0, Math.min(total - 1, s.start ?? cursor));
      let end = Math.max(start, Math.min(total - 1, s.end ?? start));
      start = Math.max(start, cursor);
      const title = String(s.title || `Segment ${out.length + 1}`).slice(0, 60);
      const summary = String(s.summary || (messages[start]?.content || '')).slice(0, 200);
      out.push({ start, end, title, summary, messageCount: (end - start + 1) });
      cursor = end + 1;
      if (cursor >= total) break;
    }
    if (out.length === 0 && total > 0) {
      out.push({ start: 0, end: total - 1, title: 'Conversation', summary: (messages[0]?.content || '').slice(0, 200), messageCount: total });
    }
    return out;
  }

  logHealth(messages, segments, durationMs, strategy, extra = {}) {
    const rec = {
      t: new Date().toISOString(),
      totalMessages: messages.length,
      totalSegments: segments.length,
      durationMs,
      strategy,
      ...extra
    };
    try {
      fs.appendFileSync(this.healthLogPath, JSON.stringify(rec) + '\n');
    } catch {}
  }

  getStatus() {
    // Load quick aggregates (last 200 lines)
    let last = [];
    try {
      if (fs.existsSync(this.healthLogPath)) {
        const data = fs.readFileSync(this.healthLogPath, 'utf8').trim().split('\n');
        last = data.slice(-200).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      }
    } catch {}
    const n = last.length || 1;
    const p95 = (arr) => { if (!arr.length) return 0; const s = [...arr].sort((a,b)=>a-b); return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))]; };
    const durs = last.map(r => r.durationMs || 0);
    return {
      mode: this.config.mode,
      ruleVariant: this.config.rule?.variant,
      availableStrategies: this.available(),
      samples: last.length,
      avgDurationMs: durs.reduce((a,b)=>a+b,0)/n,
      p95DurationMs: p95(durs),
      avgSegments: last.reduce((a,b)=>a+(b.totalSegments||0),0)/n,
      canaryRatio: this.config.canaryRatio
    };
  }
}
