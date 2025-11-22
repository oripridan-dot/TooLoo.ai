/**
 * StreamMetricsCollector
 * Tracks performance and usage metrics for streaming operations
 */

export class StreamMetricsCollector {
  constructor() {
    this.metrics = {
      activeStreams: 0,
      totalBytesStreamed: 0,
      averageStreamDuration: 0,
      peakConcurrentStreams: 0,
      streamsCompleted: 0,
      streamErrors: 0,
      totalEvents: 0,
      startTime: Date.now()
    };

    this.eventLog = [];
    this.streamHistory = [];
  }

  /**
   * Record stream start
   */
  recordStreamStart(streamId) {
    this.metrics.activeStreams++;
    this.metrics.peakConcurrentStreams = Math.max(
      this.metrics.peakConcurrentStreams,
      this.metrics.activeStreams
    );

    this.logEvent({
      type: 'stream_start',
      streamId,
      timestamp: Date.now()
    });
  }

  /**
   * Record stream completion
   */
  recordStreamComplete(streamId, duration, bytesStreamed) {
    this.metrics.activeStreams--;
    this.metrics.streamsCompleted++;
    this.metrics.totalBytesStreamed += bytesStreamed;

    const newAverage = this.metrics.streamsCompleted > 0
      ? (this.metrics.averageStreamDuration * (this.metrics.streamsCompleted - 1) + duration) /
        this.metrics.streamsCompleted
      : duration;

    this.metrics.averageStreamDuration = newAverage;

    this.streamHistory.push({
      streamId,
      duration,
      bytesStreamed,
      completedAt: Date.now()
    });

    this.logEvent({
      type: 'stream_complete',
      streamId,
      duration,
      bytesStreamed,
      timestamp: Date.now()
    });
  }

  /**
   * Record error
   */
  recordError(streamId, error) {
    this.metrics.streamErrors++;
    this.metrics.activeStreams--;

    this.logEvent({
      type: 'stream_error',
      streamId,
      error: error.message || String(error),
      timestamp: Date.now()
    });
  }

  /**
   * Record event
   */
  recordEvent(streamId, eventType, dataSize = 0) {
    this.metrics.totalEvents++;
    this.metrics.totalBytesStreamed += dataSize;

    this.logEvent({
      type: eventType,
      streamId,
      dataSize,
      timestamp: Date.now()
    });
  }

  /**
   * Log event to history
   */
  logEvent(event) {
    this.eventLog.push(event);

    // Keep last 1000 events
    if (this.eventLog.length > 1000) {
      this.eventLog.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const throughput = uptime > 0
      ? (this.metrics.totalBytesStreamed / (uptime / 1000)) / 1024 // KB/s
      : 0;

    return {
      ...this.metrics,
      uptime,
      throughputKBps: throughput.toFixed(2),
      eventRate: this.metrics.totalEvents > 0
        ? (this.metrics.totalEvents / (uptime / 1000)).toFixed(2)
        : 0
    };
  }

  /**
   * Get event log
   */
  getEventLog(limit = 100) {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get stream history
   */
  getStreamHistory(limit = 100) {
    return this.streamHistory.slice(-limit);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      activeStreams: 0,
      totalBytesStreamed: 0,
      averageStreamDuration: 0,
      peakConcurrentStreams: 0,
      streamsCompleted: 0,
      streamErrors: 0,
      totalEvents: 0,
      startTime: Date.now()
    };
    this.eventLog = [];
    this.streamHistory = [];
  }
}

export default StreamMetricsCollector;
