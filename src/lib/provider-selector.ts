import { v4 as uuidv4 } from 'uuid';

/**
 * ProviderSelector - Intelligent provider selection based on cost, quality, and availability
 *
 * Ranking Algorithm:
 * 1. Filter: only available providers
 * 2. Score: cost (30%) + quality (40%) + speed (20%) + uptime (10%)
 * 3. Boost: recent success rate
 * 4. Return: highest-scoring provider
 */
export class ProviderSelector {
  constructor(eventBus, config = {}) {
    this.eventBus = eventBus;
    this.config = {
      defaultProvider: 'gemini',
      fallbackProvider: 'ollama',
      qualityWeights: {
        costEfficiency: 0.3,
        qualityScore: 0.4,
        speed: 0.2,
        uptime: 0.1,
      },
      ...config,
    };

    // Initialize provider registry
    this.providers = this.initializeProviders();
    this.providerStats = this.initializeStats();
    this.selectionHistory = [];
    this.costHistory = new Map();

    // Bind methods
    this.selectProvider = this.selectProvider.bind(this);
    this.updateProviderStatus = this.updateProviderStatus.bind(this);
    this.recordSelection = this.recordSelection.bind(this);
  }

  /**
   * Initialize provider registry with metadata
   */
  initializeProviders() {
    return {
      ollama: {
        id: 'ollama',
        name: 'Ollama (Local)',
        endpoint: 'http://localhost:11434',
        models: ['neural-chat', 'mistral', 'llama2'],
        costPerToken: 0, // Free locally
        maxTokens: 4096,
        qualityScore: 0.7, // Good quality
        speedScore: 0.9, // Very fast (local)
        available: true,
        priority: 2, // Try second (free)
      },
      anthropic: {
        id: 'anthropic',
        name: 'Anthropic Claude',
        endpoint: 'https://api.anthropic.com/v1',
        models: ['claude-3-5-haiku-20241022', 'claude-3-opus'],
        costPerToken: 0.00008, // $0.08 per million tokens
        maxTokens: 8000,
        qualityScore: 0.95, // Highest quality
        speedScore: 0.85, // Good speed
        available: true,
        priority: 3,
      },
      openai: {
        id: 'openai',
        name: 'OpenAI GPT',
        endpoint: 'https://api.openai.com/v1',
        models: ['gpt-4o-mini', 'gpt-4o'],
        costPerToken: 0.00015, // $0.15 per million tokens
        maxTokens: 8000,
        qualityScore: 0.92, // Excellent quality
        speedScore: 0.8, // Good speed
        available: true,
        priority: 3,
      },
      gemini: {
        id: 'gemini',
        name: 'Google Gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        models: ['gemini-2.0-pro-exp-02-05', 'gemini-1.5-flash'],
        costPerToken: 0.0000375, // $0.0375 per million tokens
        maxTokens: 8000,
        qualityScore: 0.96, // Excellent quality (Gemini 3 Pro)
        speedScore: 0.85, // Fast
        available: true,
        priority: 1, // Highest priority
      },
      deepseek: {
        id: 'deepseek',
        name: 'DeepSeek',
        endpoint: 'https://api.deepseek.com/v1',
        models: ['deepseek-coder', 'deepseek-chat'],
        costPerToken: 0.00001, // $0.01 per million tokens (very cheap)
        maxTokens: 8000,
        qualityScore: 0.75, // Decent quality
        speedScore: 0.7, // Medium speed
        available: true,
        priority: 5,
      },
    };
  }

  /**
   * Initialize statistics tracking for each provider
   */
  initializeStats() {
    const stats = {};
    Object.keys(this.providers).forEach((providerId) => {
      stats[providerId] = {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        totalCost: 0,
        recentSuccessRate: 1.0,
        uptime: 0.99,
        lastUpdated: Date.now(),
      };
    });
    return stats;
  }

