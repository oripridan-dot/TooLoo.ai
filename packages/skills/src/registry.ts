/**
 * @tooloo/skills - Skill Registry
 * Central registry for loading, storing, and matching skills
 * 
 * @version 2.0.0-alpha.0
 */

import { eventBus, type Intent, type SkillId, createSkillId } from '@tooloo/core';
import type { 
  SkillDefinition, 
  SkillState, 
  SkillMatch, 
  ComposedSkills,
  SkillContextConfig,
  SkillModelRequirements,
  ToolRef,
} from './types.js';
import { SkillDefinitionSchema } from './types.js';

// =============================================================================
// SKILL REGISTRY
// =============================================================================

/**
 * SkillRegistry - Central management for all skills
 * 
 * Features:
 * - Load skills from definitions
 * - Match skills based on intent/keywords
 * - Compose multiple skills
 * - Hot-reload support
 */
export class SkillRegistry {
  private skills: Map<SkillId, SkillState> = new Map();
  private keywordIndex: Map<string, Set<SkillId>> = new Map();
  private intentIndex: Map<string, Set<SkillId>> = new Map();

  constructor() {
    // Initialize indexes
    this.rebuildIndexes();
  }

  // ===========================================================================
  // SKILL REGISTRATION
  // ===========================================================================

  /**
   * Register a skill definition
   */
  register(definition: SkillDefinition, filePath?: string): void {
    // Validate the definition
    const result = SkillDefinitionSchema.safeParse(definition);
    if (!result.success) {
      const error = `Invalid skill definition: ${result.error.message}`;
      console.error(error);
      throw new Error(error);
    }

    const skillId = createSkillId(definition.id);
    const state: SkillState = {
      definition,
      loadedAt: new Date(),
      filePath,
      enabled: true,
      usageCount: 0,
      errors: [],
    };

    this.skills.set(skillId, state);
    this.indexSkill(skillId, definition);

    eventBus.publish('skills', 'skill:loaded', {
      skillId: definition.id,
      name: definition.name,
    });
  }

  /**
   * Unregister a skill
   */
  unregister(skillId: string, reason: string = 'manual'): boolean {
    const id = createSkillId(skillId);
    const state = this.skills.get(id);
    
    if (!state) {
      return false;
    }

    this.skills.delete(id);
    this.removeFromIndexes(id);

    eventBus.publish('skills', 'skill:unloaded', {
      skillId,
      reason,
    });

    return true;
  }

  /**
   * Get a skill by ID
   */
  get(skillId: string): SkillDefinition | undefined {
    const id = createSkillId(skillId);
    return this.skills.get(id)?.definition;
  }

  /**
   * Get all registered skills
   */
  getAll(): SkillDefinition[] {
    return Array.from(this.skills.values())
      .filter((s) => s.enabled)
      .map((s) => s.definition);
  }

  /**
   * Enable/disable a skill
   */
  setEnabled(skillId: string, enabled: boolean): boolean {
    const id = createSkillId(skillId);
    const state = this.skills.get(id);
    
    if (!state) {
      return false;
    }

    state.enabled = enabled;
    return true;
  }

  // ===========================================================================
  // SKILL MATCHING
  // ===========================================================================

