/**
 * Persistent Cache Layer - Phase 6A Database Optimization
 * 
 * Provides file-based and in-memory caching with automatic persistence
 * Supports TTL, compression, and automatic cleanup
 */

import fs from 'fs/promises';
import path from 'path';
import { createWriteStream, createReadStream } from 'fs';
import zlib from 'zlib';

export class PersistentCache {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'data', 'cache');
    this.ttl = options.ttl || 3600000; // 1 hour default
    this.compress = options.compress !== false; // Enable compression by default
    this.memoryCache = new Map(); // In-memory cache for hot data
    this.maxMemoryItems = options.maxMemoryItems || 1000;
    this.stats = { hits: 0, misses: 0, writes: 0, reads: 0 };
    
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn(`Persistent cache initialization warning: ${error.message}`);
    }
  }

  /**
   * Get from cache (memory first, then disk)
   */
  async get(key) {
    // Check memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && !this.isExpired(memCached)) {
      this.stats.hits++;
      // LRU: Refresh item position by deleting and re-inserting
      this.memoryCache.delete(key);
      this.memoryCache.set(key, memCached);
      return memCached.value;
    }

    // Check disk cache
    try {
      const filePath = this.getFilePath(key);
      const data = await this.readFromDisk(filePath);
      
      if (data && !this.isExpired(data)) {
        this.stats.hits++;
        // Restore to memory cache
        this.memoryCache.set(key, data);
        // LRU: Ensure we don't exceed max size after restore
        if (this.memoryCache.size > this.maxMemoryItems) {
          const firstKey = this.memoryCache.keys().next().value;
          this.memoryCache.delete(firstKey);
        }
        return data.value;
      }
    } catch (error) {
      // Cache miss is not an error
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set cache with optional TTL
   */
  async set(key, value, ttl = this.ttl) {
    const item = {
      key,
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now()
    };

    // Store in memory cache
    this.memoryCache.set(key, item);
    
    // Trim memory cache if needed
    if (this.memoryCache.size > this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    // Persist to disk asynchronously
    this.writeToDisk(key, item).catch(err => {
      console.warn(`Cache write error for ${key}: ${err.message}`);
    });

    this.stats.writes++;
  }

  /**
   * Delete from cache
   */
  async delete(key) {
    this.memoryCache.delete(key);
    
    try {
      const filePath = this.getFilePath(key);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, that's okay
    }
  }

  /**
   * Clear entire cache
   */
  async clear() {
    this.memoryCache.clear();
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        await fs.unlink(path.join(this.cacheDir, file));
      }
    } catch (error) {
      console.warn(`Cache clear error: ${error.message}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) + '%' : '0%',
      writes: this.stats.writes,
      reads: this.stats.reads,
      memorySize: this.memoryCache.size,
      maxMemory: this.maxMemoryItems
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = { hits: 0, misses: 0, writes: 0, reads: 0 };
  }

  /**
   * Clean up expired items
   */
  async cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, item] of this.memoryCache.entries()) {
      if (this.isExpired(item)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Clean disk cache
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const data = await this.readFromDisk(filePath);
        if (data && this.isExpired(data)) {
          await fs.unlink(filePath);
          cleaned++;
        }
      }
    } catch (error) {
      console.warn(`Cache cleanup error: ${error.message}`);
    }

    return cleaned;
  }

  /**
   * Get size of cached data in bytes
   */
  async getSize() {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(this.cacheDir);
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);
        totalSize += stat.size;
      }
    } catch (error) {
      console.warn(`Cache size calculation error: ${error.message}`);
    }

    return totalSize;
  }

  // ============= Private Methods =============

  getFilePath(key) {
    const hash = Buffer.from(key).toString('base64').replace(/[/=+]/g, '-');
    const ext = this.compress ? '.json.gz' : '.json';
    return path.join(this.cacheDir, `${hash}${ext}`);
  }

  async readFromDisk(filePath) {
    try {
      let data;
      
      if (this.compress && filePath.endsWith('.gz')) {
        const compressed = await fs.readFile(filePath);
        const decompressed = zlib.gunzipSync(compressed);
        data = JSON.parse(decompressed.toString());
      } else {
        const json = await fs.readFile(filePath, 'utf-8');
        data = JSON.parse(json);
      }

      this.stats.reads++;
      return data;
    } catch (error) {
      throw error;
    }
  }

  async writeToDisk(key, item) {
    try {
      const filePath = this.getFilePath(key);
      const json = JSON.stringify(item);

      if (this.compress) {
        const compressed = zlib.gzipSync(json);
        await fs.writeFile(filePath, compressed);
      } else {
        await fs.writeFile(filePath, json, 'utf-8');
      }
    } catch (error) {
      throw error;
    }
  }

  isExpired(item) {
    return item.expiresAt && Date.now() > item.expiresAt;
  }
}

export default PersistentCache;
