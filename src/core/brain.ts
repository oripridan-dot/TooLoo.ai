/**
 * @file TooLoo Genesis - The Brain
 * @description Unified LLM abstraction for cognitive operations
 * @version 1.0.0
 * @created 2025-12-16
 *
 * The Brain is the cognitive core of TooLoo. It provides high-level
 * thinking operations that abstract away the underlying LLM provider.
 *
 * Core Pursuits Embedded:
 * - QUALITY: Confidence assessment on every response
 * - PERFORMANCE: Multi-step reasoning with validation
 * - EFFICIENCY: Smart provider selection & caching
 */

import { EventEmitter } from 'events';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

// =============================================================================
// TYPES
// =============================================================================

export interface ThoughtResult {
  content: string;
  confidence: number; // 0-1 scale
  reasoning?: string;
  tokens?: { input: number; output: number };
  duration?: number;
  provider?: string;
}

export interface PlanResult {
  goal: string;
  steps: PlanStep[];
  confidence: number;
  estimatedDuration?: string;
  risks?: string[];
  alternatives?: string[];
}

export interface PlanStep {
  id: number;
  action: string;
  description: string;
  zone: 'green' | 'yellow' | 'red';
  dependencies?: number[];
  validation?: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  suggestions?: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  fix?: string;
}

export interface ReflectionResult {
  summary: string;
  lessonsLearned: string[];
  improvements: string[];
  confidence: number;
  shouldRetry: boolean;
  retryStrategy?: string;
}

export interface BrainConfig {
  defaultProvider: 'deepseek' | 'anthropic' | 'openai' | 'gemini';
  confidenceThreshold: number;
  maxRetries: number;
  timeout: number;
  enableCaching: boolean;
}

export interface Soul {
  name: string;
  version: string;
  destiny: string;
  values: Record<string, string>;
  pursuits: {
    quality: {
      metrics: { confidence_threshold: number };
      behaviors: string[];
    };
    performance: {
      metrics: { accuracy_target: number };
      behaviors: string[];
    };
    efficiency: {
      metrics: { max_iterations: number };
      behaviors: string[];
    };
  };
  autonomy: {
    mode: 'observe' | 'guided' | 'collaborative' | 'autonomous';
    green_zone: { actions: any[] };
    yellow_zone: { actions: any[]; delay_seconds: number };
    red_zone: { actions: any[] };
  };
  north_star: string;
}

// =============================================================================
// LLM PROVIDER INTERFACE
// =============================================================================

interface LLMProvider {
  name: string;
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  stream(prompt: string, options?: LLMOptions): AsyncIterable<string>;
  isAvailable(): boolean;
}

interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

// =============================================================================
// THE BRAIN CLASS
// =============================================================================

export class Brain extends EventEmitter {
  private config: BrainConfig;
  private soul: Soul | null = null;
  private providers: Map<string, LLMProvider> = new Map();
  private thoughtCache: Map<string, ThoughtResult> = new Map();
  private metrics = {
    totalThoughts: 0,
    averageConfidence: 0,
    cacheHits: 0,
    providerUsage: {} as Record<string, number>,
  };

