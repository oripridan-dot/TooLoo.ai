// @version 1.0.0
/**
 * Cognitive Systems API Routes
 *
 * Exposes the enhanced cognitive capabilities for visualization
 * and external integration:
 * - Meta-learning insights and velocity
 * - Agent collaboration metrics
 * - Cognitive quality assessments
 * - Real-time system intelligence
 *
 * @module nexus/routes/cognitive
 */

import { Router, Request, Response } from 'express';
import { metaLearner } from '../../cortex/cognition/meta-learner.js';
import { collaborationHub } from '../../cortex/agent/collaboration-hub.js';
import { cognitiveQualityGate } from '../../qa/validation/cognitive-quality-gate.js';

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
    const result = (metaLearner as any).recordStrategyUsage?.(
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

export default router;
