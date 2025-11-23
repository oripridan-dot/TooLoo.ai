/**
 * Distributed Tracer - Phase 6C Observability & Tracing
 *
 * Request correlation, metrics collection, and distributed tracing
 */

export class DistributedTracer {
  constructor(options = {}) {
    this.serviceName = options.serviceName || 'unknown-service';
    this.samplingRate = options.samplingRate || 0.1; // 10% sampling
    this.maxSpans = options.maxSpans || 10000;
    this.flushInterval = options.flushInterval || 5000;
    
    this.spans = new Map();
    this.metrics = {
      requests: new Map(),
      latencies: [],
      errors: [],
      throughput: 0
    };
    
    this.flushTimer = null;
    this.startFlushTimer();
  }

  /**
   * Start a new trace
   */
  startTrace(traceId = null, parentSpanId = null) {
    const id = traceId || this.generateId();
    const spanId = this.generateId();

    const trace = {
      traceId: id,
      spanId,
      parentSpanId,
      startTime: Date.now(),
      duration: 0,
      service: this.serviceName,
      status: 'in-progress',
      tags: {},
      logs: [],
      spans: []
    };

    this.spans.set(id, trace);
    
    if (this.spans.size > this.maxSpans) {
      const firstKey = this.spans.keys().next().value;
      this.spans.delete(firstKey);
    }

    return { traceId: id, spanId };
  }

  /**
   * Create child span for operation tracing
   */
  startSpan(traceId, operationName, parentSpanId = null) {
    const spanId = this.generateId();
    
    const span = {
      spanId: spanId,
      traceId: traceId,
      parentSpanId: parentSpanId,
      operationName: operationName,
      startTime: Date.now(),
      duration: 0,
      status: 'in-progress',
      tags: {},
      logs: []
    };

    const trace = this.spans.get(traceId);
    if (trace) {
      trace.spans.push(span);
    }

    return spanId;
  }

  /**
   * End span with status
   */
  endSpan(traceId, spanId, status = 'success', metadata = {}) {
    const trace = this.spans.get(traceId);
    if (!trace) return;

    const span = trace.spans.find(s => s.spanId === spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = span.endTime - span.startTime;
      span.status = status;
      span.metadata = metadata;

      this.recordMetrics(span);
    }
  }

  /**
   * End trace
   */
  endTrace(traceId, status = 'success', metadata = {}) {
    const trace = this.spans.get(traceId);
    if (trace) {
      trace.endTime = Date.now();
      trace.duration = trace.endTime - trace.startTime;
      trace.status = status;
      trace.metadata = metadata;

      this.recordMetrics(trace);
    }
  }

  /**
   * Add tag to trace
   */
  addTag(traceId, key, value) {
    const trace = this.spans.get(traceId);
    if (trace) {
      trace.tags[key] = value;
    }
  }

  /**
   * Add log to trace
   */
  addLog(traceId, message, level = 'info') {
    const trace = this.spans.get(traceId);
    if (trace) {
      trace.logs.push({
        timestamp: Date.now(),
        level,
        message
      });
    }
  }

  /**
   * Get trace details
   */
  getTrace(traceId) {
    return this.spans.get(traceId) || null;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    const requestMetrics = {};
    for (const [endpoint, stats] of this.metrics.requests.entries()) {
      requestMetrics[endpoint] = stats;
    }

    const avgLatency = this.metrics.latencies.length > 0
      ? (this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length).toFixed(2)
      : 0;

    const errorRate = this.metrics.requests.size > 0
      ? ((this.metrics.errors.length / this.metrics.requests.size) * 100).toFixed(2)
      : 0;

    return {
      service: this.serviceName,
      activeTraces: this.spans.size,
      totalRequests: Array.from(this.metrics.requests.values()).reduce((sum, s) => sum + s.count, 0),
      averageLatency: `${avgLatency}ms`,
      errorRate: `${errorRate}%`,
      throughput: `${this.metrics.throughput.toFixed(2)} req/s`,
      requests: requestMetrics,
      recentErrors: this.metrics.errors.slice(-10)
    };
  }

  /**
   * Clear old traces
   */
  cleanup(maxAge = 300000) {
    const now = Date.now();
    const keysToDelete = [];

    for (const [traceId, trace] of this.spans.entries()) {
      if (trace.status !== 'in-progress' && (now - trace.endTime) > maxAge) {
        keysToDelete.push(traceId);
      }
    }

    keysToDelete.forEach(key => this.spans.delete(key));
  }

  /**
   * Shutdown tracer
   */
  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.spans.clear();
  }

  // ============= Private Methods =============

  generateId() {
    return Math.random().toString(36).substring(2, 11);
  }

  recordMetrics(span) {
    // Record latency
    this.metrics.latencies.push(span.duration);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies.shift();
    }

    // Record by operation/endpoint
    const key = span.operationName || span.service;
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        successCount: 0,
        errorCount: 0,
        totalLatency: 0,
        avgLatency: 0
      });
    }

    const stats = this.metrics.requests.get(key);
    stats.count++;
    stats.totalLatency += span.duration;
    stats.avgLatency = (stats.totalLatency / stats.count).toFixed(2);

    if (span.status === 'success') {
      stats.successCount++;
    } else {
      stats.errorCount++;
      this.metrics.errors.push({
        timestamp: new Date().toISOString(),
        span: span.spanId,
        operation: span.operationName,
        error: span.metadata?.error || 'unknown'
      });
    }

    // Calculate throughput
    const now = Date.now();
    const recentLatencies = this.metrics.latencies.filter(l => {
      const age = now - (this.metrics.latencies[this.metrics.latencies.length - 1] - l);
      return age < 60000; // Last 60 seconds
    });
    this.metrics.throughput = recentLatencies.length / 60;
  }

  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.cleanup();
    }, this.flushInterval);
  }
}

export default DistributedTracer;
