// @version 2.1.11
/**
 * Capabilities Manager
 * Manages capability state, activation, deactivation, and execution
 * Tracks system-wide capability status and dependencies
 */

export class CapabilitiesManager {
  constructor() {
    this.capabilities = new Map();
    this.stateStore = new Map();
    this.dependencies = new Map();
    this.activationLog = [];
    this.initializeCapabilities();
  }

  /**
   * Initialize system capabilities
   */
  initializeCapabilities() {
    const systemCapabilities = [
      {
        id: 'semantic_analysis',
        name: 'Semantic Analysis',
        description: 'Advanced semantic understanding of conversations',
        category: 'analysis',
        enabled: false,
        dependencies: [],
        priority: 'high'
      },
      {
        id: 'multi_provider_consensus',
        name: 'Multi-Provider Consensus',
        description: 'Leverage multiple AI providers for consensus scoring',
        category: 'ai',
        enabled: true,
        dependencies: [],
        priority: 'critical'
      },
      {
        id: 'trend_analysis',
        name: 'Trend Analysis',
        description: 'Detect trends and patterns in metrics',
        category: 'analytics',
        enabled: false,
        dependencies: [],
        priority: 'high'
      },
      {
        id: 'anomaly_detection',
        name: 'Anomaly Detection',
        description: 'Identify anomalous patterns in system behavior',
        category: 'analytics',
        enabled: false,
        dependencies: ['trend_analysis'],
        priority: 'high'
      },
      {
        id: 'real_time_monitoring',
        name: 'Real-Time Monitoring',
        description: 'Real-time system metrics collection',
        category: 'monitoring',
        enabled: true,
        dependencies: [],
        priority: 'critical'
      },
      {
        id: 'auto_scaling',
        name: 'Auto Scaling',
        description: 'Automatic resource scaling based on demand',
        category: 'infrastructure',
        enabled: false,
        dependencies: ['real_time_monitoring'],
        priority: 'medium'
      },
      {
        id: 'error_recovery',
        name: 'Error Recovery',
        description: 'Automatic error recovery and failover',
        category: 'resilience',
        enabled: true,
        dependencies: [],
        priority: 'critical'
      },
      {
        id: 'performance_optimization',
        name: 'Performance Optimization',
        description: 'Automatic performance tuning',
        category: 'optimization',
        enabled: false,
        dependencies: ['trend_analysis', 'real_time_monitoring'],
        priority: 'medium'
      },
      {
        id: 'learning_acceleration',
        name: 'Learning Acceleration',
        description: 'Hyper-speed learning with multiple threads',
        category: 'learning',
        enabled: false,
        dependencies: ['multi_provider_consensus'],
        priority: 'high'
      },
      {
        id: 'budget_optimization',
        name: 'Budget Optimization',
        description: 'Optimize spending across providers',
        category: 'cost',
        enabled: true,
        dependencies: [],
        priority: 'high'
      }
    ];

    systemCapabilities.forEach(cap => {
      this.capabilities.set(cap.id, cap);
      this.stateStore.set(cap.id, {
        enabled: cap.enabled,
        activatedAt: cap.enabled ? new Date().toISOString() : null,
        status: cap.enabled ? 'active' : 'inactive',
        lastModified: new Date().toISOString(),
        executionCount: 0,
        errors: 0
      });

      // Track dependencies
      if (cap.dependencies.length > 0) {
        this.dependencies.set(cap.id, cap.dependencies);
      }
    });
  }

