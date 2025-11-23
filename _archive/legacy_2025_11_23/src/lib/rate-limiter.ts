/**
 * Rate Limiter - Phase 6B API Rate Limiting & Throttling
 *
 * Token bucket algorithm with fair queuing and distributed state
 */

export class RateLimiter {
  constructor(options = {}) {
    this.rateLimit = options.rateLimit || 100; // tokens
    this.refillRate = options.refillRate || 10; // tokens per second
    this.refillInterval = options.refillInterval || 1000; // ms
    this.maxWaitTime = options.maxWaitTime || 30000; // ms
    this.fairQueueing = options.fairQueueing !== false;
    
    this.buckets = new Map();
    this.requestQueues = new Map();
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      deniedRequests: 0,
      queuedRequests: 0,
      buckets: {}
    };
    
    this.refillTimer = null;
    this.startRefillTimer();
  }

  /**
   * Check if request is allowed
   */
  isAllowed(clientId, tokens = 1) {
    const bucket = this.getBucket(clientId);
    
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      this.stats.allowedRequests++;
      return true;
    }
    
    this.stats.deniedRequests++;
    return false;
  }

  /**
   * Acquire tokens with queuing
   */
  async acquire(clientId, tokens = 1) {
    this.stats.totalRequests++;
    
    if (this.isAllowed(clientId, tokens)) {
      return { acquired: true, waitTime: 0 };
    }

    // Queue request for fair distribution
    if (this.fairQueueing) {
      return this.queueRequest(clientId, tokens);
    }

    return { acquired: false, waitTime: 0 };
  }

  /**
   * Queue request and wait for available tokens
   */
  async queueRequest(clientId, tokens) {
    const startTime = Date.now();

    if (!this.requestQueues.has(clientId)) {
      this.requestQueues.set(clientId, []);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.requestQueues.get(clientId).splice(0, this.requestQueues.get(clientId).length);
        reject(new Error(`Rate limit queue timeout for ${clientId}`));
      }, this.maxWaitTime);

      this.requestQueues.get(clientId).push({
        tokens,
        resolve,
        reject,
        timeout,
        queuedAt: startTime
      });

      this.stats.queuedRequests++;
      this.processQueue(clientId);
    });
  }

  /**
   * Process request queue for client
   */
  processQueue(clientId) {
    const queue = this.requestQueues.get(clientId);
    if (!queue || queue.length === 0) return;

    const bucket = this.getBucket(clientId);
    const request = queue[0];

    if (bucket.tokens >= request.tokens) {
      bucket.tokens -= request.tokens;
      queue.shift();

      const waitTime = Date.now() - request.queuedAt;
      clearTimeout(request.timeout);
      request.resolve({ acquired: true, waitTime });

      this.stats.allowedRequests++;
      this.processQueue(clientId);
    }
  }

  /**
   * Set rate limit for client
   */
  setLimit(clientId, limit, refillRate) {
    const bucket = this.getBucket(clientId);
    bucket.limit = limit;
    bucket.refillRate = refillRate;
    bucket.tokens = limit;
  }

  /**
   * Reset client bucket
   */
  resetBucket(clientId) {
    const bucket = this.getBucket(clientId);
    bucket.tokens = bucket.limit;
  }

  /**
   * Get rate limit statistics
   */
  getStats() {
    const bucketStats = {};
    for (const [clientId, bucket] of this.buckets.entries()) {
      bucketStats[clientId] = {
        tokens: Math.round(bucket.tokens * 100) / 100,
        limit: bucket.limit,
        utilization: `${((bucket.limit - bucket.tokens) / bucket.limit * 100).toFixed(2)}%`,
        queueSize: this.requestQueues.get(clientId)?.length || 0
      };
    }

    return {
      totalRequests: this.stats.totalRequests,
      allowedRequests: this.stats.allowedRequests,
      deniedRequests: this.stats.deniedRequests,
      allowRate: `${((this.stats.allowedRequests / Math.max(this.stats.totalRequests, 1)) * 100).toFixed(2)}%`,
      queuedRequests: this.stats.queuedRequests,
      activeBuckets: this.buckets.size,
      buckets: bucketStats
    };
  }

  /**
   * Cleanup idle buckets
   */
  cleanupIdleBuckets(idleTime = 300000) {
    const now = Date.now();
    for (const [clientId, bucket] of this.buckets.entries()) {
      if (now - bucket.lastAccessTime > idleTime) {
        this.buckets.delete(clientId);
        this.requestQueues.delete(clientId);
      }
    }
  }

  /**
   * Shutdown rate limiter
   */
  shutdown() {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = null;
    }
    
    // Reject all pending requests
    for (const queue of this.requestQueues.values()) {
      for (const request of queue) {
        clearTimeout(request.timeout);
        request.reject(new Error('Rate limiter shutdown'));
      }
    }
    
    this.buckets.clear();
    this.requestQueues.clear();
  }

  // ============= Private Methods =============

  getBucket(clientId) {
    if (!this.buckets.has(clientId)) {
      this.buckets.set(clientId, {
        tokens: this.rateLimit,
        limit: this.rateLimit,
        refillRate: this.refillRate,
        lastAccessTime: Date.now()
      });
    }

    const bucket = this.buckets.get(clientId);
    bucket.lastAccessTime = Date.now();
    return bucket;
  }

  startRefillTimer() {
    this.refillTimer = setInterval(() => {
      for (const bucket of this.buckets.values()) {
        const tokensToAdd = (bucket.refillRate * this.refillInterval) / 1000;
        bucket.tokens = Math.min(bucket.limit, bucket.tokens + tokensToAdd);
      }
    }, this.refillInterval);
  }
}

export default RateLimiter;
