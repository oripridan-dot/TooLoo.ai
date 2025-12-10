// @version 3.3.499
/**
 * BenchmarkService - Real Performance Benchmarking
 * 
 * Phase 2: Self-Optimization
 * 
 * Runs hourly benchmarks to measure real provider performance:
 * 
 * 1. Sends 10 standard test prompts to all providers
 * 2. Measures actual wall-clock time + quality of responses
 * 3. Records latency, token count, quality score
 * 4. Compares results to update optimization insights
 * 5. Feeds results back to ProviderScorecard for ranking
 * 
 * This replaces simulated benchmarks with real performance data
 * that drives system optimization.
 */

import { getSmartRouter } from './smart-router.js';
import { getRuntimeConfig } from './runtime-config.js';
import { generateLLM } from '../providers/llm-provider.js';
import { bus } from '../../core/event-bus.js';

interface BenchmarkResult {
  provider: string;
  prompt: string;
  response: string;
  latency: number; // milliseconds
  tokens: number;
  qualityScore: number; // 0-1: subjective quality
  timestamp: number;
  success: boolean;
  error?: string;
}

interface BenchmarkRound {
  id: string;
  timestamp: number;
  duration: number; // milliseconds
  results: BenchmarkResult[];
  summary: {
    providersAttempted: number;
    successCount: number;
    avgLatency: number;
    avgQualityScore: number;
    improvements: string[]; // Notable improvements since last round
  };
}

export class BenchmarkService {
  private isRunning = false;
  private lastBenchmarkTime = 0;
  private benchmarkIntervalMs = 60 * 60 * 1000; // 60 minutes
  private benchmarkPrompts: string[] = [];
  private benchmarkHistory: BenchmarkRound[] = [];

  constructor() {
    this.initBenchmarkPrompts();
  }

  /**
   * Start the benchmark service (runs on configured interval)
   */
  start(): void {
    if (this.isRunning) {
      console.log('[BenchmarkService] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[BenchmarkService] Started - benchmarks every', this.benchmarkIntervalMs / 1000 / 60, 'minutes');

    // Run first benchmark immediately, then on interval
    this.runBenchmark();
    
    setInterval(() => {
      if (this.isRunning) {
        this.runBenchmark();
      }
    }, this.benchmarkIntervalMs);
  }

  /**
   * Stop the benchmark service
   */
  stop(): void {
    this.isRunning = false;
    console.log('[BenchmarkService] Stopped');
  }

  /**
   * Run a complete benchmark round
   */
  private async runBenchmark(): Promise<void> {
    const startTime = Date.now();
    const roundId = `benchmark-${Date.now()}`;
    
    console.log('[BenchmarkService] Starting benchmark round:', roundId);

    const providers = ['deepseek', 'gemini', 'anthropic', 'openai'];
    const results: BenchmarkResult[] = [];

    // Run all prompts against all providers in parallel
    const promises = providers.flatMap((provider) =>
      this.benchmarkPrompts.map((prompt) =>
        this.benchmarkProvider(provider, prompt)
      )
    );

    const benchmarkResults = await Promise.allSettled(promises);

    // Collect results
    benchmarkResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    });

    const duration = Date.now() - startTime;
    const successCount = results.filter((r) => r.success).length;

    // Analyze and create round summary
    const summary = this.analyzeBenchmarkResults(results);

    const round: BenchmarkRound = {
      id: roundId,
      timestamp: Date.now(),
      duration,
      results,
      summary: {
        providersAttempted: providers.length * this.benchmarkPrompts.length,
        successCount,
        avgLatency: results.filter((r) => r.success).reduce((acc, r) => acc + r.latency, 0) / Math.max(1, successCount),
        avgQualityScore: results.filter((r) => r.success).reduce((acc, r) => acc + r.qualityScore, 0) / Math.max(1, successCount),
        improvements: summary.improvements,
      },
    };

    this.benchmarkHistory.push(round);

    // Keep only last 24 benchmarks
    if (this.benchmarkHistory.length > 24) {
      this.benchmarkHistory.shift();
    }

    this.lastBenchmarkTime = Date.now();

    // Feed results back to optimizer
    this.updateScorecard(results);
    this.publishResults(round);

    console.log('[BenchmarkService] Round complete:', roundId, 'Duration:', duration, 'ms');
    console.log('[BenchmarkService] Summary:', summary);

