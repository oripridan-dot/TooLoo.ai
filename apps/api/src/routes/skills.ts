/**
 * @tooloo/api - Skills Routes
 * Skill management endpoints
 * 
 * @version 2.0.1 - Wired to actual skill registry
 */

import { Router, type Request, type Response } from 'express';
import type { SkillRegistry, SkillDefinition } from '@tooloo/skills';
import type { APIResponse, SkillSummary } from '../types.js';

interface SkillsRouterOptions {
  skillRegistry?: SkillRegistry;
}

export function createSkillsRouter(options: SkillsRouterOptions = {}): Router {
  const router = Router();
  const { skillRegistry } = options;

  /**
   * GET /skills
   * List all registered skills
   */
  router.get('/', (_req: Request, res: Response) => {
    let skills: SkillSummary[];

    // Use actual registry if available
    if (skillRegistry) {
      const allSkills = skillRegistry.getAll();
      skills = allSkills.map((skill: SkillDefinition) => ({
        id: skill.id,
        name: skill.name,
        description: skill.description,
        version: skill.version,
        enabled: true,
        triggers: skill.triggers,
        icon: (skill as any).icon,
      }));
    } else {
      // Fallback hardcoded skills
      skills = [
        {
          id: 'default-chat',
          name: 'Default Chat',
          description: 'General conversational assistant',
          version: '1.0.0',
          enabled: true,
          triggers: {
            intents: ['chat', 'unknown'],
            keywords: [],
          },
        },
        {
          id: 'code-generator',
          name: 'Code Generator',
          description: 'Generate code from natural language descriptions',
          version: '1.0.0',
          enabled: true,
          triggers: {
            intents: ['code', 'create'],
            keywords: ['write', 'create', 'implement', 'function', 'class'],
          },
        },
        {
          id: 'code-analyzer',
          name: 'Code Analyzer',
          description: 'Analyze and explain code',
          version: '1.0.0',
          enabled: true,
          triggers: {
            intents: ['analyze', 'explain'],
            keywords: ['analyze', 'explain', 'review', 'understand'],
          },
        },
      ];
    }

    const response: APIResponse<SkillSummary[]> = {
      ok: true,
      data: skills,
    };

    res.json(response);
  });

  /**
   * GET /skills/:skillId
   * Get details for a specific skill
   */
  router.get('/:skillId', (req: Request, res: Response) => {
    const { skillId } = req.params;

    if (skillRegistry) {
      const allSkills = skillRegistry.getAll();
      const skill = allSkills.find((s: SkillDefinition) => s.id === skillId);
      
      if (skill) {
        const response: APIResponse<SkillSummary> = {
          ok: true,
          data: {
            id: skill.id,
            name: skill.name,
            description: skill.description,
            version: skill.version,
            enabled: true,
            triggers: skill.triggers,
            icon: (skill as any).icon,
          },
        };
        res.json(response);
        return;
      }
    }

    const response: APIResponse = {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: `Skill not found: ${skillId}`,
      },
    };

    res.status(404).json(response);
  });

  /**
   * POST /skills/:skillId/enable
   * Enable a skill
   */
  router.post('/:skillId/enable', (req: Request, res: Response) => {
    const { skillId } = req.params;

    // TODO: Wire to @tooloo/skills registry
    const response: APIResponse<{ skillId: string; enabled: boolean }> = {
      ok: true,
      data: {
        skillId: skillId!,
        enabled: true,
      },
    };

    res.json(response);
  });

  /**
   * POST /skills/:skillId/disable
   * Disable a skill
   */
  router.post('/:skillId/disable', (req: Request, res: Response) => {
    const { skillId } = req.params;

    // TODO: Wire to @tooloo/skills registry
    const response: APIResponse<{ skillId: string; enabled: boolean }> = {
      ok: true,
      data: {
        skillId: skillId!,
        enabled: false,
      },
    };

    res.json(response);
  });

  /**
   * POST /skills/reload
   * Reload skills from disk
   */
  router.post('/reload', (_req: Request, res: Response) => {
    // TODO: Wire to @tooloo/skills loader
    const response: APIResponse<{ reloaded: number }> = {
      ok: true,
      data: {
        reloaded: 0,
      },
    };

    res.json(response);
  });

  return router;
}
