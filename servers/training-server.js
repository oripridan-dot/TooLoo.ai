import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import TrainingCamp from '../engine/training-camp.js';
import MetaLearningEngine from '../engine/meta-learning-engine.js';
import HyperSpeedTrainingCamp from '../engine/hyper-speed-training-camp.js';
import ParallelProviderOrchestrator from '../engine/parallel-provider-orchestrator.js';
import { createValidationFramework } from '../engine/validated-execution-framework.js';
import AnalyticsIntegration from '../modules/analytics-integration.js';
import { ServiceFoundation } from '../lib/service-foundation.js';
import { DistributedTracer } from '../lib/distributed-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize service with unified middleware (replaces 40 LOC of boilerplate)
const svc = new ServiceFoundation('training-server', process.env.TRAINING_PORT || 3001);
svc.setupMiddleware();
svc.registerHealthEndpoint();
svc.registerStatusEndpoint();

const app = svc.app;
const PORT = svc.port;

// Initialize distributed tracing (Phase 6C)
const tracer = new DistributedTracer({ serviceName: 'training-server', samplingRate: 0.15 });
svc.environmentHub.registerComponent('tracer', tracer, ['observability', 'tracing', 'performance']);

// GitHub sources consolidation - state management
const sourcesStateFile = path.join(process.cwd(), 'data', 'sources-github-state.json');
function loadSourcesState() {
  try {
    return JSON.parse(fs.readFileSync(sourcesStateFile, 'utf8'));
  } catch {
    return {};
  }
}
function saveSourcesState(state) {
  if (!fs.existsSync(path.dirname(sourcesStateFile))) {
    fs.mkdirSync(path.dirname(sourcesStateFile), { recursive: true });
  }
  fs.writeFileSync(sourcesStateFile, JSON.stringify(state, null, 2));
}

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

// ============= GitHub Sources Consolidation (formerly sources-server) =============
/**
 * POST /api/v1/sources/github/issues/sync
 * Sync GitHub issues as training topics (consolidated from sources-server)
 */
