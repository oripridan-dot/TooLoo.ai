/**
 * @file Skills Index
 * @description Auto-registers all built-in skills
 * @version 1.0.0
 *
 * This file imports and registers all skills with the kernel.
 * Add new skills here to make them available.
 */
import type { Skill } from '../kernel/types.js';
export declare const BUILT_IN_SKILLS: readonly [Skill<import("./chat/logic.js").ChatInput, import("./chat/logic.js").ChatOutput>, Skill<import("./system/logic.js").SystemInput, import("./system/logic.js").SystemOutput>];
/**
 * Register all built-in skills with the kernel
 */
export declare function registerBuiltInSkills(): void;
export { ChatSkill } from './chat/index.js';
export { SystemSkill } from './system/index.js';
export type { ChatInput, ChatOutput, ChatMessage } from './chat/index.js';
export type { SystemInput, SystemOutput } from './system/index.js';
//# sourceMappingURL=index.d.ts.map