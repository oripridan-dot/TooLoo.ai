import { AIProviderClient, AIProvider, AIRequest, AIResponse, ProviderWeight, RoutingStrategy } from './interfaces.js';
import { OpenAIProvider } from './providers/openai.js';
import { ClaudeProvider } from './providers/claude.js';

export class IntelligentRoutingStrategy implements RoutingStrategy {
  async selectProvider(
    request: AIRequest,
    availableProviders: AIProvider[],
    weights: ProviderWeight[]
  ): Promise<AIProvider> {
    // If user specified a provider, use it
    if (request.provider && availableProviders.includes(request.provider)) {
      return request.provider;
    }

    // Select based on prompt characteristics and performance weights
    const scores = weights
      .filter(w => availableProviders.includes(w.provider))
      .map(weight => ({
        provider: weight.provider,
        score: this.calculateScore(request, weight),
      }))
      .sort((a, b) => b.score - a.score);

    return scores[0]?.provider || availableProviders[0];
  }

  private calculateScore(request: AIRequest, weight: ProviderWeight): number {
    let score = weight.weight * weight.successRate;

    // Adjust based on prompt characteristics
    if (request.prompt.length > 4000) {
      // Longer prompts - prefer Claude
      if (weight.provider === 'claude') score *= 1.2;
    }

    if (request.prompt.includes('code') || request.prompt.includes('function')) {
      // Code-related - prefer OpenAI or DeepSeek
      if (weight.provider === 'openai' || weight.provider === 'deepseek') score *= 1.15;
    }

    // Response time factor (lower is better)
    score *= (1000 / (weight.avgResponseTime + 100));

    return score;
  }
}

export class MultiProviderOrchestrator {
  private providers: Map<AIProvider, AIProviderClient> = new Map();
  private weights: ProviderWeight[] = [];
  private routingStrategy: RoutingStrategy;

  constructor(
    providers: { [key in AIProvider]?: { apiKey: string; baseUrl?: string } },
    routingStrategy: RoutingStrategy = new IntelligentRoutingStrategy()
  ) {
    this.routingStrategy = routingStrategy;
    this.initializeProviders(providers);
    this.initializeWeights();
  }

  private initializeProviders(config: { [key in AIProvider]?: { apiKey: string; baseUrl?: string } }) {
    if (config.openai?.apiKey) {
      this.providers.set('openai', new OpenAIProvider(config.openai));
    }
    if (config.claude?.apiKey) {
      this.providers.set('claude', new ClaudeProvider(config.claude));
    }
    // Additional providers can be added here
  }

  private initializeWeights() {
    this.weights = Array.from(this.providers.keys()).map(provider => ({
      provider,
      weight: 1.0,
      successRate: 1.0,
      avgResponseTime: 1000,
    }));
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const availableProviders = await this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    const selectedProvider = await this.routingStrategy.selectProvider(
      request,
      availableProviders,
      this.weights
    );

    const provider = this.providers.get(selectedProvider)!;
    
    try {
      const response = await provider.generate(request);
      await this.updateWeights(selectedProvider, response, true);
      return response;
    } catch (error) {
      await this.updateWeights(selectedProvider, null, false);
      
      // Fallback to next best provider
      const fallbackProviders = availableProviders.filter(p => p !== selectedProvider);
      if (fallbackProviders.length > 0) {
        const fallbackProvider = this.providers.get(fallbackProviders[0])!;
        const response = await fallbackProvider.generate(request);
        await this.updateWeights(fallbackProviders[0], response, true);
        return response;
      }
      
      throw error;
    }
  }

  private async getAvailableProviders(): Promise<AIProvider[]> {
    const available: AIProvider[] = [];
    
    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(name);
        }
      } catch {
        // Provider not available
      }
    }
    
    return available;
  }

  private async updateWeights(
    provider: AIProvider,
    response: AIResponse | null,
    success: boolean
  ) {
    const weight = this.weights.find(w => w.provider === provider);
    if (!weight) return;

    // Update success rate with exponential moving average
    const alpha = 0.1; // Learning rate
    weight.successRate = alpha * (success ? 1 : 0) + (1 - alpha) * weight.successRate;

    // Update average response time
    if (success && response) {
      weight.avgResponseTime = alpha * response.performance.responseTimeMs + (1 - alpha) * weight.avgResponseTime;
    }

    // Adjust weight based on recent performance
    weight.weight = Math.min(1.0, weight.successRate * (1000 / weight.avgResponseTime));
  }

  getProviderStats() {
    return {
      availableProviders: Array.from(this.providers.keys()),
      weights: this.weights,
      totalProviders: this.providers.size,
    };
  }
}