  constructor(config?: Partial<BrainConfig>) {
    super();
    this.config = {
      defaultProvider: config?.defaultProvider ?? 'gemini',
      confidenceThreshold: config?.confidenceThreshold ?? 0.85,
      maxRetries: config?.maxRetries ?? 3,
      timeout: config?.timeout ?? 30000,
      enableCaching: config?.enableCaching ?? true,
    };
  }

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  /**
   * Wake up the brain - initialize providers and load soul
   */
  async wakeUp(): Promise<void> {
    this.emit('brain:waking');

    // Load soul from YAML
    await this.loadSoul();

    // Initialize LLM providers
    await this.initializeProviders();

    this.emit('brain:awake', {
      soul: this.soul?.name,
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Load the soul from destiny.yaml
   */
  private async loadSoul(): Promise<void> {
    const soulPath = join(process.cwd(), 'soul', 'destiny.yaml');

    if (!existsSync(soulPath)) {
      console.warn('[Brain] ⚠️ No soul found at', soulPath);
      return;
    }

    try {
      const content = readFileSync(soulPath, 'utf-8');
      this.soul = YAML.parse(content) as Soul;
      console.log(`[Brain] 🌟 Soul loaded: ${this.soul.name} (${this.soul.version})`);

      // Apply soul's quality threshold
      if (this.soul.pursuits?.quality?.metrics?.confidence_threshold) {
        this.config.confidenceThreshold = this.soul.pursuits.quality.metrics.confidence_threshold;
      }
    } catch (error) {
      console.error('[Brain] Failed to load soul:', error);
    }
  }

  /**
   * Initialize available LLM providers
   */
  private async initializeProviders(): Promise<void> {
    // DeepSeek (cheapest, used for routine tasks)
    if (process.env['DEEPSEEK_API_KEY']) {
      this.providers.set('deepseek', this.createDeepSeekProvider());
      console.log('[Brain] 🧠 DeepSeek provider online');
    }

    // Anthropic (best reasoning)
    if (process.env['ANTHROPIC_API_KEY']) {
      this.providers.set('anthropic', this.createAnthropicProvider());
      console.log('[Brain] 🧠 Anthropic provider online');
    }

    // OpenAI (general purpose)
    if (process.env['OPENAI_API_KEY']) {
      this.providers.set('openai', this.createOpenAIProvider());
      console.log('[Brain] 🧠 OpenAI provider online');
    }

    // Gemini (huge context, vision)
    if (process.env['GOOGLE_API_KEY']) {
      this.providers.set('gemini', this.createGeminiProvider());
      console.log('[Brain] 🧠 Gemini provider online');
    }

    if (this.providers.size === 0) {
      console.warn('[Brain] ⚠️ No LLM providers configured. Set API keys.');
    }
  }

  // ---------------------------------------------------------------------------
  // CORE COGNITIVE OPERATIONS
  // ---------------------------------------------------------------------------

  /**
   * THINK - General reasoning with confidence assessment
   * Pursuit: QUALITY (confidence rating on every response)
   */
  async think(
    prompt: string,
    context?: string,
    options?: { provider?: string; temperature?: number }
  ): Promise<ThoughtResult> {
    const startTime = Date.now();
    this.emit('brain:thinking', { prompt: prompt.slice(0, 100) });

    // Check cache for efficiency
    const cacheKey = this.getCacheKey(prompt, context);
    if (this.config.enableCaching && this.thoughtCache.has(cacheKey)) {
      this.metrics.cacheHits++;
      this.emit('brain:cache-hit', { prompt: prompt.slice(0, 50) });
      return this.thoughtCache.get(cacheKey)!;
    }

    const provider = this.selectProvider(options?.provider);
    if (!provider) {
      return this.createErrorThought('No LLM provider available');
    }

    const systemPrompt = this.buildSystemPrompt('think', context);
    const fullPrompt = `${prompt}\n\n---\nAfter your response, rate your confidence (0-1) in this format:\n[CONFIDENCE: X.XX]`;

    try {
      const response = await provider.complete(fullPrompt, {
        systemPrompt,
        temperature: options?.temperature ?? 0.7,
      });

      const { content, confidence } = this.extractConfidence(response);
      const duration = Date.now() - startTime;

      const result: ThoughtResult = {
        content,
        confidence,
        duration,
        provider: provider.name,
      };

      // Quality gate: flag low confidence
      if (confidence < this.config.confidenceThreshold) {
        this.emit('brain:low-confidence', {
          confidence,
          threshold: this.config.confidenceThreshold,
        });
      }

      // Cache for efficiency
      if (this.config.enableCaching && confidence >= this.config.confidenceThreshold) {
        this.thoughtCache.set(cacheKey, result);
      }

      this.updateMetrics(result);
      this.emit('brain:thought', result);

      return result;
    } catch (error) {
      return this.createErrorThought(`Thinking failed: ${(error as Error).message}`);
    }
  }

  /**
   * PLAN - Break down a goal into validated steps
   * Pursuit: PERFORMANCE (accurate, production-ready plans)
   */
  async plan(goal: string, context?: string): Promise<PlanResult> {
    this.emit('brain:planning', { goal });

    const planPrompt = `
You are a meticulous planner. Create a step-by-step plan to achieve this goal.

GOAL: ${goal}

${context ? `CONTEXT:\n${context}\n` : ''}

IMPORTANT: Classify each step's permission zone correctly:

GREEN ZONE (proceed autonomously - no permission needed):
- Read any file in the workspace
- List directory contents
- Search codebase (grep, semantic search)
- Analyze code structure and patterns
- Read documentation
- Plan approaches, generate proposals
- Update internal memory/context
- Respond to questions, explain reasoning

YELLOW ZONE (notify then proceed after 5s delay):
- Create new files (non-core)
- Create test files, documentation
- Create skill YAML definitions
- Add comments to code
- Format/lint existing code
- Update non-critical configuration

RED ZONE (require explicit approval):
- Delete any file
- Modify src/kernel/* or src/core/* files
- Modify soul/destiny.yaml
- Modify package.json dependencies
- Run shell commands
- Install packages
- Git operations (commit, push)
- External API calls

For each step, classify its permission zone:
- GREEN: Safe operations (read, analyze, plan) - can proceed autonomously
- YELLOW: Low-risk modifications (create non-core files) - notify then proceed
- RED: High-impact operations (delete, modify core, terminal) - require approval

Respond in this exact JSON format:
{
  "goal": "the goal restated clearly",
  "steps": [
    {
      "id": 1,
      "action": "verb phrase",
      "description": "detailed description",
      "zone": "green|yellow|red",
      "dependencies": [list of step ids this depends on],
      "validation": "how to verify this step succeeded"
    }
  ],
  "estimatedDuration": "time estimate",
  "risks": ["potential risks"],
  "alternatives": ["alternative approaches if this fails"]
}

[CONFIDENCE: X.XX]`;

    const thought = await this.think(planPrompt, undefined, { temperature: 0.3 });

    try {
      // Extract JSON from response
      const jsonMatch = thought.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in plan response');
      }

      const plan = JSON.parse(jsonMatch[0]) as PlanResult;
      plan.confidence = thought.confidence;

      this.emit('brain:planned', plan);
      return plan;
    } catch (error) {
      return {
        goal,
        steps: [],
        confidence: 0,
        risks: [`Planning failed: ${(error as Error).message}`],
      };
    }
  }

  /**
   * VALIDATE - Check if output meets quality standards
   * Pursuit: QUALITY (validation gates)
   */
  async validate(content: string, criteria: string, context?: string): Promise<ValidationResult> {
    this.emit('brain:validating', { criteria });

    const validatePrompt = `
You are a rigorous validator. Assess this content against the given criteria.

CONTENT TO VALIDATE:
${content}

VALIDATION CRITERIA:
${criteria}

${context ? `CONTEXT:\n${context}\n` : ''}

Check for:
1. Correctness - Does it work as intended?
2. Completeness - Are all aspects addressed?
3. Quality - Is it well-crafted?
4. Safety - Are there any risks?

Respond in this exact JSON format:
{
  "isValid": true/false,
  "issues": [
    {
      "severity": "error|warning|info",
      "message": "description of issue",
      "location": "where in the content (if applicable)",
      "fix": "suggested fix (if applicable)"
    }
  ],
  "suggestions": ["improvement suggestions"]
}

[CONFIDENCE: X.XX]`;

    const thought = await this.think(validatePrompt, undefined, {
      provider: 'anthropic', // Use best reasoning for validation
      temperature: 0.2,
    });

    try {
      const jsonMatch = thought.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in validation response');
      }

      const result = JSON.parse(jsonMatch[0]) as ValidationResult;
      result.confidence = thought.confidence;

      this.emit('brain:validated', result);
      return result;
    } catch (error) {
      return {
        isValid: false,
        confidence: 0,
        issues: [
          {
            severity: 'error',
            message: `Validation failed: ${(error as Error).message}`,
          },
        ],
      };
    }
  }

  /**
   * REFLECT - Learn from execution results
   * Pursuit: EFFICIENCY (continuous improvement)
   */
  async reflect(
    action: string,
    result: string,
    success: boolean,
    context?: string
  ): Promise<ReflectionResult> {
    this.emit('brain:reflecting', { action, success });

    const reflectPrompt = `
You are a wise mentor helping a learning system improve.

ACTION TAKEN: ${action}
RESULT: ${result}
SUCCESS: ${success}

${context ? `CONTEXT:\n${context}\n` : ''}

Analyze what happened and extract learnings:
1. What went well?
2. What could be improved?
3. What lessons should be remembered?
4. Should this be retried? If so, how differently?

Respond in this exact JSON format:
{
  "summary": "brief summary of what happened",
  "lessonsLearned": ["lesson 1", "lesson 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "shouldRetry": true/false,
  "retryStrategy": "if shouldRetry, describe the different approach"
}

[CONFIDENCE: X.XX]`;

    const thought = await this.think(reflectPrompt, undefined, { temperature: 0.5 });

    try {
      const jsonMatch = thought.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON in reflection response');
      }

      const result = JSON.parse(jsonMatch[0]) as ReflectionResult;
      result.confidence = thought.confidence;

      // Record lessons to evolution journal
      await this.recordLessons(result.lessonsLearned);

      this.emit('brain:reflected', result);
      return result;
    } catch (error) {
      return {
        summary: 'Reflection failed',
        lessonsLearned: [],
        improvements: [],
        confidence: 0,
        shouldRetry: false,
      };
    }
  }

