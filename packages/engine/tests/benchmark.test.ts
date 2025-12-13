/**
 * @tooloo/engine - Performance Benchmarks
 * Measures routing speed, skill execution time, and throughput
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RoutingEngine, type OrchestrationContext } from '../src/index.js';
import { SkillRegistry, defineSkill } from '@tooloo/skills';
import { createSessionId, createUserId } from '@tooloo/core';

// =============================================================================
// BENCHMARK CONFIGURATION
// =============================================================================

const ITERATIONS = {
  routing: 100,
  execution: 10,
  concurrent: 50,
};

const THRESHOLDS = {
  routingP95: 20,    // 20ms p95 for routing
  routingP99: 50,    // 50ms p99 for routing
  throughput: 50,    // 50 ops/sec minimum
};

// =============================================================================
// HELPERS
// =============================================================================

interface BenchmarkResult {
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
}

function calculateStats(times: number[]): BenchmarkResult {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const len = sorted.length;
  
  return {
    iterations: len,
    totalTime: sum,
    avgTime: sum / len,
    minTime: sorted[0] || 0,
    maxTime: sorted[len - 1] || 0,
    p50: sorted[Math.floor(len * 0.5)] || 0,
    p95: sorted[Math.floor(len * 0.95)] || 0,
    p99: sorted[Math.floor(len * 0.99)] || 0,
    throughput: len / (sum / 1000),
  };
}

function formatResult(name: string, result: BenchmarkResult): string {
  return `
📊 ${name}
   Iterations: ${result.iterations}
   Avg: ${result.avgTime.toFixed(2)}ms
   Min: ${result.minTime.toFixed(2)}ms
   Max: ${result.maxTime.toFixed(2)}ms
   P50: ${result.p50.toFixed(2)}ms
   P95: ${result.p95.toFixed(2)}ms
   P99: ${result.p99.toFixed(2)}ms
   Throughput: ${result.throughput.toFixed(0)} ops/sec
`;
}

function createTestContext(message: string): OrchestrationContext {
  return {
    sessionId: createSessionId(),
    userId: createUserId(),
    userMessage: message,
    intent: { type: 'unknown', confidence: 0.5 },
    conversation: [],
    memory: { facts: [], entities: [], relationships: [] },
    artifacts: [],
    metadata: {
      timestamp: new Date(),
      requestId: `bench-${Date.now()}`,
      source: 'internal' as const,
    },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Performance Benchmarks', () => {
  let registry: SkillRegistry;
  let routingEngine: RoutingEngine;

  beforeAll(async () => {
    registry = new SkillRegistry();
    
    // Register test skills
    const skills = [
      defineSkill({
        id: 'bench-code',
        name: 'Code Generator',
        description: 'Generates code',
        instructions: 'Generate code based on the user request',
        triggers: { intents: ['code', 'create'], keywords: ['function', 'class', 'typescript', 'write'] },
        execute: async () => ({ content: 'Code', tokens: 10 }),
      }),
      defineSkill({
        id: 'bench-analyze',
        name: 'Code Analyzer',
        description: 'Analyzes code',
        instructions: 'Analyze the code and explain it',
        triggers: { intents: ['analyze'], keywords: ['analyze', 'explain', 'review'] },
        execute: async () => ({ content: 'Analysis', tokens: 10 }),
      }),
      defineSkill({
        id: 'bench-chat',
        name: 'Chat',
        description: 'General chat',
        instructions: 'Have a friendly conversation',
        triggers: { intents: ['chat', 'unknown'], keywords: [] },
        execute: async () => ({ content: 'Hello', tokens: 5 }),
      }),
    ];
    
    skills.forEach(s => registry.register(s));

    routingEngine = new RoutingEngine(registry, {
      semantic: false,
      minConfidence: 0.1,
      semanticWeight: 0,
      keywordWeight: 0.5,
    });
  });

  describe('Routing Performance', () => {
    it(`should route ${ITERATIONS.routing} queries within threshold`, async () => {
      const times: number[] = [];
      const queries = [
        'Write a TypeScript function',
        'Analyze this code',
        'Hello, how are you?',
        'Create a class for user management',
        'Explain the difference between map and filter',
      ];

      for (let i = 0; i < ITERATIONS.routing; i++) {
        const query = queries[i % queries.length] || queries[0];
        const ctx = createTestContext(query!);

        const start = performance.now();
        await routingEngine.route(ctx);
        const end = performance.now();

        times.push(end - start);
      }

      const stats = calculateStats(times);
      console.log(formatResult('Routing Benchmark', stats));

      expect(stats.p95).toBeLessThan(THRESHOLDS.routingP95);
      expect(stats.p99).toBeLessThan(THRESHOLDS.routingP99);
    });

    it('should maintain consistent routing for same inputs', async () => {
      const ctx = createTestContext('Write a function to sort an array');
      const results: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const result = await routingEngine.route(ctx);
        results.push(result.skill.id);
      }

      const unique = new Set(results);
      expect(unique.size).toBe(1);
    });
  });

  describe('Concurrent Performance', () => {
    it(`should handle ${ITERATIONS.concurrent} concurrent routing requests`, async () => {
      const contexts = Array.from({ length: ITERATIONS.concurrent }, (_, i) => 
        createTestContext(`Query ${i}: ${i % 2 === 0 ? 'Write code' : 'Analyze this'}`)
      );

      const start = performance.now();
      
      const results = await Promise.all(
        contexts.map(ctx => routingEngine.route(ctx))
      );

      const end = performance.now();
      const totalTime = end - start;
      const throughput = ITERATIONS.concurrent / (totalTime / 1000);

      console.log(`
📊 Concurrent Routing Benchmark
   Concurrent Requests: ${ITERATIONS.concurrent}
   Total Time: ${totalTime.toFixed(2)}ms
   Throughput: ${throughput.toFixed(0)} ops/sec
`);

      expect(results).toHaveLength(ITERATIONS.concurrent);
      results.forEach(r => expect(r.skill).toBeTruthy());
      expect(throughput).toBeGreaterThan(THRESHOLDS.throughput);
    });
  });

  describe('Memory Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      for (let i = 0; i < 500; i++) {
        const ctx = createTestContext('Test query ' + i);
        await routingEngine.route(ctx);
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowthMB = (finalMemory - initialMemory) / 1024 / 1024;

      console.log(`
📊 Memory Benchmark
   Initial Heap: ${(initialMemory / 1024 / 1024).toFixed(2)} MB
   Final Heap: ${(finalMemory / 1024 / 1024).toFixed(2)} MB
   Growth: ${memoryGrowthMB.toFixed(2)} MB
`);

      // Memory growth should be reasonable
      expect(memoryGrowthMB).toBeLessThan(50);
    });
  });
});
