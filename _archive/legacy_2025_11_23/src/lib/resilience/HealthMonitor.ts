import http from 'http';

class HealthMonitor {
  constructor(options = {}) {
    this.services = new Map();
    this.checks = new Map();
    this.listeners = new Map();
    this.checkInterval = options.checkInterval || 10000;
    this.stats = { checksRun: 0, healthyServices: 0, unhealthyServices: 0, checkFailures: 0 };
    this.checkWorker = setInterval(() => this._runHealthChecks(), this.checkInterval);
  }
  
  registerService(name, port, options = {}) {
    this.services.set(name, {
      name, port, host: options.host || 'localhost', health: 'unknown', lastCheck: null,
      consecutiveFailures: 0, maxFailures: options.maxFailures || 3
    });
    this.checks.set(name, { liveness: false, readiness: false, startup: false });
    this.listeners.set(name, new Set());
  }
  
  unregisterService(name) {
    this.services.delete(name);
    this.checks.delete(name);
    this.listeners.delete(name);
  }
  
  getHealth(name) {
    const service = this.services.get(name);
    if (!service) return { status: 'unknown', reason: 'Service not registered' };
    const checks = this.checks.get(name);
    return { name, port: service.port, status: service.health, lastCheck: service.lastCheck, checks, consecutiveFailures: service.consecutiveFailures };
  }
  
  getAllHealth() {
    const health = {};
    for (const [name] of this.services) {
      health[name] = this.getHealth(name);
    }
    return health;
  }
  
  isReadyForTraffic(name) {
    const checks = this.checks.get(name);
    if (!checks) return false;
    const service = this.services.get(name);
    if (!service) return false;
    return service.health === 'healthy' && checks.readiness;
  }
  
  onHealthChange(name, callback) {
    const listeners = this.listeners.get(name);
    if (listeners) listeners.add(callback);
  }
  
  offHealthChange(name, callback) {
    const listeners = this.listeners.get(name);
    if (listeners) listeners.delete(callback);
  }
  
  getStats() {
    const healthy = Array.from(this.services.values()).filter(s => s.health === 'healthy').length;
    const unhealthy = Array.from(this.services.values()).filter(s => s.health === 'unhealthy').length;
    return { ...this.stats, healthyServices: healthy, unhealthyServices: unhealthy, totalServices: this.services.size };
  }
  
  async _runHealthChecks() {
    for (const [name, service] of this.services) {
      await this._checkService(name, service);
    }
    this.stats.checksRun++;
  }
  
  async _checkService(name, service) {
    try {
      const response = await this._checkLiveness(service.host, service.port);
      const wasHealthy = service.health === 'healthy';
      const isHealthy = response.ok;
      
      if (isHealthy) {
        service.health = 'healthy';
        service.consecutiveFailures = 0;
        this.checks.get(name).liveness = true;
      } else {
        service.consecutiveFailures++;
        if (service.consecutiveFailures >= service.maxFailures) {
          service.health = 'unhealthy';
          this.checks.get(name).liveness = false;
        } else {
          service.health = 'degraded';
        }
      }
      
      service.lastCheck = new Date();
      if (wasHealthy !== isHealthy) {
        this._notifyListeners(name, service.health);
      }
    } catch (err) {
      service.consecutiveFailures++;
      if (service.consecutiveFailures >= service.maxFailures) {
        const wasHealthy = service.health === 'healthy';
        service.health = 'unhealthy';
        this.checks.get(name).liveness = false;
        this.stats.checkFailures++;
        if (wasHealthy) {
          this._notifyListeners(name, 'unhealthy');
        }
      }
    }
  }
  
  async _checkLiveness(host, port) {
    return new Promise((resolve) => {
      const options = { hostname: host, port, path: '/health', method: 'GET', timeout: 5000 };
      const req = http.request(options, (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300 });
      });
      req.on('error', () => resolve({ ok: false }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ ok: false }); });
      req.end();
    });
  }
  
  _notifyListeners(name, newHealth) {
    const listeners = this.listeners.get(name);
    if (listeners) {
      for (const callback of listeners) {
        try { callback(name, newHealth); } catch (err) { console.error('Health listener error:', err); }
      }
    }
  }
  
  destroy() {
    clearInterval(this.checkWorker);
    this.services.clear();
    this.checks.clear();
    this.listeners.clear();
  }
}

export default HealthMonitor;
