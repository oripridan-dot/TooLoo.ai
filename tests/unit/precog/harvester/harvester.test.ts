import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Harvester } from '../../../../src/precog/harvester/index';
import { bus } from '../../../../src/core/event-bus';
import { ProviderEngine } from '../../../../src/precog/provider-engine';

// Mock dependencies
vi.mock('../../../../src/precog/harvester/collectors/static-collector', () => ({
  StaticCollector: vi.fn().mockImplementation(() => ({
    collect: vi.fn().mockResolvedValue({
      content: 'static content',
      metadata: { source: 'static' }
    })
  }))
}));

vi.mock('../../../../src/precog/harvester/collectors/dynamic-collector', () => ({
  DynamicCollector: vi.fn().mockImplementation(() => ({
    collect: vi.fn().mockResolvedValue({
      content: 'dynamic content',
      metadata: { source: 'dynamic' }
    })
  }))
}));

vi.mock('../../../../src/precog/harvester/refinery/index', () => ({
  Refinery: vi.fn().mockImplementation(() => ({
    refine: vi.fn().mockResolvedValue({
      markdown: 'refined content',
      entities: []
    })
  }))
}));

vi.mock('../../../../src/precog/harvester/truth-engine', () => ({
  TruthEngine: vi.fn().mockImplementation(() => ({
    verify: vi.fn().mockResolvedValue({
      isAccurate: true,
      confidence: 0.9,
      sources: ['test']
    })
  }))
}));

describe('Harvester', () => {
  let harvester: Harvester;
  let mockProviderEngine: ProviderEngine;

  beforeEach(() => {
    mockProviderEngine = {} as any;
    harvester = new Harvester(mockProviderEngine);
    vi.spyOn(bus, 'publish');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize correctly', () => {
    expect(harvester).toBeDefined();
  });

  it('should process static harvest request', async () => {
    const request = {
      url: 'http://example.com',
      type: 'static' as const,
      requestId: 'test-req-1'
    };

    const result = await harvester.harvest(request);

    expect(result.source.content).toBe('static content');
    expect(result.refined.markdown).toBe('refined content');
    expect(result.verification.isAccurate).toBe(true);
  });

  it('should process dynamic harvest request', async () => {
    const request = {
      url: 'http://example.com',
      type: 'dynamic' as const,
      requestId: 'test-req-2'
    };

    const result = await harvester.harvest(request);

    expect(result.source.content).toBe('dynamic content');
  });

  it('should publish memory:store event on successful verification', async () => {
    const request = {
      url: 'http://example.com',
      type: 'static' as const,
      requestId: 'test-req-3'
    };

    await harvester.harvest(request);

    expect(bus.publish).toHaveBeenCalledWith('cortex', 'memory:store', expect.objectContaining({
      type: 'external_knowledge',
      content: 'refined content'
    }));
  });
});
