import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LLMProvider from '../../../../src/precog/providers/llm-provider';
import { amygdala } from '../../../../src/cortex/amygdala/index';

// Mock dependencies
vi.mock('node-fetch');
vi.mock('../../../../src/nexus/engine/domain-expertise', () => ({
  default: vi.fn().mockImplementation(() => ({
    detectDomain: vi.fn().mockReturnValue('general'),
    getDomainPrompt: vi.fn().mockReturnValue(''),
    selectProviderForDomain: vi.fn().mockReturnValue(null),
  }))
}));
vi.mock('../../../../src/nexus/engine/continuous-learning', () => ({
  default: vi.fn().mockImplementation(() => ({
    getBestProviderForDomain: vi.fn().mockReturnValue(null),
    recordInteraction: vi.fn(),
  }))
}));
vi.mock('../../../../src/nexus/engine/env-loader', () => ({
  default: vi.fn(),
}));
vi.mock('../../../../src/cortex/amygdala/index', () => ({
  amygdala: {
    currentState: 'calm',
    spikeCortisol: vi.fn(),
  },
  AmygdalaState: {
    PANIC: 'panic',
    CRITICAL: 'critical',
  }
}));
vi.mock('../../../../src/core/event-bus', () => ({
  bus: {
    publish: vi.fn(),
  }
}));

describe('LLMProvider', () => {
  let provider: LLMProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env vars
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-key';
    
    provider = new LLMProvider();
    
    // Mock internal provider calls to avoid actual fetch calls and isolate failover logic
    // We can spy on the methods if they are public, or mock the fns object inside generateSmartLLM
    // But generateSmartLLM defines fns internally.
    // So we have to mock the methods like callGemini, callClaude, etc.
    
    // Since they are methods on the class, we can spy on them.
    vi.spyOn(provider as any, 'callGemini');
    vi.spyOn(provider as any, 'callClaude');
    vi.spyOn(provider as any, 'callOpenAI');
  });

  it('should try providers in order', async () => {
    // Mock Gemini to fail
    (provider as any).callGemini.mockRejectedValue(new Error('Gemini failed'));
    // Mock Claude to succeed
    (provider as any).callClaude.mockResolvedValue({ content: 'Claude response', provider: 'anthropic' });

    const result = await provider.generate({ prompt: 'test' });

    expect((provider as any).callGemini).toHaveBeenCalled();
    expect((provider as any).callClaude).toHaveBeenCalled();
    expect(result.content).toBe('Claude response');
    expect(result.provider).toBe('anthropic');
  });

  it('should spike cortisol on failure', async () => {
    (provider as any).callGemini.mockRejectedValue(new Error('503 Service Unavailable'));
    (provider as any).callClaude.mockResolvedValue({ content: 'Claude response' });

    await provider.generate({ prompt: 'test' });

    expect(amygdala.spikeCortisol).toHaveBeenCalledWith(0.2);
  });

  it('should return failure if all providers fail', async () => {
    (provider as any).callGemini.mockRejectedValue(new Error('Fail'));
    (provider as any).callClaude.mockRejectedValue(new Error('Fail'));
    (provider as any).callOpenAI.mockRejectedValue(new Error('Fail'));
    
    // Ensure other providers are not configured (default state in test env)
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.HF_API_KEY;
    delete process.env.LOCALAI_BASE_URL;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OI_BASE_URL;

    const result = await provider.generate({ prompt: 'test' });

    expect(result.provider).toBe('failed');
    expect(result.content).toContain('All providers failed');
  });
});
