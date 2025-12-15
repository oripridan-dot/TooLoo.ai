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
import { registry } from './registry.js';

// =============================================================================
// ROUTER TYPES
// =============================================================================

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

// =============================================================================
// ROUTER CLASS
// =============================================================================

export class SkillRouter {
  private config: RouterConfig;
  private lastRoute: RouteResult | null = null;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = {
      minConfidence: 0.3,
      defaultSkillId: 'core.chat',
      useClassifier: true,
      maxAlternatives: 3,
      ...config,
    };
  }

  // ---------------------------------------------------------------------------
  // Core Routing
  // ---------------------------------------------------------------------------

  /**
   * Route input text to the best matching skill
   */
  route(input: string, context?: KernelContext): RouteResult {
    const trimmed = input.trim();

    // 1. Check for explicit triggers first (commands)
    const triggerResult = this.matchTrigger(trimmed);
    if (triggerResult.skill && triggerResult.confidence >= 0.9) {
      this.lastRoute = triggerResult;
      return triggerResult;
    }

    // 2. Use classifiers for semantic matching
    if (this.config.useClassifier) {
      const classifierResult = this.matchClassifier(trimmed, context);
      if (classifierResult.skill && classifierResult.confidence >= this.config.minConfidence) {
        this.lastRoute = classifierResult;
        return classifierResult;
      }
    }

    // 3. Fall back to default skill
    if (this.config.defaultSkillId) {
      const defaultSkill = registry.get(this.config.defaultSkillId);
      if (defaultSkill) {
        const result: RouteResult = {
          skill: defaultSkill,
          confidence: 0.5,
          matchType: 'default',
          alternatives: [],
        };
        this.lastRoute = result;
        return result;
      }
    }

    // 4. No match
    const noMatch: RouteResult = {
      skill: null,
      confidence: 0,
      matchType: 'none',
      alternatives: [],
    };
    this.lastRoute = noMatch;
    return noMatch;
  }

  /**
   * Match input against skill triggers (commands)
   */
  private matchTrigger(input: string): RouteResult {
    const lowered = input.toLowerCase();
    const alternatives: RouteResult['alternatives'] = [];
    let bestMatch: { skill: Skill; params?: Record<string, string> } | null = null;
    let bestConfidence = 0;

    for (const skill of registry.getAll()) {
      for (const trigger of skill.intent.triggers) {
        const triggerLower = trigger.toLowerCase();

        // Exact command match (e.g., "/chat hello" matches "/chat")
        if (lowered.startsWith(triggerLower)) {
          const confidence = triggerLower.length / lowered.length;
          const params = this.extractParams(input, trigger);

          if (confidence > bestConfidence) {
            if (bestMatch) {
              alternatives.push({ skill: bestMatch.skill, confidence: bestConfidence });
            }
            bestMatch = { skill, params };
            bestConfidence = Math.max(confidence, 0.9); // Commands get high confidence
          } else if (confidence > this.config.minConfidence) {
            alternatives.push({ skill, confidence });
          }
        }
      }
    }

    return {
      skill: bestMatch?.skill ?? null,
      confidence: bestConfidence,
      matchType: 'trigger',
      alternatives: alternatives.slice(0, this.config.maxAlternatives),
      params: bestMatch?.params,
    };
  }

  /**
   * Match input using semantic classifiers
   */
  private matchClassifier(input: string, _context?: KernelContext): RouteResult {
    const scored = registry.getByConfidence(input);
    const alternatives: RouteResult['alternatives'] = [];

    if (scored.length === 0) {
      return {
        skill: null,
        confidence: 0,
        matchType: 'classifier',
        alternatives: [],
      };
    }

    // Top result
    const best = scored[0];

    // Alternatives (skip first)
    for (let i = 1; i < Math.min(scored.length, this.config.maxAlternatives + 1); i++) {
      alternatives.push(scored[i]!);
    }

    return {
      skill: best!.skill,
      confidence: best!.confidence,
      matchType: 'classifier',
      alternatives,
    };
  }

  /**
   * Extract parameters from command input
   * e.g., "/code typescript function add" => { language: "typescript", query: "function add" }
   */
  private extractParams(input: string, trigger: string): Record<string, string> {
    const remainder = input.slice(trigger.length).trim();

    // Simple extraction: first word is often a parameter, rest is the query
    const parts = remainder.split(/\s+/);

    if (parts.length === 0 || parts[0] === '') {
      return {};
    }

    return {
      query: remainder,
      firstParam: parts[0] ?? '',
    };
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Get the last routing result
   */
  getLastRoute(): RouteResult | null {
    return this.lastRoute;
  }

  /**
   * Force route to a specific skill
   */
  forceRoute(skillId: string): RouteResult {
    const skill = registry.get(skillId);

    const result: RouteResult = {
      skill: skill ?? null,
      confidence: skill ? 1.0 : 0,
      matchType: skill ? 'trigger' : 'none',
      alternatives: [],
    };

    this.lastRoute = result;
    return result;
  }

  /**
   * Get suggested skills for partial input (autocomplete)
   */
  getSuggestions(partialInput: string): Array<{ skill: Skill; trigger: string }> {
    const lowered = partialInput.toLowerCase();
    const suggestions: Array<{ skill: Skill; trigger: string }> = [];

    for (const skill of registry.getAll()) {
      for (const trigger of skill.intent.triggers) {
        if (trigger.toLowerCase().startsWith(lowered)) {
          suggestions.push({ skill, trigger });
        }
      }
    }

    return suggestions.sort((a, b) => a.trigger.length - b.trigger.length);
  }

  /**
   * Check if input would activate a specific skill
   */
  wouldActivate(input: string, skillId: string): boolean {
    const result = this.route(input);
    return result.skill?.id === skillId;
  }

  /**
   * Update router configuration
   */
  configure(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}

// =============================================================================
// DEFAULT CLASSIFIERS
// =============================================================================

/**
 * Simple keyword-based classifier for common intents
 */
export function createKeywordClassifier(keywords: Record<string, string[]>) {
  return (text: string): { intent: string; confidence: number } | null => {
    const lowered = text.toLowerCase();
    let bestIntent: string | null = null;
    let bestScore = 0;

    for (const [intent, words] of Object.entries(keywords)) {
      let matches = 0;
      for (const word of words) {
        if (lowered.includes(word.toLowerCase())) {
          matches++;
        }
      }

      const score = matches / words.length;
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    if (bestIntent && bestScore > 0.2) {
      return { intent: bestIntent, confidence: Math.min(bestScore, 1) };
    }

    return null;
  };
}

/**
 * Built-in classifiers for common skill types
 */
export const defaultClassifiers = {
  chat: (text: string): number => {
    const chatWords = ['chat', 'talk', 'hello', 'hi', 'hey', 'help', 'question', 'ask'];
    const lowered = text.toLowerCase();
    let score = 0;

    for (const word of chatWords) {
      if (lowered.includes(word)) score += 0.2;
    }

    // Questions usually go to chat
    if (text.includes('?')) score += 0.3;

    return Math.min(score, 1);
  },

  coding: (text: string): number => {
    const codeWords = [
      'code',
      'function',
      'class',
      'implement',
      'fix',
      'bug',
      'error',
      'typescript',
      'javascript',
      'python',
      'write',
      'create',
    ];
    const lowered = text.toLowerCase();
    let score = 0;

    for (const word of codeWords) {
      if (lowered.includes(word)) score += 0.15;
    }

    // Code blocks indicate coding intent
    if (text.includes('```')) score += 0.4;

    return Math.min(score, 1);
  },

  system: (text: string): number => {
    const sysWords = [
      'settings',
      'config',
      'preference',
      'theme',
      'model',
      'provider',
      'api key',
      'status',
    ];
    const lowered = text.toLowerCase();
    let score = 0;

    for (const word of sysWords) {
      if (lowered.includes(word)) score += 0.25;
    }

    return Math.min(score, 1);
  },
};

// =============================================================================
// SINGLETON
// =============================================================================

/** Global router instance */
export const router = new SkillRouter();

export default router;
