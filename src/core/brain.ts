/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TooLoo.ai - The Brain (LLM Integration)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Connects TooLoo's thinking to actual LLM providers.
 * Handles all planning, validation, reflection, and creation calls.
 *
 * @version Genesis
 * @born 2025-12-16
 */

import {
  ProviderRegistry,
  DeepSeekProvider,
  AnthropicProvider,
  OpenAIProvider,
  GeminiProvider,
  type CompletionRequest,
  type CompletionResponse,
  type ChatMessage,
} from '@tooloo/providers';
import { createProviderId } from '@tooloo/core';
import type { Soul, ProcessStep, ValidationResult, StepReflection } from './kernel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ThinkingRequest {
  purpose: 'plan' | 'execute' | 'validate' | 'reflect' | 'replan' | 'create' | 'research';
  context: string;
  soul?: Soul;
  temperature?: number;
  maxTokens?: number;
}

export interface ThinkingResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: number;
  latencyMs: number;
}

export interface PlanningResult {
  steps: Array<{
    description: string;
    skills_needed: string[];
    validation_criteria: string;
  }>;
  reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THE BRAIN
// ═══════════════════════════════════════════════════════════════════════════════

export class Brain {
  private registry: ProviderRegistry;
  private initialized = false;
  private preferredProvider: string = 'deepseek'; // Cheapest for most tasks

  constructor() {
    this.registry = new ProviderRegistry();
  }

  /**
   * Initialize all available LLM providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Brain] Initializing LLM providers...');

    // DeepSeek - Great for coding, cheapest
    if (process.env['DEEPSEEK_API_KEY']) {
      this.registry.register(
        new DeepSeekProvider({
          id: createProviderId('deepseek'),
          name: 'DeepSeek',
          apiKey: process.env['DEEPSEEK_API_KEY'],
          defaultModel: process.env['DEEPSEEK_MODEL'] || 'deepseek-chat',
          enabled: true,
          models: [
            {
              id: 'deepseek-chat',
              name: 'DeepSeek Chat',
              contextWindow: 64000,
              maxOutputTokens: 8192,
              capabilities: [{ domain: 'coding', level: 'expert', score: 95 }],
              costPer1kInput: 0.00014,
              costPer1kOutput: 0.00028,
              supportsStreaming: true,
              supportsFunctionCalling: true,
              supportsVision: false,
            },
          ],
        })
      );
      console.log('[Brain] ✅ DeepSeek provider ready');
    }

    // Anthropic - Best for reasoning
    if (process.env['ANTHROPIC_API_KEY']) {
      this.registry.register(
        new AnthropicProvider({
          id: createProviderId('anthropic'),
          name: 'Anthropic',
          apiKey: process.env['ANTHROPIC_API_KEY'],
          defaultModel: process.env['ANTHROPIC_MODEL'] || 'claude-sonnet-4-20250514',
          enabled: true,
          models: [
            {
              id: 'claude-sonnet-4-20250514',
              name: 'Claude Sonnet 4',
              contextWindow: 200000,
              maxOutputTokens: 8192,
              capabilities: [{ domain: 'reasoning', level: 'expert', score: 98 }],
              costPer1kInput: 0.003,
              costPer1kOutput: 0.015,
              supportsStreaming: true,
              supportsFunctionCalling: true,
              supportsVision: true,
            },
          ],
        })
      );
      console.log('[Brain] ✅ Anthropic provider ready');
    }

    // OpenAI - General purpose
    if (process.env['OPENAI_API_KEY']) {
      this.registry.register(
        new OpenAIProvider({
          id: createProviderId('openai'),
          name: 'OpenAI',
          apiKey: process.env['OPENAI_API_KEY'],
          defaultModel: process.env['OPENAI_MODEL'] || 'gpt-4o',
          enabled: true,
          models: [
            {
              id: 'gpt-4o',
              name: 'GPT-4o',
              contextWindow: 128000,
              maxOutputTokens: 4096,
              capabilities: [{ domain: 'coding', level: 'expert', score: 90 }],
              costPer1kInput: 0.005,
              costPer1kOutput: 0.015,
              supportsStreaming: true,
              supportsFunctionCalling: true,
              supportsVision: true,
            },
          ],
        })
      );
      console.log('[Brain] ✅ OpenAI provider ready');
    }

    // Gemini - Huge context, multimodal
    if (process.env['GOOGLE_API_KEY']) {
      this.registry.register(
        new GeminiProvider({
          id: createProviderId('gemini'),
          name: 'Gemini',
          apiKey: process.env['GOOGLE_API_KEY'],
          defaultModel: process.env['GEMINI_MODEL'] || 'gemini-2.0-flash',
          enabled: true,
          models: [
            {
              id: 'gemini-2.0-flash',
              name: 'Gemini 2.0 Flash',
              contextWindow: 1000000,
              maxOutputTokens: 8192,
              capabilities: [{ domain: 'vision', level: 'expert', score: 92 }],
              costPer1kInput: 0.00035,
              costPer1kOutput: 0.00105,
              supportsStreaming: true,
              supportsFunctionCalling: true,
              supportsVision: true,
            },
          ],
        })
      );
      console.log('[Brain] ✅ Gemini provider ready');
    }

    const available = this.registry.getAvailable();
    if (available.length === 0) {
      console.warn('[Brain] ⚠️ No LLM providers available! Set API keys in environment.');
    } else {
      // Set preferred provider to first available
      this.preferredProvider = available[0].id;
      console.log(`[Brain] 🧠 Using ${this.preferredProvider} as primary provider`);
    }

    this.initialized = true;
  }

  /**
   * Get an available provider
   */
  private getProvider(preferredId?: string): any {
    const id = preferredId || this.preferredProvider;
    const provider = this.registry.get(id);

    if (provider && provider.isAvailable()) {
      return provider;
    }

    // Fallback to any available provider
    const available = this.registry.getAvailable();
    if (available.length > 0) {
      return this.registry.get(available[0].id);
    }

    return null;
  }

