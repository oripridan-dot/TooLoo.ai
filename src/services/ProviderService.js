/**
 * ProviderService - Manages AI provider selection, failover, and request routing
 * 
 * @class ProviderService
 * @description Handles multi-provider support with automatic failover and load balancing
 */

import { EventEmitter } from 'events';
import pino from 'pino';

const logger = pino({ name: 'ProviderService' });

export class ProviderService extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.providers = this.initializeProviders(config);
    this.failedProviders = new Map(); // provider -> { count, lastFailure }
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      providerUsage: {}
    };
  }

  /**
   * Initialize available providers based on configuration
   * @private
   */
  initializeProviders(config) {
    const providers = [];
    
    if (config.openai?.apiKey) providers.push('openai');
    if (config.anthropic?.apiKey) providers.push('anthropic');
    if (config.gemini?.apiKey) providers.push('gemini');
    if (config.groq?.apiKey) providers.push('groq');
    if (config.ollama?.enabled) providers.push('ollama');
    
    logger.info({ providers }, 'Initialized providers');
    return providers;
  }

  /**
   * Select the best available provider
   * @param {string} preferred - Preferred provider name
   * @param {Object} options - Selection options
   * @returns {Promise<string>} Selected provider name
   */
  async selectProvider(preferred, options = {}) {
    const startTime = Date.now();
    
    try {
      // Try preferred provider first
      if (preferred && this.isProviderHealthy(preferred)) {
        logger.debug({ provider: preferred }, 'Using preferred provider');
        return preferred;
      }

      // Find first healthy provider
      for (const provider of this.providers) {
        if (this.isProviderHealthy(provider)) {
          logger.info(
            { 
              provider, 
              preferred, 
              fallback: preferred !== provider 
            }, 
            'Provider selected'
          );
          return provider;
        }
      }

      throw new ProviderError('All providers unavailable');
      
    } finally {
      const duration = Date.now() - startTime;
      this.emit('provider:selected', { preferred, duration });
    }
  }

  /**
   * Check if provider is healthy and available
   * @private
   */
  isProviderHealthy(provider) {
    const failure = this.failedProviders.get(provider);
    
    if (!failure) return true;
    
    // Reset after 5 minutes
    const RESET_TIMEOUT = 5 * 60 * 1000;
    if (Date.now() - failure.lastFailure > RESET_TIMEOUT) {
      this.failedProviders.delete(provider);
      logger.info({ provider }, 'Provider health restored');
      return true;
    }
    
    // Exponential backoff for repeated failures
    const maxFailures = 3;
    return failure.count < maxFailures;
  }

  /**
   * Mark provider as failed
   * @param {string} provider - Provider name
   * @param {Error} error - Error that caused the failure
   */
  markProviderFailed(provider, error) {
    const current = this.failedProviders.get(provider) || { count: 0 };
    
    this.failedProviders.set(provider, {
      count: current.count + 1,
      lastFailure: Date.now(),
      error: error.message
    });

    logger.error(
      { 
        provider, 
        failureCount: current.count + 1,
        error: error.message 
      }, 
      'Provider marked as failed'
    );

    this.emit('provider:failed', { provider, error });
  }

  /**
   * Send chat completion request
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Provider response
   */
  async chat(messages, options = {}) {
    this.metrics.totalRequests++;
    const startTime = Date.now();
    
    try {
      const provider = await this.selectProvider(options.provider);
      
      // Track usage
      this.metrics.providerUsage[provider] = 
        (this.metrics.providerUsage[provider] || 0) + 1;

      // Route to appropriate provider
      const response = await this.routeToProvider(provider, messages, options);
      
      this.metrics.successfulRequests++;
      const duration = Date.now() - startTime;
      
      logger.info(
        { provider, duration, model: options.model },
        'Chat request successful'
      );

      this.emit('chat:success', { provider, duration, model: options.model });
      
      return response;
      
    } catch (error) {
      this.metrics.failedRequests++;
      const duration = Date.now() - startTime;
      
      logger.error(
        { error: error.message, duration },
        'Chat request failed'
      );

      this.emit('chat:error', { error, duration });
      throw error;
    }
  }

  /**
   * Route request to specific provider
   * @private
   */
  async routeToProvider(provider, messages, options) {
    try {
      switch (provider) {
        case 'openai':
          return await this.callOpenAI(messages, options);
        case 'anthropic':
          return await this.callAnthropic(messages, options);
        case 'gemini':
          return await this.callGemini(messages, options);
        case 'groq':
          return await this.callGroq(messages, options);
        case 'ollama':
          return await this.callOllama(messages, options);
        default:
          throw new ProviderError(`Unknown provider: ${provider}`);
      }
    } catch (error) {
      this.markProviderFailed(provider, error);
      throw error;
    }
  }

  /**
   * OpenAI provider implementation
   * @private
   */
  async callOpenAI(messages, options) {
    // Implementation extracted from simple-api-server.js
    // This is a placeholder - actual implementation will be moved here
    throw new Error('Not yet implemented - to be extracted from simple-api-server.js');
  }

  /**
   * Anthropic provider implementation
   * @private
   */
  async callAnthropic(messages, options) {
    // Implementation extracted from simple-api-server.js
    throw new Error('Not yet implemented - to be extracted from simple-api-server.js');
  }

  /**
   * Gemini provider implementation
   * @private
   */
  async callGemini(messages, options) {
    // Implementation extracted from simple-api-server.js
    throw new Error('Not yet implemented - to be extracted from simple-api-server.js');
  }

  /**
   * Groq provider implementation
   * @private
   */
  async callGroq(messages, options) {
    // Implementation extracted from simple-api-server.js
    throw new Error('Not yet implemented - to be extracted from simple-api-server.js');
  }

  /**
   * Ollama provider implementation
   * @private
   */
  async callOllama(messages, options) {
    // Implementation extracted from simple-api-server.js
    throw new Error('Not yet implemented - to be extracted from simple-api-server.js');
  }

  /**
   * Get service metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100
        : 0,
      failedProviders: Array.from(this.failedProviders.entries()).map(
        ([provider, info]) => ({ provider, ...info })
      )
    };
  }

  /**
   * Reset all failed providers (for testing/recovery)
   */
  resetFailures() {
    this.failedProviders.clear();
    logger.info('All provider failures reset');
    this.emit('providers:reset');
  }
}

/**
 * Custom error class for provider-related errors
 */
export class ProviderError extends Error {
  constructor(message, provider = null) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
  }
}

export default ProviderService;
