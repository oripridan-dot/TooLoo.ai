/**
 * @file Skills Index
 * @description Auto-registers all built-in skills
 * @version 1.0.0
 *
 * This file imports and registers all skills with the kernel.
 * Add new skills here to make them available.
 */
import { registry } from '../kernel/registry.js';
// Built-in skills
import { ChatSkill } from './chat/index.js';
import { SystemSkill } from './system/index.js';
// =============================================================================
// SKILL MANIFEST
// =============================================================================
export const BUILT_IN_SKILLS = [ChatSkill, SystemSkill];
// =============================================================================
// AUTO-REGISTRATION
// =============================================================================
/**
 * Register all built-in skills with the kernel
 */
export function registerBuiltInSkills() {
    console.log('[Skills] Registering built-in skills...');
    for (const skill of BUILT_IN_SKILLS) {
        try {
            // Cast to Skill to allow different input/output types
            registry.register(skill);
        }
        catch (error) {
            console.error(`[Skills] Failed to register ${skill.id}:`, error);
        }
    }
    console.log(`[Skills] ✅ Registered ${BUILT_IN_SKILLS.length} skills`);
}
// =============================================================================
// EXPORTS
// =============================================================================
export { ChatSkill } from './chat/index.js';
export { SystemSkill } from './system/index.js';
//# sourceMappingURL=index.js.map