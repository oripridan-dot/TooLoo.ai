class EnvironmentHub {
  constructor(options = {}) {
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.mode = options.mode || 'standard';
    this.components = new Map();
    this.started = false;
    this.startedAt = null;
    this.statusHistory = [];

    console.log('🌐 Information Hub initialized - Creating system-wide awareness');
  }

  registerComponent(name, instance, capabilities = []) {
    this.components.set(name, {
      name,
      instance,
      capabilities,
      registeredAt: new Date().toISOString(),
      status: 'ready'
    });

    console.log(`🔧 Component '${name}' registered with capabilities:`, capabilities);
  }

  start() {
    this.started = true;
    this.startedAt = new Date().toISOString();
    console.log('🚀 Information Hub starting - Establishing awareness network');
  }

  getEnvironmentStatus() {
    return {
      mode: this.mode,
      started: this.started,
      startedAt: this.startedAt,
      workspaceRoot: this.workspaceRoot,
      componentCount: this.components.size,
      components: Array.from(this.components.values()).map(({ name, capabilities, registeredAt, status }) => ({
        name,
        capabilities,
        registeredAt,
        status
      })),
      systemState: this.calculateSystemState()
    };
  }

  calculateSystemState() {
    const securityScoreBase = 2;
    const securityRecommendations = [];

    if (this.components.has('filesystemManager')) {
      securityRecommendations.push('Enable backup retention for filesystem operations');
    }
    if (this.components.has('codeExecutor')) {
      securityRecommendations.push('Run tests after executing untrusted code');
    }
    if (this.components.has('githubManager')) {
      securityRecommendations.push('Rotate GitHub access tokens regularly');
    }

    return {
      security: {
        score: securityScoreBase + securityRecommendations.length,
        maxScore: 5,
        recommendations: securityRecommendations
      },
      awareness: {
        level: this.components.has('selfAwarenessManager') ? 'high' : 'moderate',
        componentsTracked: this.components.size
      }
    };
  }

  getSystemSummary() {
    const status = this.getEnvironmentStatus();
    return {
      workspace: status.workspaceRoot,
      mode: status.mode,
      started: status.started,
      startedAt: status.startedAt,
      components: status.components.map(({ name, capabilities, registeredAt }) => ({
        name,
        capabilities,
        registeredAt
      }))
    };
  }

  async executeCoordinatedAction(action, params = {}) {
    const results = [];

    for (const [name, component] of this.components.entries()) {
      if (component.instance && typeof component.instance[action] === 'function') {
        try {
          const result = await component.instance[action](params);
          results.push({ component: name, status: 'success', result });
        } catch (error) {
          results.push({ component: name, status: 'error', error: error.message });
        }
      }
    }

    if (results.length === 0) {
      results.push({
        component: 'environment-hub',
        status: 'noop',
        message: `No registered components implement action '${action}'`
      });
    }

    return results;
  }

  async broadcastSystemAwareness() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      mode: this.mode,
      components: Array.from(this.components.values()).map(({ name, capabilities }) => ({
        name,
        capabilities
      })),
      summary: `Environment Hub broadcast with ${this.components.size} component(s).`
    };

    this.statusHistory.push(snapshot);
    if (this.statusHistory.length > 25) {
      this.statusHistory.shift();
    }

    console.log('📡 Environment Hub broadcast issued');
    return snapshot;
  }
}

module.exports = EnvironmentHub;
