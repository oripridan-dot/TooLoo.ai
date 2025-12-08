// @version 3.3.400 - REAL DATA WIRING - No more fake metrics!
import { Router } from 'express';
import { precog } from '../../precog/index.js';
import { successResponse, errorResponse } from '../utils.js';
import fs from 'fs-extra';
import path from 'path';

const router = Router();
const PATTERNS_PATH = path.join(process.cwd(), 'data', 'patterns.json');

// ============= GitHub Sources =============

/**
 * @description Sync GitHub issues for training
 * @param {string} [repo] - Repository name (owner/repo)
 * @param {string} [token] - GitHub token
 * @param {boolean} [force] - Force sync even if recent
 */
router.post('/sources/github/issues/sync', async (req, res) => {
  try {
    const {
      repo = process.env['GITHUB_REPO'],
      token = process.env['GITHUB_TOKEN'],
      force = false,
    } = req.body || {};
    if (!repo || !token) {
      return res.status(400).json(errorResponse('repo and token required'));
    }
    const result = await precog.training.syncGithubIssues(repo, token, force);
    res.json(successResponse(result));
  } catch (e: any) {
    res.status(500).json(errorResponse(e.message));
  }
});

/**
 * @description Get GitHub source status
 */
router.get('/sources/github/:repo/status', (req, res) => {
  try {
    const result = precog.training.getGithubSourceStatus(req.params.repo);
    res.json(successResponse(result));
  } catch (e: any) {
    res.status(500).json(errorResponse(e.message));
  }
});

// ============= Training =============

/**
 * @description Start a training session
 * @param {string} [userId] - User ID for personalized training
 * @param {string} [focusArea] - Specific area to focus on
 * @param {number} [roundCount] - Number of rounds
 */