  /**
   * Core thinking function - sends context to LLM and gets response
   */
  async think(request: ThinkingRequest): Promise<ThinkingResponse> {
    const provider = this.getProvider();

    if (!provider) {
      throw new Error('No LLM provider available. Please set API keys.');
    }

    // Build system prompt with soul context
    let systemPrompt = `You are TooLoo, a self-evolving digital creature.`;

    if (request.soul) {
      systemPrompt = `${request.soul.destiny}

Your values:
${Object.entries(request.soul.values)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join('\n')}

Your principles:
${request.soul.intent.principles.map((p) => `- ${p.name}: ${p.description}`).join('\n')}

Remember your north star: ${request.soul.north_star}
`;
    }

    // Add purpose-specific instructions
    const purposeInstructions = this.getPurposeInstructions(request.purpose);
    systemPrompt += `\n\n${purposeInstructions}`;

    const completionRequest: CompletionRequest = {
      model: provider.config.defaultModel,
      messages: [{ role: 'user' as const, content: request.context }],
      systemPrompt,
      temperature: request.temperature ?? this.getTemperatureForPurpose(request.purpose),
      maxTokens: request.maxTokens ?? 4096,
    };

    const response: CompletionResponse = await provider.complete(completionRequest);

    return {
      content: response.content,
      model: response.model,
      provider: provider.config.name,
      tokensUsed: response.usage.totalTokens,
      latencyMs: response.latencyMs,
    };
  }

  /**
   * Get purpose-specific instructions
   */
  private getPurposeInstructions(purpose: ThinkingRequest['purpose']): string {
    switch (purpose) {
      case 'plan':
        return `You are planning how to achieve a goal. Break it into clear steps.
For each step, specify:
1. A clear description of what to do
2. What skills/capabilities are needed
3. How to validate the step succeeded

Output your plan as JSON:
{
  "reasoning": "Why you chose this approach",
  "steps": [
    {
      "description": "Step description",
      "skills_needed": ["skill1", "skill2"],
      "validation_criteria": "How to verify this step succeeded"
    }
  ]
}`;

      case 'execute':
        return `You are executing a specific task. Focus on producing the actual output needed.
Be thorough and complete. Don't just describe what to do - actually do it.`;

      case 'validate':
        return `You are validating whether a step was successful.
Be honest and specific. Output JSON:
{
  "passed": true/false,
  "criteria_met": ["criterion1", "criterion2"],
  "criteria_failed": ["criterion3"],
  "confidence": 0.0-1.0,
  "suggestions": ["How to improve if not perfect"]
}`;

      case 'reflect':
        return `You are reflecting on what happened in a step.
Extract genuine lessons. Output JSON:
{
  "what_worked": "What went well",
  "what_didnt": "What didn't work",
  "lesson_learned": "A concrete lesson for the future",
  "should_replan": true/false
}`;

      case 'replan':
        return `You are adjusting a plan based on what you learned.
Consider: retry with different approach, add preparatory steps, or find a different path.
Output the adjusted plan as JSON (same format as planning).`;

      case 'create':
        return `You are creating a new skill definition.
The skill should be focused, composable, clear, and elegant.
Output as YAML:
id: skill-id
name: Skill Name
description: What it does
capabilities: [cap1, cap2]
instructions: |
  Detailed instructions for using this skill
keywords: [keyword1, keyword2]`;

      case 'research':
        return `You are researching industry best practices.
Look for patterns, proven approaches, and wisdom from experts.
Be specific and actionable, not generic.`;

      default:
        return `Think carefully and provide a helpful response.`;
    }
  }

