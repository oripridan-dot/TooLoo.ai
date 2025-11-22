/**
 * MemoryCacheLayer.js
 * Fast in-process LRU cache with TTL and statistics tracking
 * 
 * Features:
 *   - LRU eviction when max size reached
 *   - Per-entry TTL with automatic expiry
 *   - Statistics tracking (hits, misses, evictions)
 *   - Configurable max size (default 1000)
 * 
 * Phase 6D: Advanced Caching Layer
 */

class MemoryCacheLayer {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    
    // Map to store cached values with metadata
    this.cache = new Map();
    
    // LRU tracking - linked list order represents access order
    this.accessOrder = new Map(); // key -> {prev, next, key}
    this.head = null; // Most recently used
    this.tail = null; // Least recently used
    
    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0,
      deletes: 0,
      expirations: 0,
      currentSize: 0
    };
    
    // Cleanup interval for expired entries (every 60 seconds)
    this.cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }
  
  /**
   * Set a value in cache with optional TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Remove if exists to update
    if (this.cache.has(key)) {
      this._removeLRUNode(key);
    }
    
    // If at capacity, evict LRU entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this._evictLRU();
    }
    
    // Store value with expiry
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt, ttl });
    
    // Add to LRU (mark as most recently used)
    this._addToLRU(key);
    
    this.stats.writes++;
    this.stats.currentSize = this.cache.size;
  }
  
  /**
   * Get a value from cache
   * Returns undefined if not found or expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.stats.misses++;
      return undefined;
    }
    
    const entry = this.cache.get(key);
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this._removeLRUNode(key);
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      this.stats.currentSize = this.cache.size;
      return undefined;
    }
    
    // Mark as recently used
    this._moveLRUNodeToHead(key);
    
    this.stats.hits++;
    return entry.value;
  }
  
  /**
   * Check if key exists (doesn't update LRU)
   */
  has(key) {
    if (!this.cache.has(key)) return false;
    
    const entry = this.cache.get(key);
    if (Date.now() > entry.expiresAt) {
      this._removeLRUNode(key);
      this.cache.delete(key);
      this.stats.expirations++;
      this.stats.currentSize = this.cache.size;
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a key from cache
   */
  delete(key) {
    if (this.cache.has(key)) {
      this._removeLRUNode(key);
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.currentSize = this.cache.size;
      return true;
    }
    return false;
  }
  
  /**
   * Clear all entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.head = null;
    this.tail = null;
    this.stats.currentSize = 0;
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    return {
      ...this.stats,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  }
  
  /**
   * Set new max size
   */
  setMaxSize(size) {
    this.maxSize = size;
    
    // Evict if necessary
    while (this.cache.size > this.maxSize) {
      this._evictLRU();
    }
  }
  
  /**
   * Internal: Add key to head of LRU list (most recently used)
   */
  _addToLRU(key) {
    const node = { key, prev: null, next: this.head };
    
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
    
    this.accessOrder.set(key, node);
  }
  
  /**
   * Internal: Move key to head (most recently used)
   */
  _moveLRUNodeToHead(key) {
    const node = this.accessOrder.get(key);
    if (!node || node === this.head) return;
    
    // Remove from current position
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }
    
    // Add to head
    node.prev = null;
    node.next = this.head;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }
  
  /**
   * Internal: Remove from LRU list
   */
  _removeLRUNode(key) {
    const node = this.accessOrder.get(key);
    if (!node) return;
    
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }
    if (node === this.head) {
      this.head = node.next;
    }
    if (node === this.tail) {
      this.tail = node.prev;
    }
    
    this.accessOrder.delete(key);
  }
  
  /**
   * Internal: Evict least recently used entry
   */
  _evictLRU() {
    if (!this.tail) return;
    
    const lruKey = this.tail.key;
    this._removeLRUNode(lruKey);
    this.cache.delete(lruKey);
    
    this.stats.evictions++;
    this.stats.currentSize = this.cache.size;
  }
  
  /**
   * Internal: Clean expired entries
   */
  _cleanup() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expired.push(key);
      }
    }
    
    for (const key of expired) {
      this._removeLRUNode(key);
      this.cache.delete(key);
      this.stats.expirations++;
    }
    
    this.stats.currentSize = this.cache.size;
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

export default MemoryCacheLayer;
