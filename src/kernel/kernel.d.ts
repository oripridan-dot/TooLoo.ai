/**
 * @file TooLoo.ai Skills OS - Kernel
 * @description The universal execution endpoint for skills
 * @version 1.4.0.0
 * @updated 2025-12-15
 *
 * The Kernel has ONE job: find a skill and execute it.
 * It doesn't know what "chat" is or what "coding" means.
 * It just loads the skill, validates input, runs execute(), and returns results.
 *
 * V1.3.0: Integrated Memory Cortex for session context, conversation history,
 * and persistent memory storage.
 *
 * V1.3.0: Integrated ToolExecutor for file, search, and terminal operations.
 *
 * V1.4.0: Integrated Native Engines - NO LEGACY DEPENDENCIES
 * - LearningEngine: Q-learning, rewards, feedback
 * - EvolutionEngine: A/B testing, prompt optimization
 * - EmergenceEngine: Pattern detection, synergies
 * - RoutingEngine: Provider selection, waterfall fallback
 */
import { EventEmitter } from 'events';
import type { Skill, KernelContext, SkillExecutionResult, SkillExecuteRequest } from './types.js';
import { MemoryCortex } from '@tooloo/memory';
export declare class Kernel extends EventEmitter {
    private context;
    private activeSkillId;
    private executionHistory;
    private memoryCortex;
    private toolExecutor;
    private learningEngine;
    private evolutionEngine;
    private emergenceEngine;
    private routingEngine;
    constructor();
    /**
     * Create a default kernel context
     */
    private createContext;
    /**
     * Create memory services bound to a session
     */
    private createMemoryServices;
    /**
     * Create tool services bound to a session
     */
    private createToolServices;
    /**
     * Create engine services
     * Provides access to native learning, evolution, emergence, and routing engines
     * NO LEGACY DEPENDENCIES
     */
    private createEngineServices;
    /**
     * Update the kernel context
     */
    setContext(updates: Partial<KernelContext>): void;
    /**
     * Set the current user
     */
    setUser(user: KernelContext['user']): void;
    /**
     * Set the current project
     */
    setProject(project: KernelContext['project']): void;
    /**
     * Execute a skill by ID with given input
     * This is the CORE of the Skill OS
     */
    execute<TOutput = unknown>(request: SkillExecuteRequest): Promise<SkillExecutionResult<TOutput>>;
    /**
     * Execute skill based on natural language input
     * Uses the router to find the best skill
     */
    executeIntent<TOutput = unknown>(text: string): Promise<SkillExecutionResult<TOutput>>;
    /**
     * Check if skill requirements are met
     */
    private checkRequirements;
    /**
     * Activate a skill (make it the current UI)
     */
    activate(skillId: string): Promise<void>;
    /**
     * Deactivate the current skill
     */
    deactivate(): Promise<void>;
    /**
     * Get the currently active skill
     */
    getActiveSkill(): Skill | null;
    /**
     * Simple LLM completion (skills can use this)
     * In production, this would route to actual providers
     */
    private llmComplete;
    /**
     * Streaming LLM completion
     */
    private llmStream;
    /**
     * Get direct access to the Memory Cortex
     * Use this for advanced operations not covered by context.services.memory
     */
    getMemoryCortex(): MemoryCortex;
    /**
     * Get memory system statistics
     */
    getMemoryStats(): import("@tooloo/memory").MemoryStats;
    /**
     * Create a new session (for new users/conversations)
     */
    createNewSession(userId?: string): string;
    /**
     * Switch to an existing session
     */
    switchSession(sessionId: string): boolean;
    /**
     * Initialize the kernel and all skills
     */
    boot(): Promise<void>;
    /**
     * Shutdown the kernel
     */
    shutdown(): Promise<void>;
    /**
     * Emit a typed kernel event
     */
    private emitEvent;
    /**
     * Format an error for the response
     */
    private formatError;
    /**
     * Get execution history
     */
    getHistory(): SkillExecutionResult[];
    /**
     * Get kernel stats
     */
    getStats(): {
        activeSkill: string | null;
        executionCount: number;
        registeredSkills: import("./registry.js").RegistryStats;
        sessionId: string;
        user: string | null;
    };
}
export declare class SkillNotFoundError extends Error {
    constructor(skillId: string);
}
export declare class RequirementError extends Error {
    constructor(message: string);
}
/** Global kernel instance */
export declare const kernel: Kernel;
export default kernel;
//# sourceMappingURL=kernel.d.ts.map