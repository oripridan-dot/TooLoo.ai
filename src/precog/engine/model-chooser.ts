// @version 1.1.0
/**
 * Model Chooser - The Neural Router Core
 *
 * The main entry point for intelligent model routing. Supports:
 * - Single-model routing based on intent analysis
 * - Multi-model "Recipes" for complex tasks
 * - Shadow testing for emergent learning
 * - Integration with Knowledge Graph for adaptive routing
 * - Q-Learning based strategy selection via NeuralLearningOptimizer
 *
 * V1.1.0: Integrated NeuralLearningOptimizer for strategy-based routing
 *
 * @module precog/engine/model-chooser
 */

import {
  DynamicModelRegistry,
  dynamicModelRegistry,
  ModelRecommendation,
  RoutingPlan,
  RecipeStep,
  OutcomeData,
  BudgetTier,
  DomainType,
} from './model-registry-dynamic.js';
import { bus } from '../../core/event-bus.js';
import { ProviderEngine } from '../provider-engine.js';
import {
  NeuralLearningOptimizer,
  neuralLearningOptimizer,
  LearningStrategy,
} from './neural-learning-optimizer.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Intent {
  originalPrompt: string;
  taskType?: string;
  features?: string[];
  context?: Record<string, any>;
  sessionId?: string;
  requestId?: string;
}

export interface ComplexityAnalysis {
  complexity: 'low' | 'medium' | 'high';
  isCode: boolean;
  isCreative: boolean;
  isResearch: boolean;
  isAnalysis: boolean;
  tokens: number;
  features: string[];
  confidence: number;
}

export interface ShadowTestResult {
  champion: {
    model: string;
    response?: string;
    latency?: number;
    quality?: number;
  };
  challenger: {
    model: string;
    response?: string;
    latency?: number;
    quality?: number;
  };
  winner: 'champion' | 'challenger' | 'tie';
  judgeReason: string;
  timestamp: number;
}

export interface ExecutionResult {
  plan: RoutingPlan;
  response?: string;
  provider?: string;
  model?: string;
  latency?: number;
  cost?: number;
  shadowTest?: ShadowTestResult;
}

// ============================================================================
// MODEL CHOOSER CLASS
// ============================================================================

export class ModelChooser {
  private registry: DynamicModelRegistry;
  private providerEngine: ProviderEngine;
  private optimizer: NeuralLearningOptimizer;
  private config: {
    budgetTier: BudgetTier;
    shadowTestRate: number;
    enableRecipes: boolean;
    enableShadowTesting: boolean;
    enableStrategyRouting: boolean;
  };

  // Current strategy from optimizer
  private currentStrategy: LearningStrategy = 'efficiency';

  // Shadow test history for analysis
  private shadowTestHistory: ShadowTestResult[] = [];

  // Challenger pool for shadow testing
  private challengerPool: string[] = [
    'deepseek', // Fast and cost-effective
    'gemini', // Multimodal and fast
    'huggingface', // Experimental
  ];

  constructor(config?: Partial<typeof ModelChooser.prototype.config>) {
    this.registry = dynamicModelRegistry;
    this.providerEngine = new ProviderEngine();
    this.optimizer = neuralLearningOptimizer;

    this.config = {
      budgetTier: 'medium',
      shadowTestRate: 0.1, // 10% shadow test rate
      enableRecipes: true,
      enableShadowTesting: true,
      enableStrategyRouting: true, // Use Q-Learning optimizer
      ...config,
    };

    console.log('[ModelChooser] 🧠 Neural Router online');
    console.log(
      `[ModelChooser] Shadow testing: ${this.config.enableShadowTesting ? 'ENABLED' : 'DISABLED'} (${this.config.shadowTestRate * 100}%)`
    );
    console.log(`[ModelChooser] Recipes: ${this.config.enableRecipes ? 'ENABLED' : 'DISABLED'}`);
    console.log(
      `[ModelChooser] Strategy routing: ${this.config.enableStrategyRouting ? 'ENABLED' : 'DISABLED'}`
    );
  }

