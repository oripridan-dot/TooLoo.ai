import express from 'express';
import cors from 'cors';
// Use HTTP proxy to the training-server so all training state is unified
import MetaLearningEngine from '../engine/meta-learning-engine.js';
import AutoCoachEngine from '../engine/auto-coach-engine.js';
import AnalyticsIntegration from '../modules/analytics-integration.js';
import fs from 'fs';
import path from 'path';
import environmentHub from '../engine/environment-hub.js';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';

// Initialize service with unified middleware (replaces 25 LOC of boilerplate)
const svc = new ServiceFoundation('coach-server', process.env.COACH_PORT || 3004);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize distributed tracing (Phase 6C)
const tracer = new DistributedTracer({ serviceName: 'coach-server', samplingRate: 0.1 });
svc.environmentHub.registerComponent('tracer', tracer, ['observability', 'tracing', 'coaching']);

// Load coach settings with defaults
function loadSettings() {
  try {
    const settingsPath = path.join(process.cwd(), 'coach-settings.json');
    const data = fs.readFileSync(settingsPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {
      minAvgMastery: 75,
      maxBelow80: 3,
      intervalMs: 1000,
      maxRoundsPerCycle: 4,
      aggressiveMode: true,
      aggressiveThreshold: 50,
      aggressiveMultiplier: 2
    };
  }
}

function saveSettings(settings) {
  try {
    const settingsPath = path.join(process.cwd(), 'coach-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch {}
}

const TRAINING_PORT = process.env.TRAINING_PORT || 3001;
const TRAINING_BASE = `http://127.0.0.1:${TRAINING_PORT}`;

// Thin proxy that matches the subset of TrainingCamp API used by AutoCoachEngine and boosters
const trainingCamp = {
  async startCamp(){
    try{ const r = await fetch(`${TRAINING_BASE}/api/v1/training/start`, { method:'POST' }); return await r.json(); }catch{ return { ok:false }; }
  },
  getStatus(){
    // Best effort synchronous-ish for status queries in this server
    return { isActive: true };
  },
  async runRound(){
    const r = await fetch(`${TRAINING_BASE}/api/v1/training/round`, { method:'POST' });
    const j = await r.json();
    if (!j?.ok) throw new Error('training round failed');
    return j.result;
  },
  getOverviewData(){
    // Return promise to be awaited by callers
    return fetch(`${TRAINING_BASE}/api/v1/training/overview`).then(r=>r.json()).then(j=>j?.data || { domains: [] });
  }
};
const meta = new MetaLearningEngine({ workspaceRoot: process.cwd() });
const settings = loadSettings();
const coach = new AutoCoachEngine({ trainingCamp, metaLearningEngine: meta, logger: console, thresholds: settings });
const analytics = new AnalyticsIntegration();
environmentHub.registerComponent('autoCoachEngine', coach, ['auto-coach', 'meta-learning', 'training-camp']);

// Auto-coach endpoints
app.post('/api/v1/auto-coach/start', async (req,res)=>{ try{ const s=await coach.start(); res.json({ ok:true, status:s }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.post('/api/v1/auto-coach/stop', async (req,res)=>{ try{ const s=await coach.stop(); res.json({ ok:true, status:s }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/auto-coach/status', (req,res)=>{ try{ res.json({ ok:true, status: coach.getStatus() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});

// Quick booster: run N rapid training rounds (bounded) to accelerate early learning
app.post('/api/v1/auto-coach/boost', async (req,res)=>{
  try{
    const n = Math.min(Math.max(Number(req.body?.rounds||5), 1), 20); // Increased cap to 20
    const batchSize = Number(req.body?.batchSize || 3);
    const results = [];
    
    // Run in batches for faster parallel processing
    for(let i=0; i<n; i+=batchSize){
      const batchPromises = [];
      const thisBatch = Math.min(batchSize, n-i);
      
      for(let j=0; j<thisBatch; j++){
        batchPromises.push(trainingCamp.runRound());
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.map(r => ({ round: r.round, trained: r.trained })));
    }
    
    res.json({ ok:true, boosted: n, results, batchSize });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/auto-coach/boost', async (req,res)=>{
  try{
    const n = Math.min(Math.max(Number(req.query.rounds||5), 1), 20); // Increased cap to 20
    const batchSize = Number(req.query.batchSize || 3);
    const results = [];
    
    // Run in batches for faster parallel processing
    for(let i=0; i<n; i+=batchSize){
      const batchPromises = [];
      const thisBatch = Math.min(batchSize, n-i);
      
      for(let j=0; j<thisBatch; j++){
        batchPromises.push(trainingCamp.runRound());
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.map(r => ({ round: r.round, trained: r.trained })));
    }
    
    res.json({ ok:true, boosted: n, results, batchSize });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Hyper boost endpoint for extreme speed
app.get('/api/v1/auto-coach/hyper-boost', async (req,res)=>{
  try{
    const n = Math.min(Math.max(Number(req.query.rounds||10), 1), 50); // Up to 50 rounds
    const batchSize = 6; // Fixed large batch for maximum parallel processing
    const results = [];
    
    console.log(`🚀 HYPER BOOST: ${n} rounds in batches of ${batchSize}`);
    
    for(let i=0; i<n; i+=batchSize){
      const batchPromises = [];
      const thisBatch = Math.min(batchSize, n-i);
      
      for(let j=0; j<thisBatch; j++){
        batchPromises.push(trainingCamp.runRound());
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.map(r => ({ round: r.round, trained: r.trained })));
      
      console.log(`⚡ Completed batch ${Math.floor(i/batchSize)+1}, total rounds: ${results.length}`);
    }
    
    res.json({ ok:true, hyperBoosted: n, results, totalBatches: Math.ceil(n/batchSize) });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});// Settings management
app.get('/api/v1/auto-coach/settings', (req,res)=>{
  try{ res.json({ ok:true, settings: loadSettings() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/v1/auto-coach/settings', (req,res)=>{
  try{
    const newSettings = { ...loadSettings(), ...req.body };
    saveSettings(newSettings);
    // Update coach thresholds
    Object.assign(coach.thresholds, newSettings);
    res.json({ ok:true, settings: newSettings });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Fast-lane: temporarily boost coach throughput for critical tracks
app.post('/api/v1/auto-coach/fast-lane', async (req,res)=>{
  try{
    const payload = req.body || {};
    const enable = payload.enable !== false; // default enable
    const weight = Number(payload.weight || 2);
    const mb = Number(payload.microBatchesPerTick || 3);
    const batchSize = Number(payload.batchSize || 3);
    const interval = Number(payload.intervalMs || 800);
    // Apply fast-lane
    coach.thresholds.fastLane = { enabled: enable, weight };
    coach.thresholds.microBatchesPerTick = mb;
    coach.thresholds.batchSize = batchSize;
    coach.thresholds.intervalMs = interval;
    // Persist settings so restarts keep configuration
    try {
      const current = loadSettings();
      const toSave = { ...current, fastLane: coach.thresholds.fastLane, microBatchesPerTick: mb, batchSize, intervalMs: interval };
      saveSettings(toSave);
    } catch {}
    // Restart timer if active to pick up new interval
    if (coach._active) { await coach.stop(); await coach.start(); }
    res.json({ ok:true, fastLane: coach.thresholds.fastLane, thresholds: coach.thresholds });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Convenience: GET toggle for fast-lane with query params for quick dialing
app.get('/api/v1/auto-coach/fast-lane', async (req,res)=>{
  try{
    const q = req.query || {};
    const enable = String(q.enable||'true').toLowerCase() !== 'false';
    const weight = Number(q.weight || 2);
    const mb = Number(q.microBatchesPerTick || 4);
    const batchSize = Number(q.batchSize || 4);
    const interval = Number(q.intervalMs || 600);
    coach.thresholds.fastLane = { enabled: enable, weight };
    coach.thresholds.microBatchesPerTick = mb;
    coach.thresholds.batchSize = batchSize;
    coach.thresholds.intervalMs = interval;
    // Persist settings so restarts keep configuration
    try {
      const current = loadSettings();
      const toSave = { ...current, fastLane: coach.thresholds.fastLane, microBatchesPerTick: mb, batchSize, intervalMs: interval };
      saveSettings(toSave);
    } catch {}
    if (coach._active) { await coach.stop(); await coach.start(); }
    res.json({ ok:true, fastLane: coach.thresholds.fastLane, thresholds: coach.thresholds });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Observability endpoint (Phase 6C)
app.get('/api/v1/system/observability', (req, res) => {
  res.json({
    service: 'coach-server',
    tracer: tracer.getMetrics(),
    circuitBreakers: svc.getCircuitBreakerStatus()
  });
});

svc.start();

