/**
 * MultiLayerCacheManager.js
 * Coordinate memory + disk cache layers with write-through strategy
 * 
 * Strategy:
 *   1. Check memory cache (fast, ~1ms)
 *   2. If miss, check disk cache (slower, ~50ms)
 *   3. If miss, return undefined
 *   4. On write: Write to both layers (write-through)
 *   5. On disk hit: Promote to memory cache
 * 
 * Phase 6D: Advanced Caching Layer
 */

import MemoryCacheLayer from './MemoryCacheLayer.js';
import DiskCacheLayer from './DiskCacheLayer.js';

class MultiLayerCacheManager {
  constructor(options = {}) {
    // Memory layer config
    const memoryConfig = options.memory || {};
    this.memory = new MemoryCacheLayer({
      maxSize: memoryConfig.maxSize || 500,
      defaultTTL: memoryConfig.ttl || 5000
    });
    
    // Disk layer config
    const diskConfig = options.disk || {};
    this.disk = new DiskCacheLayer({
      dbPath: diskConfig.dbPath || './cache/default.db',
      compressionThreshold: diskConfig.compressionThreshold || 1024,
      cleanupInterval: diskConfig.cleanupInterval || 300000,
      maxDbSize: diskConfig.maxDbSize || 100 * 1024 * 1024
    });
    
    // Dependencies for cascade invalidation
    this.dependencies = new Map(); // key -> Set of keys that depend on it
    this.invalidationListeners = new Map(); // pattern -> Set of callbacks
    
    // Statistics
    this.stats = {
      memoryHits: 0,
      diskHits: 0,
      misses: 0,
      writes: 0,
      deletes: 0,
      promotions: 0, // Disk hits promoted to memory
      invalidations: 0
    };
  }
  
  /**
   * Set a value in both cache layers
   */
  async set(key, value, ttl = 5000, layers = ['memory', 'disk']) {
    try {
      // Write to specified layers
      if (layers.includes('memory')) {
        this.memory.set(key, value, ttl);
      }
      if (layers.includes('disk')) {
        await this.disk.set(key, value, ttl);
      }
      
      this.stats.writes++;
      return true;
    } catch (err) {
      console.error('MultiLayerCacheManager.set error:', err);
      return false;
    }
  }
  
  /**
   * Get a value from cache layers
   * Strategy: memory → disk → undefined
   */
  async get(key) {
    try {
      // Check memory first
      const memValue = this.memory.get(key);
      if (memValue !== undefined) {
        this.stats.memoryHits++;
        return memValue;
      }
      
      // Check disk
      const diskValue = await this.disk.get(key);
      if (diskValue !== undefined) {
        // Promote to memory on disk hit
        const entry = await this.disk.get(key);
        if (entry !== undefined) {
          this.memory.set(key, diskValue, 5000);
          this.stats.promotions++;
        }
        this.stats.diskHits++;
        return diskValue;
      }
      
      // Miss from both layers
      this.stats.misses++;
      return undefined;
    } catch (err) {
      console.error('MultiLayerCacheManager.get error:', err);
      return undefined;
    }
  }
  
  /**
   * Check if key exists
   */
  async has(key) {
    const memHas = this.memory.has(key);
    if (memHas) return true;
    
    const diskHas = await this.disk.has(key);
    return diskHas;
  }
  
  /**
   * Invalidate a key from both layers
   */
  async invalidate(key) {
    try {
      // Remove from both layers
      this.memory.delete(key);
      await this.disk.delete(key);
      
      // Cascade invalidation to dependents
      await this._cascadeInvalidate(key);
      
      // Notify listeners
      this._notifyInvalidationListeners(key);
      
      this.stats.invalidations++;
      return true;
    } catch (err) {
      console.error('MultiLayerCacheManager.invalidate error:', err);
      return false;
    }
  }
  
  /**
   * Invalidate by pattern (wildcard)
   */
  async invalidatePattern(pattern) {
    try {
      // Pattern conversion for later use
      this._patternToRegex(pattern);
      
      // For now, just notify listeners for the pattern
      this._notifyInvalidationListeners(pattern);
      
      return true;
    } catch (err) {
      console.error('MultiLayerCacheManager.invalidatePattern error:', err);
      return false;
    }
  }
  
  /**
   * Register a dependency: key1 invalidates when key2 changes
   */
  registerDependency(dependentKey, independentKey) {
    if (!this.dependencies.has(independentKey)) {
      this.dependencies.set(independentKey, new Set());
    }
    this.dependencies.get(independentKey).add(dependentKey);
  }
  
  /**
   * Set an invalidation listener for pattern
   */
  setInvalidationListener(pattern, callback) {
    if (!this.invalidationListeners.has(pattern)) {
      this.invalidationListeners.set(pattern, new Set());
    }
    this.invalidationListeners.get(pattern).add(callback);
  }
  
  /**
   * Get combined statistics
   */
  async getStats() {
    const memStats = this.memory.getStats();
    const diskStats = await this.disk.getStats();
    
    const totalHits = this.stats.memoryHits + this.stats.diskHits;
    const totalAccess = totalHits + this.stats.misses;
    
    return {
      ...this.stats,
      memory: memStats,
      disk: diskStats,
      overallHitRate: totalAccess > 0
        ? (totalHits / totalAccess * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
  
  /**
   * Optimize caches (cleanup, compression)
   */
  async optimize() {
    try {
      // Memory optimization
      // (LRU eviction is automatic)
      
      // Disk optimization
      await this.disk.vacuum();
      
      return true;
    } catch (err) {
      console.error('MultiLayerCacheManager.optimize error:', err);
      return false;
    }
  }
  
  /**
   * Internal: Cascade invalidation to dependent keys
   */
  async _cascadeInvalidate(key) {
    const dependents = this.dependencies.get(key);
    if (!dependents) return;
    
    for (const dependentKey of dependents) {
      this.memory.delete(dependentKey);
      await this.disk.delete(dependentKey);
      
      // Recursively cascade
      await this._cascadeInvalidate(dependentKey);
    }
  }
  
  /**
   * Internal: Notify listeners for invalidation
   */
  _notifyInvalidationListeners(key) {
    for (const [pattern, listeners] of this.invalidationListeners.entries()) {
      const regex = this._patternToRegex(pattern);
      if (regex.test(key)) {
        for (const callback of listeners) {
          try {
            callback(key);
          } catch (err) {
            console.error('Invalidation listener error:', err);
          }
        }
      }
    }
  }
  
  /**
   * Internal: Convert pattern to regex
   * Examples: "provider:*" becomes a regex pattern
   */
  _patternToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
  
  /**
   * Destroy caches
   */
  destroy() {
    this.memory.destroy();
    this.disk.destroy();
    this.dependencies.clear();
    this.invalidationListeners.clear();
  }
}

export default MultiLayerCacheManager;
