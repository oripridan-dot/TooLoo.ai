// Cache Manager - Response caching with TTL and invalidation
// Supports: Domain analysis, format conversion, sandbox execution

const cache = new Map();

export default {
  // Store value with TTL
  set(key, value, ttlSeconds = 300) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    cache.set(key, { value, expiry });
    return value;
  },

  // Retrieve value if not expired
  get(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      cache.delete(key);
      return null;
    }
    return entry.value;
  },

  // Generate cache key from request params
  key(...parts) {
    return parts.filter(p => p != null).join(':');
  },

  // Clear specific pattern or all
  clear(pattern = null) {
    if (!pattern) {
      cache.clear();
      return;
    }
    for (const [k] of cache) {
      if (k.includes(pattern)) cache.delete(k);
    }
  },

  // Get cache stats
  stats() {
    let activeKeys = 0;
    let expiredKeys = 0;
    for (const [, entry] of cache) {
      if (Date.now() > entry.expiry) expiredKeys++;
      else activeKeys++;
    }
    return { activeKeys, expiredKeys, totalSize: cache.size };
  },

  // Cleanup expired entries
  prune() {
    const now = Date.now();
    for (const [k, entry] of cache) {
      if (now > entry.expiry) cache.delete(k);
    }
  }
};
