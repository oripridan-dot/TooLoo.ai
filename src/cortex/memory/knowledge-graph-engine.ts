// @version 2.2.273
/**
 * Cross-Goal Knowledge Graph Engine
 * Tracks relationships between goals, tasks, and provider performance across different contexts
 * Builds a knowledge graph to optimize provider selection and task routing
 */

interface NodeData {
  id: string;
  type: string;
  [key: string]: any;
}

interface EdgeData {
  id: string;
  from: string;
  to: string;
  type: string;
  strength: number;
  created: number;
  [key: string]: any;
}

interface GoalMetadata {
  id: string;
  name: string;
  [key: string]: any;
}

interface ProviderProfile {
  id: string;
  name: string;
  capabilities: string[];
  performanceProfile: {
    speed: number;
    reliability: number;
    cost: number;
    quality: number;
  };
  goalPerformance: Map<string, GoalPerformance>;
  taskHistory: any[];
  lastUpdated: number;
  metrics: {
    avgLatency: number;
    successRate: number;
    totalRequests: number;
  };
}

interface GoalPerformance {
  attempts: number;
  successes: number;
  totalTime: number;
  totalCost: number;
  qualitySum: number;
  avgTime: number;
  avgCost: number;
  avgQuality: number;
  successRate: number;
  lastAttempt: number | null;
}

interface TaskMetadata {
  id: string;
  goal: string;
  context: any;
  performance: any[];
  created: number;
}

interface CorrelationData {
  goal: string;
  provider: string;
  samples: number;
  successRate: number;
  avgTime: number;
  avgCost: number;
  avgQuality: number;
  timeQualityCorr: number;
  costQualityCorr: number;
  lastUpdated: number;
}

interface LearningEntry {
  taskId: string;
  goal: string;
  provider: string;
  success: boolean;
  responseTime: number;
  cost: number;
  quality: number;
  context: any;
  timestamp: number;
}

export default class KnowledgeGraphEngine {
  private nodes: Map<string, NodeData>;
  private edges: Map<string, EdgeData>;
  private goals: Map<string, GoalMetadata>;
  private providers: Map<string, ProviderProfile>;
  private tasks: Map<string, TaskMetadata>;
  private correlationMatrix: Map<string, CorrelationData>;
  private learningHistory: LearningEntry[];

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.goals = new Map();
    this.providers = new Map();
    this.tasks = new Map();

    // Performance correlation matrix
    this.correlationMatrix = new Map();

    // Learning history for recommendations
    this.learningHistory = [];

