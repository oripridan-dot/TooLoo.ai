// @version 1.1.0
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

export default router;
