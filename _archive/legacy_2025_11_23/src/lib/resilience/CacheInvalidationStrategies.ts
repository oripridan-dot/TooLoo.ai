/**
 * CacheInvalidationStrategies.js
 * Smart cache invalidation with patterns and dependencies
 */

class CacheInvalidationStrategies {
  constructor(cacheManager) {
    this.cache = cacheManager;
    this.eventMap = new Map();
    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();
    
    this.stats = {
      cascades: 0,
      patternMatches: 0,
      eventTriggered: 0
    };
  }
  
  registerDependency(key, dependsOnKey) {
    if (!this.dependencyGraph.has(dependsOnKey)) {
      this.dependencyGraph.set(dependsOnKey, new Set());
    }
    this.dependencyGraph.get(dependsOnKey).add(key);
    
    if (!this.reverseDependencyGraph.has(key)) {
      this.reverseDependencyGraph.set(key, new Set());
    }
    this.reverseDependencyGraph.get(key).add(dependsOnKey);
  }
  
  async invalidateWithDependents(key) {
    try {
      await this.cache.invalidate(key);
      
      const toInvalidate = new Set([key]);
      const processed = new Set();
      
      while (toInvalidate.size > 0) {
        const current = Array.from(toInvalidate)[0];
        toInvalidate.delete(current);
        
        if (processed.has(current)) continue;
        processed.add(current);
        
        const dependents = this.dependencyGraph.get(current);
        if (dependents) {
          for (const dependent of dependents) {
            if (!processed.has(dependent)) {
              toInvalidate.add(dependent);
            }
          }
        }
      }
      
      for (const k of processed) {
        if (k !== key) {
          await this.cache.invalidate(k);
        }
      }
      
      this.stats.cascades++;
      return processed.size;
    } catch (err) {
      console.error('CacheInvalidationStrategies.invalidateWithDependents error:', err);
      return 0;
    }
  }
  
  registerEventMapping(sourcePattern, ...invalidatePatterns) {
    if (!this.eventMap.has(sourcePattern)) {
      this.eventMap.set(sourcePattern, new Set());
    }
    for (const pattern of invalidatePatterns) {
      this.eventMap.get(sourcePattern).add(pattern);
    }
  }
  
  async triggerEventInvalidation(key) {
    try {
      const patterns = [];
      
      for (const [sourcePattern, invalidatePatterns] of this.eventMap.entries()) {
        const regex = this._patternToRegex(sourcePattern);
        if (regex.test(key)) {
          for (const pattern of invalidatePatterns) {
            patterns.push(pattern);
          }
        }
      }
      
      let count = 0;
      for (const pattern of patterns) {
        count += await this.cache.invalidatePattern(pattern);
      }
      
      this.stats.eventTriggered++;
      return count;
    } catch (err) {
      console.error('CacheInvalidationStrategies.triggerEventInvalidation error:', err);
      return 0;
    }
  }
  
  setInvalidationListener(pattern, callback) {
    this.cache.setInvalidationListener(pattern, callback);
  }
  
  async batchInvalidate(keys) {
    try {
      for (const key of keys) {
        await this.cache.invalidate(key);
      }
      return keys.length;
    } catch (err) {
      console.error('CacheInvalidationStrategies.batchInvalidate error:', err);
      return 0;
    }
  }
  
  analyzeDependencies(key) {
    const dependsOn = this.reverseDependencyGraph.get(key) || new Set();
    const dependents = this.dependencyGraph.get(key) || new Set();
    
    return {
      key,
      directlyDependsOn: Array.from(dependsOn),
      directlyDependents: Array.from(dependents),
      impactChain: this._buildImpactChain(key)
    };
  }
  
  getStats() {
    return {
      ...this.stats,
      totalDependencies: this.dependencyGraph.size,
      totalEventMappings: this.eventMap.size
    };
  }
  
  _buildImpactChain(key) {
    const chain = new Set([key]);
    const queue = [key];
    
    while (queue.length > 0) {
      const current = queue.shift();
      const dependents = this.dependencyGraph.get(current) || new Set();
      
      for (const dependent of dependents) {
        if (!chain.has(dependent)) {
          chain.add(dependent);
          queue.push(dependent);
        }
      }
    }
    
    return Array.from(chain);
  }
  
  _patternToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
}

export default CacheInvalidationStrategies;
