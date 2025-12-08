// @version 3.3.212
/**
 * Synapsys System Activator
 *
 * Central activation hub that ensures all TooLoo learning, emergence,
 * and knowledge systems are properly initialized and running.
 *
 * This is the "brain stem" that wakes up all cognitive systems.
 *
 * Note: CuriosityEngine and ExplorationEngine are managed by Cortex
 * and instantiated with dependencies. This activator focuses on
 * singleton systems that can be activated independently.
 *
 * @module cortex/system-activator
 */

import { bus } from '../core/event-bus.js';
import { EmergenceAmplifier } from './discover/emergence-amplifier.js';
import { ReinforcementLearner } from './learning/reinforcement-learner.js';
import {
  providerExecutionLearner,
  ProviderExecutionLearner,
} from './learning/provider-execution-learner.js';
import { knowledgeBoostEngine, KnowledgeBoostEngine } from './learning/knowledge-boost.js';
import MetaLearningEngine from '../precog/engine/meta-learning-engine.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SystemStatus {
  name: string;
  status: 'offline' | 'starting' | 'online' | 'error';
  lastActive?: Date;
  metrics?: Record<string, unknown>;
  error?: string;
}

export interface ActivatorState {
  initialized: boolean;
  systems: Record<string, SystemStatus>;
  activatedAt?: Date;
  lastHealthCheck?: Date;
  overallHealth: number; // 0-1
}

export interface ActivatorConfig {
  enableEmergence: boolean;
  enableLearning: boolean;
  enableKnowledgeBoost: boolean;
  healthCheckInterval: number; // ms
  autoBoostOnLowHealth: boolean;
}

// ============================================================================
// SYNAPSYS SYSTEM ACTIVATOR
// ============================================================================

export class SynapsysActivator {
  private static instance: SynapsysActivator;

  private state: ActivatorState = {
    initialized: false,
    systems: {},
    overallHealth: 0,
  };

  private config: ActivatorConfig = {
    enableEmergence: true,
    enableLearning: true,
    enableKnowledgeBoost: true,
    healthCheckInterval: 30000, // 30 seconds
    autoBoostOnLowHealth: true,
  };

  // System references (only singletons that can be activated independently)
  private emergenceAmplifier?: EmergenceAmplifier;
  private reinforcementLearner?: ReinforcementLearner;
  private metaLearningEngine?: MetaLearningEngine;
  private providerLearner?: ProviderExecutionLearner;
  private knowledgeBoost?: KnowledgeBoostEngine;

  private healthCheckInterval?: ReturnType<typeof setInterval>;

  private constructor() {
    this.initializeSystemStatuses();
  }

  static getInstance(): SynapsysActivator {
    if (!SynapsysActivator.instance) {
      SynapsysActivator.instance = new SynapsysActivator();
    }
    return SynapsysActivator.instance;
  }

  private initializeSystemStatuses(): void {
    const systemNames = [
      'emergence-amplifier',
      'reinforcement-learner',
      'meta-learning-engine',
      'provider-execution-learner',
      'knowledge-boost-engine',
    ];

    for (const name of systemNames) {
      this.state.systems[name] = {
        name,
        status: 'offline',
      };
    }
  }

  // ============================================================================
  // MAIN ACTIVATION
  // ============================================================================

