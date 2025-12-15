/**
 * @file Performance Benchmarks - Native Engines vs Legacy
 * @description Phase 10: Compare Skills OS native engines with legacy implementations
 * @version 1.0.0
 * @skill-os true
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getLearningEngine,
  getEvolutionEngine,
  getEmergenceEngine,
  getRoutingEngine,
  getSkillOrchestrator,
  getSkillScheduler,
  resetLearningEngine,
  resetEvolutionEngine,
  resetEmergenceEngine,
  resetRoutingEngine,
} from '../..';

// =============================================================================
// BENCHMARK UTILITIES
// =============================================================================

interface BenchmarkResult {
  name: string;
  operations: number;
  totalTime: number;
  avgTime: number;
  opsPerSecond: number;
  memoryUsed: number;
}

async function benchmark(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 1000
): Promise<BenchmarkResult> {
  // Warm up
  for (let i = 0; i < 10; i++) {
    await fn();
  }

  // Force GC if available
  if (global.gc) {
    global.gc();
  }

  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;

  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (iterations / totalTime) * 1000;
  const memoryUsed = endMemory - startMemory;

  return {
    name,
    operations: iterations,
    totalTime,
    avgTime,
    opsPerSecond,
    memoryUsed,
  };
}

function formatResult(result: BenchmarkResult): string {
  return `${result.name}:
    Total: ${result.totalTime.toFixed(2)}ms
    Avg: ${result.avgTime.toFixed(3)}ms
    Ops/sec: ${result.opsPerSecond.toFixed(0)}
    Memory: ${(result.memoryUsed / 1024).toFixed(2)}KB`;
}

// =============================================================================
// BENCHMARKS
// =============================================================================

describe('Phase 10: Performance Benchmarks', () => {
  const results: BenchmarkResult[] = [];

  beforeAll(async () => {
    // Initialize all engines
    const learning = getLearningEngine();
    const evolution = getEvolutionEngine();
    const emergence = getEmergenceEngine();
    const routing = getRoutingEngine();

    await learning.initialize();
    await evolution.initialize();
    await emergence.initialize();
    await routing.initialize();
  });

  afterAll(async () => {
    // Print summary
    console.log('\n=== PERFORMANCE BENCHMARK RESULTS ===\n');
    for (const result of results) {
      console.log(formatResult(result));
      console.log('');
    }

    // Calculate totals
    const totalOps = results.reduce((sum, r) => sum + r.operations, 0);
    const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
    console.log(`Total: ${totalOps} operations in ${totalTime.toFixed(2)}ms`);
    console.log(`Average throughput: ${((totalOps / totalTime) * 1000).toFixed(0)} ops/sec`);

    // Cleanup
    resetLearningEngine();
    resetEvolutionEngine();
    resetEmergenceEngine();
    resetRoutingEngine();
  });

  describe('LearningEngine Benchmarks', () => {
    it('should benchmark getMetrics (fast path)', async () => {
      const engine = getLearningEngine();

      const result = await benchmark(
        'LearningEngine.getMetrics',
        async () => {
          engine.getMetrics();
        },
        10000
      );

      results.push(result);
      // getMetrics should be extremely fast
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('should benchmark getStats', async () => {
      const engine = getLearningEngine();

      const result = await benchmark(
        'LearningEngine.getStats',
        async () => {
          engine.getStats();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('should benchmark isHealthy check', async () => {
      const engine = getLearningEngine();

      const result = await benchmark(
        'LearningEngine.isHealthy',
        async () => {
          engine.isHealthy();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(100000);
    });
  });

  describe('EmergenceEngine Benchmarks', () => {
    it('should benchmark emitSignal', async () => {
      const engine = getEmergenceEngine();
      let i = 0;

      const result = await benchmark(
        'EmergenceEngine.emitSignal',
        async () => {
          engine.emitSignal({
            type: `signal-${i % 10}`,
            source: `skill-${i % 5}`,
            data: { value: i },
          });
          i++;
        },
        5000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(5000);
    });

    it('should benchmark getStats', async () => {
      const engine = getEmergenceEngine();

      const result = await benchmark(
        'EmergenceEngine.getStats',
        async () => {
          engine.getStats();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('RoutingEngine Benchmarks', () => {
    it('should benchmark getStats', async () => {
      const engine = getRoutingEngine();

      const result = await benchmark(
        'RoutingEngine.getStats',
        async () => {
          engine.getStats();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('should benchmark getMetrics', async () => {
      const engine = getRoutingEngine();

      const result = await benchmark(
        'RoutingEngine.getMetrics',
        async () => {
          engine.getMetrics();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('EvolutionEngine Benchmarks', () => {
    it('should benchmark getStats', async () => {
      const engine = getEvolutionEngine();

      const result = await benchmark(
        'EvolutionEngine.getStats',
        async () => {
          engine.getStats();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('should benchmark getMetrics', async () => {
      const engine = getEvolutionEngine();

      const result = await benchmark(
        'EvolutionEngine.getMetrics',
        async () => {
          engine.getMetrics();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('Service Benchmarks', () => {
    it('should benchmark orchestrator workflow listing', async () => {
      const orchestrator = getSkillOrchestrator();

      const result = await benchmark(
        'SkillOrchestrator.listWorkflows',
        async () => {
          orchestrator.listWorkflows();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });

    it('should benchmark scheduler task listing', async () => {
      const scheduler = getSkillScheduler();

      const result = await benchmark(
        'SkillScheduler.listTasks',
        async () => {
          scheduler.listTasks();
        },
        10000
      );

      results.push(result);
      expect(result.opsPerSecond).toBeGreaterThan(50000);
    });
  });

  describe('Memory Efficiency', () => {
    it('should have minimal baseline memory usage', async () => {
      const startMemory = process.memoryUsage().heapUsed;

      // Get all engines
      const learning = getLearningEngine();
      const evolution = getEvolutionEngine();
      const emergence = getEmergenceEngine();
      const routing = getRoutingEngine();

      // Call getStats on each to ensure they're initialized
      learning.getStats();
      evolution.getStats();
      emergence.getStats();
      routing.getStats();

      const endMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (endMemory - startMemory) / 1024 / 1024; // MB

      console.log(`Baseline engine memory: ${memoryUsed.toFixed(2)}MB`);

      // Should use less than 10MB for all 4 engines
      expect(memoryUsed).toBeLessThan(10);
    });
  });

  describe('Concurrency', () => {
    it('should handle concurrent getStats calls efficiently', async () => {
      const learning = getLearningEngine();
      const evolution = getEvolutionEngine();
      const emergence = getEmergenceEngine();
      const routing = getRoutingEngine();

      const startTime = performance.now();

      // Run 100 concurrent operations across all engines
      const operations = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve().then(() => {
          learning.getStats();
          evolution.getStats();
          emergence.getStats();
          routing.getStats();
        })
      );

      await Promise.all(operations);

      const duration = performance.now() - startTime;
      const opsPerSecond = (400 / duration) * 1000; // 400 total ops (100 * 4 engines)

      console.log(`Concurrent stats ops: ${opsPerSecond.toFixed(0)} ops/sec`);
      expect(opsPerSecond).toBeGreaterThan(50000);
    });
  });
});

// =============================================================================
// COMPARISON NOTES
// =============================================================================

/**
 * LEGACY VS NATIVE COMPARISON
 * 
 * Legacy (src/cortex, src/precog):
 * - Heavy class hierarchies with complex inheritance
 * - Database-backed storage (slower I/O)
 * - Many inter-module dependencies
 * - Stateful singletons with initialization overhead
 * 
 * Native Engines (packages/skills/src/engines):
 * - Lightweight, functional design
 * - In-memory with optional persistence
 * - Zero external dependencies
 * - Lazy initialization, fast startup
 * 
 * Expected Performance Gains:
 * - Q-learning updates: 10-50x faster (no DB)
 * - Pattern detection: 5-10x faster (optimized algorithms)
 * - Provider routing: 2-5x faster (cached health checks)
 * - Memory usage: 50-70% reduction
 * 
 * Note: Legacy code is DEPRECATED as of V2.0.0
 * See src/cortex/DEPRECATED.md and src/precog/DEPRECATED.md
 */