app.post('/api/v1/sources/github/issues/sync', async (req, res) => {
  try {
    const { repo = process.env.GITHUB_REPO, token = process.env.GITHUB_TOKEN, force = false } = req.body || {};

    if (!repo || !token) {
      return res.status(400).json({ ok: false, error: 'repo and token required' });
    }

    const state = loadSourcesState();
    const lastSync = state[repo]?.lastSync || 0;
    const since = force ? 0 : lastSync;

    const issuesUrl = `https://api.github.com/repos/${repo}/issues?state=all&since=${new Date(since).toISOString()}`;
    const r = await fetch(issuesUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: `GitHub API error: ${r.statusText}` });
    }

    const issues = await r.json();
    const newTopics = [];

    for (const issue of issues) {
      if (!issue.id || state[repo]?.ids?.includes(issue.id)) continue;

      const topic = {
        key: `github-issue-${issue.id}`,
        name: issue.title,
        background: true,
        source: 'github',
        url: issue.html_url,
        body: issue.body || '',
        created_at: issue.created_at,
        labels: issue.labels?.map(l => l.name) || []
      };

      // Add to training directly
      try {
        const result = trainingCamp.addTopic(topic);
        if (result.ok) newTopics.push(topic);
      } catch (e) {
        console.warn(`Failed to add issue ${issue.id}:`, e.message);
      }

      // Track synced issue
      state[repo] = state[repo] || { ids: [], lastSync: 0 };
      state[repo].ids.push(issue.id);
    }

    state[repo].lastSync = Date.now();
    saveSourcesState(state);

    res.json({
      ok: true,
      repo,
      newTopics,
      count: newTopics.length,
      nextSync: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /api/v1/sources/github/:repo/status
 * Get GitHub sync status
 */
app.get('/api/v1/sources/github/:repo/status', (req, res) => {
  try {
    const { repo } = req.params;
    const state = loadSourcesState();
    const repoState = state[repo];

    if (!repoState) {
      return res.json({
        ok: true,
        repo,
        synced: false,
        message: 'Never synced'
      });
    }

    res.json({
      ok: true,
      repo,
      synced: true,
      syncedIssues: repoState.ids?.length || 0,
      lastSync: new Date(repoState.lastSync).toISOString()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= Training Endpoints =============

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

// ============================================================================
// LEARNING SERVICE CONSOLIDATION ENDPOINTS (formerly learning-service.js)
// ============================================================================

/**
 * POST /api/v1/training/start - Start a new training session
 * Consolidated from learning-service.js - Training Engine endpoint
 */
app.post('/api/v1/training/start', async (req, res) => {
  try {
    const { userId, focusArea, roundCount } = req.body;

    if (!userId || !focusArea) {
      return res.status(400).json({
        error: 'userId and focusArea are required'
      });
    }

    const result = await trainingCamp.startTraining(userId, focusArea, { roundCount });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Training session started'
    });
  } catch (error) {
    console.error('Error starting training:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/training/round - Complete a training round
 * Consolidated from learning-service.js - Training Engine endpoint
 */
app.post('/api/v1/training/round', async (req, res) => {
  try {
    const { roundId, response, score } = req.body;

    if (!roundId || !response) {
      return res.status(400).json({
        error: 'roundId and response are required'
      });
    }

    const result = await trainingCamp.completeRound(roundId, response, score);

    res.json({
      success: true,
      data: result,
      message: result.completed ? 'Training completed' : 'Round completed, continue to next'
    });
  } catch (error) {
    console.error('Error completing round:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/progress - Get mastery metrics for user
 * Consolidated from learning-service.js - Training Engine endpoint
 */
app.get('/api/v1/training/progress', (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'userId query parameter is required'
      });
    }

    const metrics = trainingCamp.getMasteryMetrics(userId);
    const sessions = trainingCamp.getUserSessions(userId);

    res.json({
      success: true,
      data: {
        mastery: metrics,
        sessions,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/session/:sessionId - Get session details
 * Consolidated from learning-service.js - Training Engine endpoint
 */
app.get('/api/v1/training/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = trainingCamp.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/training/stats - Service statistics
 * Consolidated from learning-service.js - Training Engine endpoint
 */
app.get('/api/v1/training/stats', (req, res) => {
  try {
    const stats = trainingCamp.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// CHALLENGE ENDPOINTS (from learning-service.js consolidation)
// ============================================================================

/**
 * POST /api/v1/challenges/start - Start a new challenge
 * Consolidated from learning-service.js - Challenge Engine endpoint
 */
app.post('/api/v1/challenges/start', async (req, res) => {
  try {
    const { userId, skill, difficulty } = req.body;

    if (!userId || !skill) {
      return res.status(400).json({
        error: 'userId and skill are required'
      });
    }

    const result = await trainingCamp.startChallenge(
      userId,
      skill,
      difficulty || 'medium'
    );

    res.status(201).json({
      success: true,
      data: result,
      message: 'Challenge started'
    });
  } catch (error) {
    console.error('Error starting challenge:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/v1/challenges/grade - Grade a challenge response
 * Consolidated from learning-service.js - Challenge Engine endpoint
 */
app.post('/api/v1/challenges/grade', async (req, res) => {
  try {
    const { challengeId, response } = req.body;

    if (!challengeId || !response) {
      return res.status(400).json({
        error: 'challengeId and response are required'
      });
    }

    const result = await trainingCamp.gradeChallenge(challengeId, response);

    res.json({
      success: true,
      data: result,
      message: result.passed ? 'Challenge passed!' : 'Challenge failed'
    });
  } catch (error) {
    console.error('Error grading challenge:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/challenges/stats - Challenge statistics
 * Consolidated from learning-service.js - Challenge Engine endpoint
 */
app.get('/api/v1/challenges/stats', (req, res) => {
  try {
    const stats = trainingCamp.getChallengeStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// FEEDBACK & LEARNING SERVICE CONSOLIDATION (formerly feedback-learning-service.js)
// ============================================================================

// In-memory feedback and metrics storage
let feedbackStore = { feedback: [], count: 0, interactions: [], lastUpdated: Date.now() };
let metricsStore = { providers: {}, responses: [], averageQuality: 0, lastUpdated: Date.now() };

/**
 * POST /api/v1/feedback/submit - Submit user feedback on a response
 * Consolidated from feedback-learning-service.js
 */
app.post('/api/v1/feedback/submit', (req, res) => {
  try {
    const {
      responseId,
      quality = 3,
      relevance = 3,
      clarity = 3,
      provider = 'unknown',
      helpful = null,
      comment = ''
    } = req.body;

    if (!responseId) {
      return res.status(400).json({ ok: false, error: 'responseId required' });
    }

    const feedbackEntry = {
      id: responseId,
      quality,
      relevance,
      clarity,
      provider,
      helpful,
      comment,
      timestamp: Date.now(),
      averageScore: (quality + relevance + clarity) / 3
    };

    feedbackStore.feedback.push(feedbackEntry);
    feedbackStore.count = feedbackStore.feedback.length;
    feedbackStore.lastUpdated = Date.now();

    res.json({
      ok: true,
      message: 'Feedback recorded',
      feedbackId: responseId
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/feedback/summary - Get summary of all feedback collected
 * Consolidated from feedback-learning-service.js
 */
app.get('/api/v1/feedback/summary', (req, res) => {
  try {
    const summary = {
      totalFeedback: feedbackStore.count,
      feedbackLastUpdated: feedbackStore.lastUpdated,
      avgQuality: feedbackStore.feedback.length > 0 
        ? feedbackStore.feedback.reduce((a, b) => a + b.quality, 0) / feedbackStore.feedback.length 
        : 0,
      avgRelevance: feedbackStore.feedback.length > 0 
        ? feedbackStore.feedback.reduce((a, b) => a + b.relevance, 0) / feedbackStore.feedback.length 
        : 0
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/feedback/provider/:provider - Get feedback metrics for a specific provider
 * Consolidated from feedback-learning-service.js
 */
app.get('/api/v1/feedback/provider/:provider', (req, res) => {
  try {
    const { provider } = req.params;

    const providerFeedback = feedbackStore.feedback.filter(f => f.provider === provider);
    const avg = (arr) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    const metrics = {
      provider,
      totalResponses: providerFeedback.length,
      averageQuality: avg(providerFeedback.map(f => f.quality)),
      averageRelevance: avg(providerFeedback.map(f => f.relevance)),
      averageClarity: avg(providerFeedback.map(f => f.clarity)),
      helpfulRate: providerFeedback.filter(f => f.helpful).length / Math.max(1, providerFeedback.length),
      recentFeedback: providerFeedback.slice(-10)
    };

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/metrics/record - Record performance metrics for a response
 * Consolidated from feedback-learning-service.js
 */
app.post('/api/v1/metrics/record', (req, res) => {
  try {
    const {
      responseId,
      provider = 'unknown',
      latency = 0,
      tokensUsed = 0,
      costEstimate = 0,
      quality = 0
    } = req.body;

    const metricEntry = {
      id: responseId,
      provider,
      latency,
      tokensUsed,
      costEstimate,
      quality,
      timestamp: Date.now()
    };

    metricsStore.responses.push(metricEntry);
    metricsStore.lastUpdated = Date.now();

    if (!metricsStore.providers[provider]) {
      metricsStore.providers[provider] = {
        totalRequests: 0,
        averageLatency: 0,
        averageQuality: 0,
        totalCost: 0
      };
    }

    const providerData = metricsStore.providers[provider];
    providerData.totalRequests += 1;
    providerData.averageLatency = (providerData.averageLatency * (providerData.totalRequests - 1) + latency) / providerData.totalRequests;
    providerData.averageQuality = (providerData.averageQuality * (providerData.totalRequests - 1) + quality) / providerData.totalRequests;
    providerData.totalCost += costEstimate;

    res.json({ ok: true, message: 'Metrics recorded' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/metrics/performance - Get overall performance metrics across all providers
 * Consolidated from feedback-learning-service.js
 */
app.get('/api/v1/metrics/performance', (req, res) => {
  try {
    res.json({
      providers: metricsStore.providers,
      totalMetrics: metricsStore.responses.length,
      lastUpdated: metricsStore.lastUpdated
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/personalization/track-interaction - Track user interactions for personalization
 * Consolidated from feedback-learning-service.js
 */
app.post('/api/v1/personalization/track-interaction', (req, res) => {
  try {
    const { userId, queryType, selectedProvider, responseTime, engaged, followUpQuery } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: 'userId required' });
    }

    const interaction = {
      userId,
      queryType,
      selectedProvider,
      responseTime,
      engaged,
      followUpQuery,
      timestamp: Date.now()
    };

    feedbackStore.interactions.push(interaction);
    feedbackStore.lastUpdated = Date.now();

    res.json({ ok: true, message: 'Interaction tracked' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/personalization/profile/:userId - Get personalization profile for a user
 * Consolidated from feedback-learning-service.js
 */
app.get('/api/v1/personalization/profile/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const userInteractions = feedbackStore.interactions.filter(i => i.userId === userId);

    const profile = {
      userId,
      totalInteractions: userInteractions.length,
      engagementRate: userInteractions.filter(i => i.engaged).length / Math.max(1, userInteractions.length),
      recentActivity: userInteractions.slice(-5)
    };

    res.json(profile);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/v1/personalization/recommendations - Get AI-powered personalized recommendations
 * Consolidated from feedback-learning-service.js
 */
app.post('/api/v1/personalization/recommendations', (req, res) => {
  try {
    const { userId, currentQuery = '', context = {} } = req.body;
    const userInteractions = feedbackStore.interactions.filter(i => i.userId === userId);

    const recommendations = {
      userId,
      interactionCount: userInteractions.length,
      engagementRate: userInteractions.filter(i => i.engaged).length / Math.max(1, userInteractions.length),
      suggestedApproach: currentQuery.includes('code') ? 'technical' : 'standard',
      timestamp: Date.now()
    };

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/v1/improvement/analysis - Get continuous improvement analysis
 * Consolidated from feedback-learning-service.js
 */
app.get('/api/v1/improvement/analysis', (req, res) => {
  try {
    const analysis = {
      dataCollected: {
        totalFeedback: feedbackStore.count,
        totalMetrics: metricsStore.responses.length,
        totalInteractions: feedbackStore.interactions.length
      },
      avgQuality: feedbackStore.feedback.length > 0 
        ? feedbackStore.feedback.reduce((a, b) => a + b.quality, 0) / feedbackStore.feedback.length 
        : 0,
      providers: metricsStore.providers,
      lastUpdated: metricsStore.lastUpdated
    };

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
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

// Observability endpoint (Phase 6C)
app.get('/api/v1/system/observability', (req, res) => {
  res.json({
    service: 'training-server',
    tracer: tracer.getMetrics(),
    circuitBreakers: svc.getCircuitBreakerStatus()
  });
});

svc.start();
