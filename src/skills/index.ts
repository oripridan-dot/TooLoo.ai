/**
 * @file Skills Index
 * @description Auto-registers all built-in skills
 * @version 1.3.0
 *
 * This file imports and registers all skills with the kernel.
 * Add new skills here to make them available.
 */

import { registry } from '../kernel/registry.js';
import type { Skill } from '../kernel/types.js';

// Built-in skills
import { ChatSkill } from './chat/index.js';
import { SystemSkill } from './system/index.js';
import { learningSkill } from './learning/index.js';
import { skillEvolutionSkill } from './evolution/index.js';
import { emergenceSkill } from './emergence/index.js';
import { codeImplementationSkill, rollbackSkill } from './codeImplementation.js';

// =============================================================================
// SKILL MANIFEST
// =============================================================================

export const BUILT_IN_SKILLS = [
  ChatSkill,
  SystemSkill,
  learningSkill,
  skillEvolutionSkill,
  emergenceSkill,
  codeImplementationSkill,
  rollbackSkill,
] as const;

// =============================================================================
// AUTO-REGISTRATION
// =============================================================================

/**
 * Register all built-in skills with the kernel
 */
export function registerBuiltInSkills(): void {
  console.log('[Skills] Registering built-in skills...');

  for (const skill of BUILT_IN_SKILLS) {
    try {
      // Cast to Skill to allow different input/output types
      registry.register(skill as unknown as Skill);
    } catch (error) {
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
export { learningSkill } from './learning/index.js';
export { skillEvolutionSkill } from './evolution/index.js';
export { emergenceSkill } from './emergence/index.js';
export { codeImplementationSkill, rollbackSkill } from './codeImplementation.js';
export { createSkillEngineService } from './engine-service.js';

// Export all skill types
export type { ChatInput, ChatOutput, ChatMessage } from './chat/index.js';
export type { SystemInput, SystemOutput } from './system/index.js';
export type { LearningOutput } from './learning/index.js';
export type { EvolutionOutput } from './evolution/index.js';
export type { EmergenceOutput } from './emergence/index.js';
