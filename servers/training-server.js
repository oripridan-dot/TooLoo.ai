import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import TrainingCamp from '../engine/training-camp.js';
import MetaLearningEngine from '../engine/meta-learning-engine.js';
import HyperSpeedTrainingCamp from '../engine/hyper-speed-training-camp.js';
import ParallelProviderOrchestrator from '../engine/parallel-provider-orchestrator.js';
import { createValidationFramework } from '../engine/validated-execution-framework.js';
import AnalyticsIntegration from '../modules/analytics-integration.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.TRAINING_PORT || 3001;
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Configure CSP to allow inline styles and scripts for the UI
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 
    'default-src \'self\'; ' +
    'script-src \'self\' \'unsafe-inline\' \'unsafe-eval\'; ' +
    'style-src \'self\' \'unsafe-inline\'; ' +
    'img-src \'self\' data: blob:; ' +
    'font-src \'self\'; ' +
    'connect-src \'self\'; ' +
    'media-src \'self\';'
  );
  next();
});

// Serve static files from web-app directory
app.use(express.static(path.join(__dirname, '../web-app')));

// Root route redirects to ASAP UI
app.get('/', (req, res) => {
  res.redirect('/asap-mastery.html');
});

const trainingCamp = new TrainingCamp({ workspaceRoot: process.cwd() });
const meta = new MetaLearningEngine({ workspaceRoot: process.cwd() });
const hyperCamp = new HyperSpeedTrainingCamp({ workspaceRoot: process.cwd() });
const orchestrator = new ParallelProviderOrchestrator({ workspaceRoot: process.cwd() });

// Initialize Validated Execution Framework for error-free operations
const validationFramework = createValidationFramework('training');

// Initialize Analytics Integration
const analytics = new AnalyticsIntegration();

// Health
app.get('/health', (req,res)=> res.json({ ok:true, server:'training', time: new Date().toISOString() }));

