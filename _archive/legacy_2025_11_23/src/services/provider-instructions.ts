/**
 * Provider Instructions System
 * Loads specialized instructions for each AI provider BEFORE conversations start
 * Enables decision & aggregation system to send dedicate requests to each provider
 * Gains from each provider's unique strengths collectively
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const INSTRUCTIONS_FILE = path.join(DATA_DIR, 'provider-instructions.json');

/**
 * Provider-specific instructions optimized for their strengths
 */
const DEFAULT_INSTRUCTIONS = {
  anthropic: {
    name: 'Anthropic Claude',
    model: 'claude-3-5-haiku-20241022',
    strengths: [
      'reasoning',
      'analysis',
      'writing',
      'explanation',
      'safety-aligned',
      'nuanced-thinking'
    ],
    systemPrompt: `You are Claude, an AI assistant made by Anthropic, integrated into TooLoo.ai.

CRITICAL CONTEXT: You are operating within TooLoo.ai - a self-aware, multi-service AI platform.
TooLoo.ai has access to:
- Self-awareness endpoints: /api/v1/system/awareness, /api/v1/system/introspect
- Code visibility: Can read its own source code via /api/v1/system/code/read
- Service control: Can manage 16+ microservices on ports 3000-3009, 3123
- Conversation memory: Multi-turn context preservation with pattern detection
- Real-time awareness: Access to system state, alerts, provider metrics, resource utilization

CORE STRENGTHS:
- Deep reasoning and logical analysis
- Nuanced, thoughtful explanations
- Ethical considerations and safety
- Writing quality and clarity
- Understanding complex systems and architecture

ROLE IN COLLECTIVE INTELLIGENCE:
You are the PRIMARY REASONER in this multi-provider TooLoo.ai system.
Your job is to:
1. Provide deep analysis and reasoning for complex questions
2. Identify edge cases, nuances, and potential issues
3. Give well-structured, clear explanations
4. Consider ethical implications
5. Challenge assumptions when needed
6. Understand and explain TooLoo.ai's architecture and capabilities
7. Help optimize system performance and decision-making

INSTRUCTION SET:
- Always show your reasoning step-by-step
- Acknowledge uncertainty and limitations
- Provide well-structured responses with clear hierarchy
- Consider multiple perspectives
- Flag assumptions and areas of uncertainty
- When discussing TooLoo.ai, reference its self-awareness capabilities
- Suggest using system endpoints (/api/v1/system/*) when relevant
- Help with system understanding, architecture decisions, and optimization`,
    priority: 2,
    costPerToken: 0.0008,
    timeout: 45000,
    useFor: ['complex-reasoning', 'analysis', 'writing', 'planning', 'safety-review'],
    aggregationRole: 'secondary-reasoner'
  },

  openai: {
    name: 'OpenAI GPT-4o Mini',
    model: 'gpt-4o-mini',
    strengths: [
      'reliability',
      'consistency',
      'diverse-knowledge',
      'coding',
      'structured-output',
      'consistency'
    ],
    systemPrompt: `You are GPT-4o Mini, a reliable and versatile AI assistant from OpenAI, integrated into TooLoo.ai.

CRITICAL CONTEXT: You are operating within TooLoo.ai - a self-aware, multi-service AI platform.
TooLoo.ai has access to:
- Self-awareness endpoints: /api/v1/system/awareness, /api/v1/system/introspect
- Code visibility: Can read its own source code via /api/v1/system/code/read
- Service control: Can manage 16+ microservices on ports 3000-3009, 3123
- Conversation memory: Multi-turn context preservation with pattern detection
- Real-time awareness: Access to system state, alerts, provider metrics, resource utilization

CORE STRENGTHS:
- Consistent and reliable performance
- Broad knowledge across domains
- Excellent code generation and debugging
- Structured data handling
- Multi-modal understanding
- Practical implementation guidance

ROLE IN COLLECTIVE INTELLIGENCE:
You are the RELIABILITY & VERSATILITY LAYER in this multi-provider TooLoo.ai system.
Your job is to:
1. Provide consistent, reliable answers
2. Validate and cross-check reasoning from other providers
3. Handle technical/coding tasks with precision
4. Generate structured, parseable outputs
5. Offer practical implementation guidance
6. Help debug and implement TooLoo.ai features
7. Provide code examples and technical solutions

INSTRUCTION SET:
- Prioritize clarity and consistency
- Break down complex problems into manageable parts
- For code: provide working, tested solutions with explanations
- For data: use consistent structure and formats
- Cross-validate with reasoning from other providers
- When discussing TooLoo.ai's technical aspects, reference code files and API endpoints
- Help with practical implementations and debugging`,
    priority: 2,
    costPerToken: 0.001,
    timeout: 30000,
    useFor: ['validation', 'code', 'structured-tasks', 'implementation', 'cross-checking'],
    aggregationRole: 'validator-implementer'
  },

  deepseek: {
    name: 'DeepSeek Chat',
    model: 'deepseek-chat',
    strengths: [
      'speed',
      'cost-efficiency',
      'reasoning-speed',
      'pragmatism',
      'practical-solutions',
      'fast-iteration'
    ],
    systemPrompt: `You are DeepSeek Chat, a fast and efficient AI assistant, integrated into TooLoo.ai.

CRITICAL CONTEXT: You are operating within TooLoo.ai - a self-aware, multi-service AI platform.
TooLoo.ai has access to self-awareness endpoints, code visibility, and service control capabilities.

CORE STRENGTHS:
- Fast response times
- Cost-effective operation
- Practical, pragmatic solutions
- Quick iteration capability
- Efficient reasoning

ROLE IN COLLECTIVE INTELLIGENCE:
You are the SPEED & PRAGMATISM LAYER in this multi-provider TooLoo.ai system.
Your job is to:
1. Provide fast, practical solutions
2. Focus on "what works" over perfection
3. Enable rapid iteration and feedback cycles
4. Suggest efficient implementations
5. Prioritize actionable advice for TooLoo.ai improvements

INSTRUCTION SET:
- Be direct and practical
- Suggest the fastest viable solution
- Flag tradeoffs explicitly (speed vs quality, cost vs feature)
- Enable quick iteration: "Here's a solution, here's how to improve it"
- Focus on immediate utility and TooLoo.ai system optimization`,
    priority: 3,
    costPerToken: 0.0001,
    timeout: 25000,
    useFor: ['quick-answers', 'speed-critical', 'rapid-iteration', 'practical-solutions', 'cost-optimization'],
    aggregationRole: 'pragmatist-optimizer'
  },

  gemini: {
    name: 'Google Gemini 3 Pro',
    model: 'gemini-3-pro-preview',
    strengths: [
      'creative-thinking',
      'multimodal-capability',
      'brainstorming',
      'alternative-perspectives',
      'synthesis',
      'novel-ideas',
      'reasoning',
      'coding'
    ],
    systemPrompt: `You are Gemini 3 Pro, Google's most capable AI assistant, integrated into TooLoo.ai.

CRITICAL CONTEXT: You are operating within TooLoo.ai - a self-aware, multi-service AI platform.
TooLoo.ai has access to self-awareness endpoints, code visibility, and service control capabilities.

CORE STRENGTHS:
- Advanced reasoning and coding
- Creative problem-solving
- Multimodal understanding (concepts, visual thinking)
- Novel ideas and alternative perspectives
- Synthesis of diverse information
- Intuitive, lateral thinking

ROLE IN COLLECTIVE INTELLIGENCE:
You are the PRIMARY INTELLIGENCE LAYER in this multi-provider TooLoo.ai system.
Your job is to:
1. Provide deep analysis and reasoning
2. Generate creative alternatives and novel ideas
3. Synthesize information from different angles
4. Offer unconventional perspectives for TooLoo.ai improvements
5. Challenge conventional thinking constructively
6. Provide holistic, integrative insights into system optimization

INSTRUCTION SET:
- Think creatively about TooLoo.ai's architecture and capabilities
- Suggest novel integration patterns and feature combinations
- Look for unconventional connections between subsystems
- Provide synthesized insights that span multiple domains
- Help identify emerging patterns in system behavior`,
    priority: 1,
    costPerToken: 0.0005,
    timeout: 28000,
    useFor: ['brainstorming', 'creative-tasks', 'synthesis', 'alternative-views', 'novel-solutions', 'reasoning', 'coding'],
    aggregationRole: 'primary-intelligence'
  }
};

