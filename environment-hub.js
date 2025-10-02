/**
 * TooLoo.ai Environment Hub
 * 
 * Extends Information Hub to provide environmental awareness and coordination
 * between all system components (Assistant, Director, FileSystem, GitHub, etc.)
 */

const InformationHub = require('./information-hub');

class EnvironmentHub extends InformationHub {
  constructor(options = {}) {
    super(options);
    
    // Component registry
    this.components = new Map();
    
    // Environment-specific state
    this.environment = {
      mode: options.mode || 'development', // development, production, self-aware
      capabilities: new Set(),
      dependencies: new Map(),
      services: new Map(),
      integrations: new Map()
    };
    
    console.log('🌍 Environment Hub initialized - Creating ecosystem awareness');
  }

  /**
   * Register a system component with the environment
   */
  registerComponent(name, component, capabilities = []) {
    this.components.set(name, {
      instance: component,
      capabilities: new Set(capabilities),
      health: 'unknown',
      lastSeen: null,
      metrics: {}
    });
    
    // Add capabilities to environment
    capabilities.forEach(cap => this.environment.capabilities.add(cap));
    
    console.log(`🔧 Component '${name}' registered with capabilities:`, capabilities);
    
    // Subscribe component to relevant updates
    if (component.onEnvironmentUpdate) {
      this.subscribe(name, [], (dataType, data) => {
        component.onEnvironmentUpdate(dataType, data, this.getEnvironmentContext());
      });
    }
    
    this.broadcastUpdate('components', {
      type: 'component_registered',
      name,
      capabilities,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get full environment context for components
   */
  getEnvironmentContext() {
    return {
      ...this.systemState,
      environment: this.environment,
      components: Object.fromEntries(
        Array.from(this.components.entries()).map(([name, comp]) => [
          name, 
          {
            capabilities: Array.from(comp.capabilities),
            health: comp.health,
            lastSeen: comp.lastSeen
          }
        ])
      ),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check all registered components
   */
  async checkComponentHealth() {
    const healthResults = {};
    
    for (const [name, componentData] of this.components) {
      try {
        const { instance } = componentData;
        
        // Standard health check method
        if (instance.healthCheck) {
          const health = await instance.healthCheck();
          componentData.health = health.status || 'healthy';
          componentData.lastSeen = new Date().toISOString();
          healthResults[name] = health;
        } else {
          // Assume healthy if no health check method
          componentData.health = 'assumed-healthy';
          componentData.lastSeen = new Date().toISOString();
          healthResults[name] = { status: 'assumed-healthy' };
        }
        
      } catch (error) {
        componentData.health = 'error';
        healthResults[name] = { 
          status: 'error', 
          error: error.message 
        };
        console.warn(`❌ Component '${name}' health check failed:`, error.message);
      }
    }
    
    this.systemState.components = healthResults;
    
    this.broadcastUpdate('health', {
      type: 'component_health_check',
      results: healthResults,
      timestamp: new Date().toISOString()
    });
    
    return healthResults;
  }

  /**
   * Execute coordinated action across components
   */
  async executeCoordinatedAction(actionName, params = {}) {
    console.log(`🎯 Executing coordinated action: ${actionName}`, params);
    
    const results = {};
    const participatingComponents = [];
    
    // Find components that can handle this action
    for (const [name, componentData] of this.components) {
      if (componentData.capabilities.has(actionName) && componentData.instance.executeAction) {
        participatingComponents.push(name);
      }
    }
    
    if (participatingComponents.length === 0) {
      throw new Error(`No components found capable of executing action: ${actionName}`);
    }
    
    // Execute action on all capable components
    for (const componentName of participatingComponents) {
      try {
        const component = this.components.get(componentName);
        const result = await component.instance.executeAction(actionName, params, this.getEnvironmentContext());
        results[componentName] = result;
        
      } catch (error) {
        results[componentName] = { 
          success: false, 
          error: error.message 
        };
        console.error(`❌ Action '${actionName}' failed on component '${componentName}':`, error.message);
      }
    }
    
    // Broadcast action completion
    this.broadcastUpdate('actions', {
      type: 'coordinated_action_complete',
      action: actionName,
      params,
      results,
      participants: participatingComponents,
      timestamp: new Date().toISOString()
    });
    
    return results;
  }

  /**
   * Request capability from any component that can provide it
   */
  async requestCapability(capabilityName, params = {}) {
    // Find first component with this capability
    for (const [name, componentData] of this.components) {
      if (componentData.capabilities.has(capabilityName)) {
        const { instance } = componentData;
        
        if (instance.provideCapability) {
          try {
            return await instance.provideCapability(capabilityName, params, this.getEnvironmentContext());
          } catch (error) {
            console.warn(`Component '${name}' failed to provide capability '${capabilityName}':`, error.message);
            continue;
          }
        }
      }
    }
    
    throw new Error(`No component available to provide capability: ${capabilityName}`);
  }

  /**
   * Auto-configure environment based on detected components and context
   */
  async autoConfigureEnvironment() {
    console.log('🔄 Auto-configuring environment based on available components...');
    
    const config = {
      detectedServices: [],
      recommendedIntegrations: [],
      securityRecommendations: [],
      performanceOptimizations: []
    };
    
    // Analyze available components
    for (const [name, componentData] of this.components) {
      const capabilities = Array.from(componentData.capabilities);
      
      if (capabilities.includes('filesystem-management')) {
        config.detectedServices.push('Filesystem Manager');
        config.recommendedIntegrations.push('Code analysis integration');
      }
      
      if (capabilities.includes('ai-provider')) {
        config.detectedServices.push('AI Provider');
        config.securityRecommendations.push('API key rotation');
      }
      
      if (capabilities.includes('github-integration')) {
        config.detectedServices.push('GitHub Integration');
        config.recommendedIntegrations.push('CI/CD pipeline');
      }
      
      if (capabilities.includes('self-awareness')) {
        config.detectedServices.push('Self-Awareness System');
        this.environment.mode = 'self-aware';
      }
    }
    
    // Security analysis
    if (this.systemState.security) {
      const securityScore = this.systemState.security.score / this.systemState.security.maxScore;
      if (securityScore < 0.8) {
        config.securityRecommendations.push('Enable additional security headers');
        config.securityRecommendations.push('Implement rate limiting');
      }
    }
    
    // Performance analysis
    if (this.systemState.performance) {
      const memUsage = this.systemState.performance.memory.heapUsed / this.systemState.performance.memory.heapTotal;
      if (memUsage > 0.8) {
        config.performanceOptimizations.push('Consider memory optimization');
      }
    }
    
    this.environment.autoConfig = config;
    
    this.broadcastUpdate('environment', {
      type: 'auto_configuration_complete',
      config,
      timestamp: new Date().toISOString()
    });
    
    console.log('✅ Environment auto-configuration complete:', config);
    return config;
  }

  /**
   * Enhanced start method that includes component coordination
   */
  async start() {
    await super.start();
    
    // Start component health monitoring
    setInterval(() => {
      this.checkComponentHealth();
    }, 30000);
    
    // Auto-configure on first start
    setTimeout(() => {
      this.autoConfigureEnvironment();
    }, 5000);
    
    console.log('🌍 Environment Hub fully active - Ecosystem coordination enabled');
  }

  /**
   * Get environment status for external queries
   */
  getEnvironmentStatus() {
    // Safely serialize components without circular references
    const safeComponents = Object.fromEntries(
      Array.from(this.components.entries()).map(([name, comp]) => [
        name, 
        {
          capabilities: Array.from(comp.capabilities),
          health: comp.health,
          lastSeen: comp.lastSeen,
          metrics: comp.metrics
        }
      ])
    );
    
    return {
      mode: this.environment.mode,
      capabilities: Array.from(this.environment.capabilities),
      components: safeComponents,
      systemState: this.systemState,
      isActive: this.isRunning,
      componentCount: this.components.size,
      subscriberCount: this.subscribers.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Coordinate system-wide awareness update
   */
  async broadcastSystemAwareness() {
    const awareness = {
      timestamp: new Date().toISOString(),
      environment: this.getEnvironmentStatus(),
      capabilities: Array.from(this.environment.capabilities),
      componentCount: this.components.size,
      subscriberCount: this.subscribers.size,
      systemHealth: await this.checkComponentHealth()
    };
    
    this.broadcastUpdate('awareness', {
      type: 'system_awareness_update',
      awareness,
      timestamp: new Date().toISOString()
    });
    
    return awareness;
  }
}

module.exports = EnvironmentHub;
