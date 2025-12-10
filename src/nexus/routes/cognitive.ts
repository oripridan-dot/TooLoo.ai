// @version 1.2.0
/**
 * Cognitive Systems API Routes
 *
 * Exposes the enhanced cognitive capabilities for visualization
 * and external integration:
 * - Meta-learning insights and velocity
 * - Agent collaboration metrics
 * - Cognitive quality assessments
 * - Real-time system intelligence
 * - V1.1.0: Provider execution learning, knowledge boost, synapsys activation
 * - V1.2.0: Shadow Lab experimentation, Neural Optimizer, Evolution Engine stats
 *
 * @module nexus/routes/cognitive
 */

import { Router, Request, Response } from 'express';
import { metaLearner } from '../../cortex/cognition/meta-learner.js';
import { collaborationHub } from '../../cortex/agent/collaboration-hub.js';
import { cognitiveQualityGate } from '../../qa/validation/cognitive-quality-gate.js';
// V1.1.0: Enhanced cognitive systems
import { synapsysActivator } from '../../cortex/system-activator.js';
import { providerExecutionLearner } from '../../cortex/learning/provider-execution-learner.js';
import { knowledgeBoostEngine } from '../../cortex/learning/knowledge-boost.js';
import { responseFormatter } from '../../shared/response-formatter.js';
// Phase 2: Self-Optimization
import { getRuntimeConfig, getBenchmarkService } from '../../precog/engine/index.js';
import { getUserModelEngine } from '../../precog/index.js';

const router = Router();

// ============================================================================
// META-LEARNING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/meta/state
 * Get complete meta-learning state
 */