  /**
   * Activate all Synapsys systems
   */
  async activate(config?: Partial<ActivatorConfig>): Promise<ActivatorState> {
    if (this.state.initialized) {
      bus.publish('cortex', 'synapsys:already_activated', {
        timestamp: new Date().toISOString(),
      });
      return this.state;
    }

    bus.publish('cortex', 'synapsys:activating', {
      timestamp: new Date().toISOString(),
    });

    if (config) {
      this.config = { ...this.config, ...config };
    }

    const startTime = Date.now();

    try {
      // Activate core learning systems
      if (this.config.enableLearning) {
        await this.activateLearning();
      }

      // Activate emergence systems
      if (this.config.enableEmergence) {
        await this.activateEmergence();
      }

      // Activate knowledge boost
      if (this.config.enableKnowledgeBoost) {
        await this.activateKnowledgeBoost();
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.state.initialized = true;
      this.state.activatedAt = new Date();
      this.updateOverallHealth();

      const duration = Date.now() - startTime;

      // Emit activation complete
      bus.publish('cortex', 'synapsys:activated', {
        systems: Object.keys(this.state.systems).filter(
          (s) => this.state.systems[s]?.status === 'online'
        ),
        duration,
        health: this.state.overallHealth,
        timestamp: new Date().toISOString(),
      });

      return this.state;
    } catch (error) {
      bus.publish('system', 'synapsys:activation_failed', {
        error: String(error),
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  // ============================================================================
  // SUBSYSTEM ACTIVATION
  // ============================================================================

  private async activateLearning(): Promise<void> {
    bus.publish('cortex', 'synapsys:activating_learning', {
      timestamp: new Date().toISOString(),
    });

    // Reinforcement Learner
    try {
      this.setSystemStatus('reinforcement-learner', 'starting');
      this.reinforcementLearner = ReinforcementLearner.getInstance();
      await this.reinforcementLearner.initialize();
      this.setSystemStatus('reinforcement-learner', 'online', {
        qTableSize: this.reinforcementLearner.getQTableSize(),
        policy: this.reinforcementLearner.getPolicy(),
      });
    } catch (error) {
      this.setSystemStatus('reinforcement-learner', 'error', undefined, String(error));
    }

    // Meta Learning Engine
    try {
      this.setSystemStatus('meta-learning-engine', 'starting');
      this.metaLearningEngine = new MetaLearningEngine();
      await this.metaLearningEngine.init();
      await this.metaLearningEngine.start();
      this.setSystemStatus('meta-learning-engine', 'online', {
        status: this.metaLearningEngine.getStatus(),
      });
    } catch (error) {
      this.setSystemStatus('meta-learning-engine', 'error', undefined, String(error));
    }

    // Provider Execution Learner
    try {
      this.setSystemStatus('provider-execution-learner', 'starting');
      this.providerLearner = providerExecutionLearner;
      await this.providerLearner.initialize();
      this.setSystemStatus('provider-execution-learner', 'online', {
        profiles: this.providerLearner.getAllProfiles().length,
        strategies: this.providerLearner.getStrategies().length,
      });
    } catch (error) {
      this.setSystemStatus('provider-execution-learner', 'error', undefined, String(error));
    }
  }

  private async activateEmergence(): Promise<void> {
    bus.publish('cortex', 'synapsys:activating_emergence', {
      timestamp: new Date().toISOString(),
    });

    // Emergence Amplifier
    try {
      this.setSystemStatus('emergence-amplifier', 'starting');
      this.emergenceAmplifier = EmergenceAmplifier.getInstance();
      await this.emergenceAmplifier.initialize();
      this.setSystemStatus('emergence-amplifier', 'online', {
        metrics: this.emergenceAmplifier.getMetrics(),
      });
    } catch (error) {
      this.setSystemStatus('emergence-amplifier', 'error', undefined, String(error));
    }
  }

  private async activateKnowledgeBoost(): Promise<void> {
    bus.publish('cortex', 'synapsys:activating_knowledge_boost', {
      timestamp: new Date().toISOString(),
    });

    try {
      this.setSystemStatus('knowledge-boost-engine', 'starting');
      this.knowledgeBoost = knowledgeBoostEngine;
      await this.knowledgeBoost.initialize();
      this.setSystemStatus('knowledge-boost-engine', 'online', {
        metrics: this.knowledgeBoost.getMetrics(),
      });

      // Auto-start a velocity boost to accelerate initial learning
      await this.knowledgeBoost.quickBoost('velocity', 1.5, 15);

      bus.publish('cortex', 'synapsys:initial_boost_activated', {
        type: 'velocity',
        duration: 15,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.setSystemStatus('knowledge-boost-engine', 'error', undefined, String(error));
    }
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Initial check
    this.performHealthCheck();
  }

  private performHealthCheck(): void {
    this.state.lastHealthCheck = new Date();

    // Update each system's status
    for (const [_name, status] of Object.entries(this.state.systems)) {
      if (status.status === 'online') {
        status.lastActive = new Date();
      }
    }

    this.updateOverallHealth();

    // Auto-boost if health is low
    if (this.config.autoBoostOnLowHealth && this.state.overallHealth < 0.5) {
      this.triggerHealthBoost();
    }

    bus.publish('cortex', 'synapsys:health_check', {
      overallHealth: this.state.overallHealth,
      systems: this.state.systems,
      timestamp: new Date().toISOString(),
    });
  }

  private updateOverallHealth(): void {
    const systems = Object.values(this.state.systems);
    const online = systems.filter((s) => s.status === 'online').length;
    this.state.overallHealth = systems.length > 0 ? online / systems.length : 0;
  }

  private async triggerHealthBoost(): Promise<void> {
    bus.publish('cortex', 'synapsys:low_health_boost', {
      health: this.state.overallHealth,
      timestamp: new Date().toISOString(),
    });

    if (this.knowledgeBoost) {
      await this.knowledgeBoost.quickBoost('repair', 1.5, 10);
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private setSystemStatus(
    name: string,
    status: SystemStatus['status'],
    metrics?: Record<string, unknown>,
    error?: string
  ): void {
    this.state.systems[name] = {
      name,
      status,
      lastActive: status === 'online' ? new Date() : undefined,
      metrics,
      error,
    };

    bus.publish('cortex', 'synapsys:system_status_changed', {
      system: name,
      status,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getState(): ActivatorState {
    return { ...this.state };
  }

  getSystemStatus(name: string): SystemStatus | undefined {
    return this.state.systems[name];
  }

  isOnline(): boolean {
    return this.state.initialized && this.state.overallHealth > 0.5;
  }

  /**
   * Trigger a knowledge boost
   */
  async boost(
    type: 'velocity' | 'retention' | 'transfer' | 'depth' | 'breadth' = 'velocity'
  ): Promise<void> {
    if (this.knowledgeBoost) {
      await this.knowledgeBoost.quickBoost(type, 1.5, 10);
      bus.publish('cortex', 'synapsys:manual_boost', {
        type,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Run a meta-learning phase
   */
  async runMetaLearning(phase?: number): Promise<unknown> {
    if (!this.metaLearningEngine) {
      throw new Error('Meta Learning Engine not initialized');
    }

    if (phase) {
      return this.metaLearningEngine.runPhase(phase);
    }
    return this.metaLearningEngine.runAllPhases();
  }

  /**
   * Get emergence metrics
   */
  getEmergenceMetrics(): unknown {
    if (this.emergenceAmplifier) {
      return this.emergenceAmplifier.getMetrics();
    }
    return null;
  }

  /**
   * Get learning metrics
   */
  getLearningMetrics(): Record<string, unknown> {
    const metrics: Record<string, unknown> = {};

    if (this.reinforcementLearner) {
      metrics['reinforcement'] = this.reinforcementLearner.getMetricsSnapshot();
    }

    if (this.metaLearningEngine) {
      metrics['metaLearning'] = this.metaLearningEngine.getStatus();
    }

    if (this.providerLearner) {
      metrics['providerLearning'] = this.providerLearner.getExecutionStats();
    }

    if (this.knowledgeBoost) {
      metrics['knowledgeBoost'] = this.knowledgeBoost.getMetrics();
    }

    return metrics;
  }

  /**
   * Shutdown all systems
   */
  async shutdown(): Promise<void> {
    bus.publish('cortex', 'synapsys:shutting_down', {
      timestamp: new Date().toISOString(),
    });

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    if (this.knowledgeBoost) {
      await this.knowledgeBoost.shutdown();
    }

    // Mark all systems as offline
    for (const name of Object.keys(this.state.systems)) {
      const system = this.state.systems[name];
      if (system) {
        system.status = 'offline';
      }
    }

    this.state.initialized = false;
    this.state.overallHealth = 0;

    bus.publish('cortex', 'synapsys:shutdown_complete', {
      timestamp: new Date().toISOString(),
    });
  }
}

// Singleton export
export const synapsysActivator = SynapsysActivator.getInstance();

// Convenience function for quick activation
export async function activateSynapsys(config?: Partial<ActivatorConfig>): Promise<ActivatorState> {
  return synapsysActivator.activate(config);
}
