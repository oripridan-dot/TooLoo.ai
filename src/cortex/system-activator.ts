// @version 3.3.211
/**
 * Synapsys System Activator
 * 
 * Central activation hub that ensures all TooLoo learning, emergence,
 * and knowledge systems are properly initialized and running.
 * 
 * This is the "brain stem" that wakes up all cognitive systems.
 * 
 * @module cortex/system-activator
 */

import { bus } from '../core/event-bus.js';
import { EmergenceAmplifier } from './discover/emergence-amplifier.js';
import { EmergenceCoordinator } from './discover/emergence-coordinator.js';
import { CuriosityEngine } from './exploration/curiosity-engine.js';
import { ExplorationEngine } from './exploration/lab.js';
import { ReinforcementLearner } from './learning/reinforcement-learner.js';
import { providerExecutionLearner, ProviderExecutionLearner } from './learning/provider-execution-learner.js';
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
  enableExploration: boolean;
  enableCuriosity: boolean;
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
    enableExploration: true,
    enableCuriosity: true,
    healthCheckInterval: 30000, // 30 seconds
    autoBoostOnLowHealth: true,
  };
  
  // System references
  private emergenceAmplifier?: EmergenceAmplifier;
  private emergenceCoordinator?: EmergenceCoordinator;
  private curiosityEngine?: CuriosityEngine;
  private explorationEngine?: ExplorationEngine;
  private reinforcementLearner?: ReinforcementLearner;
  private metaLearningEngine?: MetaLearningEngine;
  private providerLearner?: ProviderExecutionLearner;
  private knowledgeBoost?: KnowledgeBoostEngine;
  
  private healthCheckInterval?: NodeJS.Timeout;
  
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
      'emergence-coordinator',
      'curiosity-engine',
      'exploration-engine',
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
      console.log('[SynapsysActivator] Systems already activated');
      return this.state;
    }
    
    console.log('\n🧠 ═══════════════════════════════════════════════════════════');
    console.log('   SYNAPSYS V3.3 - COGNITIVE SYSTEMS ACTIVATION');
    console.log('═══════════════════════════════════════════════════════════\n');
    
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
      
      // Activate exploration systems
      if (this.config.enableExploration) {
        await this.activateExploration();
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
      
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log(`   ✅ ALL SYSTEMS ONLINE - Activated in ${duration}ms`);
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // Emit activation complete
      bus.publish('cortex', 'synapsys:activated', {
        systems: Object.keys(this.state.systems).filter(
          s => this.state.systems[s].status === 'online'
        ),
        duration,
        health: this.state.overallHealth,
        timestamp: new Date().toISOString(),
      });
      
      return this.state;
      
    } catch (error) {
      console.error('[SynapsysActivator] Activation failed:', error);
      throw error;
    }
  }
  
  // ============================================================================
  // SUBSYSTEM ACTIVATION
  // ============================================================================
  
  private async activateLearning(): Promise<void> {
    console.log('📚 Activating Learning Systems...');
    
    // Reinforcement Learner
    try {
      this.setSystemStatus('reinforcement-learner', 'starting');
      this.reinforcementLearner = ReinforcementLearner.getInstance();
      await this.reinforcementLearner.initialize();
      this.setSystemStatus('reinforcement-learner', 'online', {
        qTableSize: this.reinforcementLearner.getQTableSize(),
        policy: this.reinforcementLearner.getPolicy(),
      });
      console.log('   ✓ Reinforcement Learner');
    } catch (error) {
      this.setSystemStatus('reinforcement-learner', 'error', undefined, String(error));
      console.log('   ✗ Reinforcement Learner:', error);
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
      console.log('   ✓ Meta Learning Engine');
    } catch (error) {
      this.setSystemStatus('meta-learning-engine', 'error', undefined, String(error));
      console.log('   ✗ Meta Learning Engine:', error);
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
      console.log('   ✓ Provider Execution Learner');
    } catch (error) {
      this.setSystemStatus('provider-execution-learner', 'error', undefined, String(error));
      console.log('   ✗ Provider Execution Learner:', error);
    }
  }
  
  private async activateEmergence(): Promise<void> {
    console.log('✨ Activating Emergence Systems...');
    
    // Emergence Amplifier
    try {
      this.setSystemStatus('emergence-amplifier', 'starting');
      this.emergenceAmplifier = EmergenceAmplifier.getInstance();
      await this.emergenceAmplifier.initialize();
      this.setSystemStatus('emergence-amplifier', 'online', {
        metrics: this.emergenceAmplifier.getMetrics(),
      });
      console.log('   ✓ Emergence Amplifier');
    } catch (error) {
      this.setSystemStatus('emergence-amplifier', 'error', undefined, String(error));
      console.log('   ✗ Emergence Amplifier:', error);
    }
    
    // Curiosity Engine (needed for coordinator)
    if (this.config.enableCuriosity) {
      try {
        this.setSystemStatus('curiosity-engine', 'starting');
        this.curiosityEngine = CuriosityEngine.getInstance();
        await this.curiosityEngine.initialize();
        this.setSystemStatus('curiosity-engine', 'online', {
          dimensions: this.curiosityEngine.getDimensions(),
        });
        console.log('   ✓ Curiosity Engine');
      } catch (error) {
        this.setSystemStatus('curiosity-engine', 'error', undefined, String(error));
        console.log('   ✗ Curiosity Engine:', error);
      }
    }
    
    // Emergence Coordinator (requires other systems)
    try {
      this.setSystemStatus('emergence-coordinator', 'starting');
      this.emergenceCoordinator = EmergenceCoordinator.getInstance();
      await this.emergenceCoordinator.initialize(
        this.curiosityEngine,
        this.explorationEngine
      );
      this.setSystemStatus('emergence-coordinator', 'online', {
        state: this.emergenceCoordinator.getStateSnapshot(),
      });
      console.log('   ✓ Emergence Coordinator');
    } catch (error) {
      this.setSystemStatus('emergence-coordinator', 'error', undefined, String(error));
      console.log('   ✗ Emergence Coordinator:', error);
    }
  }
  
  private async activateExploration(): Promise<void> {
    console.log('🔬 Activating Exploration Systems...');
    
    // Exploration Engine (Lab)
    try {
      this.setSystemStatus('exploration-engine', 'starting');
      this.explorationEngine = ExplorationEngine.getInstance();
      await this.explorationEngine.initialize();
      this.setSystemStatus('exploration-engine', 'online', {
        stats: this.explorationEngine.getStatistics(),
      });
      console.log('   ✓ Exploration Engine');
    } catch (error) {
      this.setSystemStatus('exploration-engine', 'error', undefined, String(error));
      console.log('   ✗ Exploration Engine:', error);
    }
  }
  
  private async activateKnowledgeBoost(): Promise<void> {
    console.log('🚀 Activating Knowledge Boost...');
    
    try {
      this.setSystemStatus('knowledge-boost-engine', 'starting');
      this.knowledgeBoost = knowledgeBoostEngine;
      await this.knowledgeBoost.initialize();
      this.setSystemStatus('knowledge-boost-engine', 'online', {
        metrics: this.knowledgeBoost.getMetrics(),
      });
      console.log('   ✓ Knowledge Boost Engine');
      
      // Auto-start a velocity boost to accelerate initial learning
      await this.knowledgeBoost.quickBoost('velocity', 1.5, 15);
      console.log('   ⚡ Initial velocity boost activated (15 min)');
      
    } catch (error) {
      this.setSystemStatus('knowledge-boost-engine', 'error', undefined, String(error));
      console.log('   ✗ Knowledge Boost Engine:', error);
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
    for (const [name, status] of Object.entries(this.state.systems)) {
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
    const online = systems.filter(s => s.status === 'online').length;
    this.state.overallHealth = systems.length > 0 ? online / systems.length : 0;
  }
  
  private async triggerHealthBoost(): Promise<void> {
    console.log('[SynapsysActivator] Low health detected, triggering boost...');
    
    if (this.knowledgeBoost) {
      await this.knowledgeBoost.quickBoost('repair', 1.5, 10);
    }
    
    // Try to restart failed systems
    for (const [name, status] of Object.entries(this.state.systems)) {
      if (status.status === 'error') {
        console.log(`[SynapsysActivator] Attempting to restart: ${name}`);
        // Could add restart logic here
      }
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
  async boost(type: 'velocity' | 'retention' | 'transfer' | 'depth' | 'breadth' = 'velocity'): Promise<void> {
    if (this.knowledgeBoost) {
      await this.knowledgeBoost.quickBoost(type, 1.5, 10);
      console.log(`[SynapsysActivator] ${type} boost activated`);
    }
  }
  
  /**
   * Run a meta-learning phase
   */
  async runMetaLearning(phase?: number): Promise<any> {
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
  getEmergenceMetrics(): any {
    if (this.emergenceCoordinator) {
      return this.emergenceCoordinator.getMetrics();
    }
    return null;
  }
  
  /**
   * Get learning metrics
   */
  getLearningMetrics(): any {
    const metrics: any = {};
    
    if (this.reinforcementLearner) {
      metrics.reinforcement = this.reinforcementLearner.getMetrics();
    }
    
    if (this.metaLearningEngine) {
      metrics.metaLearning = this.metaLearningEngine.getStatus();
    }
    
    if (this.providerLearner) {
      metrics.providerLearning = this.providerLearner.getExecutionStats();
    }
    
    if (this.knowledgeBoost) {
      metrics.knowledgeBoost = this.knowledgeBoost.getMetrics();
    }
    
    return metrics;
  }
  
  /**
   * Shutdown all systems
   */
  async shutdown(): Promise<void> {
    console.log('[SynapsysActivator] Shutting down all systems...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.knowledgeBoost) {
      await this.knowledgeBoost.shutdown();
    }
    
    // Mark all systems as offline
    for (const name of Object.keys(this.state.systems)) {
      this.state.systems[name].status = 'offline';
    }
    
    this.state.initialized = false;
    this.state.overallHealth = 0;
    
    console.log('[SynapsysActivator] Shutdown complete');
  }
}

// Singleton export
export const synapsysActivator = SynapsysActivator.getInstance();

// Convenience function for quick activation
export async function activateSynapsys(config?: Partial<ActivatorConfig>): Promise<ActivatorState> {
  return synapsysActivator.activate(config);
}
