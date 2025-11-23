// @version 2.1.11
/**
 * StreamingHandler
 * Core streaming connection management and event distribution
 * 
 * Manages active streams, tracks metrics, and handles SSE/WebSocket updates
 */

export class StreamingHandler {
  constructor() {
    this.streams = new Map();
    this.metrics = {
      activeStreams: 0,
      totalBytesStreamed: 0,
      totalEventsEmitted: 0,
      streamsCompleted: 0,
      peakConcurrentStreams: 0,
      averageStreamDuration: 0,
      startTime: Date.now()
    };
  }

  /**
   * Create a new SSE stream
   * @param {string} analysisId - Unique analysis identifier
   * @param {object} options - Stream options
   * @returns {string} streamId
   */
  createStream(analysisId, options = {}) {
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    this.streams.set(streamId, {
      id: streamId,
      analysisId,
      type: 'sse',
      startTime: Date.now(),
      bytesStreamed: 0,
      eventCount: 0,
      active: true,
      findings: [],
      phases: [],
      ...options
    });

    this.metrics.activeStreams++;
    this.metrics.peakConcurrentStreams = Math.max(
      this.metrics.peakConcurrentStreams,
      this.metrics.activeStreams
    );

    return streamId;
  }

  /**
   * Push an update to a stream (SSE format)
   * @param {string} streamId - Stream identifier
   * @param {string} type - Event type (progress, finding, phase, complete, error)
   * @param {object} data - Event data
   * @returns {string} Formatted SSE line
   */
  pushUpdate(streamId, type, data) {
    const stream = this.streams.get(streamId);
    if (!stream || !stream.active) {
      return null;
    }

    const payload = JSON.stringify({ type, data, timestamp: Date.now() });
    const sseLine = `data: ${payload}\n\n`;

    stream.bytesStreamed += sseLine.length;
    stream.eventCount++;
    this.metrics.totalEventsEmitted++;
    this.metrics.totalBytesStreamed += sseLine.length;

    // Track findings
    if (type === 'finding') {
      stream.findings.push(data);
    }

    // Track phases
    if (type === 'phase') {
      stream.phases.push({ name: data.name, timestamp: Date.now(), ...data });
    }

    return sseLine;
  }

  /**
   * Complete a stream
   * @param {string} streamId - Stream identifier
   * @param {object} finalData - Optional final data
   */
  completeStream(streamId, finalData = {}) {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.active = false;
    const duration = Date.now() - stream.startTime;

    this.metrics.activeStreams--;
    this.metrics.streamsCompleted++;
    
    if (this.metrics.streamsCompleted > 0) {
      this.metrics.averageStreamDuration =
        (this.metrics.averageStreamDuration * (this.metrics.streamsCompleted - 1) + duration) /
        this.metrics.streamsCompleted;
    }

    stream.endTime = Date.now();
    stream.duration = duration;
    stream.finalData = finalData;
  }

  /**
   * Cancel a stream
   * @param {string} streamId - Stream identifier
   * @param {string} reason - Cancellation reason
   */
  cancelStream(streamId, reason = 'User cancelled') {
    const stream = this.streams.get(streamId);
    if (!stream) return;

    stream.active = false;
    stream.cancelledAt = Date.now();
    stream.cancellationReason = reason;

    this.metrics.activeStreams--;
  }

  /**
   * Get active streams
   * @returns {array} List of active streams
   */
  getActiveStreams() {
    return Array.from(this.streams.values()).filter(s => s.active);
  }

  /**
   * Get stream statistics
   * @returns {object} Aggregated metrics
   */
  getStreamStats() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      activeStreamCount: this.metrics.activeStreams,
      throughput: this.metrics.totalBytesStreamed / ((Date.now() - this.metrics.startTime) / 1000)
    };
  }

  /**
   * Get single stream details
   * @param {string} streamId - Stream identifier
   * @returns {object} Stream details
   */
  getStreamDetails(streamId) {
    return this.streams.get(streamId);
  }

  /**
   * Clean up completed streams (optional memory management)
   */
  cleanup(maxAge = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [streamId, stream] of this.streams.entries()) {
      if (!stream.active && (stream.endTime && now - stream.endTime > maxAge)) {
        this.streams.delete(streamId);
        cleaned++;
      }
    }

    return cleaned;
  }
}

export default StreamingHandler;
