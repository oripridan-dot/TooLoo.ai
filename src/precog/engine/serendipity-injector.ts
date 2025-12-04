// @version 2.2.647
/**
 * SerendipityInjector
 * Introduces controlled randomness into the system to enable unexpected discoveries.
 * Implements "creative noise" that occasionally breaks patterns to find new optima.
 *
 * Key features:
 * - Wildcard provider selection (occasionally picks non-optimal provider)
 * - Temperature variation (random temperature adjustments)
 * - Prompt mutation injection (subtle prompt variations)
 * - Timing randomization (varies response patterns)
 * - Discovery tracking (records positive random outcomes)
 */

import { bus } from '../../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// ============================================================================
// TYPES
// ============================================================================

export interface SerendipityConfig {
  // Global enable/disable
  enabled: boolean;

  // Wildcard provider selection
  wildcardProbability: number; // 0-1, chance of selecting random provider
  wildcardProviders: string[]; // Pool of providers for wildcard selection

  // Temperature variation
  temperatureVariation: boolean;
  temperatureRange: [number, number]; // min, max temperature
  temperatureNoise: number; // random variation amount

  // Prompt mutation
  promptMutationProbability: number; // 0-1, chance of mutating prompt
  mutationStrength: 'subtle' | 'moderate' | 'aggressive';

  // Timing
  delayInjection: boolean;
  maxDelayMs: number;

  // Learning from randomness
  trackDiscoveries: boolean;
  positiveOutcomeThreshold: number; // minimum score to count as positive
}

export interface SerendipityEvent {
  id: string;
  type: 'wildcard' | 'temperature' | 'mutation' | 'delay';
  timestamp: Date;
  originalValue: any;
  modifiedValue: any;
  context: Record<string, unknown>;
  outcome?: SerendipityOutcome;
}

export interface SerendipityOutcome {
  success: boolean;
  score: number; // -1 to 1
  wasPositiveSurprise: boolean;
  feedback?: string;
}

export interface SerendipityDiscovery {
  id: string;
  eventId: string;
  type: SerendipityEvent['type'];
  description: string;
  score: number;
  reproducible: boolean;
  integratedAt?: Date;
  context: Record<string, unknown>;
}

export interface SerendipityMetrics {
  totalInjections: number;
  byType: Record<string, number>;
  positiveOutcomes: number;
  negativeOutcomes: number;
  discoveries: number;
  discoveryRate: number; // positive outcomes / total
  bestDiscovery?: SerendipityDiscovery;
}

// ============================================================================
// SERENDIPITY INJECTOR
// ============================================================================

export class SerendipityInjector {
  private static instance: SerendipityInjector;

  private config: SerendipityConfig;
  private eventHistory: SerendipityEvent[] = [];
  private discoveries: SerendipityDiscovery[] = [];
  private pendingEvents: Map<string, SerendipityEvent> = new Map();
  private dataDir: string;
  private stateFile: string;

  private readonly MAX_EVENT_HISTORY = 500;
  private readonly MAX_DISCOVERIES = 100;

  // Prompt mutation prefixes by strength
  private readonly MUTATION_PREFIXES: Record<string, string[]> = {
    subtle: [
      'Consider this carefully: ',
      'Think step by step about: ',
      'From a different perspective: ',
    ],
    moderate: [
      'Challenge the obvious answer to: ',
      'What if the opposite were true: ',
      'Imagine a contrarian view of: ',
    ],
    aggressive: [
      'Completely reimagine: ',
      'Break all conventions when addressing: ',
      'If everything you knew was wrong, how would you answer: ',
    ],
  };

  // Prompt mutation suffixes
  private readonly MUTATION_SUFFIXES: Record<string, string[]> = {
    subtle: [' Please be thorough.', ' Consider edge cases.', ' Think about implications.'],
    moderate: [
      ' What would a skeptic say?',
      ' Are there hidden assumptions?',
      ' What am I missing?',
    ],
    aggressive: [
      ' Surprise me with your answer.',
      ' The obvious answer is probably wrong.',
      ' Think like no one has thought before.',
    ],
  };

