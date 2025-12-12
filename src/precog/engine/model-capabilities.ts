// @version 3.3.565
/**
 * Model Capabilities Matrix
 *
 * Phase 5: Intelligence Layer Optimization
 *
 * Comprehensive capability profiles for all supported models, enabling
 * intelligent routing based on task requirements.
 *
 * @module precog/engine/model-capabilities
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CapabilityDomain =
  | 'coding'
  | 'creative'
  | 'analysis'
  | 'reasoning'
  | 'multimodal'
  | 'conversation'
  | 'research'
  | 'generation';

export type CapabilityLevel = 'expert' | 'proficient' | 'capable' | 'limited';

export interface ModelCapability {
  domain: CapabilityDomain;
  level: CapabilityLevel;
  score: number; // 0-100
  specializations: string[];
}

export interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  maxOutput: number;
  costPer1kTokens: {
    input: number;
    output: number;
  };
  latencyMs: {
    average: number;
    p95: number;
  };
  capabilities: ModelCapability[];
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  avoidFor: string[];
  fallbackChain: string[];
}

export interface TaskProfile {
  type: string;
  requiredCapabilities: CapabilityDomain[];
  preferredLevel: CapabilityLevel;
  complexity: 'low' | 'medium' | 'high';
  timeConstraint?: 'fast' | 'balanced' | 'quality';
  budgetConstraint?: 'low' | 'medium' | 'high';
}

// ─────────────────────────────────────────────────────────────────────────────
// Model Capability Matrix
// ─────────────────────────────────────────────────────────────────────────────

export const MODEL_PROFILES: Record<string, ModelProfile> = {
  // ─────────────────────────────────────────────────────────────────────────
  // DeepSeek
  // ─────────────────────────────────────────────────────────────────────────
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek Coder V2',
    provider: 'deepseek',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kTokens: { input: 0.00014, output: 0.00028 },
    latencyMs: { average: 800, p95: 1500 },
    capabilities: [
      {
        domain: 'coding',
        level: 'expert',
        score: 95,
        specializations: ['typescript', 'python', 'rust', 'go', 'debugging', 'refactoring'],
      },
      {
        domain: 'analysis',
        level: 'proficient',
        score: 80,
        specializations: ['code-review', 'architecture'],
      },
      {
        domain: 'reasoning',
        level: 'proficient',
        score: 75,
        specializations: ['technical', 'mathematical'],
      },
      {
        domain: 'generation',
        level: 'capable',
        score: 70,
        specializations: ['code-generation', 'api-design'],
      },
    ],
    strengths: [
      'Fast inference',
      'Excellent at coding',
      'Very cost-effective',
      'Large context window',
    ],
    weaknesses: ['Limited creative writing', 'Weaker at multimodal', 'Less conversational'],
    bestFor: [
      'Code generation',
      'Debugging',
      'Code review',
      'Technical documentation',
      'API design',
    ],
    avoidFor: ['Creative writing', 'Image analysis', 'Casual conversation'],
    fallbackChain: ['anthropic', 'gemini', 'openai'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Anthropic Claude
  // ─────────────────────────────────────────────────────────────────────────
  anthropic: {
    id: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    costPer1kTokens: { input: 0.003, output: 0.015 },
    latencyMs: { average: 1500, p95: 3000 },
    capabilities: [
      {
        domain: 'reasoning',
        level: 'expert',
        score: 98,
        specializations: ['complex-reasoning', 'multi-step', 'safety'],
      },
      {
        domain: 'coding',
        level: 'expert',
        score: 92,
        specializations: ['architecture', 'full-stack', 'debugging'],
      },
      {
        domain: 'analysis',
        level: 'expert',
        score: 95,
        specializations: ['research', 'evaluation', 'critique'],
      },
      {
        domain: 'creative',
        level: 'proficient',
        score: 85,
        specializations: ['technical-writing', 'documentation'],
      },
      {
        domain: 'conversation',
        level: 'expert',
        score: 90,
        specializations: ['nuanced', 'contextual'],
      },
    ],
    strengths: [
      'Deep reasoning',
      'Safety-focused',
      'Excellent analysis',
      'Large context',
      'High quality',
    ],
    weaknesses: ['Higher cost', 'Slower response', 'No image generation'],
    bestFor: [
      'Complex reasoning',
      'Code architecture',
      'Research analysis',
      'Safety-critical tasks',
      'Long documents',
    ],
    avoidFor: ['Simple queries', 'Budget-constrained tasks', 'Real-time applications'],
    fallbackChain: ['gemini', 'openai', 'deepseek'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // OpenAI GPT-4
  // ─────────────────────────────────────────────────────────────────────────
  openai: {
    id: 'openai',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kTokens: { input: 0.01, output: 0.03 },
    latencyMs: { average: 1200, p95: 2500 },
    capabilities: [
      {
        domain: 'creative',
        level: 'expert',
        score: 92,
        specializations: ['storytelling', 'copywriting', 'brainstorming'],
      },
      {
        domain: 'coding',
        level: 'proficient',
        score: 85,
        specializations: ['full-stack', 'frontend', 'explanations'],
      },
      {
        domain: 'conversation',
        level: 'expert',
        score: 95,
        specializations: ['natural', 'engaging', 'helpful'],
      },
      {
        domain: 'generation',
        level: 'expert',
        score: 90,
        specializations: ['content', 'ideas', 'variations'],
      },
      {
        domain: 'multimodal',
        level: 'proficient',
        score: 80,
        specializations: ['image-understanding', 'diagrams'],
      },
    ],
    strengths: ['Versatile', 'Creative', 'Natural conversation', 'Well-rounded', 'Reliable'],
    weaknesses: ['Higher cost', 'Rate limits', 'Occasional verbosity'],
    bestFor: [
      'Creative writing',
      'Content generation',
      'User-facing chat',
      'General tasks',
      'Brainstorming',
    ],
    avoidFor: ['Budget-constrained tasks', 'Pure code generation', 'High-volume processing'],
    fallbackChain: ['anthropic', 'gemini', 'deepseek'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Google Gemini
  // ─────────────────────────────────────────────────────────────────────────
  gemini: {
    id: 'gemini',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: 1000000,
    maxOutput: 8192,
    costPer1kTokens: { input: 0.00125, output: 0.005 },
    latencyMs: { average: 1000, p95: 2000 },
    capabilities: [
      {
        domain: 'multimodal',
        level: 'expert',
        score: 95,
        specializations: ['image', 'video', 'audio', 'pdf'],
      },
      {
        domain: 'analysis',
        level: 'expert',
        score: 90,
        specializations: ['document-analysis', 'summarization'],
      },
      {
        domain: 'reasoning',
        level: 'proficient',
        score: 85,
        specializations: ['logical', 'mathematical'],
      },
      {
        domain: 'coding',
        level: 'proficient',
        score: 82,
        specializations: ['general', 'explanations'],
      },
      {
        domain: 'generation',
        level: 'proficient',
        score: 80,
        specializations: ['structured-output', 'json'],
      },
    ],
    strengths: ['Massive context', 'Multimodal', 'Cost-effective', 'Fast', 'Good at analysis'],
    weaknesses: ['Sometimes verbose', 'Weaker at nuanced reasoning', 'Variable quality'],
    bestFor: [
      'Document analysis',
      'Image understanding',
      'Long context tasks',
      'Multimodal queries',
      'Cost-effective analysis',
    ],
    avoidFor: ['Safety-critical tasks', 'Nuanced creative writing', 'Complex multi-step reasoning'],
    fallbackChain: ['anthropic', 'openai', 'deepseek'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ZhiPu GLM
  // ─────────────────────────────────────────────────────────────────────────
  zhipu: {
    id: 'zhipu',
    name: 'GLM-4',
    provider: 'zhipu',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kTokens: { input: 0.001, output: 0.002 },
    latencyMs: { average: 900, p95: 1800 },
    capabilities: [
      { domain: 'coding', level: 'proficient', score: 78, specializations: ['python', 'general'] },
      {
        domain: 'conversation',
        level: 'proficient',
        score: 80,
        specializations: ['chinese', 'bilingual'],
      },
      { domain: 'generation', level: 'capable', score: 72, specializations: ['text', 'summaries'] },
      { domain: 'analysis', level: 'capable', score: 70, specializations: ['basic'] },
    ],
    strengths: ['Very cost-effective', 'Good for Chinese content', 'Fast responses'],
    weaknesses: ['Limited English nuance', 'Weaker reasoning', 'Smaller community'],
    bestFor: ['Budget tasks', 'Chinese content', 'Simple queries', 'High-volume processing'],
    avoidFor: ['Complex reasoning', 'Critical tasks', 'Creative English writing'],
    fallbackChain: ['deepseek', 'gemini', 'openai'],
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Ollama (Local)
  // ─────────────────────────────────────────────────────────────────────────
  ollama: {
    id: 'ollama',
    name: 'Ollama Local',
    provider: 'ollama',
    contextWindow: 32000,
    maxOutput: 4096,
    costPer1kTokens: { input: 0, output: 0 },
    latencyMs: { average: 2000, p95: 5000 },
    capabilities: [
      { domain: 'coding', level: 'capable', score: 65, specializations: ['general'] },
      { domain: 'conversation', level: 'capable', score: 60, specializations: ['basic'] },
      { domain: 'generation', level: 'capable', score: 60, specializations: ['text'] },
    ],
    strengths: ['Free', 'Private', 'Offline capable', 'No rate limits'],
    weaknesses: ['Variable quality', 'Requires local setup', 'Resource intensive', 'Slower'],
    bestFor: ['Privacy-sensitive tasks', 'Offline work', 'Experimentation', 'Unlimited queries'],
    avoidFor: ['Production tasks', 'Quality-critical work', 'Complex reasoning'],
    fallbackChain: ['deepseek', 'gemini'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Task Profiles
// ─────────────────────────────────────────────────────────────────────────────

export const TASK_PROFILES: Record<string, TaskProfile> = {
  'code-generation': {
    type: 'code-generation',
    requiredCapabilities: ['coding', 'generation'],
    preferredLevel: 'expert',
    complexity: 'medium',
  },
  'code-review': {
    type: 'code-review',
    requiredCapabilities: ['coding', 'analysis'],
    preferredLevel: 'expert',
    complexity: 'medium',
  },
  debugging: {
    type: 'debugging',
    requiredCapabilities: ['coding', 'reasoning'],
    preferredLevel: 'expert',
    complexity: 'high',
  },
  architecture: {
    type: 'architecture',
    requiredCapabilities: ['coding', 'reasoning', 'analysis'],
    preferredLevel: 'expert',
    complexity: 'high',
  },
  'creative-writing': {
    type: 'creative-writing',
    requiredCapabilities: ['creative', 'generation'],
    preferredLevel: 'expert',
    complexity: 'medium',
  },
  research: {
    type: 'research',
    requiredCapabilities: ['analysis', 'reasoning', 'research'],
    preferredLevel: 'expert',
    complexity: 'high',
  },
  conversation: {
    type: 'conversation',
    requiredCapabilities: ['conversation'],
    preferredLevel: 'proficient',
    complexity: 'low',
  },
  'document-analysis': {
    type: 'document-analysis',
    requiredCapabilities: ['analysis', 'multimodal'],
    preferredLevel: 'proficient',
    complexity: 'medium',
  },
  'image-understanding': {
    type: 'image-understanding',
    requiredCapabilities: ['multimodal'],
    preferredLevel: 'expert',
    complexity: 'medium',
  },
  summarization: {
    type: 'summarization',
    requiredCapabilities: ['analysis', 'generation'],
    preferredLevel: 'proficient',
    complexity: 'low',
  },
  'quick-query': {
    type: 'quick-query',
    requiredCapabilities: ['conversation'],
    preferredLevel: 'capable',
    complexity: 'low',
    timeConstraint: 'fast',
    budgetConstraint: 'low',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Capability Matrix Service
// ─────────────────────────────────────────────────────────────────────────────

export class ModelCapabilityService {
  private profiles: Record<string, ModelProfile>;

  constructor() {
    this.profiles = MODEL_PROFILES;
  }

  /**
   * Get the best models for a specific task type
   */
  getBestModelsForTask(taskType: string, count: number = 3): string[] {
    const taskProfile = TASK_PROFILES[taskType];
    if (!taskProfile) {
      // Fallback to general routing
      return ['gemini', 'anthropic', 'deepseek'].slice(0, count);
    }

    const scores = this.scoreModelsForTask(taskProfile);
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((s) => s.modelId);
  }

  /**
   * Score all models for a task profile
   */
  private scoreModelsForTask(task: TaskProfile): Array<{ modelId: string; score: number }> {
    const results: Array<{ modelId: string; score: number }> = [];

    for (const [modelId, profile] of Object.entries(this.profiles)) {
      let score = 0;

      // Score based on required capabilities
      for (const requiredDomain of task.requiredCapabilities) {
        const capability = profile.capabilities.find((c) => c.domain === requiredDomain);
        if (capability) {
          const levelMultiplier = this.getLevelMultiplier(capability.level, task.preferredLevel);
          score += capability.score * levelMultiplier;
        } else {
          score -= 20; // Penalty for missing capability
        }
      }

      // Adjust for constraints
      if (task.timeConstraint === 'fast') {
        score += (3000 - profile.latencyMs.average) / 30; // Bonus for low latency
      }
      if (task.budgetConstraint === 'low') {
        const totalCost = profile.costPer1kTokens.input + profile.costPer1kTokens.output;
        score += (0.05 - totalCost) * 1000; // Bonus for low cost
      }

      // Complexity adjustment
      if (task.complexity === 'high') {
        const reasoningCap = profile.capabilities.find((c) => c.domain === 'reasoning');
        if (reasoningCap) score += reasoningCap.score * 0.3;
      }

      results.push({ modelId, score });
    }

    return results;
  }

  /**
   * Get multiplier based on capability level vs required level
   */
  private getLevelMultiplier(actual: CapabilityLevel, required: CapabilityLevel): number {
    const levels: Record<CapabilityLevel, number> = {
      expert: 4,
      proficient: 3,
      capable: 2,
      limited: 1,
    };

    const actualValue = levels[actual];
    const requiredValue = levels[required];

    if (actualValue >= requiredValue) return 1.0;
    if (actualValue === requiredValue - 1) return 0.8;
    return 0.5;
  }

  /**
   * Get fallback chain for a model
   */
  getFallbackChain(modelId: string, depth: number = 3): string[] {
    const chain = this.profiles[modelId]?.fallbackChain || ['gemini', 'anthropic', 'deepseek'];
    return chain.slice(0, depth);
  }

  /**
   * Get model profile
   */
  getProfile(modelId: string): ModelProfile | undefined {
    return this.profiles[modelId];
  }

  /**
   * Get model profile (alias for intelligent-router compatibility)
   */
  getModelProfile(modelId: string): ModelProfile | undefined {
    return this.profiles[modelId];
  }

  /**
   * Get task profile by type
   */
  getTaskProfile(taskType: string): TaskProfile | undefined {
    return TASK_PROFILES[taskType];
  }

  /**
   * Score models for a task with budget/quality constraints
   */
  scoreModelsForTask(
    task: TaskProfile | undefined,
    maxBudget: number = 0.1,
    minQuality: number = 0.7
  ): Array<{ modelId: string; score: number }> {
    if (!task) {
      // Return default scores if no task profile
      return Object.keys(this.profiles).map((modelId) => ({
        modelId,
        score: 0.5,
      }));
    }
    return this.calculateTaskScores(task, maxBudget, minQuality);
  }

  /**
   * Internal method to calculate task scores
   */
  private calculateTaskScores(
    task: TaskProfile,
    maxBudget: number,
    minQuality: number
  ): Array<{ modelId: string; score: number }> {
    const results: Array<{ modelId: string; score: number }> = [];

    for (const [modelId, profile] of Object.entries(this.profiles)) {
      let score = 50; // Base score

      // Score based on required capabilities
      for (const requiredDomain of task.requiredCapabilities) {
        const capability = profile.capabilities.find((c) => c.domain === requiredDomain);
        if (capability) {
          const levelMultiplier = this.getLevelMultiplier(capability.level, task.preferredLevel);
          score += capability.score * levelMultiplier * 0.3;
        } else {
          score -= 15; // Penalty for missing capability
        }
      }

      // Budget constraint
      const totalCost = profile.costPer1kTokens.input + profile.costPer1kTokens.output;
      if (totalCost <= maxBudget) {
        score += 10;
      } else {
        score -= (totalCost - maxBudget) * 100;
      }

      // Latency consideration
      if (task.timeConstraint === 'fast') {
        score += (3000 - profile.latencyMs.average) / 100;
      }

      // Quality consideration for high complexity
      if (task.complexity === 'high') {
        const reasoningCap = profile.capabilities.find((c) => c.domain === 'reasoning');
        if (reasoningCap) score += reasoningCap.score * 0.2;
      }

      results.push({ modelId, score: Math.max(0, Math.min(100, score)) });
    }

    return results;
  }

  /**
   * Check if model is suitable for a domain
   */
  isSuitableFor(
    modelId: string,
    domain: CapabilityDomain,
    minLevel: CapabilityLevel = 'capable'
  ): boolean {
    const profile = this.profiles[modelId];
    if (!profile) return false;

    const capability = profile.capabilities.find((c) => c.domain === domain);
    if (!capability) return false;

    const levels: CapabilityLevel[] = ['limited', 'capable', 'proficient', 'expert'];
    return levels.indexOf(capability.level) >= levels.indexOf(minLevel);
  }

  /**
   * Get all models suitable for a domain
   */
  getModelsForDomain(domain: CapabilityDomain, minLevel: CapabilityLevel = 'capable'): string[] {
    return Object.keys(this.profiles).filter((id) => this.isSuitableFor(id, domain, minLevel));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Export
// ─────────────────────────────────────────────────────────────────────────────

export const modelCapabilityService = new ModelCapabilityService();
export default modelCapabilityService;
