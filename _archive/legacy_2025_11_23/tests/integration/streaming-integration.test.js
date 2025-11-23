/**
 * Phase 4.5 Streaming Tests
 * Unit and integration tests for streaming components
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StreamingHandler } from '../../engine/streaming-handler.js';
import { ProgressiveAnalysisEngine } from '../../engine/progressive-analysis-engine.js';
import { StreamMetricsCollector } from '../../engine/stream-metrics-collector.js';
import { StreamingClient } from '../../lib/streaming-client.js';

describe('StreamingHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new StreamingHandler();
  });

  it('creates a stream with valid ID', () => {
    const streamId = handler.createStream('analysis-123');
    expect(streamId).toBeDefined();
    expect(streamId).toMatch(/^stream-/);
  });

  it('tracks active streams', () => {
    handler.createStream('analysis-1');
    handler.createStream('analysis-2');
    expect(handler.metrics.activeStreams).toBe(2);
  });

  it('formats SSE updates correctly', () => {
    const streamId = handler.createStream('analysis-123');
    const update = handler.pushUpdate(streamId, 'progress', { percentage: 50 });
    expect(update).toContain('data:');
    expect(update).toContain('progress');
    expect(update).toContain('\\n\\n');
  });

  it('completes streams', () => {
    const streamId = handler.createStream('analysis-123');
    handler.completeStream(streamId);
    const stream = handler.getStreamDetails(streamId);
    expect(stream.active).toBe(false);
  });

  it('returns stream statistics', () => {
    handler.createStream('analysis-1');
    handler.createStream('analysis-2');
    const stats = handler.getStreamStats();
    expect(stats.activeStreams).toBe(2);
    expect(stats.streamsCompleted).toBe(0);
    expect(stats.uptime).toBeGreaterThan(0);
  });

  it('tracks peak concurrent streams', () => {
    handler.createStream('analysis-1');
    handler.createStream('analysis-2');
    handler.createStream('analysis-3');
    expect(handler.metrics.peakConcurrentStreams).toBe(3);
  });
});

describe('ProgressiveAnalysisEngine', () => {
  let engine;
  let handler;

  beforeEach(() => {
    handler = new StreamingHandler();
    engine = new ProgressiveAnalysisEngine(handler);
  });

  it('initializes with streaming handler', () => {
    expect(engine.streamingHandler).toBe(handler);
  });

  it('emits progress events', (done) => {
    const streamId = handler.createStream('test');
    let progressEmitted = false;

    engine.emitProgress(streamId, 'preparation', 25);
    const stream = handler.getStreamDetails(streamId);

    expect(stream.eventCount).toBeGreaterThan(0);
    done();
  });

  it('emits finding events', (done) => {
    const streamId = handler.createStream('test');
    engine.emitFinding(streamId, 'Test finding', 'high', 0.95);

    const stream = handler.getStreamDetails(streamId);
    expect(stream.findings.length).toBe(1);
    expect(stream.findings[0].finding).toBe('Test finding');
    done();
  });

  it('emits phase completion events', (done) => {
    const streamId = handler.createStream('test');
    engine.emitPhase(streamId, 'Phase 1', { items: 5 });

    const stream = handler.getStreamDetails(streamId);
    expect(stream.phases.length).toBe(1);
    expect(stream.phases[0].name).toBe('Phase 1');
    done();
  });

  it('completes full analysis pipeline', async () => {
    const results = await engine.analyzeWithStreaming(
      { id: 'test-analysis', items: [1, 2, 3] },
      {}
    );

    expect(results).toBeDefined();
    expect(results.status).toBe('complete');
  });
});

describe('StreamMetricsCollector', () => {
  let collector;

  beforeEach(() => {
    collector = new StreamMetricsCollector();
  });

  it('initializes metrics', () => {
    expect(collector.metrics.activeStreams).toBe(0);
    expect(collector.metrics.streamsCompleted).toBe(0);
  });

  it('records stream start', () => {
    collector.recordStreamStart('stream-1');
    expect(collector.metrics.activeStreams).toBe(1);
  });

  it('records stream completion', () => {
    collector.recordStreamStart('stream-1');
    collector.recordStreamComplete('stream-1', 1000, 2048);

    expect(collector.metrics.activeStreams).toBe(0);
    expect(collector.metrics.streamsCompleted).toBe(1);
    expect(collector.metrics.totalBytesStreamed).toBe(2048);
    expect(collector.metrics.averageStreamDuration).toBe(1000);
  });

  it('records errors', () => {
    collector.recordStreamStart('stream-1');
    collector.recordError('stream-1', new Error('Test error'));

    expect(collector.metrics.streamErrors).toBe(1);
    expect(collector.metrics.activeStreams).toBe(0);
  });

  it('returns metrics with calculated throughput', () => {
    collector.recordStreamStart('stream-1');
    collector.recordStreamComplete('stream-1', 1000, 10240);

    const metrics = collector.getMetrics();
    expect(metrics.throughputKBps).toBeDefined();
    expect(metrics.eventRate).toBeDefined();
  });

  it('maintains event log', () => {
    collector.recordStreamStart('stream-1');
    collector.recordEvent('stream-1', 'progress', 256);

    const log = collector.getEventLog();
    expect(log.length).toBeGreaterThan(0);
  });
});

describe('StreamingClient', () => {
  let client;

  beforeEach(() => {
    client = new StreamingClient();
  });

  it('initializes with default endpoint', () => {
    expect(client.endpoint).toBe('/api/v1/analysis/stream');
  });

  it('registers event listeners', () => {
    const callback = () => {};
    client.on('progress', callback);

    expect(client.listeners.has('progress')).toBe(true);
  });

  it('removes event listeners', () => {
    const callback = () => {};
    client.on('progress', callback);
    client.off('progress', callback);

    expect(client.listeners.get('progress').length).toBe(0);
  });

  it('maintains event history', () => {
    client.handleEvent({ type: 'progress', data: { percentage: 50 } });
    client.handleEvent({ type: 'progress', data: { percentage: 75 } });

    const history = client.getEventHistory('progress');
    expect(history.length).toBe(2);
  });

  it('reports connection status', () => {
    expect(client.isActive()).toBe(false);
    client.isConnected = true;
    expect(client.isActive()).toBe(true);
  });
});

describe('Integration: Streaming Pipeline', () => {
  it('streams complete analysis from start to finish', async () => {
    const handler = new StreamingHandler();
    const engine = new ProgressiveAnalysisEngine(handler);
    const collector = new StreamMetricsCollector();

    const testData = { id: 'integration-test', value: 'test' };
    const results = await engine.analyzeWithStreaming(testData, {});

    expect(results.status).toBe('complete');
    expect(results.findingsCount).toBeGreaterThanOrEqual(0);
    expect(results.duration).toBeGreaterThan(0);
  });

  it('handles concurrent streams', async () => {
    const handler = new StreamingHandler();
    const engine = new ProgressiveAnalysisEngine(handler);

    const promises = [
      engine.analyzeWithStreaming({ id: 'stream-1' }, {}),
      engine.analyzeWithStreaming({ id: 'stream-2' }, {}),
      engine.analyzeWithStreaming({ id: 'stream-3' }, {})
    ];

    const results = await Promise.all(promises);
    expect(results.length).toBe(3);
    expect(handler.metrics.peakConcurrentStreams).toBeGreaterThanOrEqual(1);
  });

  it('recovers from stream errors', async () => {
    const handler = new StreamingHandler();
    const engine = new ProgressiveAnalysisEngine(handler);

    try {
      await engine.analyzeWithStreaming(null, {});
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
