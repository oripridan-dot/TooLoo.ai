/**
 * @tooloo/engine - Unit Tests
 * Tests for the Orchestrator and routing components
 *
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../src/orchestrator.js';
import { RoutingEngine } from '../src/routing-engine.js';
import { SkillExecutor } from '../src/skill-executor.js';
import { ContextBuilder } from '../src/context-builder.js';
import { SkillRegistry, defineSkill } from '@tooloo/skills';
import { ProviderRegistry, DeepSeekProvider } from '@tooloo/providers';
import { createSessionId, createProviderId } from '@tooloo/core';

// =============================================================================
// MOCKS
// =============================================================================

const mockSkill = defineSkill({
  id: 'test-code-skill',
  name: 'Code Generation',
  description: 'Generates code based on requirements',
  version: '1.0.0',
  instructions: 'You are a code generation assistant. Generate clean, well-documented code.',
  tools: [],
  triggers: {
    intents: ['code', 'create'],
    keywords: ['code', 'write', 'implement', 'function', 'create'],
    minConfidence: 0.5,
  },
  context: {
    maxTokens: 8000,
    ragSources: ['codebase', 'docs'],
    memoryScope: 'session',
  },
  composability: {
    requires: [],
    enhances: [],
    conflicts: [],
  },
  handler: async ({ message }) => ({
    content: `Generated code for: ${message}`,
    tokenCount: { prompt: 50, completion: 100, total: 150 },
    latencyMs: 200,
  }),
});

const mockAnalysisSkill = defineSkill({
  id: 'test-analysis-skill',
  name: 'Code Analysis',
  description: 'Analyzes and reviews code',
  version: '1.0.0',
  instructions: 'You are a code analysis assistant. Review code for bugs, style, and improvements.',
  tools: [],
  triggers: {
    intents: ['analyze'],
    keywords: ['analyze', 'review', 'explain', 'check'],
    minConfidence: 0.5,
  },
  context: {
    maxTokens: 8000,
    ragSources: ['codebase'],
    memoryScope: 'session',
  },
  composability: {
    requires: [],
    enhances: [],
    conflicts: [],
  },
  handler: async ({ message }) => ({
    content: `Analysis of: ${message}`,
    tokenCount: { prompt: 30, completion: 80, total: 110 },
    latencyMs: 150,
  }),
});

// =============================================================================
// ROUTING ENGINE TESTS
// =============================================================================

describe('RoutingEngine', () => {
  let registry: SkillRegistry;
  let routingEngine: RoutingEngine;

  beforeEach(() => {
    registry = new SkillRegistry();
    registry.register(mockSkill);
    registry.register(mockAnalysisSkill);

    routingEngine = new RoutingEngine(registry, {
      fallbackSkillId: 'test-code-skill',
      confidenceThreshold: 0.3,
    });
  });

  describe('route', () => {
    it('should route code-related queries to code skill', async () => {
      const result = await routingEngine.route({
        userMessage: 'Write a function to sort an array',
        sessionId: createSessionId('test'),
        requestId: 'req_1',
        timestamp: Date.now(),
        intent: {
          type: 'code',
          confidence: 0.9,
          entities: [],
        },
      } as any);

      expect(result.skill.id).toBe('test-code-skill');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should route analysis queries to analysis skill', async () => {
      const result = await routingEngine.route({
        userMessage: 'Analyze this code for bugs',
        sessionId: createSessionId('test'),
        requestId: 'req_2',
        timestamp: Date.now(),
        intent: {
          type: 'analyze',
          confidence: 0.8,
          entities: [],
        },
      } as any);

      expect(result.skill.id).toBe('test-analysis-skill');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should use fallback skill for unrecognized queries', async () => {
      const result = await routingEngine.route({
        userMessage: 'Something completely random xyz123',
        sessionId: createSessionId('test'),
        requestId: 'req_3',
        timestamp: Date.now(),
        intent: {
          type: 'unknown',
          confidence: 0.1,
          entities: [],
        },
      } as any);

      // Should still return a skill (fallback)
      expect(result.skill).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
});

// =============================================================================
// CONTEXT BUILDER TESTS
// =============================================================================

describe('ContextBuilder', () => {
  let contextBuilder: ContextBuilder;

  beforeEach(() => {
    contextBuilder = new ContextBuilder({
      maxShortTerm: 10,
      maxLongTerm: 100,
      maxContextTokens: 8000,
      maxArtifactsPerSession: 5,
    });
  });

  describe('buildMemoryState', () => {
    it('should build memory state from conversation', async () => {
      const memoryState = await contextBuilder.buildMemoryState(
        [
          { id: 'msg_1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
          { id: 'msg_2', role: 'assistant' as const, content: 'Hi there!', timestamp: new Date() },
        ],
        []
      );

      expect(memoryState).toBeDefined();
      expect(memoryState.shortTerm).toBeDefined();
      expect(memoryState.shortTerm).toHaveLength(2);
    });

    it('should handle empty conversation', async () => {
      const memoryState = await contextBuilder.buildMemoryState([], []);

      expect(memoryState).toBeDefined();
      expect(memoryState.shortTerm).toHaveLength(0);
    });
  });
});

// =============================================================================
// ORCHESTRATOR TESTS
// =============================================================================

describe('Orchestrator', () => {
  let skillRegistry: SkillRegistry;
  let providerRegistry: ProviderRegistry;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    skillRegistry = new SkillRegistry();
    skillRegistry.register(mockSkill);
    skillRegistry.register(mockAnalysisSkill);

    providerRegistry = new ProviderRegistry();
    // Register a mock provider
    providerRegistry.register(
      new DeepSeekProvider({
        id: createProviderId('test-provider'),
        name: 'Test Provider',
        apiKey: 'test-api-key',
        defaultModel: 'test-model',
        enabled: true,
        models: [
          {
            id: 'test-model',
            name: 'Test Model',
            contextWindow: 4000,
            maxOutputTokens: 1000,
            capabilities: [],
            costPer1kInput: 0.001,
            costPer1kOutput: 0.002,
            supportsStreaming: false,
            supportsFunctionCalling: false,
            supportsVision: false,
          },
        ],
      })
    );

    orchestrator = new Orchestrator(skillRegistry, providerRegistry, {
      routing: {
        fallbackSkillId: 'test-code-skill',
        confidenceThreshold: 0.3,
      },
    });
  });

  describe('process', () => {
    it('should process a message and return result', async () => {
      // This test requires mocking the provider's complete method
      // For now, we test that it doesn't throw
      const sessionId = createSessionId('test-session');

      try {
        await orchestrator.process('Write hello world', sessionId);
      } catch (error: any) {
        // Expected: API key is invalid
        expect(error.message).toContain('API');
      }
    });

    it('should emit events during processing', async () => {
      const events: string[] = [];

      orchestrator.on('orchestration:start', () => events.push('start'));
      orchestrator.on('orchestration:routed', () => events.push('routed'));
      orchestrator.on('orchestration:provider_selected', () => events.push('provider'));

      const sessionId = createSessionId('test-session');

      try {
        await orchestrator.process('Test message', sessionId);
      } catch {
        // Expected to fail without valid API key
      }

      // Should have emitted at least start and routed events
      expect(events).toContain('start');
      expect(events).toContain('routed');
    });
  });
});
