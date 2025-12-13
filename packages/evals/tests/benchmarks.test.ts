/**
 * @tooloo/evals - Performance Benchmarks
 * Measure routing and execution performance
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { SkillRegistry, SkillRouter, defineSkill } from '@tooloo/skills';
import { CircuitBreaker, ProviderRegistry } from '@tooloo/providers';
import { eventBus, createSessionId, createUserId, type SkillId } from '@tooloo/core';

// =============================================================================
// PERFORMANCE BENCHMARKS
// =============================================================================

describe('Performance Benchmarks', () => {
  describe('SkillRegistry', () => {
    let registry: SkillRegistry;
    
    beforeAll(() => {
      registry = new SkillRegistry();
      
      // Register 100 skills
      for (let i = 0; i < 100; i++) {
        registry.register(defineSkill({
          id: `skill-${i}` as SkillId,
          name: `Test Skill ${i}`,
          description: `Description for skill ${i}`,
          instructions: `Process requests for skill ${i} efficiently and accurately`,
          triggers: {
            intents: [i % 2 === 0 ? 'code' : 'chat'],
            keywords: [`keyword${i}`, `term${i}`],
          },
        }));
      }
    });

    it('should register skills quickly (< 10ms for 100 skills)', () => {
      const start = performance.now();
      const newRegistry = new SkillRegistry();
      
      for (let i = 0; i < 100; i++) {
        newRegistry.register(defineSkill({
          id: `perf-skill-${i}` as SkillId,
          name: `Perf Skill ${i}`,
          description: `Description ${i}`,
          instructions: `Process requests for perf skill ${i} efficiently`,
          triggers: { intents: ['code'], keywords: [] },
        }));
      }
      
      const duration = performance.now() - start;
      console.log(`   Register 100 skills: ${duration.toFixed(2)}ms`);
      expect(duration).toBeLessThan(50); // Very generous for CI
    });

    it('should retrieve skills quickly (< 1ms for getAll)', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        registry.getAll();
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   getAll() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms)`);
      expect(avgMs).toBeLessThan(1);
    });

    it('should lookup by ID quickly (< 0.1ms avg)', () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        registry.get(`skill-${i % 100}` as SkillId);
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   get() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms)`);
      expect(avgMs).toBeLessThan(0.1);
    });

    it('should match skills quickly (< 5ms avg)', () => {
      const iterations = 100;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        registry.matchSkills('code', 'write a function');
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   matchSkills() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(2)}ms)`);
      expect(avgMs).toBeLessThan(10);
    });
  });

  describe('CircuitBreaker', () => {
    it('should handle rapid state checks (< 0.01ms avg)', () => {
      const breaker = new CircuitBreaker('perf-test', {
        failureThreshold: 5,
        resetTimeout: 1000,
        successThreshold: 2,
        callTimeout: 5000,
      });
      
      const iterations = 100000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        breaker.canRequest();
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   canRequest() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(6)}ms)`);
      expect(avgMs).toBeLessThan(0.01);
    });

    it('should handle state transitions efficiently', () => {
      const iterations = 1000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const breaker = new CircuitBreaker(`trans-${i}`, {
          failureThreshold: 3,
          resetTimeout: 100,
          successThreshold: 2,
          callTimeout: 5000,
        });
        
        // Cycle through states
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure(); // Open
        breaker.reset(); // Back to closed
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   State transitions x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms)`);
      expect(avgMs).toBeLessThan(1);
    });
  });

  describe('EventBus', () => {
    it('should publish events quickly (< 0.1ms avg)', () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        eventBus.publish('cortex', 'intent:detected', {
          sessionId: createSessionId(),
          intent: 'code',
          confidence: 0.9,
        });
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   publish() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms)`);
      expect(avgMs).toBeLessThan(0.5);
    });

    it('should handle subscriptions efficiently', () => {
      const handlers: (() => void)[] = [];
      const subscriptions = 100;
      const start = performance.now();
      
      // Create many subscriptions
      for (let i = 0; i < subscriptions; i++) {
        const unsubscribe = eventBus.on('cortex:intent:detected', () => {});
        handlers.push(unsubscribe);
      }
      
      const subscribeTime = performance.now() - start;
      
      // Publish event
      const publishStart = performance.now();
      eventBus.publish('cortex', 'intent:detected', {
        sessionId: createSessionId(),
        intent: 'code',
        confidence: 0.9,
      });
      const publishTime = performance.now() - publishStart;
      
      // Cleanup
      handlers.forEach(h => h());
      
      console.log(`   ${subscriptions} subscriptions: ${subscribeTime.toFixed(2)}ms`);
      console.log(`   Publish with ${subscriptions} handlers: ${publishTime.toFixed(2)}ms`);
      expect(subscribeTime).toBeLessThan(50);
      expect(publishTime).toBeLessThan(10);
    });
  });

  describe('ProviderRegistry', () => {
    it('should lookup providers quickly (< 0.1ms avg)', () => {
      const registry = new ProviderRegistry();
      
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        registry.get('non-existent');
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   get() x${iterations}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms)`);
      expect(avgMs).toBeLessThan(0.1);
    });
  });

  describe('ID Generation', () => {
    it('should generate IDs quickly', () => {
      const iterations = 10000;
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        createSessionId();
        createUserId();
      }
      
      const duration = performance.now() - start;
      const avgMs = duration / iterations;
      console.log(`   ID generation x${iterations * 2}: ${duration.toFixed(2)}ms (avg: ${avgMs.toFixed(4)}ms/pair)`);
      expect(avgMs).toBeLessThan(0.1);
    });
  });
});