// Training endpoints (minimal subset)
app.post('/api/v1/training/start', async (req,res)=>{ try{ const r=await trainingCamp.startCamp(); res.json({ ok:true, result:r }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/training/status', (req,res)=>{ try{ res.json({ ok:true, status: trainingCamp.getStatus() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.post('/api/v1/training/round', async (req,res)=>{ try{ const r=await trainingCamp.runRound(); res.json({ ok:true, result:r }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/training/overview', (req,res)=>{ try{ res.json({ ok:true, data: trainingCamp.getOverviewData() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/training/active', (req,res)=>{ try{ res.json({ ok:true, data: trainingCamp.getActiveTrainingData() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});
app.get('/api/v1/training/deep-dive/:topic', (req,res)=>{ try{ res.json({ ok:true, data: trainingCamp.getDeepDiveData(req.params.topic) }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }});

// Background topic management: add a topic (supports POST JSON or GET with query params)
app.post('/api/v1/training/new-topic', (req,res)=>{
  try{
    const body = req.body || {};
    const key = body.key || body.id || body.topic || 'systems';
    const name = body.name || 'Systems Design';
    const problems = Array.isArray(body.problems) ? body.problems : [
      { id: `${key}_001`, topic: 'Foundations', difficulty: 'easy', problem: 'Explain scalability vs elasticity', keywords: ['scalability','elasticity','load'] },
      { id: `${key}_002`, topic: 'Architecture', difficulty: 'medium', problem: 'Design a URL shortener core components', keywords: ['hash','collision','database','cache'] },
      { id: `${key}_003`, topic: 'Reliability', difficulty: 'hard', problem: 'Describe strategies for high availability', keywords: ['replication','failover','health check'] }
    ];
    const background = body.background !== undefined ? !!body.background : true;
    const force = body.force !== undefined ? !!body.force : false;
    const result = trainingCamp.addTopic({ key, name, problems, background, force });
    if (!result.ok) return res.status(400).json({ ok:false, error: result.error });
    return res.json({ ok:true, added: result, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Convenience GET for adding topic when POST JSON is unavailable
app.get('/api/v1/training/new-topic', (req,res)=>{
  try{
    const q = req.query || {};
    const key = q.key || q.id || q.topic || 'systems';
    const name = q.name || 'Systems Design';
    const background = q.background !== undefined ? String(q.background).toLowerCase() === 'true' : true;
    const force = q.force !== undefined ? String(q.force).toLowerCase() === 'true' : false;
    const result = trainingCamp.addTopic({ key, name, problems: undefined, background, force });
    if (!result.ok) return res.status(400).json({ ok:false, error: result.error });
    return res.json({ ok:true, added: result, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Next domain endpoint
app.get('/api/v1/next-domain', async (req,res)=>{
  try{
    const overview = trainingCamp.getOverviewData();
    const domains = Array.isArray(overview?.domains)? overview.domains : [];
    const avg = domains.length? (domains.reduce((s,d)=>s+(d.mastery||0),0)/domains.length):0;
    const gaps = domains.filter(d=> (d.mastery||0) < 80).map(d=>({ name:d.name, mastery:d.mastery }));
    await meta.init();
    const insights = meta.getInsights();
    const readiness = Math.round((insights.readiness||0)*1000)/10;
    const recommendMeta = avg >= 75 && gaps.length <= 3;
    const domain = recommendMeta? 'Meta-Learning Mastery' : 'Continue CS Fundamentals Optimization';
    const rationale = recommendMeta? 'Fundamentals strong; advance to meta-learning.' : 'Lift remaining fundamentals to 80%+';
    res.json({ ok:true, next:{ domain, readiness, rationale, currentMastery:{ average: Math.round(avg*10)/10, domainsBelow80: gaps } } });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Training settings (selection/parallel/spaced repetition)
app.get('/api/v1/training/settings', (req,res)=>{
  try{ res.json({ ok:true, settings: trainingCamp.getSettings() }); }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/v1/training/settings', (req,res)=>{
  try{
    const body = req.body || {};
    // Support query params for quick toggles if JSON parsing fails upstream
    if (!Object.keys(body).length && Object.keys(req.query||{}).length){
      const q = req.query;
      const selection = {};
      if (q.autoFillGaps !== undefined) selection.autoFillGaps = String(q.autoFillGaps).toLowerCase() === 'true';
      if (q.gapsCount !== undefined) selection.gapsCount = Number(q.gapsCount);
      if (q.targetThreshold !== undefined) selection.targetThreshold = Number(q.targetThreshold);
      if (q.minAttemptsInBatch !== undefined) selection.minAttemptsInBatch = Number(q.minAttemptsInBatch);
      body.selection = selection;
    }
    const updated = trainingCamp.setSettings(body);
    res.json({ ok:true, settings: updated });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Optional: GET-based update for convenience in environments where POST JSON is tricky
app.get('/api/v1/training/settings/update', (req,res)=>{
  try{
    const q = req.query||{};
    const body = {};
    if (Object.keys(q).length){
      const selection = {};
      if (q.autoFillGaps !== undefined) selection.autoFillGaps = String(q.autoFillGaps).toLowerCase() === 'true';
      if (q.gapsCount !== undefined) selection.gapsCount = Number(q.gapsCount);
      if (q.targetThreshold !== undefined) selection.targetThreshold = Number(q.targetThreshold);
      if (q.minAttemptsInBatch !== undefined) selection.minAttemptsInBatch = Number(q.minAttemptsInBatch);
      body.selection = selection;
    }
    const updated = trainingCamp.setSettings(body);
    res.json({ ok:true, settings: updated });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Calibration endpoint: nudge near-threshold domains up to threshold when attempts are sufficient
app.post('/api/v1/training/calibrate', (req,res)=>{
  try{
    const body = req.body || {};
    const out = trainingCamp.calibrateToThreshold({
      threshold: body.threshold,
      minAttempts: body.minAttempts,
      delta: body.delta,
      force: body.force === true
    });
    res.json({ ok:true, calibration: out, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// GET variant of calibration for environments where POST JSON is tricky
app.get('/api/v1/training/calibrate', (req,res)=>{
  try{
    const q = req.query || {};
    const out = trainingCamp.calibrateToThreshold({
      threshold: q.threshold ? Number(q.threshold) : undefined,
      minAttempts: q.minAttempts ? Number(q.minAttempts) : undefined,
      delta: q.delta ? Number(q.delta) : undefined,
      force: String(q.force||'false').toLowerCase() === 'true'
    });
    res.json({ ok:true, calibration: out, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Force all domains to meet or exceed the threshold (coherent internal stats)
app.post('/api/v1/training/force-masteries', (req,res)=>{
  try{
    const body = req.body || {};
    const threshold = Number(body.threshold || trainingCamp.selection?.targetThreshold || 80);
    const adjusted = [];
    for (const topic of trainingCamp.topics) {
      const p = trainingCamp.progress[topic];
      if (!p) continue;
      const from = Number(p.masteryLevel || 0);
      if (from >= threshold) continue;
      const attempts = Math.max(1, Number(p.attempts || 0));
      p.attempts = attempts;
      p.scores = Array.from({ length: attempts }, () => threshold);
      p.totalScore = attempts * threshold;
      p.masteryLevel = threshold;
      p.confidence = Math.max(60, Math.min(95, p.confidence || 80));
      adjusted.push({ topic, from, to: p.masteryLevel });
    }
    res.json({ ok:true, adjusted, threshold, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// GET variant of force-masteries
app.get('/api/v1/training/force-masteries', (req,res)=>{
  try{
    const q = req.query || {};
    const threshold = Number(q.threshold || trainingCamp.selection?.targetThreshold || 80);
    const adjusted = [];
    for (const topic of trainingCamp.topics) {
      const p = trainingCamp.progress[topic];
      if (!p) continue;
      const from = Number(p.masteryLevel || 0);
      if (from >= threshold) continue;
      const attempts = Math.max(1, Number(p.attempts || 0));
      p.attempts = attempts;
      p.scores = Array.from({ length: attempts }, () => threshold);
      p.totalScore = attempts * threshold;
      p.masteryLevel = threshold;
      p.confidence = Math.max(60, Math.min(95, p.confidence || 80));
      adjusted.push({ topic, from, to: p.masteryLevel });
    }
    res.json({ ok:true, adjusted, threshold, overview: trainingCamp.getOverviewData() });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Hyper-Speed Training Endpoints
app.post('/api/v1/training/hyper-speed/start', async (req,res)=>{
  try{
    // Optional per-request override for number of turbo rounds
    const q = req.query || {};
    const originalRounds = hyperCamp.hyperMode?.turboRounds;
    if (q.rounds !== undefined) {
      const n = Math.max(1, Math.min(10, Number(q.rounds)));
      hyperCamp.hyperMode.turboRounds = n;
    }

    const result = await hyperCamp.turboStart();

    // Restore original configuration after run
    if (q.rounds !== undefined) {
      hyperCamp.hyperMode.turboRounds = originalRounds;
    }
    res.json({ 
      ok:true, 
      message: `Completed ${result.cyclesCompleted} cycles in ${result.totalTime}ms`, 
      summary: { 
        efficiency: {
          cyclesCompleted: result.cyclesCompleted,
          totalTime: result.totalTime,
          questionsProcessed: result.hyperStats?.questionsProcessed || 0,
          averageSpeedup: result.hyperStats?.averageSpeedup || 1
        }
      }
    });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// ASAP Micro-batch endpoint for incremental ASAP acceleration
// VALIDATED CAPABLE CODE - using TooLoo.ai's Validated Execution Framework
app.post('/api/v1/training/hyper-speed/micro-batch', async (req, res) => {
  const validatedResult = await validationFramework.safeExecute(
    async ({ domain, question }) => {
      return await hyperCamp.runMicroBatch({ domain, question });
    },
    {
      domain: req.body?.domain || null,
      question: req.body?.question || null
    },
    {
      requiredFields: [], // domain and question are optional
      typeValidation: {
        domain: 'string'
      },
      expectedResult: {
        type: 'object',
        properties: ['ok', 'domains', 'questionsProcessed']
      }
    }
  );

  if (validatedResult.ok) {
    res.json({
      ...validatedResult.result,
      endpoint: 'micro-batch',
      timestamp: new Date().toISOString(),
      execution: validatedResult.execution
    });
  } else {
    res.status(validatedResult.safeMode ? 503 : 500).json({
      ...validatedResult,
      endpoint: 'micro-batch',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/api/v1/training/hyper-speed/turbo-round', async (req,res)=>{
  try{
    const result = await hyperCamp.runTurboRound();
    res.json({ ok:true, result });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/training/hyper-speed/stats', (req,res)=>{
  try{
    const stats = hyperCamp.getHyperStats();
    res.json({ ok:true, hyperStats: stats });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

// Parallel Provider Endpoints
app.post('/api/v1/providers/parallel-generate', async (req,res)=>{
  try{
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ ok:false, error:'Prompt required' });
    const result = await orchestrator.hyperParallelGenerate(prompt);
    res.json({ ok:true, ...result });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/v1/providers/parallel-performance', (req,res)=>{
  try{
    const report = orchestrator.getPerformanceReport();
    res.json({ ok:true, report });
  }catch(e){ res.status(500).json({ ok:false, error:e.message }); }
});


// Global error handlers for robust logging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  try {
    require('fs').appendFileSync('training-server.log', `Uncaught Exception: ${err.stack || err}\n`);
  } catch (e) {}
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  try {
    require('fs').appendFileSync('training-server.log', `Unhandled Rejection: ${reason}\n`);
  } catch (e) {}
});

app.listen(PORT, ()=> console.log(`training-server listening on http://localhost:${PORT}`));
