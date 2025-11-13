/**
 * Real-time Adaptation Service
 * Dynamically adjusts model selection, parameters, and strategies based on feedback and metrics
 * No code redeploy required - all changes are dynamic
 */

import fs from 'fs';
import path from 'path';

class RealTimeAdaptationService {
  constructor(metricsService, feedbackService, personalizationEngine, dataDir = './data/adaptation') {
    this.metricsService = metricsService;
    this.feedbackService = feedbackService;
    this.personalizationEngine = personalizationEngine;
    this.dataDir = dataDir;
    this.ensureDirExists(dataDir);

    // Dynamic configuration - can be updated without code changes
    this.config = {
      modelSelection: {},
      responseParameters: {},
      providerStrategies: {},
      feedbackWeights: {
        rating: 0.4,
        accuracy: 0.3,
        relevance: 0.2,
        usability: 0.1
      }
    };

    this.loadConfig();
    this.initializeDefaults();
  }

  ensureDirExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Initialize default configuration
   */
  initializeDefaults() {
    this.config.modelSelection = {
      default: 'claude-3-5-haiku-20241022',
      fallback: 'gpt-4',
      performance: {
        'claude-3-5-haiku-20241022': 0.85,
        'gpt-4': 0.80,
        'gemini-2.0-flash': 0.78
      }
    };

    this.config.responseParameters = {
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      adaptiveLength: true
    };

    this.config.providerStrategies = {
      'claude': { strength: 'reasoning', timeout: 5000 },
      'gpt-4': { strength: 'coding', timeout: 5000 },
      'gemini': { strength: 'analysis', timeout: 4000 }
    };
  }

  /**
   * Get adapted configuration for a user query
   */
  getAdaptedConfig(userId, queryType) {
    const personalization = this.personalizationEngine.getPersonalization(userId);
    const metrics = this.metricsService.getDashboardData();
    const adapted = JSON.parse(JSON.stringify(this.config));

    // Adapt model selection based on query type and user preference
    adapted.modelSelection.preferred = this.selectBestModel(queryType, personalization, metrics);

    // Adapt response parameters based on user behavior
    adapted.responseParameters = this.adaptResponseParameters(personalization, queryType);

    // Adapt provider strategy based on performance
    adapted.providerStrategies = this.adaptProviderStrategies(metrics);

    return adapted;
  }

  /**
   * Select best model for query type and user
   */
  selectBestModel(queryType, personalization, metrics) {
    // Priority: User preference > Query type > Overall performance
    if (personalization.preferredProviders && personalization.preferredProviders.length > 0) {
      return personalization.preferredProviders[0];
    }

    // Query type optimization
    const queryOptimization = {
      'coding': 'gpt-4',
      'analysis': 'gemini-2.0-flash',
      'creative': 'claude-3-5-haiku-20241022',
      'research': 'claude-3-5-haiku-20241022'
    };

    if (queryOptimization[queryType]) {
      return queryOptimization[queryType];
    }

    // Fall back to best performing model
    const providers = metrics.providers || [];
    if (providers.length > 0) {
      return providers[0].provider;
    }

    return this.config.modelSelection.default;
  }

  /**
   * Adapt response parameters based on user preferences
   */
  adaptResponseParameters(personalization, queryType) {
    const params = JSON.parse(JSON.stringify(this.config.responseParameters));

    // Adjust verbosity based on user preference
    if (personalization.responseStyle === 'technical') {
      params.temperature = 0.5; // More focused
      params.maxTokens = 1500;
    } else if (personalization.responseStyle === 'creative') {
      params.temperature = 0.9; // More creative
      params.maxTokens = 2500;
    } else if (personalization.responseStyle === 'educational') {
      params.temperature = 0.6;
      params.maxTokens = 2048;
    }

    return params;
  }

  /**
   * Adapt provider strategies based on current performance
   */
  adaptProviderStrategies(metrics) {
    const strategies = JSON.parse(JSON.stringify(this.config.providerStrategies));
    const providers = metrics.providers || [];

    // Update performance scores based on metrics
    providers.forEach(providerMetric => {
      if (strategies[providerMetric.provider]) {
        strategies[providerMetric.provider].performanceScore = parseFloat(providerMetric.score);
        strategies[providerMetric.provider].averageTime = providerMetric.averageTime;
        strategies[providerMetric.provider].rating = providerMetric.averageRating;
      }
    });

    return strategies;
  }

