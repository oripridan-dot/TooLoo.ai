import http from 'http';

class DistributedCacheCoordinator {
  constructor(cacheManager, serviceId, options = {}) {
    this.cache = cacheManager;
    this.serviceId = serviceId;
    this.peers = new Map();
    this.remoteInvalidationHandlers = new Map();
    this.pendingInvalidations = new Map();
    
    this.broadcastInterval = options.broadcastInterval || 1000;
    this.conflictResolutionStrategy = options.conflictResolution || 'latest-write-wins';
    
    this.stats = {
      broadcastsSent: 0,
      broadcastsReceived: 0,
      conflictsResolved: 0,
      peerFailures: 0
    };
    
    this.broadcastWorker = setInterval(() => this._flushPendingInvalidations(), this.broadcastInterval);
  }
  
  registerPeer(serviceId, host, port) {
    this.peers.set(serviceId, { host, port });
  }
  
  async publishInvalidation(key, value = null) {
    try {
      this.pendingInvalidations.set(key, {
        timestamp: Date.now(),
        value,
        serviceId: this.serviceId
      });
      return true;
    } catch (err) {
      console.error('DistributedCacheCoordinator.publishInvalidation error:', err);
      return false;
    }
  }
  
  subscribeToInvalidations(pattern, callback) {
    if (!this.remoteInvalidationHandlers.has(pattern)) {
      this.remoteInvalidationHandlers.set(pattern, new Set());
    }
    this.remoteInvalidationHandlers.get(pattern).add(callback);
  }
  
  async onRemoteInvalidation(key, remoteValue, sourceServiceId, timestamp) {
    try {
      for (const [pattern, handlers] of this.remoteInvalidationHandlers.entries()) {
        const regex = this._patternToRegex(pattern);
        if (regex.test(key)) {
          for (const handler of handlers) {
            try {
              await handler(key, remoteValue, sourceServiceId);
            } catch (err) {
              console.error('Invalidation handler error:', err);
            }
          }
        }
      }
      
      const local = await this.cache.get(key);
      if (local !== undefined && remoteValue !== undefined) {
        await this._resolveConflict(key, local, remoteValue, sourceServiceId, timestamp);
      }
      
      if (remoteValue !== undefined) {
        await this.cache.set(key, remoteValue, 5000);
      } else {
        await this.cache.invalidate(key);
      }
      
      this.stats.broadcastsReceived++;
    } catch (err) {
      console.error('DistributedCacheCoordinator.onRemoteInvalidation error:', err);
    }
  }
  
  getCoordinationStatus() {
    return {
      serviceId: this.serviceId,
      peers: Array.from(this.peers.keys()),
      pendingInvalidations: this.pendingInvalidations.size,
      stats: this.stats
    };
  }
  
  async _flushPendingInvalidations() {
    if (this.pendingInvalidations.size === 0) return;
    
    const invalidations = Array.from(this.pendingInvalidations.entries()).map(([key, data]) => ({
      key,
      ...data
    }));
    
    this.pendingInvalidations.clear();
    
    for (const [peerId, peerInfo] of this.peers.entries()) {
      if (peerId !== this.serviceId) {
        this._broadcastToPeer(peerId, peerInfo, invalidations);
      }
    }
  }
  
  async _broadcastToPeer(peerId, peerInfo, invalidations) {
    return new Promise((resolve) => {
      try {
        const payload = JSON.stringify({
          serviceId: this.serviceId,
          invalidations
        });
        
        const options = {
          hostname: peerInfo.host,
          port: peerInfo.port,
          path: '/api/v1/cache/invalidations',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: 5000
        };
        
        const req = http.request(options, (res) => {
          if (res.statusCode === 200) {
            this.stats.broadcastsSent++;
          }
          resolve();
        });
        
        req.on('error', (err) => {
          console.warn(`Failed to broadcast to ${peerId}:`, err.message);
          this.stats.peerFailures++;
          resolve();
        });
        
        req.setTimeout(5000, () => {
          req.destroy();
          this.stats.peerFailures++;
          resolve();
        });
        
        req.write(payload);
        req.end();
      } catch (err) {
        console.error('Broadcast error:', err);
        resolve();
      }
    });
  }
  
  async _resolveConflict(key, localValue, remoteValue, sourceServiceId, remoteTimestamp) {
    try {
      let winner = null;
      
      if (this.conflictResolutionStrategy === 'latest-write-wins') {
        winner = remoteValue;
      } else if (this.conflictResolutionStrategy === 'local-wins') {
        winner = localValue;
      } else if (this.conflictResolutionStrategy === 'service-priority') {
        winner = sourceServiceId > this.serviceId ? remoteValue : localValue;
      }
      
      if (winner !== null) {
        await this.cache.set(key, winner, 5000);
      }
      
      this.stats.conflictsResolved++;
    } catch (err) {
      console.error('Conflict resolution error:', err);
    }
  }
  
  _patternToRegex(pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = escaped.replace(/\\\*/g, '.*');
    return new RegExp(`^${regex}$`);
  }
  
  destroy() {
    clearInterval(this.broadcastWorker);
    this.pendingInvalidations.clear();
    this.remoteInvalidationHandlers.clear();
  }
}

export default DistributedCacheCoordinator;
