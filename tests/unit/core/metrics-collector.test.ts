// @version 3.3.577
/**
 * Metrics Collector Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for system metrics collection, real-time tracking, and service health
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the event bus
vi.mock('../../../src/core/event-bus', () => ({
  bus: {
    on: vi.fn(),
    emit: vi.fn(),
    publish: vi.fn(),
  },
}));

describe('MetricsCollector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Process Metrics', () => {
    describe('getProcessMetrics', () => {
      it('should return process metrics object', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getProcessMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.pid).toBe(process.pid);
        expect(metrics.memory).toBeDefined();
        expect(metrics.uptime).toBeDefined();
        expect(metrics.timestamp).toBeTruthy();
      });

      it('should include memory metrics in MB', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getProcessMetrics();

        expect(typeof metrics.memory.heapUsed).toBe('number');
        expect(typeof metrics.memory.heapTotal).toBe('number');
        expect(typeof metrics.memory.external).toBe('number');
        expect(typeof metrics.memory.rss).toBe('number');

        // Should be in MB (reasonable range)
        expect(metrics.memory.heapUsed).toBeGreaterThan(0);
        expect(metrics.memory.heapUsed).toBeLessThan(10000); // Less than 10GB
      });

      it('should include uptime in multiple formats', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getProcessMetrics();

        expect(typeof metrics.uptime.seconds).toBe('number');
        expect(typeof metrics.uptime.hours).toBe('string');
        expect(typeof metrics.uptime.human).toBe('string');
      });
    });
  });

  describe('System Metrics', () => {
    describe('getSystemMetrics', () => {
      it('should return system metrics object', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getSystemMetrics();

        expect(metrics).toBeDefined();
        expect(metrics.system).toBeTruthy();
        expect(metrics.platform).toBeTruthy();
        expect(metrics.arch).toBeTruthy();
      });

      it('should include CPU information', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getSystemMetrics();

        expect(metrics.cpus).toBeDefined();
        expect(typeof metrics.cpus.count).toBe('number');
        expect(metrics.cpus.count).toBeGreaterThan(0);
      });

      it('should include memory information', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getSystemMetrics();

        expect(metrics.memory).toBeDefined();
        expect(typeof metrics.memory.total).toBe('number');
        expect(typeof metrics.memory.used).toBe('number');
        expect(typeof metrics.memory.free).toBe('number');
        expect(metrics.memory.utilization).toContain('%');
      });

      it('should include load averages', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getSystemMetrics();

        expect(metrics.load).toBeDefined();
        expect(metrics.load['1min']).toBeDefined();
        expect(metrics.load['5min']).toBeDefined();
        expect(metrics.load['15min']).toBeDefined();
      });
    });
  });

  describe('Real-Time Metrics', () => {
    describe('recordRequest', () => {
      it('should increment total requests', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const initialMetrics = collector.getRealTimeMetrics();
        const initialTotal = initialMetrics.requests.total;

        collector.recordRequest();
        collector.recordRequest();
        collector.recordRequest();

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.requests.total).toBe(initialTotal + 3);
      });

      it('should track timestamps for per-minute calculation', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordRequest();
        collector.recordRequest();

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.requests.timestamps.length).toBeGreaterThanOrEqual(2);
        expect(metrics.requests.perMinute).toBeGreaterThanOrEqual(2);
      });
    });

    describe('recordLatency', () => {
      it('should record latency samples', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordLatency(100);
        collector.recordLatency(200);
        collector.recordLatency(150);

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.latency.samples.length).toBe(3);
      });

      it('should calculate average latency', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordLatency(100);
        collector.recordLatency(200);
        collector.recordLatency(300);

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.latency.average).toBe(200);
      });

      it('should calculate p95 latency', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();

        // Add 20 samples
        for (let i = 1; i <= 20; i++) {
          collector.recordLatency(i * 10);
        }

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.latency.p95).toBeGreaterThan(0);
      });
    });

    describe('recordTokenUsage', () => {
      it('should track input and output tokens', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordTokenUsage(100, 200, 0.001);
        collector.recordTokenUsage(50, 100, 0.0005);

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.tokens.input).toBe(150);
        expect(metrics.tokens.output).toBe(300);
        expect(metrics.tokens.total).toBe(450);
      });

      it('should track cost', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordTokenUsage(100, 200, 0.01);
        collector.recordTokenUsage(50, 100, 0.005);

        const metrics = collector.getRealTimeMetrics();
        expect(metrics.cost.total).toBeCloseTo(0.015, 5);
      });
    });

    describe('getRealTimeMetrics', () => {
      it('should return complete metrics structure', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const metrics = collector.getRealTimeMetrics();

        expect(metrics.requests).toBeDefined();
        expect(metrics.latency).toBeDefined();
        expect(metrics.tokens).toBeDefined();
        expect(metrics.cost).toBeDefined();
      });
    });
  });

  describe('Service Health', () => {
    describe('recordServiceHealth', () => {
      it('should track service health checks', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordServiceHealth('api', 4000, true, 50, { version: '1.0' });

        const serviceMetric = collector.getServiceMetrics('api');
        expect(serviceMetric).toBeDefined();
        expect(serviceMetric?.status).toBe('up');
      });

      it('should track up/down counts', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordServiceHealth('db', 5432, true, 10);
        collector.recordServiceHealth('db', 5432, true, 12);
        collector.recordServiceHealth('db', 5432, false, 1000);

        const serviceMetric = collector.getServiceMetrics('db');
        expect(serviceMetric?.upCount).toBe(2);
        expect(serviceMetric?.downCount).toBe(1);
      });

      it('should calculate average latency', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordServiceHealth('cache', 6379, true, 5);
        collector.recordServiceHealth('cache', 6379, true, 10);
        collector.recordServiceHealth('cache', 6379, true, 15);

        const serviceMetric = collector.getServiceMetrics('cache');
        expect(serviceMetric?.avgLatencyMs).toBe(10);
      });
    });

    describe('getAllServiceMetrics', () => {
      it('should return all tracked services', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordServiceHealth('api', 4000, true, 50);
        collector.recordServiceHealth('db', 5432, true, 20);

        const allMetrics = collector.getAllServiceMetrics();
        expect(allMetrics).toBeInstanceOf(Array);
        expect(allMetrics.length).toBe(2);
      });
    });
  });

  describe('Intent Processing', () => {
    describe('recordIntent', () => {
      it('should track successful intents', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordIntent(true, 100);
        collector.recordIntent(true, 150);

        const overview = collector.getSystemOverview();
        expect(overview.intents.totalProcessed).toBe(2);
        expect(overview.intents.successful).toBe(2);
        expect(overview.intents.failed).toBe(0);
      });

      it('should track failed intents', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        collector.recordIntent(true, 100);
        collector.recordIntent(false, 50);

        const overview = collector.getSystemOverview();
        expect(overview.intents.totalProcessed).toBe(2);
        expect(overview.intents.successful).toBe(1);
        expect(overview.intents.failed).toBe(1);
      });
    });
  });

  describe('Combined Metrics', () => {
    describe('getSystemOverview', () => {
      it('should return all metrics combined', async () => {
        const { MetricsCollector } = await import('../../../src/core/metrics-collector');

        const collector = new MetricsCollector();
        const overview = collector.getSystemOverview();

        expect(overview).toBeDefined();
        expect(overview.process).toBeDefined();
        expect(overview.system).toBeDefined();
        expect(overview.services).toBeDefined();
        expect(overview.intents).toBeDefined();
        expect(overview.timestamp).toBeTruthy();
      });
    });
  });

  describe('Uptime Formatting', () => {
    it('should format uptime in human-readable format', async () => {
      const { MetricsCollector } = await import('../../../src/core/metrics-collector');

      const collector = new MetricsCollector();
      const metrics = collector.getProcessMetrics();

      // Human-readable uptime should be a string
      expect(typeof metrics.uptime.human).toBe('string');
      // Should contain some time indication
      expect(metrics.uptime.human.length).toBeGreaterThan(0);
    });
  });
});