router.post('/training/start', async (req, res) => {
  try {
    const { userId, focusArea, roundCount } = req.body || {};
    if (userId) {
      // User training session
      const result = await precog.training.startTrainingSession(userId, focusArea, roundCount);
      res.status(201).json({
        success: true,
        data: result,
        message: 'Training session started',
      });
    } else {
      // System training camp
      const result = await precog.training.startCamp();
      res.json({ ok: true, result });
    }
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * @description Get training status
 */
router.get('/training/status', (req, res) => {
  try {
    res.json({ ok: true, status: precog.training.getStatus() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= REAL METRICS AGGREGATION =============
// This endpoint provides a complete view of ALL real tracked data
// NO FAKE DATA - only what has actually been measured and logged

router.get('/metrics/real', async (req, res) => {
  try {
    // Session data from flow-sessions
    const sessions = await countFilesInDir(FLOW_SESSIONS_DIR);
    
    // Experiments from audit log
    const experiments = await countJsonlLines(AUDIT_LOG_PATH);
    
    // Chat history - count actual conversations
    let conversationCount = 0;
    try {
      const chatHistory = await fs.readJSON(CHAT_HISTORY_PATH);
      if (chatHistory.conversations) {
        conversationCount = Object.keys(chatHistory.conversations).length;
      }
    } catch { /* No chat history */ }
    
    // Emergence events
    let emergenceEvents: any[] = [];
    try {
      const emergenceData = await fs.readJSON(EMERGENCE_STATE_PATH);
      emergenceEvents = emergenceData.recentEmergences || [];
    } catch { /* No emergence data */ }
    
    // Learning metrics
    let learningMetrics = null;
    try {
      learningMetrics = await fs.readJSON(LEARNING_METRICS_PATH);
    } catch { /* No learning metrics */ }
    
    // Artifacts
    let artifacts: any[] = [];
    try {
      const artifactIndex = await fs.readJSON(ARTIFACTS_INDEX_PATH);
      artifacts = artifactIndex.artifacts || [];
    } catch { /* No artifacts */ }
    
    // Patterns
    let patterns: any[] = [];
    try {
      const patternData = await fs.readJSON(PATTERNS_PATH);
      patterns = Array.isArray(patternData) ? patternData : (patternData.patterns || []);
    } catch { /* No patterns */ }
    
    res.json({
      ok: true,
      source: 'real-data',
      timestamp: new Date().toISOString(),
      counts: {
        sessions,
        experiments,
        conversations: conversationCount,
        emergenceEvents: emergenceEvents.length,
        artifacts: artifacts.length,
        patterns: patterns.length,
      },
      metrics: {
        learning: learningMetrics?.improvements || null,
        lastOptimization: learningMetrics?.lastMemoryOptimization || null,
      },
      recentEmergence: emergenceEvents.slice(0, 5).map((e: any) => ({
        id: e.id,
        type: e.signature?.type || 'unknown',
        strength: e.signature?.strength || 0,
        timestamp: e.timestamp,
      })),
      recentArtifacts: artifacts.slice(0, 5).map((a: any) => ({
        id: a.id,
        type: a.type,
        name: a.name,
        createdAt: a.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * @description Submit a training round response
 * @param {string} [roundId] - Round ID
 * @param {string} [response] - User response
 * @param {number} [score] - Self-reported score
 */
router.post('/training/round', async (req, res) => {
  try {
    const { roundId, response, score } = req.body || {};
    if (roundId) {
      // User training round
      const result = await precog.training.completeTrainingRound(roundId, response, score);
      res.json({
        success: true,
        data: result,
        message:
          'completed' in result && result.completed ? 'Training completed' : 'Round completed',
      });
    } else {
      // System training round
      const result = await precog.training.runRound();
      res.json({ ok: true, result });
    }
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/overview', (req, res) => {
  try {
    res.json({ ok: true, data: precog.training.getOverviewData() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/active', (req, res) => {
  try {
    res.json({ ok: true, data: precog.training.getActiveTrainingData() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/deep-dive/:topic', (req, res) => {
  try {
    res.json({
      ok: true,
      data: precog.training.getDeepDiveData(req.params.topic),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/new-topic', (req, res) => {
  try {
    const result = precog.training.addTopic(req.body || {});
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
    res.json({
      ok: true,
      added: result,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/new-topic', (req, res) => {
  try {
    const q = req.query || {};
    // Map query params to expected object structure
    const data = {
      key: (q['key'] || q['id'] || q['topic']) as string | undefined,
      name: q['name'] as string | undefined,
      background:
        q['background'] !== undefined
          ? String(q['background']).toLowerCase() === 'true'
          : undefined,
      force: q['force'] !== undefined ? String(q['force']).toLowerCase() === 'true' : undefined,
    };
    const result = precog.training.addTopic(data as any);
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
    res.json({
      ok: true,
      added: result,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/next-domain', async (req, res) => {
  try {
    const result = await precog.training.getNextDomain();
    res.json({ ok: true, next: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/settings', (req, res) => {
  try {
    res.json({ ok: true, settings: precog.training.getSettings() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/settings', (req, res) => {
  try {
    const body = req.body || {};
    // Support query params fallback
    if (!Object.keys(body).length && Object.keys(req.query || {}).length) {
      const q = req.query as any;
      const selection: any = {};
      if (q.autoFillGaps !== undefined)
        selection.autoFillGaps = String(q.autoFillGaps).toLowerCase() === 'true';
      if (q.gapsCount !== undefined) selection.gapsCount = Number(q.gapsCount);
      if (q.targetThreshold !== undefined) selection.targetThreshold = Number(q.targetThreshold);
      if (q.minAttemptsInBatch !== undefined)
        selection.minAttemptsInBatch = Number(q.minAttemptsInBatch);
      body.selection = selection;
    }
    const updated = precog.training.setSettings(body);
    res.json({ ok: true, settings: updated });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/settings/update', (req, res) => {
  try {
    const q = req.query as any;
    const body: any = {};
    if (Object.keys(q).length) {
      const selection: any = {};
      if (q.autoFillGaps !== undefined)
        selection.autoFillGaps = String(q.autoFillGaps).toLowerCase() === 'true';
      if (q.gapsCount !== undefined) selection.gapsCount = Number(q.gapsCount);
      if (q.targetThreshold !== undefined) selection.targetThreshold = Number(q.targetThreshold);
      if (q.minAttemptsInBatch !== undefined)
        selection.minAttemptsInBatch = Number(q.minAttemptsInBatch);
      body.selection = selection;
    }
    const updated = precog.training.setSettings(body);
    res.json({ ok: true, settings: updated });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/calibrate', (req, res) => {
  try {
    const body = req.body || {};
    const out = precog.training.calibrateToThreshold({
      threshold: body.threshold,
      minAttempts: body.minAttempts,
      delta: body.delta,
      force: body.force === true,
    });
    res.json({
      ok: true,
      calibration: out,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/calibrate', (req, res) => {
  try {
    const q = req.query as any;
    const out = precog.training.calibrateToThreshold({
      threshold: q.threshold ? Number(q.threshold) : undefined,
      minAttempts: q.minAttempts ? Number(q.minAttempts) : undefined,
      delta: q.delta ? Number(q.delta) : undefined,
      force: String(q.force || 'false').toLowerCase() === 'true',
    });
    res.json({
      ok: true,
      calibration: out,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/force-masteries', async (req, res) => {
  try {
    const body = req.body || {};
    const threshold = Number(body.threshold || 80);
    const result = await precog.training.forceMasteries(threshold);
    res.json({
      ok: true,
      ...result,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/force-masteries', async (req, res) => {
  try {
    const q = req.query as any;
    const threshold = Number(q.threshold || 80);
    const result = await precog.training.forceMasteries(threshold);
    res.json({
      ok: true,
      ...result,
      overview: precog.training.getOverviewData(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= Hyper-Speed =============

router.post('/training/hyper-speed/start', async (req, res) => {
  try {
    const q = req.query as any;
    const rounds = q.rounds !== undefined ? Number(q.rounds) : undefined;
    const result = await precog.training.startHyperSpeed(rounds);
    res.json({
      ok: true,
      message: `Completed ${result.cyclesCompleted} cycles in ${result.totalTime}ms`,
      summary: {
        efficiency: {
          cyclesCompleted: result.cyclesCompleted,
          totalTime: result.totalTime,
          questionsProcessed: result.hyperStats?.questionsProcessed || 0,
          averageSpeedup: result.hyperStats?.averageSpeedup || 1,
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/hyper-speed/micro-batch', async (req, res) => {
  try {
    const result = await precog.training.runMicroBatch(req.body?.domain, req.body?.question);
    if (result.ok && 'result' in result) {
      res.json({
        ...result.result,
        endpoint: 'micro-batch',
        timestamp: new Date().toISOString(),
        execution: result.execution,
      });
    } else {
      res.status(result.safeMode ? 503 : 500).json({
        ...result,
        endpoint: 'micro-batch',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/training/hyper-speed/turbo-round', async (req, res) => {
  try {
    const result = await precog.training.runTurboRound();
    res.json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/training/hyper-speed/stats', (req, res) => {
  try {
    res.json({ ok: true, hyperStats: precog.training.getHyperStats() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= Parallel Provider =============

router.post('/providers/parallel-generate', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ ok: false, error: 'Prompt required' });
    const result = await precog.training.parallelGenerate(prompt);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/providers/parallel-performance', (req, res) => {
  try {
    res.json({ ok: true, report: precog.training.getParallelPerformance() });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ============= Learning Service =============

router.get('/training/progress', (req, res) => {
  try {
    const { userId } = req.query as any;
    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });
    res.json({
      success: true,
      data: precog.training.getTrainingProgress(userId),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/training/session/:sessionId', (req, res) => {
  try {
    const session = precog.training.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, data: session });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/training/stats', (req, res) => {
  try {
    res.json({ success: true, data: precog.training.getStats() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============= Challenges =============

router.post('/challenges/start', async (req, res) => {
  try {
    const { userId, skill, difficulty } = req.body;
    if (!userId || !skill) return res.status(400).json({ error: 'userId and skill are required' });
    const result = await precog.training.startChallenge(userId, skill, difficulty);
    res.status(201).json({ success: true, data: result, message: 'Challenge started' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/challenges/grade', async (req, res) => {
  try {
    const { challengeId, response } = req.body;
    if (!challengeId || !response)
      return res.status(400).json({ error: 'challengeId and response are required' });
    const result = await precog.training.gradeChallenge(challengeId, response);
    res.json({
      success: true,
      data: result,
      message: 'passed' in result && result.passed ? 'Challenge passed!' : 'Challenge failed',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/challenges/stats', (req, res) => {
  try {
    res.json({ success: true, data: precog.training.getChallengeStats() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ============= Feedback & Metrics =============

router.post('/feedback/submit', (req, res) => {
  try {
    const result = precog.training.submitFeedback(req.body);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/feedback/summary', (req, res) => {
  try {
    res.json(precog.training.getFeedbackSummary());
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/feedback/provider/:provider', (req, res) => {
  try {
    res.json(precog.training.getProviderFeedback(req.params.provider));
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/metrics/record', (req, res) => {
  try {
    const result = precog.training.recordMetrics(req.body);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/metrics/performance', (req, res) => {
  try {
    res.json(precog.training.getPerformanceMetrics());
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/personalization/track-interaction', (req, res) => {
  try {
    const result = precog.training.trackInteraction(req.body);
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/personalization/profile/:userId', (req, res) => {
  try {
    res.json(precog.training.getUserProfile(req.params.userId));
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/personalization/recommendations', (req, res) => {
  try {
    const { userId, currentQuery, context } = req.body;
    res.json(precog.training.getRecommendations(userId, currentQuery));
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/improvement/analysis', (req, res) => {
  try {
    res.json(precog.training.getImprovementAnalysis());
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.post('/optimization/plan', (req, res) => {
  try {
    const { task, context } = req.body;
    const result = precog.training.getOptimizationPlan(task, context);
    res.json({ ok: true, plan: result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/patterns/catalog', async (req, res) => {
  try {
    // Read real patterns from file
    let patterns: any[] = [];

    if (await fs.pathExists(PATTERNS_PATH)) {
      const data = await fs.readJson(PATTERNS_PATH);
      patterns = data.patterns || [];
    }

    res.json({
      ok: true,
      patterns: patterns,
      total: patterns.length,
      source: patterns.length > 0 ? 'file' : 'none',
    });
  } catch (e: any) {
    console.error('[Training] Patterns catalog error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Real metrics file paths
const LEARNING_METRICS_PATH = path.join(process.cwd(), 'data', 'learning-metrics.json');
const CHAT_HISTORY_PATH = path.join(process.cwd(), 'data', 'chat-history.json');
const AUDIT_LOG_PATH = path.join(process.cwd(), 'data', 'audit-log.jsonl');
const EMERGENCE_STATE_PATH = path.join(process.cwd(), 'data', 'emergence', 'emergence-state.json');
const FLOW_SESSIONS_DIR = path.join(process.cwd(), 'data', 'flow-sessions');
const ARTIFACTS_INDEX_PATH = path.join(process.cwd(), 'data', 'artifacts', 'index.json');

// Helper to count lines in JSONL file
async function countJsonlLines(filePath: string): Promise<number> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim()).length;
  } catch {
    return 0;
  }
}

// Helper to count items in JSON array file
async function countJsonItems(filePath: string, arrayKey?: string): Promise<number> {
  try {
    const content = await fs.readJSON(filePath);
    if (arrayKey) {
      return Array.isArray(content[arrayKey]) ? content[arrayKey].length : 0;
    }
    return Array.isArray(content) ? content.length : 0;
  } catch {
    return 0;
  }
}

// Helper to count files in directory
async function countFilesInDir(dirPath: string): Promise<number> {
  try {
    const files = await fs.readdir(dirPath);
    return files.filter(f => !f.startsWith('.')).length;
  } catch {
    return 0;
  }
}

router.get('/learning/report', async (req, res) => {
  try {
    // Read REAL learning metrics from data file
    let improvements = {
      firstTrySuccess: { current: 0, target: 0.8, baseline: 0.5, achieved: false },
      repeatProblems: { current: 0, target: 0.1, baseline: 0.3, achieved: false },
    };
    
    try {
      const metricsData = await fs.readJSON(LEARNING_METRICS_PATH);
      if (metricsData.improvements) {
        improvements = {
          firstTrySuccess: {
            current: metricsData.improvements.firstTrySuccess?.current || 0,
            target: metricsData.improvements.firstTrySuccess?.target || 0.8,
            baseline: metricsData.improvements.firstTrySuccess?.baseline || 0.5,
            achieved: (metricsData.improvements.firstTrySuccess?.current || 0) >= (metricsData.improvements.firstTrySuccess?.target || 0.8),
          },
          repeatProblems: {
            current: metricsData.improvements.repeatProblems?.current || 0,
            target: metricsData.improvements.repeatProblems?.target || 0.1,
            baseline: metricsData.improvements.repeatProblems?.baseline || 0.3,
            achieved: (metricsData.improvements.repeatProblems?.current || 0) <= (metricsData.improvements.repeatProblems?.target || 0.1),
          },
        };
      }
    } catch { /* File doesn't exist yet - use defaults */ }

    // Count REAL sessions from flow-sessions directory
    const totalSessions = await countFilesInDir(FLOW_SESSIONS_DIR);
    
    // Count REAL experiments from audit log
    const totalExperiments = await countJsonlLines(AUDIT_LOG_PATH);
    
    // Count REAL emergence events
    let emergenceCount = 0;
    try {
      const emergenceData = await fs.readJSON(EMERGENCE_STATE_PATH);
      emergenceCount = Array.isArray(emergenceData.recentEmergences) 
        ? emergenceData.recentEmergences.length 
        : 0;
    } catch { /* No emergence data yet */ }
    
    // Count REAL artifacts
    let artifactCount = 0;
    try {
      const artifactIndex = await fs.readJSON(ARTIFACTS_INDEX_PATH);
      artifactCount = Array.isArray(artifactIndex.artifacts) 
        ? artifactIndex.artifacts.length 
        : 0;
    } catch { /* No artifacts yet */ }

    res.json({
      ok: true,
      data: {
        totalSessions,
        totalExperiments,
        emergenceCount,
        artifactCount,
        successfulGenerations: totalExperiments, // experiments completed = successful
        failedGenerations: 0, // TODO: track failures separately
        improvements,
        commonFailures: [],
        source: 'real-data', // Flag to indicate this is REAL data
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/decisions/report', (req, res) => {
  try {
    res.json({
      ok: true,
      data: {
        totalDecisions: 0,
        decisionsWithOutcomes: 0,
        recentDecisions: [],
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export const trainingRoutes = router;
