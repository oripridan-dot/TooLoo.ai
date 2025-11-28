/**
 * Cortex Feedback Routes
 * API endpoints for cortex feedback, session context, and memory management
 * Exposes services from SessionContextService, ProviderFeedbackEngine, and MemoryAutoFiller
 *
 * @version 2.2.121
 */

import { Router, Request, Response } from "express";
import { cortex } from "../../cortex/index.js";

const router = Router();

/**
 * GET /api/v1/cortex/feedback
 * Get active/used providers and their feedback metrics
 * Returns only providers starting with 'non' prefix
 */
router.get("/feedback", (_req: Request, res: Response) => {
  try {
    const providers = cortex.providerFeedbackEngine.getSerializableFeedback();
    const activeProvider = cortex.providerFeedbackEngine.getActiveProvider();

    res.json({
      ok: true,
      providers,
      activeProvider: activeProvider
        ? {
            name: activeProvider.name,
            provider: activeProvider.provider,
            status: activeProvider.status,
            isActive: activeProvider.status === "processing",
          }
        : null,
    });
  } catch (e) {
    console.error("[Cortex Routes] Feedback fetch error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch provider feedback",
    });
  }
});

/**
 * GET /api/v1/cortex/session/:sessionId
 * Get session context and highlights from current session
 */
router.get("/session/:sessionId", (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const context =
      cortex.sessionContextService.getSerializableContext(sessionId);

    res.json({
      ok: true,
      context,
    });
  } catch (e) {
    console.error("[Cortex Routes] Session context fetch error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch session context",
    });
  }
});

/**
 * GET /api/v1/cortex/memory/:sessionId
 * Get auto-filled short and long-term memory for session
 */
router.get("/memory/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Force memory update if requested
    const forceUpdate = req.query.force === "true";
    if (forceUpdate) {
      await cortex.memoryAutoFiller.forceUpdate(sessionId);
    }

    const memory = cortex.memoryAutoFiller.getSerializableMemory(sessionId);

    res.json({
      ok: true,
      memory,
    });
  } catch (e) {
    console.error("[Cortex Routes] Memory fetch error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch auto-filled memory",
    });
  }
});

/**
 * POST /api/v1/cortex/session/:sessionId/highlight
 * Manually add a highlight to session
 */
router.post("/session/:sessionId/highlight", (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { type, content, icon } = req.body;

    if (!type || !content) {
      res.status(400).json({
        ok: false,
        error: "Missing required fields: type, content",
      });
      return;
    }

    cortex.sessionContextService.addHighlight(sessionId, {
      type,
      content,
      relevanceScore: 0.8,
      icon,
    });

    res.json({
      ok: true,
      message: "Highlight added",
    });
  } catch (e) {
    console.error("[Cortex Routes] Highlight add error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to add highlight",
    });
  }
});

/**
 * POST /api/v1/cortex/session/:sessionId/goal
 * Set current session goal
 */
router.post("/session/:sessionId/goal", (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { goal } = req.body;

    if (!goal) {
      res.status(400).json({
        ok: false,
        error: "Missing required field: goal",
      });
      return;
    }

    cortex.sessionContextService.setCurrentGoal(sessionId, goal);

    res.json({
      ok: true,
      message: "Goal set",
    });
  } catch (e) {
    console.error("[Cortex Routes] Goal set error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to set goal",
    });
  }
});

/**
 * POST /api/v1/cortex/memory/:sessionId/update
 * Manually update auto-filled memory
 */
router.post(
  "/memory/:sessionId/update",
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      await cortex.memoryAutoFiller.forceUpdate(sessionId);

      const memory = cortex.memoryAutoFiller.getSerializableMemory(sessionId);

      res.json({
        ok: true,
        memory,
      });
    } catch (e) {
      console.error("[Cortex Routes] Memory update error:", e);
      res.status(500).json({
        ok: false,
        error: "Failed to update memory",
      });
    }
  },
);

/**
 * GET /api/v1/cortex/providers
 * Get all active providers (alternative endpoint)
 */
router.get("/providers", (_req: Request, res: Response) => {
  try {
    const providers = cortex.providerFeedbackEngine.getActiveProviders();

    res.json({
      ok: true,
      providers: providers.map((p) => ({
        name: p.name,
        provider: p.provider,
        status: p.status,
        callCount: p.callCount,
        successRate: p.successRate,
        avgLatencyMs: p.avgLatencyMs,
        confidenceScore: p.confidenceScore,
        lastUsed: p.lastUsed.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[Cortex Routes] Providers fetch error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to fetch providers",
    });
  }
});

/**
 * POST /api/v1/cortex/providers/reset
 * Reset provider feedback for new session
 */
router.post("/providers/reset", (_req: Request, res: Response) => {
  try {
    cortex.providerFeedbackEngine.resetSession();

    res.json({
      ok: true,
      message: "Provider session reset",
    });
  } catch (e) {
    console.error("[Cortex Routes] Provider reset error:", e);
    res.status(500).json({
      ok: false,
      error: "Failed to reset providers",
    });
  }
});

export const cortexRoutes = router;
