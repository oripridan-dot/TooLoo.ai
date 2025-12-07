// @version 3.3.283
// TooLoo Flow API Routes
// Unified thinking and creation endpoints

import { Router, Request, Response } from 'express';
import { flowSessionManager } from '../../cortex/flow/index.js';
import { FlowPhase, DimensionType, DIMENSION_TEMPLATES } from '../../cortex/flow/types.js';

const router = Router();

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

// List all sessions
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const sessions = await flowSessionManager.listSessions();
    res.json({
      ok: true,
      sessions: sessions.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        phase: s.phase,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        decisionCount: s.decisions.length,
        artifactCount: s.artifacts.length,
      })),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Create new session
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ ok: false, error: 'Name is required' });
    }
    const session = await flowSessionManager.createSession(name, description);
    res.json({ ok: true, session });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get session by ID
router.get('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params['id'];
    if (!id) return res.status(400).json({ ok: false, error: 'ID required' });
    
    const session = await flowSessionManager.getSession(id);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    res.json({ ok: true, session });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get active session
router.get('/sessions/active', async (req: Request, res: Response) => {
  try {
    const session = await flowSessionManager.getActiveSession();
    res.json({ ok: true, session });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Set active session
router.post('/sessions/:id/activate', async (req: Request, res: Response) => {
  try {
    await flowSessionManager.setActiveSession(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Delete session
router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    await flowSessionManager.deleteSession(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// MESSAGES & CONVERSATION
// ============================================================================

// Add user message
router.post('/sessions/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content, nodeId } = req.body;
    if (!content) {
      return res.status(400).json({ ok: false, error: 'Content is required' });
    }
    const message = await flowSessionManager.addUserMessage(req.params.id, content, nodeId);
    res.json({ ok: true, message });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Add TooLoo response (called by AI processing)
router.post('/sessions/:id/responses', async (req: Request, res: Response) => {
  try {
    const { response, nodeId } = req.body;
    if (!response) {
      return res.status(400).json({ ok: false, error: 'Response is required' });
    }
    const message = await flowSessionManager.addToolooResponse(req.params.id, response, nodeId);
    res.json({ ok: true, message });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// BRANCHING & EXPLORATION
// ============================================================================

// Create branch from node
router.post('/sessions/:id/branches', async (req: Request, res: Response) => {
  try {
    const { parentNodeId, label, reason } = req.body;
    if (!parentNodeId || !label) {
      return res.status(400).json({ ok: false, error: 'parentNodeId and label are required' });
    }
    const branch = await flowSessionManager.createBranch(
      req.params.id,
      parentNodeId,
      label,
      reason || ''
    );
    res.json({ ok: true, branch });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// OPTIONS & DECISIONS
// ============================================================================

// Collect an option
router.post('/sessions/:id/collect', async (req: Request, res: Response) => {
  try {
    const { optionId, nodeId } = req.body;
    if (!optionId || !nodeId) {
      return res.status(400).json({ ok: false, error: 'optionId and nodeId are required' });
    }
    const decision = await flowSessionManager.collectOption(req.params.id, optionId, nodeId);
    res.json({ ok: true, decision });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Dismiss an option
router.post('/sessions/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { optionId, nodeId, reason } = req.body;
    if (!optionId || !nodeId) {
      return res.status(400).json({ ok: false, error: 'optionId and nodeId are required' });
    }
    await flowSessionManager.dismissOption(req.params.id, optionId, nodeId, reason || 'No reason given');
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get all decisions for session
router.get('/sessions/:id/decisions', async (req: Request, res: Response) => {
  try {
    const session = await flowSessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    res.json({ ok: true, decisions: session.decisions });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// PHASE MANAGEMENT
// ============================================================================

// Set phase
router.post('/sessions/:id/phase', async (req: Request, res: Response) => {
  try {
    const { phase } = req.body;
    if (!phase) {
      return res.status(400).json({ ok: false, error: 'Phase is required' });
    }
    await flowSessionManager.setPhase(req.params.id, phase as FlowPhase);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get suggested next phase
router.get('/sessions/:id/suggest-phase', async (req: Request, res: Response) => {
  try {
    const suggestion = await flowSessionManager.suggestNextPhase(req.params.id);
    res.json({ ok: true, suggestion });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// QA HANDOFF
// ============================================================================

// Hand off to QA
router.post('/sessions/:id/qa/handoff', async (req: Request, res: Response) => {
  try {
    const handoff = await flowSessionManager.handoffToQA(req.params.id);
    res.json({ ok: true, handoff });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Update QA status
router.post('/sessions/:id/qa/status', async (req: Request, res: Response) => {
  try {
    const { status, results, feedback } = req.body;
    if (!status) {
      return res.status(400).json({ ok: false, error: 'Status is required' });
    }
    await flowSessionManager.updateQAStatus(req.params.id, status, results, feedback);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// CONTEXT & DIMENSIONS
// ============================================================================

// Get AI context for session
router.get('/sessions/:id/context', async (req: Request, res: Response) => {
  try {
    const session = await flowSessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    const context = flowSessionManager.buildContextForAI(session);
    res.json({ ok: true, context });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get readiness status
router.get('/sessions/:id/readiness', async (req: Request, res: Response) => {
  try {
    const session = await flowSessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    res.json({ ok: true, readiness: session.readiness });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get dimension templates
router.get('/dimensions', async (req: Request, res: Response) => {
  try {
    const dimensions = Object.entries(DIMENSION_TEMPLATES).map(([type, template]) => ({
      type,
      ...template,
    }));
    res.json({ ok: true, dimensions });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// Get specific dimension template
router.get('/dimensions/:type', async (req: Request, res: Response) => {
  try {
    const template = DIMENSION_TEMPLATES[req.params.type as DimensionType];
    if (!template) {
      return res.status(404).json({ ok: false, error: 'Dimension not found' });
    }
    res.json({ ok: true, dimension: { type: req.params.type, ...template } });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

// ============================================================================
// KNOWLEDGE
// ============================================================================

// Get extended knowledge
router.get('/sessions/:id/knowledge', async (req: Request, res: Response) => {
  try {
    const session = await flowSessionManager.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }
    res.json({ ok: true, knowledge: session.knowledge });
  } catch (error) {
    res.status(500).json({ ok: false, error: String(error) });
  }
});

export default router;