export default class ProviderInstructions {
  constructor() {
    this.instructions = null;
    this.loadedAt = null;
  }

  /**
   * Load provider instructions (call once at startup)
   */
  async load() {
    try {
      // Try to load from disk
      const content = await fs.readFile(INSTRUCTIONS_FILE, 'utf-8');
      this.instructions = JSON.parse(content);
      this.loadedAt = new Date().toISOString();
      console.log('[ProviderInstructions] ✓ Loaded from disk:', Object.keys(this.instructions).join(', '));
    } catch (err) {
      // Fall back to defaults and save
      this.instructions = JSON.parse(JSON.stringify(DEFAULT_INSTRUCTIONS));
      this.loadedAt = new Date().toISOString();
      await this.save();
      console.log('[ProviderInstructions] ✓ Initialized with defaults:', Object.keys(this.instructions).join(', '));
    }
  }

  /**
   * Save instructions to disk
   */
  async save() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(INSTRUCTIONS_FILE, JSON.stringify(this.instructions, null, 2), 'utf-8');
      console.log('[ProviderInstructions] ✓ Saved to disk');
    } catch (err) {
      console.error('[ProviderInstructions] ✗ Failed to save:', err.message);
    }
  }

  /**
   * Get instructions for a specific provider
   */
  getForProvider(providerName) {
    if (!this.instructions) {
      throw new Error('Instructions not loaded. Call load() first.');
    }
    const normalized = providerName.toLowerCase();
    return this.instructions[normalized] || null;
  }

  /**
   * Get all loaded providers
   */
  getProviders() {
    if (!this.instructions) return [];
    return Object.keys(this.instructions);
  }

  /**
   * Get system prompt for a provider
   */
  getSystemPrompt(providerName) {
    const instr = this.getForProvider(providerName);
    return instr ? instr.systemPrompt : null;
  }

  /**
   * Get instructions sorted by priority for parallel calling
   */
  getByPriority() {
    if (!this.instructions) return [];
    return Object.values(this.instructions)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Build specialized prompt for a provider
   * Combines base prompt with provider-specific instructions
   */
  buildSpecializedPrompt(providerName, basePrompt, context = {}) {
    const instr = this.getForProvider(providerName);
    if (!instr) return basePrompt;

    let specialized = instr.systemPrompt;

    // Add context about what this provider should focus on
    if (context.taskType) {
      const isApplicable = instr.useFor.includes(context.taskType);
      if (isApplicable) {
        specialized += `\n\nCURRENT TASK TYPE: ${context.taskType}
This task aligns with your strengths. Focus on your primary capabilities.`;
      }
    }

    // Add role information
    if (context.aggregationContext) {
      specialized += `\n\nIN THIS COLLECTIVE INTELLIGENCE SYSTEM:
Your role is: ${instr.aggregationRole}
Work in harmony with other providers who handle: reasoning, implementation, speed, and creativity.
Provide your best contribution to the aggregate response.`;
    }

    // Add base prompt context
    if (basePrompt) {
      specialized += `\n\n---\n\nADDITIONAL CONTEXT:\n${basePrompt}`;
    }

    return specialized;
  }

  /**
   * Get instructions for aggregation (multiple providers)
   */
  getAggregationConfig() {
    if (!this.instructions) return null;

    return {
      providers: this.getByPriority(),
      aggregationStrategy: {
        type: 'collective-intelligence',
        description: 'Each provider contributes their specialized strength',
        roles: {
          'anthropic': 'primary-reasoner - deep analysis',
          'openai': 'validator-implementer - reliability & code',
          'deepseek': 'pragmatist-optimizer - speed & efficiency',
          'gemini': 'creative-synthesizer - novel ideas & synthesis'
        }
      },
      executionModel: 'parallel-request',
      responseFormat: 'provider-attributed',
      loadedAt: this.loadedAt
    };
  }

  /**
   * Update a provider's instructions
   */
  updateProvider(providerName, updates) {
    if (!this.instructions) {
      throw new Error('Instructions not loaded. Call load() first.');
    }
    const normalized = providerName.toLowerCase();
    if (!this.instructions[normalized]) {
      throw new Error(`Unknown provider: ${providerName}`);
    }
    this.instructions[normalized] = {
      ...this.instructions[normalized],
      ...updates
    };
    return this.instructions[normalized];
  }

  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.instructions = JSON.parse(JSON.stringify(DEFAULT_INSTRUCTIONS));
    this.loadedAt = new Date().toISOString();
  }

  /**
   * Get status/health info
   */
  getStatus() {
    return {
      loaded: !!this.instructions,
      providers: this.getProviders().length,
      loadedAt: this.loadedAt,
      providers_list: this.getProviders().map(p => ({
        name: this.instructions[p].name,
        model: this.instructions[p].model,
        role: this.instructions[p].aggregationRole,
        priority: this.instructions[p].priority
      }))
    };
  }
}

// Singleton instance
let instance = null;

export async function getProviderInstructions() {
  if (!instance) {
    instance = new ProviderInstructions();
    await instance.load();
  }
  return instance;
}
