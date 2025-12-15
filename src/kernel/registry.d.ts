/**
 * @file TooLoo.ai Skills OS - Skill Registry
 * @description The registry that loads, stores, and manages skills
 * @version 1.1.0.0
 * @updated 2025-12-15
 *
 * The Registry is the skill database. It:
 * - Discovers skills from the filesystem
 * - Validates skill manifests
 * - Manages skill lifecycle
 * - Provides skill lookup
 */
import { EventEmitter } from 'events';
import type { Skill, SkillManifest, SkillCategory } from './types.js';
export declare class SkillRegistry extends EventEmitter {
    private skills;
    private manifests;
    private loadOrder;
    private initialized;
    constructor();
    /**
     * Register a skill in the registry
     */
    register<TInput, TOutput>(skill: Skill<TInput, TOutput>): void;
    /**
     * Unregister a skill
     */
    unregister(skillId: string): boolean;
    /**
     * Get a skill by ID
     */
    get<TInput = unknown, TOutput = unknown>(skillId: string): Skill<TInput, TOutput> | undefined;
    /**
     * Check if a skill exists
     */
    has(skillId: string): boolean;
    /**
     * Get all registered skills
     */
    getAll(): Skill[];
    /**
     * Get skills by category
     */
    getByCategory(category: SkillCategory): Skill[];
    /**
     * Get skills that match a trigger pattern
     */
    getByTrigger(text: string): Skill[];
    /**
     * Get skills sorted by classifier confidence for given input
     */
    getByConfidence(text: string): Array<{
        skill: Skill;
        confidence: number;
    }>;
    /**
     * Get skills that depend on a given skill
     */
    getDependents(skillId: string): string[];
    /**
     * Get skill IDs in load order
     */
    getLoadOrder(): string[];
    /**
     * Get registry statistics
     */
    getStats(): RegistryStats;
    /**
     * List all registered skills as manifests (for UI)
     */
    listManifests(): SkillManifest[];
    /**
     * Initialize the registry
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the registry
     */
    shutdown(): Promise<void>;
    /**
     * Clear all skills (for testing)
     */
    clear(): void;
}
export interface RegistryStats {
    total: number;
    byCategory: Record<string, number>;
    loadOrder: string[];
}
/** Global skill registry instance */
export declare const registry: SkillRegistry;
export default registry;
//# sourceMappingURL=registry.d.ts.map