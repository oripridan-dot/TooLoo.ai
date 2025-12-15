/**
 * @file SystemSkill - Logic Layer
 * @description Backend brain for System/Settings skill
 * @version 1.0.0
 */
import type { KernelContext } from '../../kernel/types.js';
export interface SystemInput {
    action: 'get' | 'set' | 'list' | 'reset';
    setting?: string;
    value?: unknown;
}
export interface SystemOutput {
    action: string;
    success: boolean;
    data: Record<string, unknown>;
    message?: string;
}
export interface SystemSettings {
    theme: 'dark' | 'light' | 'system';
    language: string;
    defaultModel: string;
    defaultProvider: string;
    temperature: number;
    maxTokens: number;
    autoSave: boolean;
    notifications: boolean;
    soundEnabled: boolean;
    fontSize: 'small' | 'medium' | 'large';
}
export declare function systemExecute(input: SystemInput, context: KernelContext): Promise<SystemOutput>;
export declare function getSettings(): SystemSettings;
export declare function getSetting<K extends keyof SystemSettings>(key: K): SystemSettings[K];
//# sourceMappingURL=logic.d.ts.map