  // ==========================================================================
  // MAIN ROUTING API
  // ==========================================================================

  /**
   * Main Entry Point: Decides if this is a single task or a complex recipe
   * Now integrates with NeuralLearningOptimizer for strategy-based routing
   */
  async selectRecipeForIntent(intent: Intent): Promise<RoutingPlan> {
    const complexity = this.analyzeComplexity(intent);
    const features = intent.features || this.extractFeatures(intent.originalPrompt);

    console.log(`[ModelChooser] 🎯 Intent analysis: ${complexity.complexity} complexity`);
    console.log(`[ModelChooser] Features detected: ${features.join(', ')}`);

    // 0. Get learning strategy from Neural Optimizer
    if (this.config.enableStrategyRouting) {
      const state = this.optimizer.getCurrentLearningState();
      this.currentStrategy = this.optimizer.selectLearningAction(state);
      const strategyMapping = this.optimizer.getStrategyMapping(this.currentStrategy);

      console.log(
        `[ModelChooser] 🧪 Strategy: ${this.currentStrategy} (budget: ${strategyMapping.budgetTier})`
      );

      // Override budget tier based on strategy
      this.config.budgetTier = strategyMapping.budgetTier;
    }

    // 1. Check for Complex Recipe Triggers
    if (this.config.enableRecipes) {
      if (complexity.complexity === 'high' && complexity.isCode) {
        console.log('[ModelChooser] 📋 Triggering Architect-Builder recipe');
        return this.composeArchitectBuilderRecipe(features);
      }

      if (complexity.isResearch && complexity.tokens > 1000) {
        console.log('[ModelChooser] 📚 Triggering Deep Dive research recipe');
        return this.composeDeepDiveRecipe(features);
      }

      if (complexity.complexity === 'high' && complexity.isCreative) {
        console.log('[ModelChooser] 🎨 Triggering Creative Production recipe');
        return this.composeCreativeRecipe(features);
      }

      if (complexity.complexity === 'high' && complexity.isAnalysis) {
        console.log('[ModelChooser] 🔬 Triggering Analysis recipe');
        return this.composeAnalysisRecipe(features);
      }
    }

    // 2. Strategy-Based Model Selection
    let selectedModel: string | undefined;

    if (this.config.enableStrategyRouting) {
      // Get preferred models from strategy
      const domain = this.detectDomain(features);
      const strategyModels = this.optimizer.mapStrategyToModels(this.currentStrategy, domain);

      // Select from strategy-preferred models
      selectedModel = this.selectFromStrategyModels(strategyModels, features);
      console.log(
        `[ModelChooser] 🎲 Strategy models: ${strategyModels.join(', ')} → ${selectedModel}`
      );
    }

    // 3. Fallback to Registry-based selection
    if (!selectedModel) {
      const bestModels = await this.registry.getBestModels(features, this.config.budgetTier);
      const selected = bestModels[0];
      selectedModel = selected?.provider;
    }

    if (!selectedModel) {
      // Ultimate fallback
      console.log('[ModelChooser] ⚠️ No model found, using fallback');
      return {
        type: 'single',
        model: 'gemini',
        lane: 'fast',
        confidence: 0.5,
        shadowTest: false,
      };
    }

    // Get model recommendation for lane determination
    const bestModels = await this.registry.getBestModels(features, this.config.budgetTier);
    const modelRec = bestModels.find((m) => m.provider === selectedModel) || bestModels[0];

    const lane = modelRec ? this.determineLane(modelRec, complexity) : 'focus';
    const shouldShadowTest = this.shouldRunShadowTest(complexity);

    const plan: RoutingPlan = {
      type: 'single',
      model: selectedModel,
      lane,
      confidence: modelRec?.confidence || 0.6,
      shadowTest: shouldShadowTest,
    };

    // Emit routing decision event
    bus.publish('precog', 'routing:plan', {
      plan,
      features,
      complexity: complexity.complexity,
      requestId: intent.requestId,
      strategy: this.currentStrategy,
    });

    console.log(
      `[ModelChooser] ✅ Selected: ${plan.model} (lane: ${plan.lane}, strategy: ${this.currentStrategy}, confidence: ${plan.confidence.toFixed(2)})`
    );

    return plan;
  }

