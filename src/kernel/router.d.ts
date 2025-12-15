/**
 * @file TooLoo.ai Skills OS - Intent Router
 * @description Routes user input to the appropriate skill based on intent
 * @version 1.1.0.0
 * @updated 2025-12-15
 *
 * The Router analyzes input and determines which skill should handle it.
 * It uses:
 * - Trigger matching (commands like /chat, /code)
 * - Semantic classification (natural language understanding)
 * - Context awareness (what's the user doing?)
 */
import type { Skill, KernelContext } from './types.js';
export interface RouteResult {
    /** The matched skill, if any */
    skill: Skill | null;
    /** Confidence score 0-1 */
    confidence: number;
    /** How the skill was matched */
    matchType: 'trigger' | 'classifier' | 'default' | 'none';
    /** Alternative skills that could handle this */
    alternatives: Array<{
        skill: Skill;
        confidence: number;
    }>;
    /** Extracted parameters from the input */
    params?: Record<string, string>;
}
export interface RouterConfig {
    /** Minimum confidence threshold to activate a skill */
    minConfidence: number;
    /** Default skill to use when nothing matches */
    defaultSkillId?: string;
    /** Enable semantic classification */
    useClassifier: boolean;
    /** Max alternatives to return */
    maxAlternatives: number;
}
export declare class SkillRouter {
    private config;
    private lastRoute;
    constructor(config?: Partial<RouterConfig>);
    /**
     * Route input text to the best matching skill
     */
    route(input: string, context?: KernelContext): RouteResult;
    /**
     * Match input against skill triggers (commands)
     */
    private matchTrigger;
    /**
     * Match input using semantic classifiers
     */
    private matchClassifier;
    /**
     * Extract parameters from command input
     * e.g., "/code typescript function add" => { language: "typescript", query: "function add" }
     */
    private extractParams;
    /**
     * Get the last routing result
     */
    getLastRoute(): RouteResult | null;
    /**
     * Force route to a specific skill
     */
    forceRoute(skillId: string): RouteResult;
    /**
     * Get suggested skills for partial input (autocomplete)
     */
    getSuggestions(partialInput: string): Array<{
        skill: Skill;
        trigger: string;
    }>;
    /**
     * Check if input would activate a specific skill
     */
    wouldActivate(input: string, skillId: string): boolean;
    /**
     * Update router configuration
     */
    configure(config: Partial<RouterConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): RouterConfig;
}
/**
 * Simple keyword-based classifier for common intents
 */
export declare function createKeywordClassifier(keywords: Record<string, string[]>): (text: string) => {
    intent: string;
    confidence: number;
} | null;
/**
 * Built-in classifiers for common skill types
 */
export declare const defaultClassifiers: {
    chat: (text: string) => number;
    coding: (text: string) => number;
    system: (text: string) => number;
};
/** Global router instance */
export declare const router: SkillRouter;
export default router;
//# sourceMappingURL=router.d.ts.map