    bus.publish('benchmark:complete', round);
  }

  /**
   * Benchmark a single provider with a single prompt
   */
  private async benchmarkProvider(provider: string, prompt: string): Promise<BenchmarkResult> {
    const startTime = Date.now();

    try {
      const response = await generateLLM({
        prompt,
        provider,
        maxTokens: 512,
        timeout: 30000,
      });

      const latency = Date.now() - startTime;
      const tokens = (response.length / 4) | 0; // Estimate tokens

      // Simple quality heuristic: longer, more detailed responses score higher
      const qualityScore = Math.min(
        1,
        0.5 + // Base score
        (response.length / 2000) * 0.3 + // Length component
        (response.split('.').length / 20) * 0.2 // Sentence count component
      );

      return {
        provider,
        prompt,
        response,
        latency,
        tokens,
        qualityScore,
        timestamp: Date.now(),
        success: true,
      };
    } catch (error) {
      const latency = Date.now() - startTime;

      return {
        provider,
        prompt,
        response: '',
        latency,
        tokens: 0,
        qualityScore: 0,
        timestamp: Date.now(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Analyze benchmark results and identify trends
   */
  private analyzeBenchmarkResults(results: BenchmarkResult[]): {
    bestProvider: string;
    improvements: string[];
  } {
    const byProvider: { [key: string]: BenchmarkResult[] } = {};

    results.forEach((result) => {
      if (!byProvider[result.provider]) {
        byProvider[result.provider] = [];
      }
      byProvider[result.provider].push(result);
    });

    let bestProvider = 'unknown';
    let bestScore = -1;

    const improvements: string[] = [];

    // Analyze each provider
    Object.entries(byProvider).forEach(([provider, providerResults]) => {
      const successResults = providerResults.filter((r) => r.success);
      const successRate = successResults.length / providerResults.length;

      if (successResults.length === 0) {
        improvements.push(`${provider}: 0% success rate - CRITICAL`);
        return;
      }

      const avgLatency = successResults.reduce((acc, r) => acc + r.latency, 0) / successResults.length;
      const avgQuality = successResults.reduce((acc, r) => acc + r.qualityScore, 0) / successResults.length;

      // Composite score: 40% latency, 30% quality, 30% reliability
      const score =
        (1 - Math.min(1, avgLatency / 5000)) * 0.4 + // Lower latency = better
        avgQuality * 0.3 +
        successRate * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }

      // Check for improvements
      if (successRate < 0.5) {
        improvements.push(`${provider}: Low success rate (${(successRate * 100).toFixed(1)}%)`);
      }
      if (avgLatency > 3000) {
        improvements.push(`${provider}: High latency (${avgLatency.toFixed(0)}ms)`);
      }
    });

    improvements.push(`Best provider: ${bestProvider} (score: ${bestScore.toFixed(3)})`);

    return { bestProvider, improvements };
  }

  /**
   * Feed benchmark results back to the scorecard
   */
  private updateScorecard(results: BenchmarkResult[]): void {
    const smartRouter = getSmartRouter();
    if (!smartRouter) {
      console.log('[BenchmarkService] SmartRouter not available');
      return;
    }

    const scorecard = smartRouter.getScorecard();

    // Record each successful benchmark as a real request
    results.forEach((result) => {
      if (result.success) {
        scorecard.recordRequest(result.provider, {
          timestamp: result.timestamp,
          latency: result.latency,
          success: true,
          tokens: result.tokens,
          costPerToken: this.estimateCost(result.provider, result.tokens),
        });
      }
    });

    console.log('[BenchmarkService] Updated scorecard with benchmark results');
  }

  /**
   * Publish benchmark results (notify observers)
   */
  private publishResults(round: BenchmarkRound): void {
    // Update runtime config with insights
    const config = getRuntimeConfig();
    
    // Calculate optimization score based on results
    const avgQuality = round.summary.avgQualityScore;
    const successRate = round.summary.successCount / round.summary.providersAttempted;
    const optimizationScore = (avgQuality + successRate) / 2;
    
    config.setOptimizationScore(optimizationScore, 'BenchmarkService');

    // Publish event
    bus.publish('benchmark:results', {
      roundId: round.id,
      timestamp: round.timestamp,
      optimizationScore,
      summary: round.summary,
    });
  }

  /**
   * Get benchmark history
   */
  getHistory(limit: number = 10): BenchmarkRound[] {
    return this.benchmarkHistory.slice(-limit);
  }

  /**
   * Get latest benchmark results
   */
  getLatestResults(): BenchmarkRound | null {
    return this.benchmarkHistory.length > 0
      ? this.benchmarkHistory[this.benchmarkHistory.length - 1]
      : null;
  }

  /**
   * Initialize standard benchmark prompts
   */
  private initBenchmarkPrompts(): void {
    this.benchmarkPrompts = [
      // 1. Simple Q&A
      'What is the capital of France?',
      
      // 2. Code generation
      'Write a function in JavaScript that reverses a string.',
      
      // 3. Explanation
      'Explain quantum computing in simple terms.',
      
      // 4. Summarization
      'Summarize: The Industrial Revolution was a period of human history marked by the transition from agrarian societies to industrial ones.',
      
      // 5. Creative writing
      'Write a short poem about autumn.',
      
      // 6. Data extraction
      'Extract the dates from this text: The conference was held on March 15, 2024, with follow-ups on April 22 and May 10.',
      
      // 7. Problem solving
      'If a train leaves New York at 60 mph and another leaves Boston at 80 mph (220 miles apart), when do they meet?',
      
      // 8. Translation/Transformation
      'Convert this to JSON: Name: Alice, Age: 30, Email: alice@example.com',
      
      // 9. Analysis
      'What are the pros and cons of remote work?',
      
      // 10. Complex reasoning
      'Given that all cats are mammals, and all mammals have lungs, are all cats able to breathe? Explain your reasoning.',
    ];
  }

  /**
   * Estimate cost for a provider and token count
   */
  private estimateCost(provider: string, tokens: number): number {
    const costPerMillion: { [key: string]: number } = {
      deepseek: 0.14,
      gemini: 0.75,
      anthropic: 3.0,
      openai: 1.5,
    };

    const costPerToken = (costPerMillion[provider] || 1.0) / 1_000_000;
    return costPerToken;
  }
}

// Singleton instance
let benchmarkServiceInstance: BenchmarkService | null = null;

/**
 * Initialize benchmark service
 */
export function initBenchmarkService(): BenchmarkService {
  if (!benchmarkServiceInstance) {
    benchmarkServiceInstance = new BenchmarkService();
  }
  return benchmarkServiceInstance;
}

/**
 * Get benchmark service singleton
 */
export function getBenchmarkService(): BenchmarkService {
  if (!benchmarkServiceInstance) {
    benchmarkServiceInstance = new BenchmarkService();
  }
  return benchmarkServiceInstance;
}

export type { BenchmarkResult, BenchmarkRound };
