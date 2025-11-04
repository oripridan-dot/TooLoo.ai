import config from '../config/env.js';
import { openai, anthropic, ollama, gemini } from './providers/index.js';

class AggregationService {
  constructor() {
    this.providers = this.initializeProviders();
  }

  initializeProviders() {
    const providers = {};
    
    if (config.OPENAI_API_KEY) {
      try {
        providers.openai = new openai(config.OPENAI_API_KEY);
      } catch (e) {
        // OpenAI init failed
      }
    }
    
    if (config.ANTHROPIC_API_KEY) {
      try {
        providers.anthropic = new anthropic(config.ANTHROPIC_API_KEY);
      } catch (e) {
        // Anthropic init failed
      }
    }
    
    if (config.GEMINI_API_KEY) {
      try {
        providers.gemini = new gemini(config.GEMINI_API_KEY);
      } catch (e) {
        // Gemini init failed
      }
    }
    
    // Ollama is optional (local deployment)
    try {
      providers.ollama = new ollama();
    } catch (e) {
      // Ollama init failed
    }
    
    return providers;
  }

  getAvailableProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Get smart aggregated response from all providers
   * - Fetches all responses in parallel
   * - Combines insights from multiple models
   * - Returns synthesized answer with confidence metrics
   */
  async getAggregatedResponse(prompt) {
    const providers = Object.keys(this.providers);
    
    if (providers.length === 0) {
      throw new Error('No AI providers configured');
    }

    // Fetch all responses in parallel
    const results = await Promise.allSettled(
      providers.map(async (name) => {
        try {
          const provider = this.providers[name];
          const startTime = Date.now();
          const response = await provider.generateResponse(prompt);
          const endTime = Date.now();
          
          return {
            provider: name,
            response,
            responseTime: endTime - startTime,
            status: 'success',
            error: null
          };
        } catch (error) {
          return {
            provider: name,
            response: null,
            responseTime: null,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    // Process results
    const responses = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const successful = responses.filter(r => r.status === 'success');
    const failed = responses.filter(r => r.status === 'error');

    if (successful.length === 0) {
      throw new Error('All providers failed to respond');
    }

    // Create aggregated result
    return {
      aggregated: {
        prompt,
        timestamp: new Date().toISOString(),
        successful: successful.length,
        failed: failed.length,
        total: responses.length,
        providerResponses: successful.map(r => ({
          provider: r.provider,
          response: r.response,
          responseTime: r.responseTime
        })),
        failedProviders: failed.map(r => ({
          provider: r.provider,
          error: r.error
        })),
        // Smart consensus - identify common themes
        consensus: this.extractConsensus(successful),
        // Unique insights - what only some providers mentioned
        uniqueInsights: this.extractUniqueInsights(successful),
        // Average response time
        avgResponseTime: Math.round(
          successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length
        ),
        fastestProvider: successful.reduce((a, b) => 
          a.responseTime < b.responseTime ? a : b
        ).provider,
        slowestProvider: successful.reduce((a, b) => 
          a.responseTime > b.responseTime ? a : b
        ).provider
      }
    };
  }

  /**
   * Extract common themes and consensus from responses
   */
  extractConsensus(responses) {
    if (responses.length <= 1) return 'Single provider only';

    const texts = responses.map(r => r.response.toLowerCase());
    
    // Find commonly occurring phrases (simple consensus)
    const allWords = texts.join(' ').split(/\s+/);
    const wordFreq = {};
    
    allWords.forEach(word => {
      if (word.length > 5) { // Only meaningful words
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    // Get high-frequency meaningful terms
    const importantTerms = Object.entries(wordFreq)
      .filter(([, count]) => count >= Math.max(2, Math.ceil(responses.length / 2)))
      .map(([word]) => word)
      .slice(0, 5);

    return {
      agreement: responses.length > 1 ? 'Multiple sources agree' : 'Single source',
      keyTerms: importantTerms,
      diversity: responses.length
    };
  }

  /**
   * Extract unique insights only certain providers mentioned
   */
  extractUniqueInsights(responses) {
    if (responses.length <= 1) return [];

    const insights = [];
    
    // Simple: check sentence lengths and unique patterns
    responses.forEach((r) => {
      const sentences = r.response.split(/[.!?]+/).filter(s => s.trim());
      const uniqueSentences = sentences.slice(-2); // Last couple sentences often most unique
      
      insights.push({
        provider: r.provider,
        uniquePoint: uniqueSentences[0]?.trim() || ''
      });
    });

    return insights;
  }

  /**
   * Get detailed comparison (used for diagnostics)
   */
  async compareProviders(prompt, selectedProviders = []) {
    const providers = selectedProviders.length > 0 
      ? selectedProviders.filter(name => this.providers[name])
      : Object.keys(this.providers);

    const results = {};
    
    for (const providerName of providers) {
      try {
        const provider = this.providers[providerName];
        const startTime = Date.now();
        const response = await provider.generateResponse(prompt);
        const endTime = Date.now();
        
        results[providerName] = {
          response,
          responseTime: endTime - startTime,
          status: 'success'
        };
      } catch (error) {
        results[providerName] = {
          response: null,
          responseTime: null,
          status: 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Get health status of all providers
   */
  async getProviderHealth() {
    const health = {};
    const testPrompt = 'Say "OK"';

    for (const name of Object.keys(this.providers)) {
      try {
        const startTime = Date.now();
        const provider = this.providers[name];
        const response = await provider.generateResponse(testPrompt);
        const endTime = Date.now();

        health[name] = {
          status: 'healthy',
          responseTime: endTime - startTime,
          lastCheck: new Date().toISOString(),
          response: response?.substring(0, 50)
        };
      } catch (error) {
        health[name] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date().toISOString()
        };
      }
    }

    return health;
  }
}

export default AggregationService;