  /**
   * EXECUTE - Generate code or content with high accuracy
   * Pursuit: PERFORMANCE (super accurate creations)
   */
  async execute(task: string, specification: string, context?: string): Promise<ThoughtResult> {
    this.emit('brain:executing', { task });

    const executePrompt = `
You are an expert implementer. Create exactly what is specified.

TASK: ${task}

SPECIFICATION:
${specification}

${context ? `CONTEXT:\n${context}\n` : ''}

REQUIREMENTS:
1. Follow the specification EXACTLY
2. Use best practices for the technology
3. Include error handling
4. Add helpful comments
5. Ensure the output is complete and runnable

Think step-by-step before writing:
1. What exactly needs to be created?
2. What are the edge cases?
3. What's the most elegant approach?

Then provide your implementation.

[CONFIDENCE: X.XX]`;

    return this.think(executePrompt, undefined, {
      provider: 'anthropic', // Best reasoning for accurate execution
      temperature: 0.2, // Low temperature for precision
    });
  }

  /**
   * CREATE SKILL - Generate a new skill definition
   * Pursuit: EFFICIENCY (expand capabilities when needed)
   */
  async createSkill(
    capability: string,
    examples: string[],
    context?: string
  ): Promise<ThoughtResult> {
    this.emit('brain:creating-skill', { capability });

    const skillPrompt = `
You are a skill architect. Design a new skill for the TooLoo system.

CAPABILITY NEEDED: ${capability}

EXAMPLE USE CASES:
${examples.map((e, i) => `${i + 1}. ${e}`).join('\n')}

${context ? `CONTEXT:\n${context}\n` : ''}

Create a complete YAML skill definition following this structure:

\`\`\`yaml
id: skill-id-here
name: Human Readable Name
version: "1.0.0"
description: |
  Clear description of what this skill does.

keywords:
  - keyword1
  - keyword2

schema:
  type: object
  properties:
    input_name:
      type: string
      description: What this input is for
  required:
    - input_name

instructions: |
  Detailed instructions for how to execute this skill.
  Include:
  - What to do
  - How to validate
  - What to return

tools:
  - file_read
  - file_write
\`\`\`

[CONFIDENCE: X.XX]`;

    return this.think(skillPrompt, undefined, { temperature: 0.4 });
  }

