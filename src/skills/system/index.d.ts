/**
 * @file SystemSkill - Skill Definition
 * @description Complete vertical slice for System/Settings
 * @version 1.0.0
 */
import { z } from 'zod';
import { type SystemInput, type SystemOutput } from './logic.js';
export declare const SystemInputSchema: z.ZodType<SystemInput>;
export declare const SystemOutputSchema: z.ZodType<SystemOutput>;
export declare const SystemSkill: import("../../kernel/types.js").Skill<SystemInput, SystemOutput>;
export default SystemSkill;
export type { SystemInput, SystemOutput } from './logic.js';
//# sourceMappingURL=index.d.ts.map