  /**
   * Select best provider for a query
   * @param {Object} options - Selection criteria
   * @param {string} options.query - User query (for context)
   * @param {string} options.focusArea - Training focus area
   * @param {number} options.estimatedTokens - Expected token usage
   * @param {boolean} options.preferFree - Prefer free providers
   * @param {boolean} options.highQuality - Require high quality
   * @returns {Promise<Object>} Selected provider info
   */
  async selectProvider(options = {}) {
    const {
      query = '',
      focusArea = 'general',
      estimatedTokens = 500,
      preferFree = false,
      highQuality = false,
    } = options;

    try {
      // Filter available providers
      const availableProviders = Object.values(this.providers).filter(
        (p) => p.available && this.providerStats[p.id].recentSuccessRate > 0.5
      );

      if (availableProviders.length === 0) {
        throw new Error('No available providers');
      }

      // Score each provider
      const scores = availableProviders.map((provider) => ({
        provider,
        score: this.scoreProvider(provider, {
          estimatedTokens,
          preferFree,
          highQuality,
        }),
      }));

      // Sort by score (descending)
      scores.sort((a, b) => b.score - a.score);
      const selected = scores[0];

      // Record selection
      const selection = {
        id: uuidv4(),
        timestamp: Date.now(),
        providerId: selected.provider.id,
        query: query.substring(0, 100),
        focusArea,
        estimatedTokens,
        score: selected.score,
        allScores: scores.map((s) => ({
          providerId: s.provider.id,
          score: s.score,
        })),
      };

      this.recordSelection(selection);

      // Emit event
      if (this.eventBus) {
        await this.eventBus.emit({
          type: 'provider.selected',
          aggregateId: selection.id,
          data: {
            providerId: selected.provider.id,
            selectionId: selection.id,
            score: selected.score,
            estimatedCost: selected.provider.costPerToken * estimatedTokens,
          },
        });
      }

      return {
        id: selection.id,
        providerId: selected.provider.id,
        provider: selected.provider,
        score: selected.score,
        estimatedCost: selected.provider.costPerToken * estimatedTokens,
      };
    } catch (error) {
      console.error('Provider selection failed:', error);
      // Fallback to local provider
      const fallback = this.providers[this.config.fallbackProvider];
      return {
        id: uuidv4(),
        providerId: fallback.id,
        provider: fallback,
        score: 0.5,
        estimatedCost: 0,
        fallback: true,
      };
    }
  }

  /**
   * Score a provider based on multiple factors
   * @private
   */
  scoreProvider(provider, options) {
    const { estimatedTokens, preferFree, highQuality } = options;
    const stats = this.providerStats[provider.id];
    const weights = this.config.qualityWeights;

    // Cost efficiency: lower is better (inverted)
    const estimatedCost = provider.costPerToken * estimatedTokens;
    const maxCost = 0.1; // $0.10 max reference
    const costScore = Math.max(0, 1 - estimatedCost / maxCost);

    // Quality score: directly from provider config
    const qualityScore = provider.qualityScore;

    // Speed: directly from provider config
    const speedScore = provider.speedScore;

    // Uptime: from stats
    const uptimeScore = stats.uptime;

    // Recent success rate boost
    const successBoost = stats.recentSuccessRate;

    // Priority factor: prefer free providers or high quality
    let priorityFactor = 1.0;
    if (preferFree && provider.costPerToken === 0) priorityFactor = 1.5;
    if (highQuality && provider.qualityScore > 0.9) priorityFactor = 1.5;

    // Combined score
    const baseScore =
      costScore * weights.costEfficiency +
      qualityScore * weights.qualityScore +
      speedScore * weights.speed +
      uptimeScore * weights.uptime;

    const finalScore = baseScore * successBoost * priorityFactor;

    return Math.min(1, finalScore); // Cap at 1.0
  }

