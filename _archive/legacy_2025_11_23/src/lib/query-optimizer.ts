/**
 * Query Optimizer - Phase 6A Database Optimization
 *
 * Optimizes query patterns, implements query batching, and tracks performance
 */

export class QueryOptimizer {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 10;
    this.batchTimeout = options.batchTimeout || 100;
    this.enablePreparedStatements = options.enablePreparedStatements !== false;
    
    this.queryQueue = [];
    this.batchTimers = new Map();
    this.stats = {
      queriesBatched: 0,
      queriesOptimized: 0,
      averageLatency: 0,
      latencyHistory: [],
      slowQueries: []
    };
    
    this.slowQueryThreshold = options.slowQueryThreshold || 1000;
  }

  /**
   * Queue query for batching
   */
  queueQuery(query, params = []) {
    const queryKey = this.normalizeQuery(query);
    
    if (!this.batchTimers.has(queryKey)) {
      // Start batching timer for this query type
      const timer = setTimeout(() => {
        this.executeBatch(queryKey);
      }, this.batchTimeout);
      
      this.batchTimers.set(queryKey, timer);
    }

    return new Promise((resolve, reject) => {
      this.queryQueue.push({
        query,
        queryKey,
        params,
        resolve,
        reject,
        queuedAt: Date.now()
      });

      // Execute if batch size reached
      const batchQueries = this.queryQueue.filter(q => q.queryKey === queryKey);
      if (batchQueries.length >= this.batchSize) {
        clearTimeout(this.batchTimers.get(queryKey));
        this.executeBatch(queryKey);
      }
    });
  }

  /**
   * Execute batch of queries
   */
  async executeBatch(queryKey) {
    const batchQueries = this.queryQueue.filter(q => q.queryKey === queryKey);
    if (batchQueries.length === 0) return;

    // Remove from queue
    this.queryQueue = this.queryQueue.filter(q => q.queryKey !== queryKey);
    this.batchTimers.delete(queryKey);

    const batchStartTime = Date.now();

    try {
      // Simulate batch execution (override for actual DB implementation)
      const results = await this.executeBatchQueries(batchQueries);
      
      const latency = Date.now() - batchStartTime;
      this.recordQueryLatency(latency, batchQueries.length);

      // Resolve each query with its result
      batchQueries.forEach((q, index) => {
        q.resolve(results[index] || null);
      });

      this.stats.queriesBatched += batchQueries.length;
    } catch (error) {
      batchQueries.forEach(q => q.reject(error));
    }
  }

  /**
   * Analyze and optimize query
   */
  optimizeQuery(query) {
    const optimized = {
      original: query,
      normalized: this.normalizeQuery(query),
      suggestions: [],
      estimatedCost: 0
    };

    // Check for common anti-patterns
    if (query.includes('SELECT *')) {
      optimized.suggestions.push('Specify columns instead of SELECT *');
    }

    if (query.match(/JOIN.*JOIN.*JOIN/)) {
      optimized.suggestions.push('Consider breaking multi-join query into separate queries');
    }

    if (!query.includes('LIMIT') && query.includes('WHERE')) {
      optimized.suggestions.push('Add LIMIT clause for safety');
    }

    // Check for missing indexes (simple heuristic)
    if (query.includes('WHERE') && !query.includes('INDEX')) {
      optimized.suggestions.push('Verify indexes on WHERE clause columns');
    }

    if (optimized.suggestions.length === 0) {
      this.stats.queriesOptimized++;
    }

    return optimized;
  }

  /**
   * Get slow queries
   */
  getSlowQueries() {
    return this.stats.slowQueries.slice(-20); // Return last 20
  }

  /**
   * Get statistics
   */
  getStats() {
    const avgLatency = this.stats.latencyHistory.length > 0
      ? (this.stats.latencyHistory.reduce((a, b) => a + b, 0) / this.stats.latencyHistory.length).toFixed(2)
      : 0;

    return {
      queriesBatched: this.stats.queriesBatched,
      queriesOptimized: this.stats.queriesOptimized,
      averageLatency: `${avgLatency}ms`,
      slowQueriesCount: this.stats.slowQueries.length,
      queueSize: this.queryQueue.length,
      activeBatches: this.batchTimers.size
    };
  }

  /**
   * Clear statistics
   */
  clearStats() {
    this.stats = {
      queriesBatched: 0,
      queriesOptimized: 0,
      averageLatency: 0,
      latencyHistory: [],
      slowQueries: []
    };
  }

  // ============= Private Methods =============

  normalizeQuery(query) {
    // Remove extra whitespace and normalize for batching
    return query
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  async executeBatchQueries(queries) {
    // Override in subclass or pass executor function
    return queries.map(() => ({ success: true }));
  }

  recordQueryLatency(latency, batchSize) {
    this.stats.latencyHistory.push(latency);
    // Keep only last 1000 samples
    if (this.stats.latencyHistory.length > 1000) {
      this.stats.latencyHistory.shift();
    }

    if (latency > this.slowQueryThreshold) {
      this.stats.slowQueries.push({
        latency,
        batchSize,
        timestamp: new Date().toISOString()
      });
      // Keep only last 100 slow queries
      if (this.stats.slowQueries.length > 100) {
        this.stats.slowQueries.shift();
      }
    }
  }
}

export default QueryOptimizer;