    // Initialize with known providers
    this.initializeProviders();
  }

  /**
   * Initialize provider profiles
   */
  initializeProviders() {
    const providers = [
      'huggingface',
      'deepseek',
      'openinterpreter',
      'anthropic',
      'openai',
      'gemini',
    ];

    providers.forEach((provider) => {
      this.providers.set(provider, {
        id: provider,
        name: provider,
        capabilities: this.getProviderCapabilities(provider),
        performanceProfile: {
          speed: 0.5, // 0-1 scale
          reliability: 0.5,
          cost: 0.5,
          quality: 0.5,
        },
        goalPerformance: new Map(), // goal -> performance metrics
        taskHistory: [], // Recent task performance
        lastUpdated: Date.now(),
        metrics: {
          avgLatency: 0,
          successRate: 0,
          totalRequests: 0,
        },
      });
    });
  }

  /**
   * Get provider capabilities based on known characteristics
   */
  getProviderCapabilities(provider: string): string[] {
    const capabilities: Record<string, string[]> = {
      localai: ['local', 'flexible', 'moderate-speed', 'configurable'],
      huggingface: ['diverse-models', 'research-focused', 'variable-speed', 'free-tier'],
      deepseek: ['fast-inference', 'cost-effective', 'good-quality', 'api-based'],
      openinterpreter: ['code-execution', 'tool-integration', 'versatile', 'experimental'],
      anthropic: ['high-quality', 'safe', 'expensive', 'reliable'],
      openai: ['versatile', 'fast', 'premium-cost', 'high-reliability'],
      gemini: [
        'multimodal',
        'google-ecosystem',
        'moderate-cost',
        'innovative',
        'high-quality',
        'reliable',
      ],
    };

    return capabilities[provider] || ['general-purpose'];
  }

  /**
   * Record task performance and update knowledge graph
   */
  recordTaskPerformance(taskData: {
    taskId: string;
    goal: string;
    provider: string;
    success: boolean;
    responseTime: number;
    cost?: number;
    quality?: number;
    context?: any;
    timestamp?: number;
  }) {
    const {
      taskId,
      goal,
      provider,
      success,
      responseTime,
      cost,
      quality,
      context = {},
      timestamp = Date.now(),
    } = taskData;

    // Create/update task node
    if (!this.tasks.has(taskId)) {
      this.tasks.set(taskId, {
        id: taskId,
        goal,
        context,
        performance: [],
        created: timestamp,
      });
    }

    const task = this.tasks.get(taskId);
    if (task) {
      task.performance.push({
        provider,
        success,
        responseTime,
        cost,
        quality,
        timestamp,
      });
    }

    // Update provider performance for this goal
    this.updateProviderGoalPerformance(provider, goal, {
      success,
      responseTime,
      cost: cost || 0,
      quality: quality || 0.5,
      timestamp,
    });

    // Create relationships in knowledge graph
    this.createRelationships(taskId, goal, provider, context);

    // Update correlation matrix
    this.updateCorrelations(goal, provider, success, responseTime, cost || 0, quality || 0.5);

    // Add to learning history
    this.learningHistory.push({
      taskId,
      goal,
      provider,
      success,
      responseTime,
      cost: cost || 0,
      quality: quality || 0.5,
      context,
      timestamp,
    });

    // Maintain history size
    if (this.learningHistory.length > 10000) {
      this.learningHistory = this.learningHistory.slice(-5000);
    }
  }

  /**
   * Update provider performance for specific goal
   */
  updateProviderGoalPerformance(
    provider: string,
    goal: string,
    performance: {
      success: boolean;
      responseTime: number;
      cost?: number;
      quality?: number;
      timestamp: number;
    }
  ) {
    if (!this.providers.has(provider)) return;

    const providerData = this.providers.get(provider)!;
    if (!providerData.goalPerformance.has(goal)) {
      providerData.goalPerformance.set(goal, {
        attempts: 0,
        successes: 0,
        totalTime: 0,
        totalCost: 0,
        qualitySum: 0,
        avgTime: 0,
        avgCost: 0,
        avgQuality: 0,
        successRate: 0,
        lastAttempt: null,
      });
    }

    const goalPerf = providerData.goalPerformance.get(goal)!;
    goalPerf.attempts++;
    goalPerf.lastAttempt = performance.timestamp;

    if (performance.success) {
      goalPerf.successes++;
    }

    goalPerf.totalTime += performance.responseTime;
    goalPerf.totalCost += performance.cost || 0;
    goalPerf.qualitySum += performance.quality || 0.5;

    // Update averages
    goalPerf.avgTime = goalPerf.totalTime / goalPerf.attempts;
    goalPerf.avgCost = goalPerf.totalCost / goalPerf.attempts;
    goalPerf.avgQuality = goalPerf.qualitySum / goalPerf.attempts;
    goalPerf.successRate = goalPerf.successes / goalPerf.attempts;

    providerData.lastUpdated = performance.timestamp;
  }

  /**
   * Create relationships in knowledge graph
   */
  createRelationships(taskId: string, goal: string, provider: string, context: any) {
    const timestamp = Date.now();

    // Task -> Goal relationship
    this.addEdge(`task-${taskId}`, `goal-${goal}`, {
      type: 'belongs_to',
      strength: 1.0,
      created: timestamp,
    });

    // Task -> Provider relationship
    this.addEdge(`task-${taskId}`, `provider-${provider}`, {
      type: 'executed_by',
      strength: 1.0,
      created: timestamp,
    });

    // Goal -> Provider relationship (performance-based)
    const goalProviderKey = `goal-${goal}-provider-${provider}`;
    if (!this.edges.has(goalProviderKey)) {
      this.addEdge(`goal-${goal}`, `provider-${provider}`, {
        type: 'performance_history',
        strength: 0.1,
        attempts: 0,
        successes: 0,
        created: timestamp,
      });
    }

    // Context-based relationships
    if (context.domain) {
      this.addEdge(`goal-${goal}`, `domain-${context.domain}`, {
        type: 'domain_context',
        strength: 0.8,
        created: timestamp,
      });
    }

    if (context.complexity) {
      this.addEdge(`task-${taskId}`, `complexity-${context.complexity}`, {
        type: 'complexity_level',
        strength: 0.9,
        created: timestamp,
      });
    }
  }

  /**
   * Add edge to knowledge graph
   */
  addEdge(fromId: string, toId: string, data: Partial<EdgeData>) {
    const edgeId = `${fromId}->${toId}`;
    this.edges.set(edgeId, {
      id: edgeId,
      from: fromId,
      to: toId,
      type: data.type || 'unknown',
      strength: data.strength || 0,
      created: data.created || Date.now(),
      ...data,
    });
  }

  /**
   * Update performance correlations
   */
  updateCorrelations(
    goal: string,
    provider: string,
    success: boolean,
    responseTime: number,
    cost: number,
    quality: number
  ) {
    const key = `${goal}:${provider}`;

    if (!this.correlationMatrix.has(key)) {
      this.correlationMatrix.set(key, {
        goal,
        provider,
        samples: 0,
        successRate: 0,
        avgTime: 0,
        avgCost: 0,
        avgQuality: 0,
        timeQualityCorr: 0, // Correlation between time and quality
        costQualityCorr: 0, // Correlation between cost and quality
        lastUpdated: Date.now(),
      });
    }

    const corr = this.correlationMatrix.get(key)!;
    corr.samples++;

    // Update running averages
    const alpha = 1 / corr.samples; // Learning rate decreases with more samples
    corr.successRate = (1 - alpha) * corr.successRate + alpha * (success ? 1 : 0);
    corr.avgTime = (1 - alpha) * corr.avgTime + alpha * responseTime;
    corr.avgCost = (1 - alpha) * corr.avgCost + alpha * (cost || 0);
    corr.avgQuality = (1 - alpha) * corr.avgQuality + alpha * (quality || 0.5);

    corr.lastUpdated = Date.now();
  }

  /**
   * Get optimal provider recommendations for a goal
   */
  getProviderRecommendations(goal: string, context: any = {}) {
    const candidates = [];

    for (const [providerId, provider] of this.providers) {
      const goalPerf = provider.goalPerformance.get(goal);
      if (!goalPerf || goalPerf.attempts < 3) continue; // Need minimum samples

      // Calculate composite score based on multiple factors
      const score = this.calculateProviderScore(providerId, goal, context, goalPerf);
      const confidence = Math.min(goalPerf.attempts / 10, 1.0); // Confidence increases with samples

      candidates.push({
        provider: providerId,
        score,
        confidence,
        metrics: {
          successRate: goalPerf.successRate,
          avgTime: goalPerf.avgTime,
          avgCost: goalPerf.avgCost,
          avgQuality: goalPerf.avgQuality,
          attempts: goalPerf.attempts,
        },
        capabilities: provider.capabilities,
        lastUsed: goalPerf.lastAttempt,
      });
    }

    // Sort by score and return top recommendations
    return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Calculate provider score for goal/context
   */
  calculateProviderScore(
    providerId: string,
    goal: string,
    context: any,
    goalPerf: GoalPerformance
  ): number {
    let score = 0;

    // Base performance score (40% weight)
    const perfScore =
      goalPerf.successRate * 0.4 +
      (1 - Math.min(goalPerf.avgTime / 30000, 1)) * 0.3 + // Faster is better (normalized to 30s)
      goalPerf.avgQuality * 0.3;
    score += perfScore * 0.4;

    // Cost efficiency score (20% weight) - lower cost is better
    const costScore = Math.max(0, 1 - Math.min(goalPerf.avgCost / 0.1, 1)); // Normalized to $0.10
    score += costScore * 0.2;

    // Capability match score (20% weight)
    const capabilityScore = this.calculateCapabilityMatch(providerId, goal, context);
    score += capabilityScore * 0.2;

    // Recency bonus (10% weight) - prefer recently successful providers
    const lastAttempt = goalPerf.lastAttempt || 0;
    const hoursSinceLastUse = (Date.now() - lastAttempt) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - hoursSinceLastUse / 24); // Decay over 24 hours
    score += recencyScore * 0.1;

    // Context-specific adjustments
    if (context.priority === 'speed') {
      score = score * 0.7 + (1 - Math.min(goalPerf.avgTime / 10000, 1)) * 0.3;
    } else if (context.priority === 'quality') {
      score = score * 0.8 + goalPerf.avgQuality * 0.2;
    } else if (context.priority === 'cost') {
      score = score * 0.7 + costScore * 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate capability match score
   */
  calculateCapabilityMatch(providerId: string, goal: string, context: any): number {
    const provider = this.providers.get(providerId);
    if (!provider) return 0;

    let matchScore = 0;
    let totalChecks = 0;

    // Goal-based capability matching
    const goalCapabilities = this.getGoalCapabilities(goal);
    goalCapabilities.forEach((cap) => {
      totalChecks++;
      if (provider.capabilities.includes(cap)) matchScore += 1;
    });

    // Context-based matching
    if (context.domain) {
      totalChecks++;
      const domainCaps = this.getDomainCapabilities(context.domain);
      if (domainCaps.some((cap) => provider.capabilities.includes(cap))) matchScore += 1;
    }

    if (context.complexity === 'high') {
      totalChecks++;
      if (
        provider.capabilities.includes('high-quality') ||
        provider.capabilities.includes('reliable')
      ) {
        matchScore += 1;
      }
    }

    return totalChecks > 0 ? matchScore / totalChecks : 0.5;
  }

  /**
   * Get capabilities needed for a goal
   */
  getGoalCapabilities(goal: string): string[] {
    const goalCapabilities: Record<string, string[]> = {
      training: ['reliable', 'fast', 'cost-effective'],
      evaluation: ['high-quality', 'accurate', 'consistent'],
      generation: ['creative', 'versatile', 'fast'],
      analysis: ['analytical', 'detailed', 'reliable'],
      coding: ['code-execution', 'accurate', 'fast'],
      research: ['comprehensive', 'accurate', 'research-focused'],
    };

    return goalCapabilities[goal] || ['general-purpose'];
  }

  /**
   * Get capabilities for a domain
   */
  getDomainCapabilities(domain: string): string[] {
    const domainCapabilities: Record<string, string[]> = {
      technical: ['code-execution', 'accurate', 'fast'],
      creative: ['creative', 'versatile', 'innovative'],
      academic: ['comprehensive', 'accurate', 'research-focused'],
      business: ['professional', 'reliable', 'efficient'],
    };

    return domainCapabilities[domain] || [];
  }

  /**
   * Get knowledge graph statistics
   */
  getGraphStatistics() {
    return {
      nodes: {
        goals: this.goals.size,
        providers: this.providers.size,
        tasks: this.tasks.size,
        total: this.nodes.size,
      },
      edges: {
        total: this.edges.size,
        byType: this.getEdgeTypeCounts(),
      },
      correlations: this.correlationMatrix.size,
      learningHistory: this.learningHistory.length,
      lastUpdated: Math.max(...Array.from(this.providers.values()).map((p) => p.lastUpdated)),
    };
  }

  /**
   * Get edge type counts
   */
  getEdgeTypeCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const edge of this.edges.values()) {
      counts[edge.type] = (counts[edge.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get provider profile for exploration
   */
  getProviderProfile(providerId: string): ProviderProfile | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Export knowledge graph data for visualization
   */
  exportGraphData() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      goals: Array.from(this.goals.values()),
      providers: Array.from(this.providers.values()),
      correlations: Array.from(this.correlationMatrix.values()),
      statistics: this.getGraphStatistics(),
    };
  }

  /**
   * Get goal statistics for exploration engine
   * Returns a Map of goalId -> { successRate, attempts, avgTime, avgQuality }
   */
  getGoalStatistics(): Map<
    string,
    {
      successRate: number;
      attempts: number;
      avgTime: number;
      avgQuality: number;
      providerCount: number;
    }
  > {
    const goalStats = new Map<
      string,
      {
        successRate: number;
        attempts: number;
        avgTime: number;
        avgQuality: number;
        providerCount: number;
      }
    >();

    // Collect unique goals from all providers
    const allGoals = new Set<string>();
    for (const [, provider] of this.providers) {
      for (const [goalId] of provider.goalPerformance) {
        allGoals.add(goalId);
      }
    }

    // Aggregate statistics for each goal across all providers
    for (const goalId of allGoals) {
      let totalAttempts = 0;
      let totalSuccesses = 0;
      let totalTime = 0;
      let totalQuality = 0;
      let providerCount = 0;

      for (const [, provider] of this.providers) {
        const goalPerf = provider.goalPerformance.get(goalId);
        if (goalPerf && goalPerf.attempts > 0) {
          totalAttempts += goalPerf.attempts;
          totalSuccesses += goalPerf.successes;
          totalTime += goalPerf.totalTime;
          totalQuality += goalPerf.qualitySum;
          providerCount++;
        }
      }

      if (totalAttempts > 0) {
        goalStats.set(goalId, {
          successRate: totalSuccesses / totalAttempts,
          attempts: totalAttempts,
          avgTime: totalTime / totalAttempts,
          avgQuality: totalQuality / totalAttempts,
          providerCount,
        });
      }
    }

    return goalStats;
  }

  /**
   * Get goal performance summary
   */
  getGoalPerformanceSummary(goal: string) {
    const goalProviders = [];

    for (const [providerId, provider] of this.providers) {
      const goalPerf = provider.goalPerformance.get(goal);
      if (goalPerf && goalPerf.attempts > 0) {
        goalProviders.push({
          provider: providerId,
          ...goalPerf,
        });
      } else {
        // Include provider with default/empty stats so it shows up in the monitor
        goalProviders.push({
          provider: providerId,
          attempts: 0,
          successes: 0,
          totalTime: 0,
          totalCost: 0,
          qualitySum: 0,
          avgTime: 0,
          avgCost: 0,
          avgQuality: 0,
          successRate: 0,
          lastAttempt: null,
        });
      }
    }

    return {
      goal,
      providerCount: goalProviders.length,
      totalAttempts: goalProviders.reduce((sum, p) => sum + p.attempts, 0),
      avgSuccessRate:
        goalProviders.length > 0
          ? goalProviders.reduce((sum, p) => sum + p.successRate, 0) / goalProviders.length
          : 0,
      providers: goalProviders.sort((a, b) => b.successRate - a.successRate),
    };
  }
}