router.get('/meta/state', async (_req: Request, res: Response) => {
  try {
    const state = metaLearner.getStateSnapshot();
    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/meta/velocity
 * Get learning velocity metrics
 */
router.get('/meta/velocity', async (_req: Request, res: Response) => {
  try {
    const velocity = metaLearner.getLearningVelocity();
    res.json({
      success: true,
      data: velocity,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/meta/strategies
 * Get learning strategy effectiveness
 */
router.get('/meta/strategies', async (_req: Request, res: Response) => {
  try {
    const strategies = metaLearner.getStrategies();
    res.json({
      success: true,
      data: strategies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/meta/insights
 * Get recent learning insights
 */
router.get('/meta/insights', async (_req: Request, res: Response) => {
  try {
    const insights = metaLearner.getInsightHistory();
    res.json({
      success: true,
      data: insights,
      count: insights.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/meta/emergence
 * Get emergence patterns
 */
router.get('/meta/emergence', async (_req: Request, res: Response) => {
  try {
    const patterns = metaLearner.getEmergencePatterns();
    res.json({
      success: true,
      data: patterns,
      count: patterns.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/meta/cognitive-load
 * Get current cognitive load metrics
 */
router.get('/meta/cognitive-load', async (_req: Request, res: Response) => {
  try {
    const load = metaLearner.getCognitiveLoad();
    res.json({
      success: true,
      data: load,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/meta/analyze
 * Trigger manual meta-analysis
 */
router.post('/meta/analyze', async (_req: Request, res: Response) => {
  try {
    await metaLearner.triggerAnalysis();
    const state = metaLearner.getStateSnapshot();
    res.json({
      success: true,
      message: 'Analysis triggered successfully',
      data: {
        cycle: state.selfImprovementCycles,
        velocity: state.velocity,
        lastAnalysis: state.lastAnalysis,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/meta/record-strategy
 * Record strategy effectiveness for learning
 */
router.post('/meta/record-strategy', async (req: Request, res: Response) => {
  try {
    const { strategyId, domain, success, metrics } = req.body;

    // Record the strategy result in the meta-learner
    const metaLearnerWithRecord = metaLearner as {
      recordStrategyUsage?: (
        id: string,
        dom: string,
        succ: boolean,
        met: Record<string, unknown>
      ) => unknown;
    };
    const result = metaLearnerWithRecord.recordStrategyUsage?.(
      strategyId || 'unknown',
      domain || 'general',
      success ?? true,
      metrics || {}
    );

    // Also publish to event bus for learning system integration
    const { bus } = await import('../../core/event-bus.js');
    bus.publish('nexus', 'strategy:recorded', {
      strategyId,
      domain,
      success,
      metrics,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Strategy recorded for learning',
      data: {
        strategyId,
        domain,
        recorded: true,
        result,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// COLLABORATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/collaboration/metrics
 * Get collaboration metrics
 */
router.get('/collaboration/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = collaborationHub.getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/collaboration/agents
 * Get registered agents
 */
router.get('/collaboration/agents', async (_req: Request, res: Response) => {
  try {
    const agents = collaborationHub.getRegisteredAgents();
    res.json({
      success: true,
      data: agents,
      count: agents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/collaboration/knowledge
 * Get shared knowledge pool
 */
router.get('/collaboration/knowledge', async (_req: Request, res: Response) => {
  try {
    const domain = (_req.query['domain'] as string) || undefined;
    const limit = parseInt(_req.query['limit'] as string) || 20;

    const knowledge = domain
      ? collaborationHub.getRelevantKnowledge(domain, limit)
      : collaborationHub.getAllKnowledge().slice(-limit);

    res.json({
      success: true,
      data: knowledge,
      count: knowledge.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/collaboration/messages
 * Get agent messages
 */
router.get('/collaboration/messages', async (_req: Request, res: Response) => {
  try {
    const agentId = (_req.query['agentId'] as string) || undefined;
    const limit = parseInt(_req.query['limit'] as string) || 50;

    const messages = collaborationHub.getMessages(agentId, limit);
    res.json({
      success: true,
      data: messages,
      count: messages.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/collaboration/recommend-team
 * Get team recommendation for a task
 */
router.post('/collaboration/recommend-team', async (req: Request, res: Response) => {
  try {
    const { taskType, requiredCapabilities } = req.body;

    if (!taskType || !requiredCapabilities) {
      return res.status(400).json({
        success: false,
        error: 'taskType and requiredCapabilities are required',
      });
    }

    const recommendation = collaborationHub.recommendTeam(taskType, requiredCapabilities);
    res.json({
      success: true,
      data: recommendation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/collaboration/share-knowledge
 * Share knowledge to the collaboration hub
 */
router.post('/collaboration/share-knowledge', async (req: Request, res: Response) => {
  try {
    const { agentId, domain, content, confidence } = req.body;

    if (!agentId || !domain || !content) {
      return res.status(400).json({
        success: false,
        error: 'agentId, domain, and content are required',
      });
    }

    const knowledgeId = collaborationHub.shareKnowledge(
      agentId,
      domain,
      content,
      confidence || 0.7
    );

    res.json({
      success: true,
      message: 'Knowledge shared successfully',
      data: {
        knowledgeId,
        agentId,
        domain,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/collaboration/send-message
 * Send a message between agents
 */
router.post('/collaboration/send-message', async (req: Request, res: Response) => {
  try {
    const { fromAgentId, toAgentId, type, content, priority, payload } = req.body;

    if (!fromAgentId || !toAgentId || !content) {
      return res.status(400).json({
        success: false,
        error: 'fromAgentId, toAgentId, and content are required',
      });
    }

    // Map simple types to valid message types
    const validTypes = [
      'knowledge_share',
      'task_request',
      'validation_request',
      'insight',
      'warning',
    ];
    const messageType = validTypes.includes(type) ? type : 'insight';

    // Map priority levels
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const messagePriority = validPriorities.includes(priority) ? priority : 'medium';

    const messageId = collaborationHub.sendMessage({
      fromAgentId,
      toAgentId,
      type: messageType,
      payload: payload || { content },
      priority: messagePriority,
    });

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId,
        fromAgentId,
        toAgentId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// QUALITY GATE ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/quality/config
 * Get quality gate configuration
 */
router.get('/quality/config', async (_req: Request, res: Response) => {
  try {
    const config = cognitiveQualityGate.getConfig();
    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/quality/trends
 * Get quality trends
 */
router.get('/quality/trends', async (_req: Request, res: Response) => {
  try {
    const trends = cognitiveQualityGate.getQualityTrends();
    const passRate = cognitiveQualityGate.getPassRate();

    res.json({
      success: true,
      data: {
        trends,
        passRate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/quality/assessments
 * Get recent quality assessments
 */
router.get('/quality/assessments', async (_req: Request, res: Response) => {
  try {
    const limit = parseInt(_req.query['limit'] as string) || 50;
    const assessments = cognitiveQualityGate.getAssessmentHistory(limit);

    res.json({
      success: true,
      data: assessments,
      count: assessments.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/quality/assess
 * Run quality assessment on content
 */
router.post('/quality/assess', async (req: Request, res: Response) => {
  try {
    const { taskId, content, context, options } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content is required',
      });
    }

    const assessment = await cognitiveQualityGate.assessQuality(
      taskId || `task-${Date.now()}`,
      content,
      context,
      options
    );

    res.json({
      success: true,
      data: assessment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// UNIFIED DASHBOARD ENDPOINT
// ============================================================================

/**
 * GET /api/v1/cognitive/dashboard
 * Get unified cognitive dashboard data
 */
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const metaState = metaLearner.getStateSnapshot();
    const collabMetrics = collaborationHub.getMetrics();
    const qualityTrends = cognitiveQualityGate.getQualityTrends();
    const passRate = cognitiveQualityGate.getPassRate();
    const insights = metaLearner.getInsightHistory().slice(-5);

    res.json({
      success: true,
      data: {
        meta: {
          velocity: metaState.velocity,
          cognitiveLoad: metaState.cognitiveLoad,
          selfImprovementCycles: metaState.selfImprovementCycles,
          emergencePatterns: metaState.emergencePatterns.slice(-3),
        },
        collaboration: {
          metrics: collabMetrics,
          agentCount: collaborationHub.getRegisteredAgents().length,
        },
        quality: {
          trends: qualityTrends,
          passRate,
          config: cognitiveQualityGate.getConfig(),
        },
        recentInsights: insights,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// SYNAPSYS COGNITIVE SYSTEMS (V1.1.0)
// ============================================================================

/**
 * GET /api/v1/cognitive/synapsys/status
 * Get Synapsys cognitive systems activation status
 */
router.get('/synapsys/status', (_req: Request, res: Response) => {
  try {
    const state = synapsysActivator.getState();
    res.json({
      success: true,
      data: {
        initialized: state.initialized,
        overallHealth: state.overallHealth,
        systems: state.systems,
        activatedAt: state.activatedAt,
        lastHealthCheck: state.lastHealthCheck,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/synapsys/activate
 * Activate all Synapsys cognitive systems
 */
router.post('/synapsys/activate', async (_req: Request, res: Response) => {
  try {
    const state = await synapsysActivator.activate();
    res.json({
      success: true,
      data: { message: 'Synapsys cognitive systems activated', state },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/synapsys/metrics
 * Get all learning metrics from Synapsys
 */
router.get('/synapsys/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = synapsysActivator.getLearningMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// PROVIDER EXECUTION LEARNING ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/providers/profiles
 * Get all provider execution profiles with learned patterns
 */
router.get('/providers/profiles', (_req: Request, res: Response) => {
  try {
    const profiles = providerExecutionLearner.getAllProfiles();
    res.json({
      success: true,
      data: { profiles },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/providers/profile/:providerId
 * Get specific provider execution profile
 */
router.get('/providers/profile/:providerId', (req: Request, res: Response) => {
  try {
    const providerId = req.params['providerId'];
    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: 'Provider ID is required',
      });
    }
    const profile = providerExecutionLearner.getProviderProfile(providerId);
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found',
      });
    }
    res.json({
      success: true,
      data: { profile },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/providers/strategies
 * Get all learned execution strategies
 */
router.get('/providers/strategies', (_req: Request, res: Response) => {
  try {
    const strategies = providerExecutionLearner.getStrategies();
    res.json({
      success: true,
      data: { strategies },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/providers/insights
 * Get recent learning insights
 */
router.get('/providers/insights', (req: Request, res: Response) => {
  try {
    const limitParam = req.query['limit'];
    const limit = typeof limitParam === 'string' ? parseInt(limitParam) || 20 : 20;
    const insights = providerExecutionLearner.getRecentInsights(limit);
    res.json({
      success: true,
      data: { insights },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/providers/stats
 * Get provider execution statistics
 */
router.get('/providers/stats', (_req: Request, res: Response) => {
  try {
    const stats = providerExecutionLearner.getExecutionStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/providers/recommend
 * Get best provider recommendation for a task
 */
router.get('/providers/recommend', (req: Request, res: Response) => {
  try {
    const taskTypeParam = req.query['taskType'];
    const availableParam = req.query['available'];
    const taskType = typeof taskTypeParam === 'string' ? taskTypeParam : 'general';
    const available =
      typeof availableParam === 'string'
        ? availableParam.split(',')
        : ['deepseek', 'anthropic', 'openai', 'gemini'];
    const best = providerExecutionLearner.getBestProvider(taskType, available);
    res.json({
      success: true,
      data: {
        taskType,
        recommendedProvider: best,
        availableProviders: available,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// KNOWLEDGE BOOST ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/boost/metrics
 * Get knowledge boost metrics
 */
router.get('/boost/metrics', (_req: Request, res: Response) => {
  try {
    const metrics = knowledgeBoostEngine.getMetrics();
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/boost/active
 * Get active boost sessions
 */
router.get('/boost/active', (_req: Request, res: Response) => {
  try {
    const sessions = knowledgeBoostEngine.getActiveBoosts();
    res.json({
      success: true,
      data: { sessions },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/boost/start
 * Start a knowledge boost session
 */
router.post('/boost/start', async (req: Request, res: Response) => {
  try {
    const { type = 'velocity', intensity = 1.0, durationMinutes = 10 } = req.body;

    const validTypes = [
      'velocity',
      'retention',
      'transfer',
      'depth',
      'breadth',
      'consolidation',
      'repair',
    ];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid boost type. Valid types: ${validTypes.join(', ')}`,
      });
    }

    const session = await knowledgeBoostEngine.quickBoost(type, intensity, durationMinutes);
    res.json({
      success: true,
      data: { message: `${type} boost activated`, session },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/boost/end/:sessionId
 * End a boost session
 */
router.post('/boost/end/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params['sessionId'];
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
    }
    await knowledgeBoostEngine.endBoost(sessionId, 'completed');
    res.json({
      success: true,
      data: { message: 'Boost session ended' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/boost/knowledge
 * Get knowledge nodes
 */
router.get('/boost/knowledge', (req: Request, res: Response) => {
  try {
    const domainParam = req.query['domain'];
    const domain = typeof domainParam === 'string' ? domainParam : undefined;
    const nodes = knowledgeBoostEngine.getKnowledgeNodes(domain);
    res.json({
      success: true,
      data: {
        count: nodes.length,
        nodes: nodes.slice(0, 100), // Limit response size
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/boost/health
 * Get domain health
 */
router.get('/boost/health', (_req: Request, res: Response) => {
  try {
    const health = knowledgeBoostEngine.getDomainHealth();
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/boost/reinforce
 * Reinforce a knowledge node
 */
router.post('/boost/reinforce', (req: Request, res: Response) => {
  try {
    const { nodeId, amount = 0.1 } = req.body;
    if (!nodeId) {
      return res.status(400).json({
        success: false,
        error: 'nodeId required',
      });
    }
    knowledgeBoostEngine.reinforceNode(nodeId, amount);
    res.json({
      success: true,
      data: { message: `Node ${nodeId} reinforced by ${amount}` },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/cognitive/boost/exercises
 * Get pending learning exercises
 */
router.get('/boost/exercises', (_req: Request, res: Response) => {
  try {
    const exercises = knowledgeBoostEngine.getPendingExercises();
    res.json({
      success: true,
      data: { exercises },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/boost/exercise/complete
 * Complete a learning exercise
 */
router.post('/boost/exercise/complete', async (req: Request, res: Response) => {
  try {
    const { exerciseId, score } = req.body;
    if (!exerciseId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'exerciseId and score required',
      });
    }
    await knowledgeBoostEngine.completeExercise(exerciseId, score);
    res.json({
      success: true,
      data: { message: 'Exercise completed' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// RESPONSE FORMATTING ENDPOINT
// ============================================================================

/**
 * POST /api/v1/cognitive/format
 * Format a response with intelligent structuring
 */
router.post('/format', (req: Request, res: Response) => {
  try {
    const { content, context, userMessage: _userMessage } = req.body;
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'content required',
      });
    }

    const formatted = responseFormatter.format(content, { context });
    res.json({
      success: true,
      data: {
        formatted,
        markdown: responseFormatter.toMarkdown(formatted),
        html: responseFormatter.toHTML(formatted),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/cognitive/global-boost
 * Trigger a global system boost
 */
router.post('/global-boost', async (req: Request, res: Response) => {
  try {
    const { type = 'velocity' } = req.body;
    await synapsysActivator.boost(type);
    res.json({
      success: true,
      data: { message: `Global ${type} boost activated` },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================================================
// NEURAL ROUTER ENDPOINTS (Emergent Model Routing)
// ============================================================================

import { modelChooser } from '../../precog/engine/model-chooser.js';
import { dynamicModelRegistry } from '../../precog/engine/model-registry-dynamic.js';
// V1.2.0: Shadow Lab and Neural Evolution systems
import { shadowLab } from '../../precog/engine/shadow-lab.js';
import { neuralLearningOptimizer } from '../../precog/engine/neural-learning-optimizer.js';
import { autonomousEvolutionEngine } from '../../precog/engine/autonomous-evolution-engine.js';

/**
 * POST /api/v1/cognitive/router/feedback
 * Records user feedback/outcome for neural router learning
 *
 * This is the primary learning endpoint that feeds outcomes back
 * into the Knowledge Graph for adaptive routing improvement.
 */
router.post('/router/feedback', async (req: Request, res: Response) => {
  try {
    const { intentId, modelUsed, outcome, features: providedFeatures } = req.body;

    // Validate required fields
    if (!modelUsed) {
      return res.status(400).json({
        success: false,
        error: 'modelUsed is required',
      });
    }

    if (!outcome || typeof outcome.success !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'outcome object with success boolean is required',
      });
    }

    // Normalize outcome data
    const normalizedOutcome = {
      success: outcome.success,
      rating:
        typeof outcome.rating === 'number'
          ? Math.min(1, Math.max(0, outcome.rating <= 5 ? outcome.rating / 5 : outcome.rating))
          : outcome.success
            ? 0.7
            : 0.3,
      latency: outcome.latency || 2000,
      quality: outcome.quality,
      cost: outcome.cost,
    };

    // Use provided features or default to general
    const features = providedFeatures || ['general'];

    // Feed into the Dynamic Registry via ModelChooser
    await modelChooser.recordOutcome(features, modelUsed, normalizedOutcome);

    console.log(
      `[Router Feedback] ✅ Recorded: ${modelUsed} (success: ${outcome.success}, rating: ${normalizedOutcome.rating.toFixed(2)})`
    );

    res.json({
      success: true,
      data: {
        status: 'learned',
        updated: true,
        intentId,
        modelUsed,
        normalizedOutcome,
        features,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Router Feedback] Learning failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Learning failed',
    });
  }
});

/**
 * POST /api/v1/cognitive/router/select
 * Get model recommendation for an intent (routing decision)
 */
router.post('/router/select', async (req: Request, res: Response) => {
  try {
    const { prompt, taskType, features: providedFeatures, context, sessionId } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required',
      });
    }

    const plan = await modelChooser.selectRecipeForIntent({
      originalPrompt: prompt,
      taskType,
      features: providedFeatures,
      context,
      sessionId,
      requestId: `route-${Date.now()}`,
    });

    res.json({
      success: true,
      data: {
        plan,
        isRecipe: plan.type === 'recipe',
        recommendedModel: plan.model,
        lane: plan.lane,
        confidence: plan.confidence,
        steps: plan.steps,
        shadowTestEnabled: plan.shadowTest,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Routing failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/router/recommendations
 * Get model recommendations for specific features/domain
 */
router.get('/router/recommendations', async (req: Request, res: Response) => {
  try {
    const featuresParam = req.query['features'];
    const budgetParam = req.query['budget'];

    const features =
      typeof featuresParam === 'string'
        ? featuresParam.split(',').map((f) => f.trim())
        : ['general'];

    const budget =
      typeof budgetParam === 'string' && ['low', 'medium', 'high'].includes(budgetParam)
        ? (budgetParam as 'low' | 'medium' | 'high')
        : 'medium';

    const result = await dynamicModelRegistry.getRecommendationsWithContext(features, budget);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Recommendations failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/router/stats
 * Get neural router statistics including shadow test results
 */
router.get('/router/stats', (_req: Request, res: Response) => {
  try {
    const stats = modelChooser.getRoutingStats();
    const shadowHistory = modelChooser.getShadowTestHistory();

    res.json({
      success: true,
      data: {
        ...stats,
        recentShadowTests: shadowHistory.slice(-10), // Last 10 shadow tests
        shadowTestWinRate:
          stats.shadowTests > 0
            ? ((stats.challengerWins / stats.shadowTests) * 100).toFixed(1) + '%'
            : 'N/A',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Stats retrieval failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/router/registry
 * Get the current state of the dynamic model registry
 */
router.get('/router/registry', (_req: Request, res: Response) => {
  try {
    const state = dynamicModelRegistry.getRegistryState();

    res.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registry state retrieval failed',
    });
  }
});

/**
 * POST /api/v1/cognitive/router/configure
 * Update router configuration (shadow testing, recipes, etc.)
 */
router.post('/router/configure', (req: Request, res: Response) => {
  try {
    const { budgetTier, shadowTestRate, enableRecipes, enableShadowTesting } = req.body;

    const config: Record<string, any> = {};
    if (budgetTier && ['low', 'medium', 'high'].includes(budgetTier)) {
      config['budgetTier'] = budgetTier;
    }
    if (typeof shadowTestRate === 'number' && shadowTestRate >= 0 && shadowTestRate <= 1) {
      config['shadowTestRate'] = shadowTestRate;
    }
    if (typeof enableRecipes === 'boolean') {
      config['enableRecipes'] = enableRecipes;
    }
    if (typeof enableShadowTesting === 'boolean') {
      config['enableShadowTesting'] = enableShadowTesting;
    }

    if (Object.keys(config).length > 0) {
      modelChooser.updateConfig(config);
    }

    res.json({
      success: true,
      data: {
        message: 'Configuration updated',
        appliedConfig: config,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Configuration update failed',
    });
  }
});

// ============================================================================
// SHADOW LAB ENDPOINTS (Background Experimentation)
// ============================================================================

/**
 * GET /api/v1/cognitive/shadow/status
 * Get Shadow Lab status including experiment stats and configuration
 */
router.get('/shadow/status', (_req: Request, res: Response) => {
  try {
    const status = shadowLab.getStatus();

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Shadow Lab status failed',
    });
  }
});

/**
 * POST /api/v1/cognitive/shadow/configure
 * Update Shadow Lab configuration
 */
router.post('/shadow/configure', (req: Request, res: Response) => {
  try {
    const { enabled, experimentRate, maxConcurrent, minPromptLength, cooldownMs } = req.body;

    const config: Record<string, any> = {};
    if (typeof enabled === 'boolean') {
      shadowLab.setEnabled(enabled);
    }
    if (typeof experimentRate === 'number' && experimentRate >= 0 && experimentRate <= 1) {
      config['experimentRate'] = experimentRate;
    }
    if (typeof maxConcurrent === 'number' && maxConcurrent >= 1 && maxConcurrent <= 10) {
      config['maxConcurrent'] = maxConcurrent;
    }
    if (typeof minPromptLength === 'number' && minPromptLength >= 10) {
      config['minPromptLength'] = minPromptLength;
    }
    if (typeof cooldownMs === 'number' && cooldownMs >= 0) {
      config['cooldownMs'] = cooldownMs;
    }

    if (Object.keys(config).length > 0) {
      shadowLab.updateConfig(config);
    }

    res.json({
      success: true,
      data: {
        message: 'Shadow Lab configuration updated',
        appliedConfig: config,
        enabled: typeof enabled === 'boolean' ? enabled : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Configuration update failed',
    });
  }
});

/**
 * POST /api/v1/cognitive/shadow/experiment
 * Manually trigger a shadow experiment
 */
router.post('/shadow/experiment', async (req: Request, res: Response) => {
  try {
    const { prompt, domain, primaryModel } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'prompt is required',
      });
    }

    const experiment = await shadowLab.manualExperiment({
      prompt,
      domain: domain || 'general',
      primaryModel,
    });

    res.json({
      success: true,
      data: {
        experimentId: experiment.id,
        primary: {
          model: experiment.primary.model,
          latency: experiment.primary.latency,
          quality: experiment.primary.quality,
        },
        challenger: {
          model: experiment.challenger.model,
          latency: experiment.challenger.latency,
          quality: experiment.challenger.quality,
        },
        judgment: experiment.judgment,
        status: experiment.status,
        duration: experiment.completedAt
          ? experiment.completedAt - experiment.startedAt
          : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Experiment failed',
    });
  }
});

// ============================================================================
// NEURAL OPTIMIZER ENDPOINTS (Q-Learning Strategy Selection)
// ============================================================================

/**
 * GET /api/v1/cognitive/optimizer/state
 * Get Neural Learning Optimizer state including Q-table and strategy
 */
router.get('/optimizer/state', (_req: Request, res: Response) => {
  try {
    const status = neuralLearningOptimizer.getStatus();

    res.json({
      success: true,
      data: {
        currentState: status.state,
        config: status.config,
        qTableSize: status.qTableSize,
        recentActions: status.recentActions,
        topStrategies: status.topStrategies,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Optimizer state failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/optimizer/strategy
 * Get current learning strategy and recent performance
 */
router.get('/optimizer/strategy', (_req: Request, res: Response) => {
  try {
    const status = neuralLearningOptimizer.getStatus();
    const topStrategy = status.topStrategies[0]?.strategy || 'gradient_ascent';

    res.json({
      success: true,
      data: {
        currentStrategy: topStrategy,
        explorationRate: status.config.explorationRate,
        strategyRanking: status.topStrategies,
        totalQEntries: status.qTableSize,
        recentActionCount: status.recentActions,
        learningParams: {
          learningRate: status.config.learningRate,
          discountFactor: status.config.discountFactor,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Strategy retrieval failed',
    });
  }
});

// ============================================================================
// AUTONOMOUS EVOLUTION ENGINE ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/cognitive/evolution/state
 * Get Evolution Engine state including knowledge graph and improvement opportunities
 */
router.get('/evolution/state', (_req: Request, res: Response) => {
  try {
    const status = autonomousEvolutionEngine.getEvolutionStatus();

    res.json({
      success: true,
      data: {
        metrics: status.metrics,
        providers: status.providers,
        opportunitiesCount: status.opportunities.length,
        modificationsCount: status.modifications.length,
        leapsCount: status.leaps.length,
        autonomousMode: status.autonomousMode,
        interactionCount: status.interactionCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Evolution state failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/evolution/opportunities
 * Get current improvement opportunities identified by the engine
 */
router.get('/evolution/opportunities', (_req: Request, res: Response) => {
  try {
    const status = autonomousEvolutionEngine.getEvolutionStatus();

    res.json({
      success: true,
      data: {
        count: status.opportunities.length,
        opportunities: status.opportunities.map((op) => ({
          type: op.type,
          priority: op.priority,
          description: op.description,
          estimatedImpact: op.estimatedImpact,
          status: op.status,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Opportunities retrieval failed',
    });
  }
});

/**
 * POST /api/v1/cognitive/evolution/cycle
 * Manually trigger an evolution cycle (analyze for improvement opportunities)
 */
router.post('/evolution/cycle', async (req: Request, res: Response) => {
  try {
    const result = await autonomousEvolutionEngine.forceEvolution();

    res.json({
      success: true,
      data: {
        cycleCompleted: true,
        newOpportunities: result.opportunities.length,
        suggestedModifications: result.modifications.length,
        opportunities: result.opportunities,
        modifications: result.modifications,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Evolution cycle failed',
    });
  }
});

/**
 * GET /api/v1/cognitive/synaptic-bridge
 * Get unified view of the entire Synaptic Bridge system
 * (Router + Optimizer + Evolution + Shadow Lab)
 */
router.get('/synaptic-bridge', (_req: Request, res: Response) => {
  try {
    const routerStats = modelChooser.getRoutingStats();
    const optimizerStatus = neuralLearningOptimizer.getStatus();
    const evolutionStatus = autonomousEvolutionEngine.getEvolutionStatus();
    const shadowStatus = shadowLab.getStatus();

    res.json({
      success: true,
      data: {
        overview: {
          systemHealth: 'active',
          learningMode: routerStats.currentStrategy,
          autonomousEvolution: evolutionStatus.autonomousMode,
          shadowTestsActive: shadowStatus.runningCount > 0,
        },
        router: {
          shadowTests: routerStats.shadowTests,
          challengerWins: routerStats.challengerWins,
          shadowWinRate:
            routerStats.shadowTests > 0
              ? ((routerStats.challengerWins / routerStats.shadowTests) * 100).toFixed(1) + '%'
              : 'N/A',
          currentStrategy: routerStats.currentStrategy,
        },
        optimizer: {
          explorationRate: optimizerStatus.config.explorationRate,
          qTableSize: optimizerStatus.qTableSize,
          topStrategies: optimizerStatus.topStrategies.slice(0, 3),
          recentActions: optimizerStatus.recentActions,
        },
        evolution: {
          interactionCount: evolutionStatus.interactionCount,
          pendingOpportunities: evolutionStatus.opportunities.length,
          providerCount: Object.keys(evolutionStatus.providers).length,
          metrics: evolutionStatus.metrics,
        },
        shadowLab: {
          enabled: shadowStatus.enabled,
          experimentRate: shadowStatus.config.experimentRate,
          totalExperiments: shadowStatus.totalExperiments,
          runningNow: shadowStatus.runningCount,
          recentResults: shadowStatus.recentResults.slice(-5),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Synaptic Bridge status failed',
    });
  }
});

// Phase 4: GET /api/v1/cognitive/system/real-metrics
// Wire UI to Real Metrics - ProviderScorecard live data
// Returns live, in-memory provider performance stats for dashboard visualization
router.get('/system/real-metrics', async (_req: Request, res: Response) => {
  try {
    const { getSmartRouter } = await import('../../precog/engine/index.js');
    const smartRouter = getSmartRouter();

    if (!smartRouter) {
      return res.json({
        success: false,
        error: 'SmartRouter not initialized',
        providers: {},
      });
    }

    const scorecard = smartRouter.getScorecard();
    const rankings = smartRouter.getProviderRankings();
    const report = scorecard.getReport();

    // Transform to dashboard-friendly format
    const providerMetrics = Object.entries(report).reduce((acc: any, [provider, data]: any) => {
      acc[provider] = {
        rank: rankings.find((r: any) => r.provider === provider)?.rank || 0,
        latency: data.avgLatency,
        successRate: data.successRate,
        errorRate: data.errorRate,
        requests: data.requests,
        score: data.score,
        recommendation: data.recommendation,
        status:
          data.score < 0.3
            ? 'healthy'
            : data.score < 0.6
              ? 'good'
              : data.score < 0.8
                ? 'degraded'
                : 'unhealthy',
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        bestProvider: rankings[0]?.provider || null,
        providers: providerMetrics,
        rankings: rankings.map((r: any) => ({
          rank: r.rank,
          provider: r.provider,
          score: r.score,
          recommendation: r.recommendation,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch real metrics',
    });
  }
});

// Phase 2: Runtime Configuration Endpoint
router.get('/system/runtime-config', (_req, res) => {
  try {
    const config = getRuntimeConfig();

    res.json({
      success: true,
      data: config.getConfig(),
      metadata: config.getMetadata(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch runtime config',
    });
  }
});

// Phase 2: Update Runtime Configuration (for optimization engines)
router.post('/system/runtime-config', (req, res) => {
  try {
    const config = getRuntimeConfig();

    const { weights, modelConfig, features, explorationRate } = req.body;

    if (weights) {
      config.updateProviderWeights(weights, 'api-client');
    }
    if (modelConfig) {
      config.updateModelConfig(modelConfig, undefined, 'api-client');
    }
    if (features) {
      Object.entries(features).forEach(([featureName, enabled]: [string, any]) => {
        config.setFeature(featureName, enabled, 'api-client');
      });
    }
    if (explorationRate !== undefined) {
      config.setExplorationRate(explorationRate, 'api-client');
    }

    // Flush to disk
    config.save();

    res.json({
      success: true,
      message: 'Runtime config updated',
      data: config.getConfig(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update runtime config',
    });
  }
});

// Phase 2: Benchmark Results Endpoint
router.get('/system/benchmark-results', (_req, res) => {
  try {
    const benchmarkService = getBenchmarkService();

    const latest = benchmarkService.getLatestResults();
    const history = benchmarkService.getHistory(10);

    res.json({
      success: true,
      data: {
        latest,
        history,
        totalRounds: history.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch benchmark results',
    });
  }
});

// Phase 3: User Segmentation Endpoints
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userModel = getUserModelEngine();
    const profile = await userModel.getUserProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user profile',
    });
  }
});

router.get('/users/:userId/segment', async (req, res) => {
  try {
    const { userId } = req.params;
    const userModel = getUserModelEngine();
    const profile = await userModel.getUserProfile(userId);

    res.json({
      success: true,
      data: {
        segment: profile.segment,
        confidence: profile.stats.segmentConfidence,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user segment',
    });
  }
});

export default router;