  /**
   * Update configuration based on feedback
   * Called regularly by the learning loop
   */
  processFeedback() {
    const unprocessed = this.feedbackService.getUnprocessedFeedback();
    if (unprocessed.length === 0) return { processed: 0 };

    // Analyze patterns in feedback
    const patterns = this.analyzeFeedbackPatterns(unprocessed);

    // Update provider strategies based on patterns
    this.updateProviderStrategies(patterns);

    // Mark feedback as processed
    const feedbackIds = unprocessed.map(f => f.id);
    this.feedbackService.markBatchAsProcessed(feedbackIds);

    this.saveConfig();

    return {
      processed: feedbackIds.length,
      changes: patterns
    };
  }

  /**
   * Analyze patterns in feedback data
   */
  analyzeFeedbackPatterns(feedback) {
    const patterns = {
      lowPerformingProviders: [],
      highPerformingProviders: [],
      commonIssues: [],
      suggestedImprovements: []
    };

    // Group by provider
    const byProvider = {};
    feedback.forEach(f => {
      if (!byProvider[f.provider]) {
        byProvider[f.provider] = [];
      }
      byProvider[f.provider].push(f);
    });

    // Identify patterns
    Object.entries(byProvider).forEach(([provider, items]) => {
      const avgRating = items.filter(i => i.rating).reduce((a, b) => a + b.rating, 0) / items.length;

      if (avgRating < 2.5) {
        patterns.lowPerformingProviders.push({ provider, avgRating: avgRating.toFixed(2) });
      } else if (avgRating > 4) {
        patterns.highPerformingProviders.push({ provider, avgRating: avgRating.toFixed(2) });
      }

      // Extract common feedback
      const feedbackTexts = items.filter(i => i.feedbackText).map(i => i.feedbackText);
      if (feedbackTexts.length > 0) {
        patterns.commonIssues.push({
          provider,
          issues: feedbackTexts.slice(0, 3)
        });
      }
    });

    // Collect improvement suggestions
    patterns.suggestedImprovements = this.feedbackService.getImprovementSuggestions();

    return patterns;
  }

  /**
   * Update provider strategies based on feedback patterns
   */
  updateProviderStrategies(patterns) {
    // Reduce timeout for low performers
    patterns.lowPerformingProviders.forEach(({ provider }) => {
      if (this.config.providerStrategies[provider]) {
        this.config.providerStrategies[provider].timeout = Math.max(
          2000,
          this.config.providerStrategies[provider].timeout - 1000
        );
      }
    });

    // Increase priority for high performers
    patterns.highPerformingProviders.forEach(({ provider }) => {
      if (this.config.providerStrategies[provider]) {
        this.config.providerStrategies[provider].priority = 'high';
      }
    });
  }

  /**
   * Update model performance scores
   */
  updateModelPerformance() {
    const metrics = this.metricsService.getDashboardData();
    const providers = metrics.providers || [];

    providers.forEach(provider => {
      this.config.modelSelection.performance[provider.provider] = parseFloat(provider.score);
    });

    this.saveConfig();
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    this.saveConfig();
    return this.config;
  }

  /**
   * Get adaptation statistics
   */
  getAdaptationStats() {
    return {
      lastUpdated: this.getLastConfigUpdate(),
      totalAdaptations: this.getAdaptationCount(),
      currentStrategy: this.config.providerStrategies,
      performanceScores: this.config.modelSelection.performance
    };
  }

  /**
   * Save configuration to disk
   */
  saveConfig() {
    const filePath = path.join(this.dataDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
  }

  /**
   * Load configuration from disk
   */
  loadConfig() {
    const filePath = path.join(this.dataDir, 'config.json');
    try {
      if (fs.existsSync(filePath)) {
        this.config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      console.warn('Could not load adaptation config, using defaults:', err.message);
    }
  }

  /**
   * Get last config update time
   */
  getLastConfigUpdate() {
    const filePath = path.join(this.dataDir, 'config.json');
    try {
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath).mtime.toISOString();
      }
    } catch (err) {
      return null;
    }
  }

  /**
   * Get adaptation count (from file metadata)
   */
  getAdaptationCount() {
    // This could track the number of times config was updated
    // For now, return a placeholder
    return 0;
  }
}

export default RealTimeAdaptationService;