  /**
   * Get appropriate temperature for different purposes
   */
  private getTemperatureForPurpose(purpose: ThinkingRequest['purpose']): number {
    switch (purpose) {
      case 'plan':
        return 0.7;
      case 'execute':
        return 0.3;
      case 'validate':
        return 0.2;
      case 'reflect':
        return 0.5;
      case 'replan':
        return 0.7;
      case 'create':
        return 0.8;
      case 'research':
        return 0.6;
      default:
        return 0.5;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HIGH-LEVEL THINKING FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Plan how to achieve a goal
   */
  async plan(goal: string, context: string, soul: Soul): Promise<PlanningResult> {
    const response = await this.think({
      purpose: 'plan',
      context: `${context}\n\nGoal to achieve: ${goal}`,
      soul,
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[Brain] Failed to parse planning response as JSON');
    }

    // Fallback: single step
    return {
      reasoning: 'Could not parse structured plan',
      steps: [
        {
          description: goal,
          skills_needed: ['general'],
          validation_criteria: 'Goal is achieved',
        },
      ],
    };
  }

  /**
   * Validate a step result
   */
  async validate(
    step: ProcessStep,
    output: unknown,
    context: string,
    soul: Soul
  ): Promise<ValidationResult> {
    const response = await this.think({
      purpose: 'validate',
      context: `${context}

Step: ${step.description}
Validation Criteria: ${step.validation_criteria}

Output to validate:
${JSON.stringify(output, null, 2).slice(0, 5000)}`,
      soul,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[Brain] Failed to parse validation response as JSON');
    }

    // Fallback: assume passed
    return {
      passed: true,
      criteria_met: [step.validation_criteria],
      criteria_failed: [],
      confidence: 0.5,
      suggestions: [],
    };
  }

  /**
   * Reflect on a step
   */
  async reflect(
    step: ProcessStep,
    validation: ValidationResult,
    context: string,
    soul: Soul
  ): Promise<StepReflection> {
    const response = await this.think({
      purpose: 'reflect',
      context: `${context}

Step: ${step.description}
Validation passed: ${validation.passed}
Confidence: ${validation.confidence}
Criteria met: ${validation.criteria_met.join(', ')}
Criteria failed: ${validation.criteria_failed.join(', ')}`,
      soul,
    });

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          step_id: step.id,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('[Brain] Failed to parse reflection response as JSON');
    }

    // Fallback
    return {
      step_id: step.id,
      what_worked: validation.passed ? 'Step completed' : 'Attempted the step',
      what_didnt: validation.passed ? 'Nothing significant' : validation.criteria_failed.join(', '),
      lesson_learned: 'Continue with current approach',
      should_replan: !validation.passed,
    };
  }

  /**
   * Execute a task and return the result
   */
  async execute(task: string, context: string, soul: Soul): Promise<string> {
    const response = await this.think({
      purpose: 'execute',
      context: `${context}\n\nTask to execute: ${task}`,
      soul,
      maxTokens: 8192,
    });

    return response.content;
  }

  /**
   * Research a topic
   */
  async research(query: string, context: string, soul: Soul): Promise<string> {
    const response = await this.think({
      purpose: 'research',
      context: `${context}\n\nResearch query: ${query}`,
      soul,
    });

    return response.content;
  }

  /**
   * Create a new skill definition
   */
  async createSkill(need: string, context: string, soul: Soul): Promise<string> {
    const response = await this.think({
      purpose: 'create',
      context: `${context}\n\nNeed to address: ${need}`,
      soul,
    });

    return response.content;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if brain is ready
   */
  isReady(): boolean {
    return this.initialized && this.registry.getAvailable().length > 0;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return this.registry.getAvailable().map((p) => p.name);
  }

  /**
   * Get stats
   */
  getStats(): { providers: number; preferred: string } {
    return {
      providers: this.registry.getAvailable().length,
      preferred: this.preferredProvider,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════════════

export const brain = new Brain();
export default brain;
