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
import type { Skill, SkillManifest, KernelEvent, SkillCategory } from './types.js';

// =============================================================================
// REGISTRY CLASS
// =============================================================================

export class SkillRegistry extends EventEmitter {
  private skills: Map<string, Skill> = new Map();
  private manifests: Map<string, SkillManifest> = new Map();
  private loadOrder: string[] = [];
  private initialized = false;

  constructor() {
    super();
  }

  // ---------------------------------------------------------------------------
  // Core Operations
  // ---------------------------------------------------------------------------

  /**
   * Register a skill in the registry
   */
  register<TInput, TOutput>(skill: Skill<TInput, TOutput>): void {
    if (this.skills.has(skill.id)) {
      console.warn(`[Registry] Skill ${skill.id} already registered, overwriting`);
    }

    // Validate dependencies
    if (skill.dependencies) {
      for (const dep of skill.dependencies) {
        if (!this.skills.has(dep)) {
          throw new Error(
            `[Registry] Skill ${skill.id} depends on ${dep}, which is not registered`
          );
        }
      }
    }

    this.skills.set(skill.id, skill as Skill);
    this.loadOrder.push(skill.id);

    this.emit('skill:registered', { skillId: skill.id, skill });
    console.log(`[Registry] ✅ Registered skill: ${skill.id} (${skill.name})`);
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill) return false;

    // Check if other skills depend on this one
    const dependents = this.getDependents(skillId);
    if (dependents.length > 0) {
      throw new Error(
        `[Registry] Cannot unregister ${skillId}: skills depend on it: ${dependents.join(', ')}`
      );
    }

    this.skills.delete(skillId);
    this.manifests.delete(skillId);
    this.loadOrder = this.loadOrder.filter((id) => id !== skillId);

    this.emit('skill:unregistered', { skillId });
    console.log(`[Registry] 🗑️ Unregistered skill: ${skillId}`);

    return true;
  }

  /**
   * Get a skill by ID
   */
  get<TInput = unknown, TOutput = unknown>(skillId: string): Skill<TInput, TOutput> | undefined {
    return this.skills.get(skillId) as Skill<TInput, TOutput> | undefined;
  }

  /**
   * Check if a skill exists
   */
  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  // ---------------------------------------------------------------------------
  // Query Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all registered skills
   */
  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  /**
   * Get skills by category
   */
  getByCategory(category: SkillCategory): Skill[] {
    return this.getAll().filter((skill) => skill.category === category);
  }

  /**
   * Get skills that match a trigger pattern
   */
  getByTrigger(text: string): Skill[] {
    const lowered = text.toLowerCase().trim();

    return this.getAll().filter((skill) => {
      // Check exact trigger matches
      for (const trigger of skill.intent.triggers) {
        if (lowered.startsWith(trigger.toLowerCase())) {
          return true;
        }
      }
      return false;
    });
  }

  /**
   * Get skills sorted by classifier confidence for given input
   */
  getByConfidence(text: string): Array<{ skill: Skill; confidence: number }> {
    const results: Array<{ skill: Skill; confidence: number }> = [];

    for (const skill of Array.from(this.skills.values())) {
      let confidence = 0;

      // Use classifier if available
      if (skill.intent.classifier) {
        confidence = skill.intent.classifier(text);
      } else {
        // Fallback: check triggers
        const lowered = text.toLowerCase();
        for (const trigger of skill.intent.triggers) {
          if (lowered.includes(trigger.toLowerCase())) {
            confidence = Math.max(confidence, 0.5);
          }
        }
      }

      if (confidence > 0) {
        results.push({ skill, confidence });
      }
    }

    // Sort by confidence (descending), then by priority (descending)
    return results.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      return (b.skill.intent.priority ?? 0) - (a.skill.intent.priority ?? 0);
    });
  }

  /**
   * Get skills that depend on a given skill
   */
  getDependents(skillId: string): string[] {
    const dependents: string[] = [];

    for (const skill of Array.from(this.skills.values())) {
      if (skill.dependencies?.includes(skillId)) {
        dependents.push(skill.id);
      }
    }

    return dependents;
  }

  /**
   * Get skill IDs in load order
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder];
  }

  // ---------------------------------------------------------------------------
  // Metadata
  // ---------------------------------------------------------------------------

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const byCategory: Record<string, number> = {};

    for (const skill of Array.from(this.skills.values())) {
      byCategory[skill.category] = (byCategory[skill.category] ?? 0) + 1;
    }

    return {
      total: this.skills.size,
      byCategory,
      loadOrder: this.loadOrder,
    };
  }

  /**
   * List all registered skills as manifests (for UI)
   */
  listManifests(): SkillManifest[] {
    return this.getAll().map((skill) => ({
      id: skill.id,
      name: skill.name,
      version: skill.version,
      description: skill.description,
      category: skill.category,
      entry: skill.component,
      ui: skill.ui,
      intent: {
        triggers: skill.intent.triggers,
        priority: skill.intent.priority,
      },
      dependencies: skill.dependencies,
    }));
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[Registry] Already initialized');
      return;
    }

    console.log('[Registry] 🚀 Initializing Skill Registry...');

    // Call onLoad hooks for all skills
    for (const skillId of this.loadOrder) {
      const skill = this.skills.get(skillId);
      if (skill?.hooks?.onLoad) {
        try {
          // Note: Context will be provided by the Kernel
          await skill.hooks.onLoad({} as any);
          console.log(`[Registry] Loaded skill: ${skillId}`);
        } catch (error) {
          console.error(`[Registry] Failed to load skill ${skillId}:`, error);
          this.emit('kernel:error', {
            type: 'skill:error',
            skillId,
            error,
          } as KernelEvent);
        }
      }
    }

    this.initialized = true;
    this.emit('kernel:ready');
    console.log(`[Registry] ✅ Ready with ${this.skills.size} skills`);
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    console.log('[Registry] 🛑 Shutting down...');

    // Call onUnload hooks in reverse order
    const reversed = [...this.loadOrder].reverse();

    for (const skillId of reversed) {
      const skill = this.skills.get(skillId);
      if (skill?.hooks?.onUnload) {
        try {
          await skill.hooks.onUnload();
        } catch (error) {
          console.error(`[Registry] Error unloading skill ${skillId}:`, error);
        }
      }
    }

    this.skills.clear();
    this.manifests.clear();
    this.loadOrder = [];
    this.initialized = false;

    console.log('[Registry] ✅ Shutdown complete');
  }

  /**
   * Clear all skills (for testing)
   */
  clear(): void {
    this.skills.clear();
    this.manifests.clear();
    this.loadOrder = [];
    this.initialized = false;
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface RegistryStats {
  total: number;
  byCategory: Record<string, number>;
  loadOrder: string[];
}

// =============================================================================
// SINGLETON
// =============================================================================

/** Global skill registry instance */
export const registry = new SkillRegistry();

export default registry;