  /**
   * Match skills based on intent and message content
   */
  matchSkills(
    intent: Intent,
    message: string,
    options: {
      maxResults?: number;
      minScore?: number;
    } = {}
  ): SkillMatch[] {
    const { maxResults = 5, minScore = 0.3 } = options;
    const matches: SkillMatch[] = [];
    const messageLower = message.toLowerCase();
    const messageWords = new Set(messageLower.split(/\s+/));

    for (const [_skillId, state] of this.skills) {
      if (!state.enabled) continue;

      const skill = state.definition;
      let score = 0;
      const matchedIntents: Intent['type'][] = [];
      const matchedKeywords: string[] = [];
      const matchedPatterns: string[] = [];

      // Match intents
      if (skill.triggers.intents.includes(intent.type)) {
        score += 0.4 * intent.confidence;
        matchedIntents.push(intent.type);
      }

      // Match keywords
      for (const keyword of skill.triggers.keywords) {
        const keywordLower = keyword.toLowerCase();
        if (messageLower.includes(keywordLower) || messageWords.has(keywordLower)) {
          score += 0.15;
          matchedKeywords.push(keyword);
        }
      }

      // Match patterns
      if (skill.triggers.patterns) {
        for (const pattern of skill.triggers.patterns) {
          try {
            const regex = new RegExp(pattern, 'i');
            if (regex.test(message)) {
              score += 0.2;
              matchedPatterns.push(pattern);
            }
          } catch {
            // Invalid regex, skip
          }
        }
      }

      // Check minimum confidence threshold
      const minConfidence = skill.triggers.minConfidence ?? 0;
      if (intent.confidence < minConfidence) {
        score *= 0.5;  // Penalize but don't exclude
      }

      // Cap score at 1.0
      score = Math.min(score, 1.0);

      if (score >= minScore) {
        matches.push({
          skill,
          score,
          matchedTriggers: {
            intents: matchedIntents,
            keywords: matchedKeywords,
            patterns: matchedPatterns,
          },
          reason: this.buildMatchReason(matchedIntents, matchedKeywords, matchedPatterns),
        });
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Return top N
    return matches.slice(0, maxResults);
  }

  /**
   * Build human-readable match reason
   */
  private buildMatchReason(
    intents: Intent['type'][],
    keywords: string[],
    patterns: string[]
  ): string {
    const parts: string[] = [];
    
    if (intents.length > 0) {
      parts.push(`intent: ${intents.join(', ')}`);
    }
    if (keywords.length > 0) {
      parts.push(`keywords: ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '...' : ''}`);
    }
    if (patterns.length > 0) {
      parts.push(`patterns: ${patterns.length} matched`);
    }

    return parts.length > 0 ? `Matched by ${parts.join('; ')}` : 'Low-confidence match';
  }

  // ===========================================================================
  // SKILL COMPOSITION
  // ===========================================================================

  /**
   * Compose multiple skills into a single prompt
   */
  composeSkills(skillIds: string[]): ComposedSkills {
    const skills: SkillDefinition[] = [];
    
    // Collect skills and check composability
    for (const skillId of skillIds) {
      const skill = this.get(skillId);
      if (skill) {
        skills.push(skill);
      }
    }

    // Check for conflicts
    const conflicts = this.findConflicts(skills);
    if (conflicts.length > 0) {
      console.warn(`Skill conflicts detected: ${conflicts.join(', ')}`);
      // Remove conflicting skills (keep higher priority)
      const prioritized = this.resolveConflicts(skills);
      skills.length = 0;
      skills.push(...prioritized);
    }

    // Check for missing requirements
    const missing = this.findMissingRequirements(skills);
    if (missing.length > 0) {
      console.warn(`Missing required skills: ${missing.join(', ')}`);
    }

    // Sort by priority
    skills.sort((a, b) => (b.composability.priority ?? 0) - (a.composability.priority ?? 0));

    // Merge instructions
    const instructions = this.mergeInstructions(skills);

    // Merge tools (deduplicate)
    const tools = this.mergeTools(skills);

    // Merge context config (use highest values)
    const context = this.mergeContextConfig(skills);

    // Merge model requirements
    const modelRequirements = this.mergeModelRequirements(skills);

    const composed: ComposedSkills = {
      skillIds: skills.map((s) => s.id),
      instructions,
      tools,
      context,
      modelRequirements,
    };

    // Track usage
    for (const skill of skills) {
      const state = this.skills.get(createSkillId(skill.id));
      if (state) {
        state.usageCount++;
        state.lastUsed = new Date();
      }
    }

    eventBus.publish('skills', 'skill:composed', {
      skillIds: composed.skillIds,
      promptLength: instructions.length,
    });

    return composed;
  }

  /**
   * Merge instructions from multiple skills
   */
  private mergeInstructions(skills: SkillDefinition[]): string {
    if (skills.length === 0) return '';
    if (skills.length === 1) return skills[0]!.instructions;

    const parts = [
      '# Combined Skill Instructions\n',
      'You have been activated with multiple specialized skills. Apply them as appropriate:\n',
    ];

    for (const skill of skills) {
      parts.push(`\n## ${skill.name} (v${skill.version})\n`);
      parts.push(`${skill.description}\n\n`);
      parts.push(skill.instructions);
      parts.push('\n');
    }

    return parts.join('');
  }

  /**
   * Merge tools from multiple skills (deduplicate by name)
   */
  private mergeTools(skills: SkillDefinition[]): ToolRef[] {
    const toolMap = new Map<string, ToolRef>();
    
    for (const skill of skills) {
      for (const tool of skill.tools) {
        if (!toolMap.has(tool.name)) {
          toolMap.set(tool.name, tool);
        }
      }
    }

    return Array.from(toolMap.values());
  }

  /**
   * Merge context configs (use highest values)
   */
  private mergeContextConfig(skills: SkillDefinition[]): SkillContextConfig {
    const ragSources = new Set<SkillContextConfig['ragSources'][number]>();
    let maxTokens = 0;
    let memoryScope: SkillContextConfig['memoryScope'] = 'session';
    let includeHistory = false;
    let maxHistoryMessages = 0;

    const scopePriority = { session: 1, project: 2, global: 3 };

    for (const skill of skills) {
      const ctx = skill.context;
      
      maxTokens = Math.max(maxTokens, ctx.maxTokens);
      
      for (const source of ctx.ragSources) {
        ragSources.add(source);
      }
      
      if (scopePriority[ctx.memoryScope] > scopePriority[memoryScope]) {
        memoryScope = ctx.memoryScope;
      }

      if (ctx.includeHistory) includeHistory = true;
      if (ctx.maxHistoryMessages) {
        maxHistoryMessages = Math.max(maxHistoryMessages, ctx.maxHistoryMessages);
      }
    }

    return {
      maxTokens: maxTokens || 32000,
      ragSources: Array.from(ragSources),
      memoryScope,
      includeHistory,
      maxHistoryMessages: maxHistoryMessages || undefined,
    };
  }

  /**
   * Merge model requirements
   */
  private mergeModelRequirements(skills: SkillDefinition[]): SkillModelRequirements {
    const capabilities = new Set<'coding' | 'reasoning' | 'creative' | 'vision' | 'analysis'>();
    let minContext = 0;
    const preferredProviders: string[] = [];

    for (const skill of skills) {
      const req = skill.modelRequirements;
      if (!req) continue;

      if (req.minContext) {
        minContext = Math.max(minContext, req.minContext);
      }
      
      if (req.capabilities) {
        for (const cap of req.capabilities) {
          capabilities.add(cap);
        }
      }

      if (req.preferredProviders) {
        for (const provider of req.preferredProviders) {
          if (!preferredProviders.includes(provider)) {
            preferredProviders.push(provider);
          }
        }
      }
    }

    return {
      minContext: minContext || undefined,
      capabilities: capabilities.size > 0 ? Array.from(capabilities) : undefined,
      preferredProviders: preferredProviders.length > 0 ? preferredProviders : undefined,
    };
  }

  /**
   * Find conflicts between skills
   */
  private findConflicts(skills: SkillDefinition[]): string[] {
    const conflicts: string[] = [];
    const skillIds = new Set(skills.map((s) => s.id));

    for (const skill of skills) {
      for (const conflictId of skill.composability.conflicts) {
        if (skillIds.has(conflictId as SkillId)) {
          conflicts.push(`${skill.id} conflicts with ${conflictId}`);
        }
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflicts by keeping higher priority skills
   */
  private resolveConflicts(skills: SkillDefinition[]): SkillDefinition[] {
    const prioritized = [...skills].sort(
      (a, b) => (b.composability.priority ?? 0) - (a.composability.priority ?? 0)
    );

    const result: SkillDefinition[] = [];
    const included = new Set<string>();

    for (const skill of prioritized) {
      // Check if any conflict is already included
      const hasConflict = skill.composability.conflicts.some((c) => included.has(c));
      
      if (!hasConflict) {
        result.push(skill);
        included.add(skill.id);
      }
    }

    return result;
  }

  /**
   * Find missing required skills
   */
  private findMissingRequirements(skills: SkillDefinition[]): string[] {
    const skillIds = new Set(skills.map((s) => s.id));
    const missing: string[] = [];

    for (const skill of skills) {
      for (const reqId of skill.composability.requires) {
        if (!skillIds.has(reqId as SkillId)) {
          missing.push(`${skill.id} requires ${reqId}`);
        }
      }
    }

    return missing;
  }

  // ===========================================================================
  // INDEXING
  // ===========================================================================

  /**
   * Index a skill for fast lookup
   */
  private indexSkill(skillId: SkillId, skill: SkillDefinition): void {
    // Index by keywords
    for (const keyword of skill.triggers.keywords) {
      const lower = keyword.toLowerCase();
      let set = this.keywordIndex.get(lower);
      if (!set) {
        set = new Set();
        this.keywordIndex.set(lower, set);
      }
      set.add(skillId);
    }

    // Index by intents
    for (const intent of skill.triggers.intents) {
      let set = this.intentIndex.get(intent);
      if (!set) {
        set = new Set();
        this.intentIndex.set(intent, set);
      }
      set.add(skillId);
    }
  }

  /**
   * Remove skill from indexes
   */
  private removeFromIndexes(skillId: SkillId): void {
    for (const set of this.keywordIndex.values()) {
      set.delete(skillId);
    }
    for (const set of this.intentIndex.values()) {
      set.delete(skillId);
    }
  }

  /**
   * Rebuild all indexes
   */
  private rebuildIndexes(): void {
    this.keywordIndex.clear();
    this.intentIndex.clear();

    for (const [skillId, state] of this.skills) {
      this.indexSkill(skillId, state.definition);
    }
  }

  // ===========================================================================
  // STATS
  // ===========================================================================

  /**
   * Get registry statistics
   */
  getStats(): {
    totalSkills: number;
    enabledSkills: number;
    totalUsage: number;
    topSkills: Array<{ id: string; name: string; usage: number }>;
  } {
    let totalUsage = 0;
    const usageList: Array<{ id: string; name: string; usage: number }> = [];

    for (const [_skillId, state] of this.skills) {
      totalUsage += state.usageCount;
      usageList.push({
        id: state.definition.id,
        name: state.definition.name,
        usage: state.usageCount,
      });
    }

    usageList.sort((a, b) => b.usage - a.usage);

    return {
      totalSkills: this.skills.size,
      enabledSkills: Array.from(this.skills.values()).filter((s) => s.enabled).length,
      totalUsage,
      topSkills: usageList.slice(0, 5),
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global skill registry instance
 */
export const skillRegistry = new SkillRegistry();