  private constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'serendipity');
    this.stateFile = path.join(this.dataDir, 'serendipity-state.json');

    this.config = {
      enabled: true,
      wildcardProbability: 0.1, // 10% chance of wildcard
      wildcardProviders: ['openai', 'anthropic', 'gemini', 'deepseek'],
      temperatureVariation: true,
      temperatureRange: [0.3, 0.95],
      temperatureNoise: 0.15,
      promptMutationProbability: 0.08, // 8% chance
      mutationStrength: 'moderate',
      delayInjection: false,
      maxDelayMs: 500,
      trackDiscoveries: true,
      positiveOutcomeThreshold: 0.7,
    };

    this.setupListeners();
  }

  static getInstance(): SerendipityInjector {
    if (!SerendipityInjector.instance) {
      SerendipityInjector.instance = new SerendipityInjector();
    }
    return SerendipityInjector.instance;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  async initialize(): Promise<void> {
    console.log('[SerendipityInjector] Initializing controlled randomness system...');

    await fs.ensureDir(this.dataDir);
    await this.loadState();

    bus.publish('cortex', 'serendipity:initialized', {
      config: this.config,
      discoveryCount: this.discoveries.length,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `[SerendipityInjector] Ready - Wildcard: ${this.config.wildcardProbability * 100}%, Mutation: ${this.config.promptMutationProbability * 100}%`
    );
  }

  // ============================================================================
  // INJECTION METHODS
  // ============================================================================

  /**
   * Possibly inject wildcard provider selection
   */
  maybeInjectWildcard(
    intendedProvider: string,
    availableProviders: string[],
    context: Record<string, unknown> = {}
  ): { provider: string; wasInjected: boolean; eventId?: string } {
    if (!this.config.enabled) {
      return { provider: intendedProvider, wasInjected: false };
    }

    // Check if we should inject wildcard
    if (Math.random() > this.config.wildcardProbability) {
      return { provider: intendedProvider, wasInjected: false };
    }

    // Select random provider from available (excluding intended)
    const wildcardPool = availableProviders.filter(
      (p) => p !== intendedProvider && this.config.wildcardProviders.includes(p)
    );

    if (wildcardPool.length === 0) {
      return { provider: intendedProvider, wasInjected: false };
    }

    const wildcardProvider = wildcardPool[Math.floor(Math.random() * wildcardPool.length)];

    // Record event
    const event = this.recordEvent('wildcard', intendedProvider, wildcardProvider, context);

    console.log(
      `[SerendipityInjector] 🎲 Wildcard injection: ${intendedProvider} → ${wildcardProvider}`
    );

    bus.publish('cortex', 'serendipity:wildcard_injected', {
      eventId: event.id,
      original: intendedProvider,
      wildcard: wildcardProvider,
      timestamp: new Date().toISOString(),
    });

    return { provider: wildcardProvider || intendedProvider, wasInjected: true, eventId: event.id };
  }

  /**
   * Apply temperature variation
   */
  applyTemperatureVariation(
    baseTemperature: number,
    context: Record<string, unknown> = {}
  ): { temperature: number; wasVaried: boolean; eventId?: string } {
    if (!this.config.enabled || !this.config.temperatureVariation) {
      return { temperature: baseTemperature, wasVaried: false };
    }

    // Add random noise to temperature
    const noise = (Math.random() * 2 - 1) * this.config.temperatureNoise;
    let variedTemperature = baseTemperature + noise;

    // Clamp to range
    variedTemperature = Math.max(
      this.config.temperatureRange[0],
      Math.min(this.config.temperatureRange[1], variedTemperature)
    );

    // Only record if variation is significant
    const variation = Math.abs(variedTemperature - baseTemperature);
    if (variation < 0.05) {
      return { temperature: baseTemperature, wasVaried: false };
    }

    // Record event
    const event = this.recordEvent('temperature', baseTemperature, variedTemperature, context);

    console.log(
      `[SerendipityInjector] 🌡️ Temperature varied: ${baseTemperature.toFixed(2)} → ${variedTemperature.toFixed(2)}`
    );

    return { temperature: variedTemperature, wasVaried: true, eventId: event.id };
  }

  /**
   * Possibly mutate a prompt
   */
  maybeInjectPromptMutation(
    prompt: string,
    context: Record<string, unknown> = {}
  ): { prompt: string; wasMutated: boolean; eventId?: string } {
    if (!this.config.enabled) {
      return { prompt, wasMutated: false };
    }

    // Check if we should mutate
    if (Math.random() > this.config.promptMutationProbability) {
      return { prompt, wasMutated: false };
    }

    // Apply mutation
    const mutatedPrompt = this.mutatePrompt(prompt);

    // Record event
    const event = this.recordEvent('mutation', prompt, mutatedPrompt, context);

    console.log(`[SerendipityInjector] 🧬 Prompt mutated (${this.config.mutationStrength})`);

    bus.publish('cortex', 'serendipity:mutation_injected', {
      eventId: event.id,
      mutationStrength: this.config.mutationStrength,
      originalLength: prompt.length,
      mutatedLength: mutatedPrompt.length,
      timestamp: new Date().toISOString(),
    });

    return { prompt: mutatedPrompt, wasMutated: true, eventId: event.id };
  }

  /**
   * Apply all serendipity injections to a request
   */
  processRequest(
    request: {
      provider: string;
      prompt: string;
      temperature?: number;
    },
    availableProviders: string[],
    context: Record<string, unknown> = {}
  ): {
    provider: string;
    prompt: string;
    temperature: number;
    injections: Array<{ type: string; eventId: string }>;
  } {
    const injections: Array<{ type: string; eventId: string }> = [];

    // Apply wildcard provider
    const wildcardResult = this.maybeInjectWildcard(request.provider, availableProviders, context);
    if (wildcardResult.wasInjected && wildcardResult.eventId) {
      injections.push({ type: 'wildcard', eventId: wildcardResult.eventId });
    }

    // Apply prompt mutation
    const mutationResult = this.maybeInjectPromptMutation(request.prompt, context);
    if (mutationResult.wasMutated && mutationResult.eventId) {
      injections.push({ type: 'mutation', eventId: mutationResult.eventId });
    }

    // Apply temperature variation
    const temperatureResult = this.applyTemperatureVariation(request.temperature ?? 0.7, context);
    if (temperatureResult.wasVaried && temperatureResult.eventId) {
      injections.push({ type: 'temperature', eventId: temperatureResult.eventId });
    }

    return {
      provider: wildcardResult.provider,
      prompt: mutationResult.prompt,
      temperature: temperatureResult.temperature,
      injections,
    };
  }

  // ============================================================================
  // MUTATION HELPERS
  // ============================================================================

  /**
   * Apply mutation to prompt based on configured strength
   */
  private mutatePrompt(prompt: string): string {
    const strength = this.config.mutationStrength;
    const prefixes = this.MUTATION_PREFIXES[strength] || this.MUTATION_PREFIXES['moderate'];
    const suffixes = this.MUTATION_SUFFIXES[strength] || this.MUTATION_SUFFIXES['moderate'];

    // Randomly decide mutation type
    const mutationType = Math.random();

    if (mutationType < 0.4) {
      // Add prefix
      const prefix = prefixes![Math.floor(Math.random() * prefixes!.length)] || '';
      return prefix + prompt;
    } else if (mutationType < 0.7) {
      // Add suffix
      const suffix = suffixes![Math.floor(Math.random() * suffixes!.length)] || '';
      return prompt + suffix;
    } else {
      // Add both
      const prefix = prefixes![Math.floor(Math.random() * prefixes!.length)] || '';
      const suffix = suffixes![Math.floor(Math.random() * suffixes!.length)] || '';
      return prefix + prompt + suffix;
    }
  }

  // ============================================================================
  // EVENT TRACKING
  // ============================================================================

  /**
   * Record a serendipity event
   */
  private recordEvent(
    type: SerendipityEvent['type'],
    originalValue: any,
    modifiedValue: any,
    context: Record<string, unknown>
  ): SerendipityEvent {
    const event: SerendipityEvent = {
      id: `ser-${type}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type,
      timestamp: new Date(),
      originalValue,
      modifiedValue,
      context,
    };

    this.eventHistory.push(event);
    this.pendingEvents.set(event.id, event);

    // Trim history
    if (this.eventHistory.length > this.MAX_EVENT_HISTORY) {
      this.eventHistory = this.eventHistory.slice(-this.MAX_EVENT_HISTORY);
    }

    return event;
  }

  /**
   * Record outcome for a serendipity event
   */
  recordOutcome(eventId: string, outcome: SerendipityOutcome): void {
    const event = this.pendingEvents.get(eventId);
    if (!event) {
      console.warn(`[SerendipityInjector] Unknown event ID: ${eventId}`);
      return;
    }

    event.outcome = outcome;
    this.pendingEvents.delete(eventId);

    // Check if this is a positive discovery
    if (outcome.wasPositiveSurprise && outcome.score >= this.config.positiveOutcomeThreshold) {
      const discovery = this.recordDiscovery(event, outcome);

      bus.publish('cortex', 'serendipity:discovery', {
        discoveryId: discovery.id,
        eventType: event.type,
        score: outcome.score,
        description: discovery.description,
        timestamp: new Date().toISOString(),
      });
    }

    // Emit telemetry
    bus.publish('cortex', 'serendipity:outcome_recorded', {
      eventId,
      type: event.type,
      score: outcome.score,
      wasPositive: outcome.wasPositiveSurprise,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Record a positive discovery
   */
  private recordDiscovery(
    event: SerendipityEvent,
    outcome: SerendipityOutcome
  ): SerendipityDiscovery {
    const discovery: SerendipityDiscovery = {
      id: `discovery-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      eventId: event.id,
      type: event.type,
      description: this.generateDiscoveryDescription(event, outcome),
      score: outcome.score,
      reproducible: false, // Would need further testing
      context: {
        originalValue: event.originalValue,
        modifiedValue: event.modifiedValue,
        ...event.context,
      },
    };

    this.discoveries.push(discovery);

    // Trim discoveries
    if (this.discoveries.length > this.MAX_DISCOVERIES) {
      this.discoveries = this.discoveries.slice(-this.MAX_DISCOVERIES);
    }

    console.log(`[SerendipityInjector] 🌟 New discovery: ${discovery.description}`);

    return discovery;
  }

  /**
   * Generate description for discovery
   */
  private generateDiscoveryDescription(
    event: SerendipityEvent,
    outcome: SerendipityOutcome
  ): string {
    switch (event.type) {
      case 'wildcard':
        return `Wildcard provider ${event.modifiedValue} outperformed ${event.originalValue} (score: ${outcome.score.toFixed(2)})`;
      case 'temperature':
        return `Temperature ${event.modifiedValue} produced better results than ${event.originalValue} (score: ${outcome.score.toFixed(2)})`;
      case 'mutation':
        return `Prompt mutation (${this.config.mutationStrength}) improved response quality (score: ${outcome.score.toFixed(2)})`;
      default:
        return `Serendipitous ${event.type} discovery (score: ${outcome.score.toFixed(2)})`;
    }
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async loadState(): Promise<void> {
    try {
      if (await fs.pathExists(this.stateFile)) {
        const data = await fs.readJson(this.stateFile);

        this.discoveries = (data.discoveries || []).map((d: any) => ({
          ...d,
          integratedAt: d.integratedAt ? new Date(d.integratedAt) : undefined,
        }));

        if (data.config) {
          this.config = { ...this.config, ...data.config };
        }

        console.log('[SerendipityInjector] Restored state:', {
          discoveries: this.discoveries.length,
        });
      }
    } catch (error) {
      console.error('[SerendipityInjector] Failed to load state:', error);
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.writeJson(
        this.stateFile,
        {
          config: this.config,
          discoveries: this.discoveries.slice(-50),
          savedAt: new Date().toISOString(),
        },
        { spaces: 2 }
      );
    } catch (error) {
      console.error('[SerendipityInjector] Failed to save state:', error);
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private setupListeners(): void {
    // Listen for response quality signals to update outcomes
    bus.on('cortex:response', (event) => {
      const { quality, serendipityEventId } = event.payload;

      if (serendipityEventId && quality !== undefined) {
        this.recordOutcome(serendipityEventId, {
          success: quality > 0.5,
          score: quality,
          wasPositiveSurprise: quality > this.config.positiveOutcomeThreshold,
        });
      }
    });

    // Listen for user feedback
    bus.on('user:feedback', (event) => {
      const { serendipityEventId, rating } = event.payload;

      if (serendipityEventId && rating !== undefined) {
        const score = rating / 5; // Assuming 1-5 rating
        this.recordOutcome(serendipityEventId, {
          success: score > 0.6,
          score,
          wasPositiveSurprise: score > this.config.positiveOutcomeThreshold,
          feedback: event.payload.feedback,
        });
      }
    });

    // Periodic state save
    setInterval(() => this.saveState(), 60000); // Save every minute
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getMetrics(): SerendipityMetrics {
    const byType: Record<string, number> = {};
    let positiveOutcomes = 0;
    let negativeOutcomes = 0;

    for (const event of this.eventHistory) {
      byType[event.type] = (byType[event.type] || 0) + 1;

      if (event.outcome) {
        if (event.outcome.wasPositiveSurprise) {
          positiveOutcomes++;
        } else if (event.outcome.score < 0.3) {
          negativeOutcomes++;
        }
      }
    }

    const bestDiscovery = this.discoveries.reduce(
      (best, d) => (!best || d.score > best.score ? d : best),
      null as SerendipityDiscovery | null
    );

    return {
      totalInjections: this.eventHistory.length,
      byType,
      positiveOutcomes,
      negativeOutcomes,
      discoveries: this.discoveries.length,
      discoveryRate:
        this.eventHistory.length > 0 ? this.discoveries.length / this.eventHistory.length : 0,
      bestDiscovery: bestDiscovery || undefined,
    };
  }

  getDiscoveries(limit: number = 20): SerendipityDiscovery[] {
    return this.discoveries.slice(-limit);
  }

  getConfig(): SerendipityConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<SerendipityConfig>): void {
    this.config = { ...this.config, ...updates };

    bus.publish('cortex', 'serendipity:config_updated', {
      config: this.config,
      timestamp: new Date().toISOString(),
    });

    this.saveState();
  }

  /**
   * Enable or disable serendipity
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`[SerendipityInjector] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Set wildcard probability
   */
  setWildcardProbability(probability: number): void {
    this.config.wildcardProbability = Math.max(0, Math.min(1, probability));
  }

  /**
   * Set prompt mutation probability
   */
  setMutationProbability(probability: number): void {
    this.config.promptMutationProbability = Math.max(0, Math.min(1, probability));
  }
}

// Export singleton
export const serendipityInjector = SerendipityInjector.getInstance();
