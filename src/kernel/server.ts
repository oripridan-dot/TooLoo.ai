/**
 * @file Synapsys Singularity - HTTP Server
 * @description The Universal Kernel Server with ONE endpoint to rule them all
 * @version 2.0.0
 *
 * SYNAPSYS SINGULARITY ARCHITECTURE
 * =================================
 * The server needs ONE route: /synapsys/invoke
 * This endpoint handles ALL skill interactions - the frontend just sends intent.
 *
 * Legacy endpoints maintained for backward compatibility:
 * - POST /synapsys/execute - Direct skill execution (deprecated)
 * - POST /synapsys/intent - Natural language routing (deprecated)
 * - GET /synapsys/skills - List available skills
 * - GET /synapsys/status - Kernel status
 */

import * as express from 'express';
import { Router, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { kernel } from './kernel.js';
import { registry } from './registry.js';
import { router as skillRouter } from './router.js';
import { SkillExecuteRequestSchema, InvokeRequestSchema, type SkillCategory } from './types.js';

// =============================================================================
// REQUEST SCHEMAS
// =============================================================================

const IntentRequestSchema = z.object({
  text: z.string().min(1),
  context: z
    .object({
      projectId: z.string().optional(),
    })
    .optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

export function createKernelRouter(): Router {
  const router = Router();

  // ===========================================================================
  // POST /synapsys/invoke - THE UNIVERSAL ENDPOINT
  // ===========================================================================
  // One endpoint to rule them all. Send intent, get data + UI instructions.
  router.post('/invoke', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();

      // Validate request
      const { intent, skillId, payload, context, stream } = InvokeRequestSchema.parse(req.body);

      // Set context if provided
      if (context?.projectId) {
        kernel.setProject({ id: context.projectId, name: '', path: '' });
      }

      // 1. Route the intent to find best matching skill
      let targetSkillId = skillId;
      let routeResult = null;

      if (!targetSkillId) {
        routeResult = skillRouter.route(intent);
        if (!routeResult.skill) {
          return res.json({
            ok: false,
            skillId: null,
            skillName: null,
            error: {
              code: 'NO_SKILL_MATCH',
              message: 'No skill capability found for this intent',
              details: { intent, alternatives: routeResult.alternatives.map((a) => a.skill.id) },
            },
            ui: { type: 'headless' },
            meta: { duration: Date.now() - startTime },
          });
        }
        targetSkillId = routeResult.skill.id;
      }

      // 2. Get the skill
      const skill = registry.get(targetSkillId);
      if (!skill) {
        return res.json({
          ok: false,
          skillId: targetSkillId,
          skillName: null,
          error: {
            code: 'SKILL_NOT_FOUND',
            message: `Skill "${targetSkillId}" not found`,
          },
          ui: { type: 'headless' },
          meta: { duration: Date.now() - startTime },
        });
      }

      // 3. Prepare input (use payload or extract from intent)
      const input = payload ?? { message: intent, raw: intent };

      // 4. Execute the skill's brain
      const result = await kernel.execute({ skillId: targetSkillId, input });

      // 5. Build the response with UI instructions
      const response = {
        ok: result.success,
        skillId: skill.id,
        skillName: skill.name,
        data: result.data,

        // UI rendering instructions for the frontend
        ui: {
          type: skill.ui.placement === 'hidden' ? ('headless' as const) : ('static' as const),
          component: skill.component,
          layout: {
            position: skill.ui.placement,
          },
        },

        // Error if any
        error: result.error,

        // Metadata
        meta: {
          duration: Date.now() - startTime,
          routing: routeResult
            ? {
                confidence: routeResult.confidence,
                matchType: routeResult.matchType,
              }
            : undefined,
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /synapsys/execute - Direct skill execution (LEGACY)
  // ---------------------------------------------------------------------------
  router.post('/execute', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const body = req.body as { skillId?: string; input?: unknown };
      if (!body.skillId) {
        return res
          .status(400)
          .json({ ok: false, error: { code: 'MISSING_SKILL_ID', message: 'skillId is required' } });
      }
      const request = { skillId: body.skillId, input: body.input ?? {} };

      // Execute the skill
      const result = await kernel.execute(request);

      // Return result
      res.json({
        ok: result.success,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // POST /synapsys/intent - Natural language routing + execution (LEGACY)
  // ---------------------------------------------------------------------------
  router.post('/intent', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text, context } = IntentRequestSchema.parse(req.body);

      // Set context if provided
      if (context?.projectId) {
        kernel.setProject({ id: context.projectId, name: '', path: '' });
      }

      // Route and execute
      const result = await kernel.executeIntent(text);

      // Include routing info
      const routeInfo = skillRouter.getLastRoute();

      res.json({
        ok: result.success,
        routing: {
          matchedSkill: routeInfo?.skill?.id ?? null,
          confidence: routeInfo?.confidence ?? 0,
          matchType: routeInfo?.matchType ?? 'none',
          alternatives:
            routeInfo?.alternatives.map((a) => ({
              id: a.skill.id,
              confidence: a.confidence,
            })) ?? [],
        },
        ...result,
      });
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // GET /synapsys/skills - List available skills
  // ---------------------------------------------------------------------------
  router.get('/skills', (_req: Request, res: Response) => {
    const manifests = registry.listManifests();
    const categories = manifests.map((m) => m.category);
    const uniqueCategories = categories.filter((v, i, a) => a.indexOf(v) === i);

    res.json({
      ok: true,
      data: {
        skills: manifests,
        total: manifests.length,
        categories: uniqueCategories,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /synapsys/skills/:id - Get specific skill info
  // ---------------------------------------------------------------------------
  router.get('/skills/:id', (req: Request, res: Response) => {
    const skill = registry.get(req.params['id']!);

    if (!skill) {
      return res.status(404).json({
        ok: false,
        error: { code: 'SKILL_NOT_FOUND', message: `Skill ${req.params['id']} not found` },
      });
    }

    res.json({
      ok: true,
      data: {
        id: skill.id,
        name: skill.name,
        version: skill.version,
        description: skill.description,
        category: skill.category,
        ui: skill.ui,
        intent: {
          triggers: skill.intent.triggers,
          priority: skill.intent.priority,
          requires: skill.intent.requires,
        },
        dependencies: skill.dependencies,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // POST /synapsys/activate - Activate a skill (UI state)
  // ---------------------------------------------------------------------------
  router.post('/activate', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { skillId } = z.object({ skillId: z.string() }).parse(req.body);

      await kernel.activate(skillId);

      const active = kernel.getActiveSkill();

      res.json({
        ok: true,
        data: {
          activeSkill: active?.id ?? null,
          component: active?.component ?? null,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // GET /synapsys/status - Kernel status
  // ---------------------------------------------------------------------------
  router.get('/status', (_req: Request, res: Response) => {
    const stats = kernel.getStats();

    res.json({
      ok: true,
      data: {
        version: '1.0.0',
        ...stats,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /synapsys/route - Preview routing without executing
  // ---------------------------------------------------------------------------
  router.get('/route', (req: Request, res: Response) => {
    const text = req.query['text'] as string;

    if (!text) {
      return res.status(400).json({
        ok: false,
        error: { code: 'MISSING_TEXT', message: 'Query parameter "text" is required' },
      });
    }

    const result = skillRouter.route(text);

    res.json({
      ok: true,
      data: {
        input: text,
        matchedSkill: result.skill?.id ?? null,
        confidence: result.confidence,
        matchType: result.matchType,
        alternatives: result.alternatives.map((a) => ({
          id: a.skill.id,
          name: a.skill.name,
          confidence: a.confidence,
        })),
        params: result.params,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // GET /synapsys/suggest - Autocomplete suggestions
  // ---------------------------------------------------------------------------
  router.get('/suggest', (req: Request, res: Response) => {
    const partial = (req.query['q'] as string) ?? '';
    const suggestions = skillRouter.getSuggestions(partial);

    res.json({
      ok: true,
      data: {
        query: partial,
        suggestions: suggestions.map((s) => ({
          skillId: s.skill.id,
          skillName: s.skill.name,
          trigger: s.trigger,
          icon: s.skill.ui.icon,
        })),
      },
    });
  });

  return router;
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

export function kernelErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Kernel Server] Error:', err);

  if (err instanceof z.ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors,
      },
    });
    return;
  }

  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
    },
  });
}

// =============================================================================
// STANDALONE SERVER (for testing)
// =============================================================================

export async function startKernelServer(port: number = 4002): Promise<void> {
  const app = express.default();

  // Enable CORS for frontend
  app.use(
    cors({
      origin: true, // Allow all origins in dev
      credentials: true,
    })
  );

  app.use(express.default.json());
  app.use('/synapsys', createKernelRouter());
  app.use(kernelErrorHandler);

  // Boot the kernel
  await kernel.boot();

  app.listen(port, () => {
    console.log(`[Kernel Server] 🚀 Running on http://localhost:${port}/synapsys`);
    console.log('[Kernel Server] Endpoints:');
    console.log('  POST /synapsys/execute   - Execute a skill directly');
    console.log('  POST /synapsys/intent    - Route + execute from natural language');
    console.log('  GET  /synapsys/skills    - List all skills');
    console.log('  GET  /synapsys/status    - Kernel status');
    console.log('  GET  /synapsys/route     - Preview routing');
    console.log('  GET  /synapsys/suggest   - Autocomplete suggestions');
  });
}

export default createKernelRouter;
