/**
 * @file SystemSkill - Skill Definition
 * @description Complete vertical slice for System/Settings
 * @version 1.0.0
 */
import { z } from 'zod';
import { defineSkill, defaultClassifiers } from '../../kernel/index.js';
import { systemExecute } from './logic.js';
// =============================================================================
// SCHEMAS
// =============================================================================
export const SystemInputSchema = z.object({
    action: z.enum(['get', 'set', 'list', 'reset']),
    setting: z.string().optional(),
    value: z.unknown().optional(),
});
export const SystemOutputSchema = z.object({
    action: z.string(),
    success: z.boolean(),
    data: z.record(z.string(), z.unknown()),
    message: z.string().optional(),
});
// =============================================================================
// SKILL DEFINITION
// =============================================================================
export const SystemSkill = defineSkill({
    id: 'core.system',
    name: 'Settings',
    description: 'System configuration and preferences',
    version: '1.0.0',
    category: 'system',
    intent: {
        triggers: [
            '/settings',
            '/config',
            '/preferences',
            '/system',
            'settings',
            'configure',
            'preferences',
        ],
        classifier: defaultClassifiers.system,
        priority: 5,
        requires: {
            auth: false,
        },
    },
    schema: SystemInputSchema,
    outputSchema: SystemOutputSchema,
    execute: systemExecute,
    ui: {
        icon: 'settings',
        placement: 'sidebar',
        shortcut: 'Alt+,',
    },
    component: 'skills/system/ui',
    hooks: {
        onLoad: async (_context) => {
            console.log('[SystemSkill] Loaded');
            // context.services may not be available during initial load
        },
        onActivate: async (_context) => {
            console.log('[SystemSkill] Activated');
        },
    },
});
export default SystemSkill;
//# sourceMappingURL=index.js.map