  /**
   * Select a model from strategy-preferred models
   */
  private selectFromStrategyModels(
    strategyModels: string[],
    features: string[]
  ): string | undefined {
    // Check which models are available
    const providerStatus = this.providerEngine.getProviderStatus();
    const availableModels = strategyModels.filter((model) =>
      providerStatus.some((p) => p.id.startsWith(model) && p.status !== 'Missing Key')
    );

    if (availableModels.length === 0) return undefined;

    // If exploring, pick randomly
    if (this.currentStrategy === 'random_exploration') {
      return availableModels[Math.floor(Math.random() * availableModels.length)];
    }

    // Otherwise, pick first available (preferred order)
    return availableModels[0];
  }

  /**
   * Detect primary domain from features
   */
  private detectDomain(features: string[]): string {
    const domainKeywords: Record<string, string[]> = {
      coding: ['code', 'function', 'debug', 'typescript', 'javascript', 'python', 'react', 'api'],
      creative: ['write', 'story', 'creative', 'design', 'generate'],
      analysis: ['analyze', 'evaluate', 'compare', 'research'],
      general: ['explain', 'help', 'question'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (features.some((f) => keywords.some((k) => f.toLowerCase().includes(k)))) {
        return domain;
      }
    }

    return 'general';
  }

  /**
   * Executes a task, potentially spawning a shadow test
   */
  async executeWithLearning(intent: Intent): Promise<ExecutionResult> {
    const plan = await this.selectRecipeForIntent(intent);
    let shadowResult: ShadowTestResult | undefined;

    // Shadow test opportunity
    if (plan.shadowTest && plan.type === 'single' && this.config.enableShadowTesting) {
      // Run shadow test in background (non-blocking)
      this.runShadowTest(intent, plan)
        .then((result) => {
          if (result) {
            this.shadowTestHistory.push(result);
            // Keep history manageable
            if (this.shadowTestHistory.length > 100) {
              this.shadowTestHistory = this.shadowTestHistory.slice(-50);
            }
          }
        })
        .catch((err) => {
          console.error('[ModelChooser] Shadow test failed:', err);
        });
    }

    return {
      plan,
      shadowTest: shadowResult,
    };
  }

  // ==========================================================================
  // COMPLEXITY ANALYSIS
  // ==========================================================================

  /**
   * Analyzes the complexity of an intent
   */
  analyzeComplexity(intent: Intent): ComplexityAnalysis {
    const prompt = intent.originalPrompt.toLowerCase();
    const tokens = this.estimateTokens(intent.originalPrompt);
    const features = this.extractFeatures(intent.originalPrompt);

    // Code detection
    const codePatterns = [
      /\b(code|function|class|implement|debug|fix|refactor|test|api|endpoint|script)\b/,
      /\b(react|vue|angular|node|python|typescript|javascript|java|go|rust)\b/,
      /\b(database|sql|query|schema|migration)\b/,
      /```[\s\S]*```/,
    ];
    const isCode = codePatterns.some((p) => p.test(prompt)) || intent.taskType === 'code';

    // Creative detection
    const creativePatterns = [
      /\b(write|story|poem|creative|design|imagine|create|generate|art|visual)\b/,
      /\b(ui|ux|interface|layout|color|style)\b/,
    ];
    const isCreative =
      creativePatterns.some((p) => p.test(prompt)) || intent.taskType === 'creative';

    // Research detection
    const researchPatterns = [
      /\b(research|investigate|explore|compare|analyze|study|examine|review)\b/,
      /\b(why|how|what if|explain|summarize|overview)\b/,
    ];
    const isResearch =
      researchPatterns.some((p) => p.test(prompt)) || intent.taskType === 'research';

    // Analysis detection
    const analysisPatterns = [
      /\b(analyze|evaluate|assess|measure|compare|benchmark|audit|review)\b/,
    ];
    const isAnalysis =
      analysisPatterns.some((p) => p.test(prompt)) || intent.taskType === 'analysis';

    // Complexity scoring
    let complexityScore = 0;

    // Token-based complexity
    if (tokens > 500) complexityScore += 1;
    if (tokens > 1000) complexityScore += 1;
    if (tokens > 2000) complexityScore += 1;

    // Multi-step indicators
    const multiStepPatterns = [
      /then|after that|next|finally|step \d/i,
      /first.*then|1\.|2\.|3\./i,
      /multiple|several|various/i,
    ];
    if (multiStepPatterns.some((p) => p.test(prompt))) complexityScore += 1;

    // Technical depth indicators
    const technicalPatterns = [
      /architecture|system design|scalable|distributed/i,
      /optimization|performance|security|authentication/i,
      /integration|microservice|api design/i,
    ];
    if (technicalPatterns.some((p) => p.test(prompt))) complexityScore += 2;

    // Feature count
    if (features.length > 3) complexityScore += 1;
    if (features.length > 5) complexityScore += 1;

    // Determine final complexity
    let complexity: 'low' | 'medium' | 'high';
    if (complexityScore >= 4) complexity = 'high';
    else if (complexityScore >= 2) complexity = 'medium';
    else complexity = 'low';

    return {
      complexity,
      isCode,
      isCreative,
      isResearch,
      isAnalysis,
      tokens,
      features,
      confidence: Math.min(0.9, 0.5 + features.length * 0.05),
    };
  }

  /**
   * Extracts features from a prompt for routing decisions
   */
  extractFeatures(prompt: string): string[] {
    const features: string[] = [];
    const normalized = prompt.toLowerCase();

    // Language/Framework features
    const techPatterns: Record<string, RegExp> = {
      react: /\breact\b/,
      typescript: /\btypescript\b|\bts\b/,
      javascript: /\bjavascript\b|\bjs\b/,
      python: /\bpython\b|\bpy\b/,
      node: /\bnode(\.?js)?\b/,
      sql: /\bsql\b|\bdatabase\b|\bquery\b/,
      api: /\bapi\b|\brendpoint\b|\brest\b/,
      graphql: /\bgraphql\b/,
    };

    for (const [feature, pattern] of Object.entries(techPatterns)) {
      if (pattern.test(normalized)) features.push(feature);
    }

    // Task type features
    if (/\bfix\b|\bdebug\b|\berror\b|\bbug\b/.test(normalized)) features.push('debugging');
    if (/\boptimize\b|\bperformance\b|\bfast(er)?\b/.test(normalized))
      features.push('optimization');
    if (/\btest\b|\bunit\b|\bintegration\b/.test(normalized)) features.push('testing');
    if (/\brefactor\b|\bclean\b|\bimprove\b/.test(normalized)) features.push('refactoring');
    if (/\barchitect(ure)?\b|\bdesign\b|\bsystem\b/.test(normalized)) features.push('architecture');
    if (/\bsecurity\b|\bauth\b|\bencrypt\b/.test(normalized)) features.push('security');
    if (/\bexplain\b|\bwhy\b|\bhow\b/.test(normalized)) features.push('explanation');
    if (/\bgenerate\b|\bcreate\b|\bbuild\b/.test(normalized)) features.push('generation');

    // Complexity features
    if (/\bcomplex\b|\badvanced\b|\bsophisticated\b/.test(normalized)) features.push('complex');
    if (/\bsimple\b|\bbasic\b|\bquick\b/.test(normalized)) features.push('simple');

    return features;
  }

  /**
   * Estimates token count for a prompt
   */
  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // ==========================================================================
  // RECIPE COMPOSITION
  // ==========================================================================

  /**
   * Composes the Architect-Builder recipe for complex code tasks
   */
  composeArchitectBuilderRecipe(features: string[]): RoutingPlan {
    return {
      type: 'recipe',
      name: 'Architect-Builder-Relay',
      steps: [
        {
          role: 'architect',
          model: 'anthropic',
          task: 'design_spec',
          priority: 1,
          fallback: 'gemini',
        },
        {
          role: 'builder',
          model: 'deepseek',
          task: 'implementation',
          priority: 2,
          fallback: 'anthropic',
        },
        {
          role: 'critic',
          model: 'gemini',
          task: 'security_review',
          priority: 3,
          fallback: 'openai',
        },
      ],
      lane: 'deep',
      confidence: 0.85,
    };
  }

  /**
   * Composes the Deep Dive recipe for research tasks
   */
  composeDeepDiveRecipe(features: string[]): RoutingPlan {
    return {
      type: 'recipe',
      name: 'Deep-Dive-Research',
      steps: [
        {
          role: 'researcher',
          model: 'anthropic',
          task: 'deep_analysis',
          priority: 1,
          fallback: 'gemini',
        },
        {
          role: 'synthesizer',
          model: 'gemini',
          task: 'synthesis',
          priority: 2,
          fallback: 'openai',
        },
        {
          role: 'validator',
          model: 'openai',
          task: 'fact_check',
          priority: 3,
          fallback: 'anthropic',
        },
      ],
      lane: 'focus',
      confidence: 0.8,
    };
  }

  /**
   * Composes the Creative Production recipe
   */
  composeCreativeRecipe(features: string[]): RoutingPlan {
    return {
      type: 'recipe',
      name: 'Creative-Production',
      steps: [
        {
          role: 'ideator',
          model: 'openai',
          task: 'brainstorm',
          priority: 1,
          fallback: 'gemini',
        },
        {
          role: 'creator',
          model: 'gemini',
          task: 'generate',
          priority: 2,
          fallback: 'openai',
        },
        {
          role: 'refiner',
          model: 'anthropic',
          task: 'polish',
          priority: 3,
          fallback: 'gemini',
        },
      ],
      lane: 'focus',
      confidence: 0.82,
    };
  }

  /**
   * Composes the Analysis recipe
   */
  composeAnalysisRecipe(features: string[]): RoutingPlan {
    return {
      type: 'recipe',
      name: 'Deep-Analysis',
      steps: [
        {
          role: 'analyzer',
          model: 'anthropic',
          task: 'detailed_analysis',
          priority: 1,
          fallback: 'gemini',
        },
        {
          role: 'synthesizer',
          model: 'gemini',
          task: 'insights_synthesis',
          priority: 2,
          fallback: 'anthropic',
        },
      ],
      lane: 'focus',
      confidence: 0.83,
    };
  }

  // ==========================================================================
  // SHADOW TESTING (EMERGENCE)
  // ==========================================================================

  /**
   * Determines if a shadow test should run
   */
  private shouldRunShadowTest(complexity: ComplexityAnalysis): boolean {
    if (!this.config.enableShadowTesting) return false;

    // Higher chance for medium complexity (good learning opportunity)
    const baseRate = this.config.shadowTestRate;
    let adjustedRate = baseRate;

    if (complexity.complexity === 'medium') adjustedRate *= 1.5;
    if (complexity.complexity === 'low') adjustedRate *= 0.5;

    return Math.random() < adjustedRate;
  }

  /**
   * Runs a shadow test comparing champion vs challenger
   */
  async runShadowTest(intent: Intent, mainPlan: RoutingPlan): Promise<ShadowTestResult | null> {
    if (mainPlan.type !== 'single' || !mainPlan.model) return null;

    // Pick a challenger (different from champion)
    const challenger = this.selectChallenger(mainPlan.model);
    if (!challenger) return null;

    console.log(`[ModelChooser] 🧪 SHADOW TEST: ${mainPlan.model} vs ${challenger}`);

    const startTime = Date.now();

    try {
      // Execute both in parallel (background)
      const [championResult, challengerResult] = await Promise.allSettled([
        this.executeQuiet(intent, mainPlan.model),
        this.executeQuiet(intent, challenger),
      ]);

      const championData = championResult.status === 'fulfilled' ? championResult.value : null;
      const challengerData =
        challengerResult.status === 'fulfilled' ? challengerResult.value : null;

      // Quick quality comparison (lightweight judge)
      const judgment = this.quickJudge(championData, challengerData);

      const result: ShadowTestResult = {
        champion: {
          model: mainPlan.model,
          response: championData?.content?.substring(0, 200),
          latency: championData?.latency,
          quality: championData?.quality || 0.7,
        },
        challenger: {
          model: challenger,
          response: challengerData?.content?.substring(0, 200),
          latency: challengerData?.latency,
          quality: challengerData?.quality || 0.6,
        },
        winner: judgment.winner,
        judgeReason: judgment.reason,
        timestamp: Date.now(),
      };

      // If challenger wins, update registry with positive signal
      if (result.winner === 'challenger') {
        console.log(`[ModelChooser] 🏆 Challenger ${challenger} WON shadow test!`);

        // Record positive outcome for challenger
        await this.registry.recordOutcome(
          intent.features || this.extractFeatures(intent.originalPrompt),
          challenger,
          {
            success: true,
            rating: 0.85,
            latency: challengerData?.latency || 2000,
            quality: 0.85,
          }
        );

        // Emit learning event
        bus.publish('precog', 'shadow-test:challenger-won', {
          champion: mainPlan.model,
          challenger,
          reason: judgment.reason,
        });
      }

      return result;
    } catch (error) {
      console.error('[ModelChooser] Shadow test error:', error);
      return null;
    }
  }

  /**
   * Selects a challenger model for shadow testing
   */
  private selectChallenger(champion: string): string | null {
    // Filter out the champion from the pool
    const candidates = this.challengerPool.filter((c) => c !== champion);
    if (candidates.length === 0) return null;

    // Weighted random selection (prefer diverse challengers)
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  /**
   * Executes a prompt quietly (for shadow testing)
   */
  private async executeQuiet(
    intent: Intent,
    model: string
  ): Promise<{
    content: string;
    latency: number;
    quality: number;
  } | null> {
    const start = Date.now();

    try {
      const result = await this.providerEngine.generate({
        prompt: intent.originalPrompt,
        provider: model,
        taskType: intent.taskType,
        sessionId: `shadow-${intent.sessionId || 'unknown'}`,
      });

      return {
        content: result.content,
        latency: Date.now() - start,
        quality: this.estimateQuality(result.content),
      };
    } catch {
      return null;
    }
  }

  /**
   * Quick quality estimation for shadow test judging
   */
  private estimateQuality(content: string): number {
    if (!content) return 0;

    let score = 0.5; // Base

    // Length (within reason)
    if (content.length > 100) score += 0.1;
    if (content.length > 500) score += 0.1;
    if (content.length > 2000) score -= 0.1; // Too verbose

    // Structure indicators
    if (content.includes('\n')) score += 0.05;
    if (content.includes('```')) score += 0.1; // Code blocks
    if (/^\d+\.|^-\s/m.test(content)) score += 0.05; // Lists

    // Quality indicators
    if (/example|for instance|specifically/i.test(content)) score += 0.05;
    if (/however|although|but|on the other hand/i.test(content)) score += 0.05;

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Quick judge for shadow test comparison
   */
  private quickJudge(
    championData: { content: string; latency: number; quality: number } | null,
    challengerData: { content: string; latency: number; quality: number } | null
  ): { winner: 'champion' | 'challenger' | 'tie'; reason: string } {
    if (!championData && !challengerData) {
      return { winner: 'tie', reason: 'Both failed' };
    }
    if (!challengerData) {
      return { winner: 'champion', reason: 'Challenger failed' };
    }
    if (!championData) {
      return { winner: 'challenger', reason: 'Champion failed' };
    }

    // Multi-factor comparison
    const championScore = championData.quality * 0.6 + (1 - championData.latency / 10000) * 0.4;
    const challengerScore =
      challengerData.quality * 0.6 + (1 - challengerData.latency / 10000) * 0.4;

    const diff = challengerScore - championScore;

    if (diff > 0.1) {
      return {
        winner: 'challenger',
        reason: `Better quality (${(challengerData.quality * 100).toFixed(0)}% vs ${(championData.quality * 100).toFixed(0)}%) and latency (${challengerData.latency}ms vs ${championData.latency}ms)`,
      };
    }
    if (diff < -0.1) {
      return {
        winner: 'champion',
        reason: `Champion better (quality: ${(championData.quality * 100).toFixed(0)}%, latency: ${championData.latency}ms)`,
      };
    }

    return { winner: 'tie', reason: 'Similar performance' };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Determines the execution lane based on model and complexity
   */
  private determineLane(
    model: ModelRecommendation,
    complexity: ComplexityAnalysis
  ): 'fast' | 'focus' | 'deep' | 'audit' {
    // Fast lane for simple tasks with fast models
    if (complexity.complexity === 'low' && model.metrics.avgTime < 1500) {
      return 'fast';
    }

    // Deep lane for complex tasks
    if (complexity.complexity === 'high') {
      return 'deep';
    }

    // Focus lane for medium complexity or analysis tasks
    if (complexity.isAnalysis || complexity.isResearch) {
      return 'focus';
    }

    // Default to focus
    return 'focus';
  }

  /**
   * Records an outcome from actual execution
   * Also feeds into NeuralLearningOptimizer for Q-Learning
   */
  async recordOutcome(features: string[], modelId: string, outcome: OutcomeData): Promise<void> {
    // Record to registry
    await this.registry.recordOutcome(features, modelId, outcome);

    // Feed to optimizer for Q-learning
    if (this.config.enableStrategyRouting) {
      const domain = this.detectDomain(features);
      this.optimizer.recordInteraction({
        strategy: this.currentStrategy,
        model: modelId,
        domain,
        success: outcome.success,
        quality: outcome.quality || (outcome.success ? 0.7 : 0.3),
        latency: outcome.latency,
        cost: outcome.cost || 0.01,
      });
    }
  }

  /**
   * Gets the current shadow test history
   */
  getShadowTestHistory(): ShadowTestResult[] {
    return [...this.shadowTestHistory];
  }

  /**
   * Gets routing statistics including optimizer state
   */
  getRoutingStats(): {
    shadowTests: number;
    challengerWins: number;
    registryState: any;
    optimizerState?: any;
    currentStrategy: LearningStrategy;
  } {
    const challengerWins = this.shadowTestHistory.filter((t) => t.winner === 'challenger').length;

    return {
      shadowTests: this.shadowTestHistory.length,
      challengerWins,
      registryState: this.registry.getRegistryState(),
      optimizerState: this.config.enableStrategyRouting ? this.optimizer.getStatus() : undefined,
      currentStrategy: this.currentStrategy,
    };
  }

  /**
   * Get the Neural Learning Optimizer instance
   */
  getOptimizer(): NeuralLearningOptimizer {
    return this.optimizer;
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...config };
    console.log('[ModelChooser] Configuration updated:', this.config);
  }
}

// Export singleton instance
export const modelChooser = new ModelChooser();
export default ModelChooser;

// Re-export types from model-registry-dynamic for convenience
export type {
  RoutingPlan,
  RecipeStep,
  OutcomeData,
  BudgetTier,
  DomainType,
  ModelRecommendation,
} from './model-registry-dynamic.js';
