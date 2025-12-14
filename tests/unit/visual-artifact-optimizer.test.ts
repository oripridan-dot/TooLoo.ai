// @version 3.3.573
// TooLoo.ai Visual Artifact Optimizer Tests
// Tests for intelligent caching, memoization, and progressive rendering

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  VisualArtifactOptimizer,
  LRUCache,
  PRECOMPUTED_TEMPLATES,
} from '../../src/cortex/visual/visual-artifact-optimizer.js';

describe('Visual Artifact Optimizer', () => {
  describe('LRUCache', () => {
    let cache: LRUCache<string>;

    beforeEach(() => {
      cache = new LRUCache<string>({ maxEntries: 5 });
    });

    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should evict oldest entry when at capacity', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');
      cache.set('key6', 'value6'); // This should evict key1

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key6')).toBe('value6');
    });

    it('should update access order on get', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4');
      cache.set('key5', 'value5');

      // Access key1 to move it to end
      cache.get('key1');

      // Add new entry - should evict key2 instead of key1
      cache.set('key6', 'value6');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should track hit/miss statistics', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.666, 2);
    });

    it('should clear cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.getStats().entries).toBe(0);
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('VisualArtifactOptimizer', () => {
    let optimizer: VisualArtifactOptimizer;

    beforeEach(() => {
      optimizer = new VisualArtifactOptimizer();
      optimizer.clearCache();
    });

    it('should generate consistent cache keys', () => {
      const key1 = optimizer.generateCacheKey({
        type: 'chart',
        data: { values: [1, 2, 3] },
        options: { width: 800 },
      });

      const key2 = optimizer.generateCacheKey({
        type: 'chart',
        data: { values: [1, 2, 3] },
        options: { width: 800 },
      });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different requests', () => {
      const key1 = optimizer.generateCacheKey({
        type: 'chart',
        data: { values: [1, 2, 3] },
      });

      const key2 = optimizer.generateCacheKey({
        type: 'chart',
        data: { values: [4, 5, 6] },
      });

      expect(key1).not.toBe(key2);
    });

    it('should cache generated results', async () => {
      const generator = vi.fn().mockResolvedValue('<svg>test</svg>');

      const result1 = await optimizer.getOrGenerate(
        { type: 'chart', data: { values: [1, 2, 3] } },
        generator
      );

      const result2 = await optimizer.getOrGenerate(
        { type: 'chart', data: { values: [1, 2, 3] } },
        generator
      );

      expect(result1.svg).toBe('<svg>test</svg>');
      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
      expect(generator).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should interpolate templates correctly', () => {
      const result = optimizer.interpolateTemplate('placeholder', {
        width: 400,
        height: 300,
      });

      expect(result).toContain('viewBox="0 0 400 300"');
    });

    it('should generate placeholder SVG', () => {
      const placeholder = optimizer.generatePlaceholder(800, 600);

      expect(placeholder).toContain('<svg');
      expect(placeholder).toContain('viewBox="0 0 800 600"');
      expect(placeholder).toContain('shimmer');
    });

    it('should generate optimized bars', () => {
      const data = [
        { value: 10, label: 'A' },
        { value: 20, label: 'B' },
        { value: 30, label: 'C' },
      ];

      const bars = optimizer.generateOptimizedBars(data, {
        width: 400,
        height: 300,
        animate: false,
      });

      expect(bars).toContain('<rect');
      expect(bars).toContain('A');
      expect(bars).toContain('B');
      expect(bars).toContain('C');
    });

    it('should generate optimized path', () => {
      const points = [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 200, y: 100 },
      ];

      const path = optimizer.generateOptimizedPath(points, { simplify: false });

      expect(path).toBe('M0,0 L100,50 L200,100');
    });

    it('should simplify paths with Douglas-Peucker', () => {
      // Create a line with many colinear points that should be simplified
      const points = Array.from({ length: 100 }, (_, i) => ({
        x: i * 10,
        y: i * 5, // All points on a straight line
      }));

      const path = optimizer.generateOptimizedPath(points, {
        simplify: true,
        threshold: 1,
      });

      // Simplified path should have fewer points
      const pointCount = (path.match(/L/g) || []).length + 1;
      expect(pointCount).toBeLessThan(100);
    });

    it('should track statistics', async () => {
      const generator = vi.fn().mockResolvedValue('<svg>test</svg>');

      await optimizer.getOrGenerate({ type: 'chart' }, generator);
      await optimizer.getOrGenerate({ type: 'chart' }, generator); // cache hit

      const stats = optimizer.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    it('should create memoized functions', () => {
      const expensive = vi.fn((x: number) => `result-${x}`);
      const memoized = optimizer.memoize(expensive);

      const r1 = memoized(5);
      const r2 = memoized(5);
      const r3 = memoized(10);

      expect(r1).toBe('result-5');
      expect(r2).toBe('result-5');
      expect(r3).toBe('result-10');
      expect(expensive).toHaveBeenCalledTimes(2); // Only 2 unique calls
    });
  });

  describe('PRECOMPUTED_TEMPLATES', () => {
    it('should have gradient templates', () => {
      expect(PRECOMPUTED_TEMPLATES.gradients).toBeDefined();
      expect(PRECOMPUTED_TEMPLATES.gradients.primary).toContain('linearGradient');
      expect(PRECOMPUTED_TEMPLATES.gradients.secondary).toContain('linearGradient');
    });

    it('should have filter templates', () => {
      expect(PRECOMPUTED_TEMPLATES.filters).toBeDefined();
      expect(PRECOMPUTED_TEMPLATES.filters.glow).toContain('filter');
      expect(PRECOMPUTED_TEMPLATES.filters.shadow).toContain('filter');
    });

    it('should have background templates', () => {
      expect(PRECOMPUTED_TEMPLATES.backgrounds).toBeDefined();
      expect(PRECOMPUTED_TEMPLATES.backgrounds.dark).toContain('rect');
    });
  });
});