  /**
   * Record provider selection for analytics
   * @private
   */
  recordSelection(selection) {
    this.selectionHistory.push(selection);

    // Keep only last 1000 selections
    if (this.selectionHistory.length > 1000) {
      this.selectionHistory.shift();
    }

    // Update cost history
    const providerId = selection.providerId;
    if (!this.costHistory.has(providerId)) {
      this.costHistory.set(providerId, []);
    }
    this.costHistory.get(providerId).push({
      timestamp: selection.timestamp,
      estimatedCost: this.providers[providerId].costPerToken * selection.estimatedTokens,
      tokens: selection.estimatedTokens,
    });
  }

  /**
   * Update provider availability status
   * @param {string} providerId - Provider ID
   * @param {Object} status - Status update
   */
  updateProviderStatus(providerId, status) {
    if (!this.providers[providerId]) return;

    const provider = this.providers[providerId];

    // Update availability
    if (status.available !== undefined) {
      provider.available = status.available;
    }

    // Update stats
    if (status.responseTime !== undefined) {
      const stats = this.providerStats[providerId];
      stats.avgResponseTime = status.responseTime;
    }

    if (status.success !== undefined) {
      const stats = this.providerStats[providerId];
      stats.requestCount++;
      if (status.success) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }
      stats.recentSuccessRate = Math.max(0.3, stats.successCount / stats.requestCount);
    }

    if (status.uptime !== undefined) {
      this.providerStats[providerId].uptime = status.uptime;
    }

    provider.lastUpdated = Date.now();
  }

  /**
   * Get current status of all providers
   */
  getProviderStatus() {
    const status = {};
    Object.entries(this.providers).forEach(([id, provider]) => {
      const stats = this.providerStats[id];
      status[id] = {
        name: provider.name,
        available: provider.available,
        costPerToken: provider.costPerToken,
        qualityScore: provider.qualityScore,
        speedScore: provider.speedScore,
        requestCount: stats.requestCount,
        successRate:
          stats.requestCount > 0
            ? (stats.successCount / stats.requestCount).toFixed(2)
            : 'N/A',
        uptime: (stats.uptime * 100).toFixed(1) + '%',
        avgResponseTime: stats.avgResponseTime.toFixed(0) + 'ms',
        priority: provider.priority,
      };
    });
    return status;
  }

  /**
   * Get cost summary by provider
   */
  getCostSummary() {
    const summary = {};
    Object.keys(this.providers).forEach((providerId) => {
      const history = this.costHistory.get(providerId) || [];
      const totalCost = history.reduce((sum, h) => sum + h.estimatedCost, 0);
      const totalTokens = history.reduce((sum, h) => sum + h.tokens, 0);
      const requestCount = history.length;

      summary[providerId] = {
        provider: this.providers[providerId].name,
        requestCount,
        totalCost: totalCost.toFixed(4),
        totalTokens,
        avgCostPerRequest: (totalCost / (requestCount || 1)).toFixed(6),
        costPerToken: this.providers[providerId].costPerToken,
      };
    });
    return summary;
  }

  /**
   * Get selection statistics
   */
  getSelectionStats() {
    const stats = {
      totalSelections: this.selectionHistory.length,
      byProvider: {},
      avgScores: {},
    };

    // Count selections by provider
    this.selectionHistory.forEach((selection) => {
      if (!stats.byProvider[selection.providerId]) {
        stats.byProvider[selection.providerId] = 0;
      }
      stats.byProvider[selection.providerId]++;

      // Track average scores
      if (!stats.avgScores[selection.providerId]) {
        stats.avgScores[selection.providerId] = [];
      }
      stats.avgScores[selection.providerId].push(selection.score);
    });

    // Calculate averages
    Object.keys(stats.avgScores).forEach((providerId) => {
      const scores = stats.avgScores[providerId];
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      stats.avgScores[providerId] = avg.toFixed(3);
    });

    return stats;
  }

  /**
   * Reset all stats (for testing)
   */
  resetStats() {
    this.providerStats = this.initializeStats();
    this.selectionHistory = [];
    this.costHistory.clear();
  }
}

export default ProviderSelector;