  /**
   * Activate a capability
   * @param {string} capabilityId - Capability to activate
   * @returns {object} - Activation result
   */
  async activateCapability(capabilityId) {
    const capability = this.capabilities.get(capabilityId);

    if (!capability) {
      return {
        ok: false,
        error: `Capability ${capabilityId} not found`,
        status: 'failed'
      };
    }

    const state = this.stateStore.get(capabilityId);

    if (state.enabled) {
      return {
        ok: true,
        message: `${capability.name} is already active`,
        status: 'already_active',
        capability: this.formatCapability(capability, state)
      };
    }

    // Check dependencies
    const unmetDeps = this.getUnmetDependencies(capabilityId);

    if (unmetDeps.length > 0) {
      return {
        ok: false,
        error: `Cannot activate ${capability.name}: unmet dependencies`,
        dependencies: unmetDeps,
        status: 'dependency_error'
      };
    }

    // Activate capability
    try {
      state.enabled = true;
      state.status = 'active';
      state.activatedAt = new Date().toISOString();
      state.lastModified = new Date().toISOString();

      this.logActivation(capabilityId, 'activated', 'success');

      return {
        ok: true,
        message: `${capability.name} activated successfully`,
        status: 'success',
        capability: this.formatCapability(capability, state),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      state.status = 'error';
      state.errors++;
      this.logActivation(capabilityId, 'activation_failed', 'error', err.message);

      return {
        ok: false,
        error: `Failed to activate ${capability.name}: ${err.message}`,
        status: 'error'
      };
    }
  }

  /**
   * Deactivate a capability
   * @param {string} capabilityId - Capability to deactivate
   * @returns {object} - Deactivation result
   */
  async deactivateCapability(capabilityId) {
    const capability = this.capabilities.get(capabilityId);

    if (!capability) {
      return {
        ok: false,
        error: `Capability ${capabilityId} not found`,
        status: 'failed'
      };
    }

    const state = this.stateStore.get(capabilityId);

    if (!state.enabled) {
      return {
        ok: true,
        message: `${capability.name} is already inactive`,
        status: 'already_inactive',
        capability: this.formatCapability(capability, state)
      };
    }

    // Check if other capabilities depend on this one
    const dependents = this.getDependentCapabilities(capabilityId);
    const activeDependents = dependents.filter(depId => {
      const depState = this.stateStore.get(depId);
      return depState.enabled;
    });

    if (activeDependents.length > 0) {
      return {
        ok: false,
        error: `Cannot deactivate ${capability.name}: active dependents`,
        dependents: activeDependents,
        status: 'dependency_error'
      };
    }

    // Deactivate capability
    try {
      state.enabled = false;
      state.status = 'inactive';
      state.lastModified = new Date().toISOString();

      this.logActivation(capabilityId, 'deactivated', 'success');

      return {
        ok: true,
        message: `${capability.name} deactivated successfully`,
        status: 'success',
        capability: this.formatCapability(capability, state),
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      state.status = 'error';
      state.errors++;
      this.logActivation(capabilityId, 'deactivation_failed', 'error', err.message);

      return {
        ok: false,
        error: `Failed to deactivate ${capability.name}: ${err.message}`,
        status: 'error'
      };
    }
  }

  /**
   * Get capability status
   * @param {string} capabilityId - Capability to check (optional, returns all if not provided)
   * @returns {object} - Capability status/statuses
   */
  getCapabilityStatus(capabilityId = null) {
    if (capabilityId) {
      const capability = this.capabilities.get(capabilityId);
      const state = this.stateStore.get(capabilityId);

      if (!capability) {
        return {
          ok: false,
          error: `Capability ${capabilityId} not found`
        };
      }

      return {
        ok: true,
        capability: this.formatCapability(capability, state)
      };
    }

    // Return all capabilities
    const all = Array.from(this.capabilities.entries()).map(([id, cap]) => {
      const state = this.stateStore.get(id);
      return this.formatCapability(cap, state);
    });

    // Group by category
    const byCategory = {};
    all.forEach(cap => {
      if (!byCategory[cap.category]) {
        byCategory[cap.category] = [];
      }
      byCategory[cap.category].push(cap);
    });

    return {
      ok: true,
      summary: {
        total: all.length,
        active: all.filter(c => c.state.enabled).length,
        inactive: all.filter(c => !c.state.enabled).length
      },
      byCategory,
      all,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Format capability with state
   */
  formatCapability(capability, state) {
    return {
      id: capability.id,
      name: capability.name,
      description: capability.description,
      category: capability.category,
      priority: capability.priority,
      state: {
        enabled: state.enabled,
        status: state.status,
        activatedAt: state.activatedAt,
        lastModified: state.lastModified,
        executionCount: state.executionCount,
        errors: state.errors
      },
      dependencies: capability.dependencies,
      health: this.getCapabilityHealth(capability.id, state)
    };
  }

  /**
   * Calculate capability health
   */
  getCapabilityHealth(capabilityId, state) {
    if (!state.enabled) {
      return 'inactive';
    }

    const errorRate = state.executionCount > 0 ? state.errors / state.executionCount : 0;

    if (errorRate > 0.1) {
      return 'degraded';
    } else if (errorRate > 0.05) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Get unmet dependencies
   */
  getUnmetDependencies(capabilityId) {
    const deps = this.dependencies.get(capabilityId) || [];

    return deps.filter(depId => {
      const depState = this.stateStore.get(depId);
      return !depState.enabled;
    });
  }

  /**
   * Get dependent capabilities
   */
  getDependentCapabilities(capabilityId) {
    const dependents = [];

    this.dependencies.forEach((deps, id) => {
      if (deps.includes(capabilityId)) {
        dependents.push(id);
      }
    });

    return dependents;
  }

  /**
   * Log capability activation/deactivation
   */
  logActivation(capabilityId, action, result, error = null) {
    const logEntry = {
      capabilityId,
      action,
      result,
      error,
      timestamp: new Date().toISOString()
    };

    this.activationLog.push(logEntry);

    // Keep last 1000 entries
    if (this.activationLog.length > 1000) {
      this.activationLog.shift();
    }
  }

  /**
   * Get activation history
   */
  getActivationHistory(limit = 50) {
    return this.activationLog.slice(-limit).reverse();
  }

  /**
   * Record capability execution
   */
  recordExecution(capabilityId, success = true) {
    const state = this.stateStore.get(capabilityId);

    if (state) {
      state.executionCount++;

      if (!success) {
        state.errors++;
      }
    }
  }

  /**
   * Get capability insights
   */
  getInsights() {
    const capabilities = Array.from(this.capabilities.values());
    const states = Array.from(this.stateStore.values());

    const insights = {
      totalCapabilities: capabilities.length,
      activeCount: states.filter(s => s.enabled).length,
      inactiveCount: states.filter(s => !s.enabled).length,
      criticalCapabilities: capabilities.filter(c => c.priority === 'critical'),
      allHealthy: states.every(s => !s.enabled || s.errors === 0),
      recommendations: this.generateRecommendations()
    };

    return insights;
  }

  /**
   * Generate recommendations for capability management
   */
  generateRecommendations() {
    const recommendations = [];
    const criticalIds = Array.from(this.capabilities.entries())
      .filter(([, cap]) => cap.priority === 'critical')
      .map(([id]) => id);

    // Check if all critical capabilities are active
    const inactiveCritical = criticalIds.filter(id => {
      const state = this.stateStore.get(id);
      return !state.enabled;
    });

    if (inactiveCritical.length > 0) {
      recommendations.push('Consider activating critical capabilities for system stability');
    }

    // Check for dependency chains
    this.dependencies.forEach((deps, id) => {
      if (deps.length > 0) {
        const state = this.stateStore.get(id);
        if (state.enabled) {
          const unmetDeps = this.getUnmetDependencies(id);
          if (unmetDeps.length > 0) {
            recommendations.push(`${id} has unmet dependencies, consider activating them`);
          }
        }
      }
    });

    return recommendations;
  }
}

export default new CapabilitiesManager();
