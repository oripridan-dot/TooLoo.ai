class LoadBalancer {
  constructor(algorithm = 'round-robin') {
    this.targets = [];
    this.algorithm = algorithm;
    this.roundRobinIndex = 0;
    this.stats = { requestsServed: 0, targetStats: new Map() };
  }
  
  addTarget(target) {
    this.targets.push(target);
    this.stats.targetStats.set(target.id, { requests: 0, latency: 0 });
  }
  
  removeTarget(targetId) {
    this.targets = this.targets.filter(t => t.id !== targetId);
    this.stats.targetStats.delete(targetId);
  }
  
  nextTarget() {
    if (this.targets.length === 0) return null;
    
    let target;
    if (this.algorithm === 'round-robin') {
      target = this.targets[this.roundRobinIndex];
      this.roundRobinIndex = (this.roundRobinIndex + 1) % this.targets.length;
    } else if (this.algorithm === 'least-connections') {
      target = this.targets.reduce((min, t) => {
        const minStats = this.stats.targetStats.get(min.id) || { requests: 0 };
        const tStats = this.stats.targetStats.get(t.id) || { requests: 0 };
        return minStats.requests <= tStats.requests ? min : t;
      });
    } else {
      target = this.targets[0];
    }
    
    this.stats.requestsServed++;
    return target;
  }
  
  recordRequest(targetId, latency) {
    const stats = this.stats.targetStats.get(targetId);
    if (stats) {
      stats.requests++;
      stats.latency = (stats.latency + latency) / 2;
    }
  }
  
  setAlgorithm(algorithm) {
    this.algorithm = algorithm;
    this.roundRobinIndex = 0;
  }
  
  getStats() {
    return { ...this.stats, activeTargets: this.targets.length };
  }
  
  rebalance() {
    this.roundRobinIndex = 0;
  }
}

export default LoadBalancer;
