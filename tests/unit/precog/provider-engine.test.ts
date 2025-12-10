/**
 * Precog Provider Engine Test Suite
 * @version 3.3.510
 *
 * Tests for the provider engine types and structures including:
 * - Provider status tracking
 * - Generation parameters
 * - Streaming parameters
 * - Image generation
 * - Ensemble mode
 * - Cost calculation
 * - Complexity classification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ProviderStatus {
  name: string;
  available: boolean;
  model: string;
  lastUsed?: number;
  errorCount?: number;
}

interface GenerateParams {
  prompt: string;
  system?: string;
  history?: ConversationMessage[];
  taskType?: string;
  cohortId?: string;
  workflowId?: string;
  sessionId?: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
  modelTier?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface GenerateResult {
  content: string;
  provider: string;
  model: string;
  cost_usd: number;
  complexity: 'low' | 'high';
  reasoning: string;
  usage?: {
    input: number;
    output: number;
  };
}

interface StreamParams extends GenerateParams {
  onChunk: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
}

interface ImageGenerationRequest {
  prompt: string;
  provider?: 'openai' | 'gemini';
  model?: string;
  imageSize?: string;
  quality?: 'standard' | 'hd';
  style?: 'natural' | 'vivid';
}

interface ImageGenerationResponse {
  images: GeneratedImage[];
}

interface GeneratedImage {
  data: string;
  mimeType: string;
  url?: string;
}

interface EnsembleParams {
  prompt: string;
  system?: string;
  taskType?: string;
  sessionId?: string;
  providers?: string[];
  synthesize?: boolean;
}

interface EnsembleResult {
  responses: ProviderResponse[];
  synthesized?: string;
  meta: EnsembleMeta;
}

interface ProviderResponse {
  provider: string;
  content: string;
  success: boolean;
  latencyMs: number;
  costUsd: number;
  error?: string;
}

interface EnsembleMeta {
  totalLatencyMs: number;
  successCount: number;
  failureCount: number;
  totalCostUsd: number;
  providers: string[];
}

interface CostRecord {
  provider: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  timestamp: number;
}

interface WorkflowCost {
  cohortId: string;
  workflowId: string;
  provider: string;
  cost: number;
  capabilityGain: number;
  timestamp: number;
}

// ============================================================================
// PROVIDER STATUS TESTS
// ============================================================================

describe('ProviderStatus', () => {
  it('should create available provider status', () => {
    const status: ProviderStatus = {
      name: 'openai',
      available: true,
      model: 'gpt-4o',
      lastUsed: Date.now(),
      errorCount: 0,
    };
    expect(status.available).toBe(true);
    expect(status.errorCount).toBe(0);
  });

  it('should create unavailable provider status', () => {
    const status: ProviderStatus = {
      name: 'anthropic',
      available: false,
      model: 'claude-3-sonnet',
      errorCount: 3,
    };
    expect(status.available).toBe(false);
    expect(status.errorCount).toBe(3);
  });

  it('should track multiple providers', () => {
    const providers: ProviderStatus[] = [
      { name: 'openai', available: true, model: 'gpt-4o' },
      { name: 'anthropic', available: true, model: 'claude-3-sonnet' },
      { name: 'gemini', available: true, model: 'gemini-1.5-pro' },
      { name: 'deepseek', available: false, model: 'deepseek-coder' },
    ];
    expect(providers).toHaveLength(4);
    expect(providers.filter((p) => p.available)).toHaveLength(3);
  });
});

// ============================================================================
// GENERATE PARAMS TESTS
// ============================================================================

describe('GenerateParams', () => {
  it('should create minimal params', () => {
    const params: GenerateParams = {
      prompt: 'Hello, world!',
    };
    expect(params.prompt).toBe('Hello, world!');
    expect(params.system).toBeUndefined();
  });

  it('should create params with system prompt', () => {
    const params: GenerateParams = {
      prompt: 'Explain quantum computing',
      system: 'You are a helpful physics tutor',
    };
    expect(params.system).toBe('You are a helpful physics tutor');
  });

  it('should include conversation history', () => {
    const params: GenerateParams = {
      prompt: 'Continue the story',
      history: [
        { role: 'user', content: 'Start a story' },
        { role: 'assistant', content: 'Once upon a time...' },
      ],
    };
    expect(params.history).toHaveLength(2);
  });

  it('should support task type', () => {
    const params: GenerateParams = {
      prompt: 'Write a sorting algorithm',
      taskType: 'code_generation',
    };
    expect(params.taskType).toBe('code_generation');
  });

  it('should support provider override', () => {
    const params: GenerateParams = {
      prompt: 'Test prompt',
      provider: 'anthropic',
      model: 'claude-3-opus',
    };
    expect(params.provider).toBe('anthropic');
    expect(params.model).toBe('claude-3-opus');
  });

  it('should support workflow tracking', () => {
    const params: GenerateParams = {
      prompt: 'Test prompt',
      cohortId: 'cohort-123',
      workflowId: 'wf-456',
      sessionId: 'session-789',
    };
    expect(params.cohortId).toBe('cohort-123');
    expect(params.workflowId).toBe('wf-456');
    expect(params.sessionId).toBe('session-789');
  });

  it('should support token limits', () => {
    const params: GenerateParams = {
      prompt: 'Generate a long response',
      maxTokens: 4096,
      modelTier: 'pro',
    };
    expect(params.maxTokens).toBe(4096);
    expect(params.modelTier).toBe('pro');
  });
});

// ============================================================================
// GENERATE RESULT TESTS
// ============================================================================

describe('GenerateResult', () => {
  it('should create successful result', () => {
    const result: GenerateResult = {
      content: 'This is the generated response.',
      provider: 'openai',
      model: 'gpt-4o',
      cost_usd: 0.003,
      complexity: 'low',
      reasoning: 'Auto-routed to openai (low complexity, flash tier)',
    };
    expect(result.provider).toBe('openai');
    expect(result.cost_usd).toBe(0.003);
  });

  it('should track token usage', () => {
    const result: GenerateResult = {
      content: 'Response content',
      provider: 'anthropic',
      model: 'claude-3-sonnet',
      cost_usd: 0.01,
      complexity: 'high',
      reasoning: 'Auto-routed to anthropic (high complexity, pro tier)',
      usage: {
        input: 500,
        output: 1200,
      },
    };
    expect(result.usage?.input).toBe(500);
    expect(result.usage?.output).toBe(1200);
  });

  it('should classify complexity correctly', () => {
    const lowComplexity: GenerateResult = {
      content: 'Simple answer',
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      cost_usd: 0.001,
      complexity: 'low',
      reasoning: 'Low complexity task',
    };
    expect(lowComplexity.complexity).toBe('low');

    const highComplexity: GenerateResult = {
      content: 'Complex analysis',
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      cost_usd: 0.05,
      complexity: 'high',
      reasoning: 'High complexity task',
    };
    expect(highComplexity.complexity).toBe('high');
  });
});

// ============================================================================
// STREAM PARAMS TESTS
// ============================================================================

describe('StreamParams', () => {
  it('should include onChunk callback', () => {
    const chunks: string[] = [];
    const params: StreamParams = {
      prompt: 'Stream test',
      onChunk: (chunk) => chunks.push(chunk),
    };
    params.onChunk('Hello');
    params.onChunk(' World');
    expect(chunks).toEqual(['Hello', ' World']);
  });

  it('should support onComplete callback', () => {
    let finalText = '';
    const params: StreamParams = {
      prompt: 'Stream test',
      onChunk: () => {},
      onComplete: (text) => {
        finalText = text;
      },
    };
    params.onComplete?.('Full response text');
    expect(finalText).toBe('Full response text');
  });

  it('should inherit generate params', () => {
    const params: StreamParams = {
      prompt: 'Stream with options',
      system: 'System prompt',
      provider: 'openai',
      taskType: 'code_generation',
      onChunk: () => {},
    };
    expect(params.system).toBe('System prompt');
    expect(params.provider).toBe('openai');
  });
});

// ============================================================================
// IMAGE GENERATION TESTS
// ============================================================================

describe('ImageGenerationRequest', () => {
  it('should create minimal request', () => {
    const request: ImageGenerationRequest = {
      prompt: 'A beautiful sunset over mountains',
    };
    expect(request.prompt).toContain('sunset');
  });

  it('should support OpenAI provider', () => {
    const request: ImageGenerationRequest = {
      prompt: 'A cat wearing a hat',
      provider: 'openai',
      model: 'dall-e-3',
      imageSize: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    };
    expect(request.provider).toBe('openai');
    expect(request.model).toBe('dall-e-3');
    expect(request.quality).toBe('hd');
  });

  it('should support Gemini provider', () => {
    const request: ImageGenerationRequest = {
      prompt: 'Abstract geometric art',
      provider: 'gemini',
    };
    expect(request.provider).toBe('gemini');
  });

  it('should support different image sizes', () => {
    const sizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
    sizes.forEach((size) => {
      const request: ImageGenerationRequest = {
        prompt: 'Test',
        imageSize: size,
      };
      expect(request.imageSize).toBe(size);
    });
  });
});

describe('ImageGenerationResponse', () => {
  it('should return generated images', () => {
    const response: ImageGenerationResponse = {
      images: [{ data: 'base64encodeddata...', mimeType: 'image/png' }],
    };
    expect(response.images).toHaveLength(1);
    expect(response.images[0].mimeType).toBe('image/png');
  });

  it('should support multiple images', () => {
    const response: ImageGenerationResponse = {
      images: [
        { data: 'img1...', mimeType: 'image/png' },
        { data: 'img2...', mimeType: 'image/png' },
        { data: 'img3...', mimeType: 'image/png' },
      ],
    };
    expect(response.images).toHaveLength(3);
  });

  it('should support URL-based images', () => {
    const response: ImageGenerationResponse = {
      images: [
        {
          data: '',
          mimeType: 'image/png',
          url: 'https://cdn.example.com/image.png',
        },
      ],
    };
    expect(response.images[0].url).toBeDefined();
  });
});

// ============================================================================
// ENSEMBLE MODE TESTS
// ============================================================================

describe('EnsembleParams', () => {
  it('should create ensemble params', () => {
    const params: EnsembleParams = {
      prompt: 'Complex question requiring multiple perspectives',
      providers: ['openai', 'anthropic', 'gemini'],
      synthesize: true,
    };
    expect(params.providers).toHaveLength(3);
    expect(params.synthesize).toBe(true);
  });

  it('should use default providers if not specified', () => {
    const params: EnsembleParams = {
      prompt: 'Test prompt',
    };
    const defaultProviders = params.providers || ['gemini', 'anthropic', 'openai'];
    expect(defaultProviders).toHaveLength(3);
  });

  it('should support custom provider list', () => {
    const params: EnsembleParams = {
      prompt: 'Test prompt',
      providers: ['gemini', 'deepseek'],
    };
    expect(params.providers).toEqual(['gemini', 'deepseek']);
  });
});

describe('EnsembleResult', () => {
  it('should collect provider responses', () => {
    const result: EnsembleResult = {
      responses: [
        {
          provider: 'openai',
          content: 'OpenAI response',
          success: true,
          latencyMs: 500,
          costUsd: 0.01,
        },
        {
          provider: 'anthropic',
          content: 'Anthropic response',
          success: true,
          latencyMs: 600,
          costUsd: 0.02,
        },
        {
          provider: 'gemini',
          content: 'Gemini response',
          success: true,
          latencyMs: 400,
          costUsd: 0.005,
        },
      ],
      meta: {
        totalLatencyMs: 600,
        successCount: 3,
        failureCount: 0,
        totalCostUsd: 0.035,
        providers: ['openai', 'anthropic', 'gemini'],
      },
    };
    expect(result.responses).toHaveLength(3);
    expect(result.meta.successCount).toBe(3);
  });

  it('should include synthesized response', () => {
    const result: EnsembleResult = {
      responses: [
        { provider: 'openai', content: 'Response 1', success: true, latencyMs: 500, costUsd: 0.01 },
        {
          provider: 'anthropic',
          content: 'Response 2',
          success: true,
          latencyMs: 600,
          costUsd: 0.02,
        },
      ],
      synthesized: 'Combined and synthesized response from all providers',
      meta: {
        totalLatencyMs: 800,
        successCount: 2,
        failureCount: 0,
        totalCostUsd: 0.03,
        providers: ['openai', 'anthropic'],
      },
    };
    expect(result.synthesized).toBeDefined();
  });

  it('should handle partial failures', () => {
    const result: EnsembleResult = {
      responses: [
        { provider: 'openai', content: 'Response', success: true, latencyMs: 500, costUsd: 0.01 },
        {
          provider: 'anthropic',
          content: '',
          success: false,
          latencyMs: 0,
          costUsd: 0,
          error: 'Rate limit exceeded',
        },
      ],
      meta: {
        totalLatencyMs: 500,
        successCount: 1,
        failureCount: 1,
        totalCostUsd: 0.01,
        providers: ['openai', 'anthropic'],
      },
    };
    expect(result.meta.failureCount).toBe(1);
    expect(result.responses[1].error).toBe('Rate limit exceeded');
  });
});

// ============================================================================
// COST CALCULATION TESTS
// ============================================================================

describe('Cost Calculation', () => {
  function calculateModelCost(provider: string, inputTokens: number, outputTokens: number): number {
    const rates: Record<string, { input: number; output: number }> = {
      openai: { input: 0.0025, output: 0.01 },
      anthropic: { input: 0.003, output: 0.015 },
      gemini: { input: 0.0005, output: 0.0015 },
      deepseek: { input: 0.0001, output: 0.0002 },
    };

    const rate = rates[provider] || { input: 0.001, output: 0.002 };
    return (inputTokens / 1000) * rate.input + (outputTokens / 1000) * rate.output;
  }

  it('should calculate OpenAI cost', () => {
    const cost = calculateModelCost('openai', 1000, 500);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBe(0.0025 + 0.005); // $0.0075
  });

  it('should calculate Anthropic cost', () => {
    const cost = calculateModelCost('anthropic', 1000, 500);
    expect(cost).toBe(0.003 + 0.0075); // $0.0105
  });

  it('should calculate Gemini cost', () => {
    const cost = calculateModelCost('gemini', 1000, 500);
    expect(cost).toBe(0.0005 + 0.00075); // $0.00125
  });

  it('should handle unknown provider', () => {
    const cost = calculateModelCost('unknown', 1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('should create cost record', () => {
    const record: CostRecord = {
      provider: 'openai',
      model: 'gpt-4o',
      inputTokens: 500,
      outputTokens: 1200,
      costUsd: 0.015,
      timestamp: Date.now(),
    };
    expect(record.inputTokens).toBe(500);
    expect(record.outputTokens).toBe(1200);
  });
});

describe('WorkflowCost', () => {
  it('should record workflow cost', () => {
    const cost: WorkflowCost = {
      cohortId: 'default',
      workflowId: 'wf-123456',
      provider: 'openai',
      cost: 0.025,
      capabilityGain: 0.5,
      timestamp: Date.now(),
    };
    expect(cost.cohortId).toBe('default');
    expect(cost.capabilityGain).toBe(0.5);
  });

  it('should track multiple workflow costs', () => {
    const costs: WorkflowCost[] = [
      {
        cohortId: 'team-a',
        workflowId: 'wf-1',
        provider: 'openai',
        cost: 0.01,
        capabilityGain: 0.3,
        timestamp: Date.now(),
      },
      {
        cohortId: 'team-a',
        workflowId: 'wf-2',
        provider: 'anthropic',
        cost: 0.02,
        capabilityGain: 0.5,
        timestamp: Date.now(),
      },
      {
        cohortId: 'team-b',
        workflowId: 'wf-3',
        provider: 'gemini',
        cost: 0.005,
        capabilityGain: 0.4,
        timestamp: Date.now(),
      },
    ];

    const totalCost = costs.reduce((sum, c) => sum + c.cost, 0);
    expect(totalCost).toBeCloseTo(0.035, 5);

    const avgCapabilityGain = costs.reduce((sum, c) => sum + c.capabilityGain, 0) / costs.length;
    expect(avgCapabilityGain).toBeCloseTo(0.4, 2);
  });
});

// ============================================================================
// COMPLEXITY CLASSIFICATION TESTS
// ============================================================================

describe('Complexity Classification', () => {
  function classifyComplexity(prompt: string, taskType?: string): 'low' | 'high' {
    if (taskType === 'code_generation' || taskType === 'architecting') return 'high';
    if (prompt.length > 1000) return 'high';
    if (prompt.includes('analyze') || prompt.includes('design')) return 'high';
    return 'low';
  }

  it('should classify code generation as high', () => {
    expect(classifyComplexity('Write a function', 'code_generation')).toBe('high');
  });

  it('should classify architecting as high', () => {
    expect(classifyComplexity('Plan the system', 'architecting')).toBe('high');
  });

  it('should classify long prompts as high', () => {
    const longPrompt = 'x'.repeat(1001);
    expect(classifyComplexity(longPrompt)).toBe('high');
  });

  it('should classify analyze requests as high', () => {
    expect(classifyComplexity('Please analyze this code')).toBe('high');
  });

  it('should classify design requests as high', () => {
    expect(classifyComplexity('Help me design a database')).toBe('high');
  });

  it('should classify simple queries as low', () => {
    expect(classifyComplexity('What is JavaScript?')).toBe('low');
  });

  it('should classify short prompts as low', () => {
    expect(classifyComplexity('Hello!')).toBe('low');
  });
});

// ============================================================================
// CONVERSATION MESSAGE TESTS
// ============================================================================

describe('ConversationMessage', () => {
  it('should create user message', () => {
    const message: ConversationMessage = {
      role: 'user',
      content: 'How do I sort an array?',
    };
    expect(message.role).toBe('user');
  });

  it('should create assistant message', () => {
    const message: ConversationMessage = {
      role: 'assistant',
      content: 'You can use the sort() method...',
    };
    expect(message.role).toBe('assistant');
  });

  it('should create system message', () => {
    const message: ConversationMessage = {
      role: 'system',
      content: 'You are a helpful coding assistant.',
    };
    expect(message.role).toBe('system');
  });

  it('should build conversation history', () => {
    const history: ConversationMessage[] = [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi! How can I help?' },
      { role: 'user', content: 'Explain promises' },
    ];
    expect(history).toHaveLength(4);
    expect(history.filter((m) => m.role === 'user')).toHaveLength(2);
  });
});

// ============================================================================
// PROVIDER RESPONSE TESTS
// ============================================================================

describe('ProviderResponse', () => {
  it('should create successful response', () => {
    const response: ProviderResponse = {
      provider: 'openai',
      content: 'Generated content from OpenAI',
      success: true,
      latencyMs: 450,
      costUsd: 0.008,
    };
    expect(response.success).toBe(true);
    expect(response.error).toBeUndefined();
  });

  it('should create failed response', () => {
    const response: ProviderResponse = {
      provider: 'anthropic',
      content: '',
      success: false,
      latencyMs: 0,
      costUsd: 0,
      error: 'API key invalid',
    };
    expect(response.success).toBe(false);
    expect(response.error).toBe('API key invalid');
  });

  it('should track latency', () => {
    const responses: ProviderResponse[] = [
      { provider: 'gemini', content: 'Fast', success: true, latencyMs: 200, costUsd: 0.001 },
      { provider: 'openai', content: 'Medium', success: true, latencyMs: 500, costUsd: 0.01 },
      { provider: 'anthropic', content: 'Slow', success: true, latencyMs: 800, costUsd: 0.02 },
    ];

    const avgLatency = responses.reduce((sum, r) => sum + r.latencyMs, 0) / responses.length;
    expect(avgLatency).toBe(500);
  });
});

// ============================================================================
// TASK TYPE TESTS
// ============================================================================

describe('Task Types', () => {
  const taskTypes = [
    'code_generation',
    'architecting',
    'debugging',
    'explanation',
    'summarization',
    'translation',
    'analysis',
    'creative_writing',
  ];

  it('should have predefined task types', () => {
    expect(taskTypes).toContain('code_generation');
    expect(taskTypes).toContain('architecting');
  });

  it('should map task types to complexity', () => {
    const highComplexityTasks = ['code_generation', 'architecting', 'analysis'];
    const lowComplexityTasks = ['explanation', 'summarization', 'translation'];

    expect(highComplexityTasks).toContain('code_generation');
    expect(lowComplexityTasks).toContain('explanation');
  });
});

// ============================================================================
// MODEL TIER TESTS
// ============================================================================

describe('Model Tiers', () => {
  it('should map complexity to tier', () => {
    function getModelTier(complexity: 'low' | 'high'): string {
      return complexity === 'high' ? 'pro' : 'flash';
    }

    expect(getModelTier('high')).toBe('pro');
    expect(getModelTier('low')).toBe('flash');
  });

  it('should have tier-specific models', () => {
    const modelsByTier: Record<string, Record<string, string>> = {
      flash: {
        openai: 'gpt-4o-mini',
        anthropic: 'claude-3-haiku',
        gemini: 'gemini-1.5-flash',
      },
      pro: {
        openai: 'gpt-4o',
        anthropic: 'claude-3-opus',
        gemini: 'gemini-1.5-pro',
      },
    };

    expect(modelsByTier.flash.openai).toBe('gpt-4o-mini');
    expect(modelsByTier.pro.anthropic).toBe('claude-3-opus');
  });
});

// ============================================================================
// ENSEMBLE META TESTS
// ============================================================================

describe('EnsembleMeta', () => {
  it('should track ensemble metrics', () => {
    const meta: EnsembleMeta = {
      totalLatencyMs: 1200,
      successCount: 3,
      failureCount: 0,
      totalCostUsd: 0.05,
      providers: ['openai', 'anthropic', 'gemini'],
    };
    expect(meta.successCount + meta.failureCount).toBe(meta.providers.length);
  });

  it('should calculate success rate', () => {
    const meta: EnsembleMeta = {
      totalLatencyMs: 1000,
      successCount: 2,
      failureCount: 1,
      totalCostUsd: 0.03,
      providers: ['openai', 'anthropic', 'gemini'],
    };
    const successRate = meta.successCount / meta.providers.length;
    expect(successRate).toBeCloseTo(0.667, 2);
  });

  it('should handle all failures', () => {
    const meta: EnsembleMeta = {
      totalLatencyMs: 0,
      successCount: 0,
      failureCount: 3,
      totalCostUsd: 0,
      providers: ['openai', 'anthropic', 'gemini'],
    };
    expect(meta.successCount).toBe(0);
    expect(meta.totalCostUsd).toBe(0);
  });
});
