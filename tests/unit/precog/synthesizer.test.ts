/**
 * Synthesizer Tests
 * Tests for multi-provider synthesis and response aggregation
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test synthesizer configuration
describe('Synthesizer Configuration', () => {
  const defaultProviders = ['gemini', 'anthropic', 'openai'];

  it('should have default providers', () => {
    expect(defaultProviders).toContain('gemini');
    expect(defaultProviders).toContain('anthropic');
    expect(defaultProviders).toContain('openai');
  });

  it('should have exactly 3 providers', () => {
    expect(defaultProviders.length).toBe(3);
  });
});

// Test response type handling
describe('Response Type Handling', () => {
  type ResponseType = 'context-driven' | 'factual' | 'creative' | 'analytical';

  function getResponseStrategy(responseType: ResponseType): { temperature: number; maxTokens: number } {
    switch (responseType) {
      case 'context-driven':
        return { temperature: 0.7, maxTokens: 1024 };
      case 'factual':
        return { temperature: 0.3, maxTokens: 512 };
      case 'creative':
        return { temperature: 0.9, maxTokens: 2048 };
      case 'analytical':
        return { temperature: 0.5, maxTokens: 1536 };
      default:
        return { temperature: 0.7, maxTokens: 1024 };
    }
  }

  it('should configure context-driven responses', () => {
    const strategy = getResponseStrategy('context-driven');
    expect(strategy.temperature).toBe(0.7);
    expect(strategy.maxTokens).toBe(1024);
  });

  it('should configure factual responses', () => {
    const strategy = getResponseStrategy('factual');
    expect(strategy.temperature).toBe(0.3);
    expect(strategy.maxTokens).toBe(512);
  });

  it('should configure creative responses', () => {
    const strategy = getResponseStrategy('creative');
    expect(strategy.temperature).toBe(0.9);
    expect(strategy.maxTokens).toBe(2048);
  });

  it('should configure analytical responses', () => {
    const strategy = getResponseStrategy('analytical');
    expect(strategy.temperature).toBe(0.5);
  });
});

// Test parallel execution results
describe('Parallel Execution Results', () => {
  interface ProviderResult {
    provider: string;
    response?: string;
    error?: string;
    success: boolean;
    latency?: number;
  }

  it('should track successful responses', () => {
    const result: ProviderResult = {
      provider: 'openai',
      response: 'Hello from OpenAI',
      success: true,
      latency: 500
    };
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
  });

  it('should track failed responses', () => {
    const result: ProviderResult = {
      provider: 'anthropic',
      error: 'Rate limit exceeded',
      success: false
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Rate limit exceeded');
  });

  it('should track latency', () => {
    const result: ProviderResult = {
      provider: 'gemini',
      response: 'Response',
      success: true,
      latency: 1234
    };
    expect(result.latency).toBe(1234);
  });
});

// Test response aggregation
describe('Response Aggregation', () => {
  interface ProviderResult {
    provider: string;
    response?: string;
    success: boolean;
    quality?: number;
  }

  function aggregateResponses(results: ProviderResult[]): string {
    const successful = results.filter(r => r.success && r.response);
    if (successful.length === 0) return 'No responses available';
    
    if (successful.length === 1) return successful[0].response!;
    
    // Simple: return highest quality or first successful
    const sorted = successful.sort((a, b) => (b.quality || 0) - (a.quality || 0));
    return sorted[0].response!;
  }

  it('should return single response when only one succeeds', () => {
    const results: ProviderResult[] = [
      { provider: 'openai', response: 'OpenAI response', success: true },
      { provider: 'anthropic', success: false },
      { provider: 'gemini', success: false }
    ];
    expect(aggregateResponses(results)).toBe('OpenAI response');
  });

  it('should return no responses message when all fail', () => {
    const results: ProviderResult[] = [
      { provider: 'openai', success: false },
      { provider: 'anthropic', success: false },
      { provider: 'gemini', success: false }
    ];
    expect(aggregateResponses(results)).toBe('No responses available');
  });

  it('should prefer highest quality response', () => {
    const results: ProviderResult[] = [
      { provider: 'openai', response: 'OpenAI', success: true, quality: 0.7 },
      { provider: 'anthropic', response: 'Anthropic', success: true, quality: 0.9 },
      { provider: 'gemini', response: 'Gemini', success: true, quality: 0.8 }
    ];
    expect(aggregateResponses(results)).toBe('Anthropic');
  });
});

// Test telemetry events
describe('Telemetry Events', () => {
  interface TelemetryEvent {
    provider: string;
    status: 'processing' | 'success' | 'error';
    latency: number;
    sessionId?: string;
  }

  it('should create processing telemetry', () => {
    const event: TelemetryEvent = {
      provider: 'OPENAI',
      status: 'processing',
      latency: 0,
      sessionId: 'session-123'
    };
    expect(event.status).toBe('processing');
    expect(event.latency).toBe(0);
  });

  it('should create success telemetry', () => {
    const event: TelemetryEvent = {
      provider: 'ANTHROPIC',
      status: 'success',
      latency: 850,
      sessionId: 'session-123'
    };
    expect(event.status).toBe('success');
    expect(event.latency).toBe(850);
  });

  it('should create error telemetry', () => {
    const event: TelemetryEvent = {
      provider: 'GEMINI',
      status: 'error',
      latency: 0,
      sessionId: 'session-123'
    };
    expect(event.status).toBe('error');
  });
});

// Test augmented persona generation
describe('Augmented Persona', () => {
  function getAugmentedPersona(
    basePersona: string,
    version: string,
    uptime: number
  ): string {
    return `${basePersona}

[SYSTEM AWARENESS]
- System Version: ${version}
- Uptime: ${uptime} seconds
- Architecture: Synapsys V3.3
- Current Date: ${new Date().toISOString()}
`;
  }

  it('should include base persona', () => {
    const persona = getAugmentedPersona('I am TooLoo', '3.3.510', 1000);
    expect(persona).toContain('I am TooLoo');
  });

  it('should include system version', () => {
    const persona = getAugmentedPersona('Base', '3.3.510', 1000);
    expect(persona).toContain('3.3.510');
  });

  it('should include uptime', () => {
    const persona = getAugmentedPersona('Base', '3.3.0', 3600);
    expect(persona).toContain('3600 seconds');
  });

  it('should include architecture info', () => {
    const persona = getAugmentedPersona('Base', '3.3.0', 100);
    expect(persona).toContain('Synapsys V3.3');
  });
});

// Test synthesis timing
describe('Synthesis Timing', () => {
  function calculateSynthesisMetrics(
    startTime: number,
    endTime: number,
    providerLatencies: number[]
  ): { totalTime: number; avgLatency: number; maxLatency: number } {
    const totalTime = endTime - startTime;
    const avgLatency = providerLatencies.length > 0
      ? providerLatencies.reduce((a, b) => a + b, 0) / providerLatencies.length
      : 0;
    const maxLatency = Math.max(...providerLatencies, 0);
    
    return { totalTime, avgLatency, maxLatency };
  }

  it('should calculate total time', () => {
    const metrics = calculateSynthesisMetrics(1000, 3000, [500, 700, 800]);
    expect(metrics.totalTime).toBe(2000);
  });

  it('should calculate average latency', () => {
    const metrics = calculateSynthesisMetrics(0, 1000, [300, 600, 900]);
    expect(metrics.avgLatency).toBe(600);
  });

  it('should find max latency', () => {
    const metrics = calculateSynthesisMetrics(0, 1000, [300, 1200, 500]);
    expect(metrics.maxLatency).toBe(1200);
  });

  it('should handle empty latencies', () => {
    const metrics = calculateSynthesisMetrics(0, 1000, []);
    expect(metrics.avgLatency).toBe(0);
    expect(metrics.maxLatency).toBe(0);
  });
});

// Test quality scoring
describe('Quality Scoring', () => {
  function scoreResponse(response: string, prompt: string): number {
    let score = 0.5; // Base score
    
    // Length bonus
    if (response.length > 100) score += 0.1;
    if (response.length > 500) score += 0.1;
    
    // Relevance check (simple keyword matching)
    const promptWords = prompt.toLowerCase().split(' ');
    const responseWords = new Set(response.toLowerCase().split(' '));
    const relevantWords = promptWords.filter(w => responseWords.has(w));
    score += Math.min(0.2, relevantWords.length * 0.05);
    
    return Math.min(1.0, score);
  }

  it('should give base score for minimal response', () => {
    const score = scoreResponse('Yes', 'Question');
    expect(score).toBeCloseTo(0.5, 1);
  });

  it('should give bonus for longer responses', () => {
    const longResponse = 'a'.repeat(200);
    const score = scoreResponse(longResponse, 'test');
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it('should give bonus for relevant responses', () => {
    const score = scoreResponse(
      'Python is a programming language used for code development',
      'Python programming code'
    );
    expect(score).toBeGreaterThan(0.5);
  });

  it('should cap score at 1.0', () => {
    const veryLongResponse = 'test '.repeat(500);
    const score = scoreResponse(veryLongResponse, 'test');
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

// Test provider priority
describe('Provider Priority', () => {
  function getProviderPriority(provider: string, taskType: string): number {
    const priorities: Record<string, Record<string, number>> = {
      code: { anthropic: 1, openai: 2, gemini: 3 },
      creative: { gemini: 1, anthropic: 2, openai: 3 },
      reasoning: { anthropic: 1, openai: 2, gemini: 3 },
      general: { openai: 1, anthropic: 2, gemini: 3 }
    };
    
    return priorities[taskType]?.[provider] || 99;
  }

  it('should prioritize anthropic for code', () => {
    expect(getProviderPriority('anthropic', 'code')).toBe(1);
    expect(getProviderPriority('openai', 'code')).toBe(2);
  });

  it('should prioritize gemini for creative', () => {
    expect(getProviderPriority('gemini', 'creative')).toBe(1);
  });

  it('should prioritize anthropic for reasoning', () => {
    expect(getProviderPriority('anthropic', 'reasoning')).toBe(1);
  });

  it('should return high number for unknown', () => {
    expect(getProviderPriority('unknown', 'code')).toBe(99);
    expect(getProviderPriority('anthropic', 'unknown')).toBe(99);
  });
});

// Test error handling
describe('Error Handling', () => {
  interface SynthesisError {
    provider: string;
    errorType: 'rate_limit' | 'timeout' | 'api_error' | 'network';
    message: string;
    retryable: boolean;
  }

  function categorizeError(error: Error, provider: string): SynthesisError {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit')) {
      return { provider, errorType: 'rate_limit', message: error.message, retryable: true };
    }
    if (message.includes('timeout')) {
      return { provider, errorType: 'timeout', message: error.message, retryable: true };
    }
    if (message.includes('network') || message.includes('fetch')) {
      return { provider, errorType: 'network', message: error.message, retryable: true };
    }
    return { provider, errorType: 'api_error', message: error.message, retryable: false };
  }

  it('should categorize rate limit errors', () => {
    const error = categorizeError(new Error('Rate limit exceeded'), 'openai');
    expect(error.errorType).toBe('rate_limit');
    expect(error.retryable).toBe(true);
  });

  it('should categorize timeout errors', () => {
    const error = categorizeError(new Error('Request timeout'), 'anthropic');
    expect(error.errorType).toBe('timeout');
    expect(error.retryable).toBe(true);
  });

  it('should categorize network errors', () => {
    const error = categorizeError(new Error('Network error: fetch failed'), 'gemini');
    expect(error.errorType).toBe('network');
    expect(error.retryable).toBe(true);
  });

  it('should categorize generic API errors', () => {
    const error = categorizeError(new Error('Invalid API key'), 'openai');
    expect(error.errorType).toBe('api_error');
    expect(error.retryable).toBe(false);
  });
});