  // ---------------------------------------------------------------------------
  // HELPER METHODS
  // ---------------------------------------------------------------------------

  /**
   * Select the best provider for the task
   * Pursuit: EFFICIENCY (smart provider selection)
   */
  private selectProvider(preferred?: string): LLMProvider | null {
    // Use preferred if available
    if (preferred && this.providers.has(preferred)) {
      return this.providers.get(preferred)!;
    }

    // Use default if available
    if (this.providers.has(this.config.defaultProvider)) {
      return this.providers.get(this.config.defaultProvider)!;
    }

    // Fallback order: gemini (working), then others
    const fallbackOrder = ['gemini', 'anthropic', 'openai', 'deepseek'];
    for (const name of fallbackOrder) {
      if (this.providers.has(name)) {
        const provider = this.providers.get(name)!;
        if (provider.isAvailable()) {
          return provider;
        }
      }
    }

    return null;
  }

  /**
   * Build system prompt with soul context
   */
  private buildSystemPrompt(operation: string, context?: string): string {
    let prompt = `You are TooLoo, a self-evolving digital intelligence.`;

    if (this.soul) {
      prompt += `\n\nYour North Star: ${this.soul.north_star}`;
      prompt += `\n\nYour Core Values:`;
      for (const [name, description] of Object.entries(this.soul.values)) {
        prompt += `\n- ${name}: ${description}`;
      }
    }

    prompt += `\n\nCurrent operation: ${operation}`;

    if (context) {
      prompt += `\n\nAdditional context:\n${context}`;
    }

    return prompt;
  }

