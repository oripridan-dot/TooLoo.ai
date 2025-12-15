/**
 * @file Synapsys Singularity - Core Types
 * @description The DNA of the Skill Operating System
 * @version 2.1.0
 *
 * SYNAPSYS SINGULARITY ARCHITECTURE
 * =================================
 * A Skill is a FULL-STACK ATOM containing:
 * - Brain (Backend Logic) - Runs in the Nucleus
 * - Face (Frontend UI) - Runs in the Browser
 * - Memory (Data Schema) - Persisted state
 *
 * The App becomes nothing more than a Skill Loader.
 *
 * V2.1.0 ADDITIONS:
 * - Native Engines (learning, evolution, emergence, routing)
 * - No legacy dependencies - all engines are Skills OS native
 */
import { z } from 'zod';
/**
 * Type-safe skill creator helper
 */
export function defineSkill(skill) {
    return skill;
}
// =============================================================================
// SCHEMAS
// =============================================================================
/** Zod schema for SkillExecuteRequest validation */
export const SkillExecuteRequestSchema = z.object({
    skillId: z.string().min(1),
    input: z.unknown(),
    context: z
        .object({
        sessionId: z.string().optional(),
        projectId: z.string().optional(),
    })
        .optional(),
});
/** Zod schema for SkillManifest validation */
export const SkillManifestSchema = z.object({
    id: z.string().regex(/^[a-z]+\.[a-z-]+$/),
    name: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    description: z.string(),
    category: z.enum(['core', 'coding', 'ai', 'integration', 'ui', 'system', 'plugin']),
    entry: z.string(),
    ui: z.object({
        icon: z.string(),
        placement: z.enum(['main', 'sidebar', 'modal', 'floating', 'hidden']),
        shortcut: z.string().optional(),
    }),
    intent: z.object({
        triggers: z.array(z.string()),
        priority: z.number().optional(),
    }),
    dependencies: z.array(z.string()).optional(),
});
/**
 * Helper function to define a unified skill with full type inference
 */
export function defineUnifiedSkill(skill) {
    return skill;
}
/** Zod schema for InvokeRequest validation */
export const InvokeRequestSchema = z.object({
    intent: z.string().min(1),
    skillId: z.string().optional(),
    payload: z.unknown().optional(),
    context: z
        .object({
        sessionId: z.string().optional(),
        userId: z.string().optional(),
        conversationId: z.string().optional(),
        projectId: z.string().optional(),
    })
        .optional(),
    stream: z.boolean().optional(),
});
// =============================================================================
// CONVERSION UTILITIES
// =============================================================================
/**
 * Convert legacy Skill to UnifiedSkill format
 */
export function toUnifiedSkill(legacy) {
    return {
        id: legacy.id,
        name: legacy.name,
        version: legacy.version,
        description: legacy.description,
        category: legacy.category,
        icon: legacy.ui.icon,
        brain: {
            triggers: legacy.intent.triggers,
            inputSchema: legacy.schema,
            outputSchema: (legacy.outputSchema ?? z.unknown()),
            handler: async (ctx, input) => legacy.execute(input, ctx),
            classifier: legacy.intent.classifier,
        },
        face: {
            type: legacy.component ? 'static' : 'headless',
            component: legacy.component,
            layout: {
                position: legacy.ui.placement,
            },
        },
        requires: legacy.intent.requires,
        dependencies: legacy.dependencies,
        onLoad: legacy.hooks?.onLoad,
        onUnload: legacy.hooks?.onUnload,
        onActivate: legacy.hooks?.onActivate,
        onDeactivate: legacy.hooks?.onDeactivate,
    };
}
//# sourceMappingURL=types.js.map