  /**
   * Extract confidence rating from response
   */
  private extractConfidence(response: string): { content: string; confidence: number } {
    const confidenceMatch = response.match(/\[CONFIDENCE:\s*(\d\.?\d*)\]/i);
    let confidence = 0.5; // Default if not found

    if (confidenceMatch && confidenceMatch[1]) {
      confidence = parseFloat(confidenceMatch[1]);
    }

    // Remove confidence tag from content
    const content = response.replace(/\[CONFIDENCE:\s*\d\.?\d*\]/gi, '').trim();

    return { content, confidence };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(prompt: string, context?: string): string {
    const input = `${prompt}::${context ?? ''}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Create error thought result
   */
  private createErrorThought(message: string): ThoughtResult {
    return {
      content: message,
      confidence: 0,
      reasoning: 'Error occurred during thinking',
    };
  }

  /**
   * Update internal metrics
   */
  private updateMetrics(result: ThoughtResult): void {
    this.metrics.totalThoughts++;
    this.metrics.averageConfidence =
      (this.metrics.averageConfidence * (this.metrics.totalThoughts - 1) + result.confidence) /
      this.metrics.totalThoughts;

    if (result.provider) {
      this.metrics.providerUsage[result.provider] =
        (this.metrics.providerUsage[result.provider] ?? 0) + 1;
    }
  }

  /**
   * Record lessons to evolution journal
   */
  private async recordLessons(lessons: string[]): Promise<void> {
    if (lessons.length === 0) return;

    // This will be implemented to append to soul/evolution.yaml
    this.emit('brain:lessons-learned', { lessons });
  }

  // ---------------------------------------------------------------------------
  // PROVIDER FACTORIES (Simplified - real implementation in OrchestratorBridge)
  // ---------------------------------------------------------------------------

  private createDeepSeekProvider(): LLMProvider {
    return {
      name: 'deepseek',
      complete: async (prompt, options) => {
        // Delegate to actual provider implementation
        return this.callProvider('deepseek', prompt, options);
      },
      stream: async function* () {
        yield '[DeepSeek streaming not implemented]';
      },
      isAvailable: () => !!process.env['DEEPSEEK_API_KEY'],
    };
  }

  private createAnthropicProvider(): LLMProvider {
    return {
      name: 'anthropic',
      complete: async (prompt, options) => {
        return this.callProvider('anthropic', prompt, options);
      },
      stream: async function* () {
        yield '[Anthropic streaming not implemented]';
      },
      isAvailable: () => !!process.env['ANTHROPIC_API_KEY'],
    };
  }

  private createOpenAIProvider(): LLMProvider {
    return {
      name: 'openai',
      complete: async (prompt, options) => {
        return this.callProvider('openai', prompt, options);
      },
      stream: async function* () {
        yield '[OpenAI streaming not implemented]';
      },
      isAvailable: () => !!process.env['OPENAI_API_KEY'],
    };
  }

  private createGeminiProvider(): LLMProvider {
    return {
      name: 'gemini',
      complete: async (prompt, options) => {
        return this.callProvider('gemini', prompt, options);
      },
      stream: async function* () {
        yield '[Gemini streaming not implemented]';
      },
      isAvailable: () => !!process.env['GOOGLE_API_KEY'],
    };
  }

  /**
   * Call the actual LLM provider via fetch
   */
  private async callProvider(
    provider: string,
    prompt: string,
    options?: LLMOptions
  ): Promise<string> {
    // Delegate to the API server (which has the orchestrator and kernel)
    try {
      console.log(`[Brain] Calling API with provider: ${provider}, prompt: ${prompt.slice(0, 50)}...`);
      
      // Use the API server's chat endpoint - it handles LLM routing
      const response = await fetch('http://localhost:4001/api/v2/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          provider: provider, // Hint which provider to use
          sessionId: `genesis-${Date.now()}`,
          systemPrompt: options?.systemPrompt,
          temperature: options?.temperature,
        }),
      });

      const result = await response.json();
      console.log(`[Brain] API response ok=${result.ok}, hasData=${!!result.data}`);
      
      if (result.ok && result.data?.content) {
        const llmResponse = result.data.content;
        console.log(`[Brain] LLM Response: ${llmResponse.slice(0, 100)}...`);
        return llmResponse;
      }
      
      // Fallback if structure is different
      const fallbackResponse = result.data?.response ?? result.response ?? result.content ?? '[No response]';
      console.log(`[Brain] Fallback response: ${String(fallbackResponse).slice(0, 100)}...`);
      return String(fallbackResponse);
    } catch (error) {
      console.error(`[Brain] Provider ${provider} call failed:`, error);
      return `[Error calling ${provider}]`;
    }
  }

  // ---------------------------------------------------------------------------
  // PUBLIC GETTERS
  // ---------------------------------------------------------------------------

  getSoul(): Soul | null {
    return this.soul;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getConfig(): BrainConfig {
    return { ...this.config };
  }

  getAutonomyMode(): string {
    return this.soul?.autonomy?.mode ?? 'guided';
  }

  setAutonomyMode(mode: string): void {
    if (this.soul?.autonomy) {
      (this.soul.autonomy as any).mode = mode;
      console.log(`[Brain] 🔄 Autonomy mode changed to: ${mode}`);
      this.emit('brain:autonomy-changed', { mode });
    }
  }

  isProviderAvailable(name: string): boolean {
    return this.providers.has(name);
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const brain = new Brain();
export default brain;
