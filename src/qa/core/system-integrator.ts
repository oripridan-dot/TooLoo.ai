// @version 2.2.175
/**
 * System Integrator - Deep Core System Integration
 *
 * Hooks into TooLoo.ai's core systems:
 * - EventBus monitoring
 * - Module registry tracking
 * - Health pulse monitoring
 * - Cross-module communication validation
 *
 * @module qa/core/system-integrator
 */

import { bus, SynapsysEvent } from '../../core/event-bus.js';
import { registry } from '../../core/module-registry.js';
import {
  ModuleHealth,
  EventFlowMetrics,
  SystemWiringStatus,
  EventSchemas,
  EventType,
} from '../types/index.js';

interface EventLogEntry {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  payloadSize: number;
  processingTime?: number;
}

interface EventExpectation {
  eventType: string;
  maxInterval: number;
  required: boolean;
}

/**
 * SystemIntegrator - Deep integration with core systems
 */
export class SystemIntegrator {
  private eventLog: EventLogEntry[] = [];
  private maxLogSize = 5000;
  private moduleHealth: Map<string, ModuleHealth> = new Map();
  private lastHeartbeat = 0;
  private eventStats: Map<string, { count: number; lastSeen: number; avgLatency: number }> =
    new Map();
  private schemaViolations: Array<{
    eventType: string;
    timestamp: number;
    error: string;
  }> = [];

  constructor() {
    console.log('[SystemIntegrator] 🔗 Initializing core system integration...');
    this.setupEventBusHooks();
    this.setupRegistryHooks();
    this.initializeModuleHealth();
  }

  /**
   * Set up EventBus monitoring
   */
  private setupEventBusHooks() {
    // Subscribe to ALL events
    bus.on('*', (event: SynapsysEvent) => {
      this.recordEvent(event);
    });

    // Add validation interceptor
    bus.addInterceptor(async (event: SynapsysEvent) => {
      return this.validateEvent(event);
    });

    // Track heartbeats
    bus.on('system:heartbeat', (event: SynapsysEvent) => {
      this.lastHeartbeat = event.timestamp;
      this.updateModuleHealthFromHeartbeat(event);
    });

    console.log('[SystemIntegrator] EventBus hooks installed');
  }

  /**
   * Set up Module Registry monitoring
   */
  private setupRegistryHooks() {
    registry.on('module:registered', (module: any) => {
      this.initializeModuleHealth(module.name);
      console.log(`[SystemIntegrator] Module registered: ${module.name}`);
    });

    registry.on('module:status_change', ({ name, status }: { name: string; status: string }) => {
      const health = this.moduleHealth.get(name);
      if (health) {
        health.status = status as ModuleHealth['status'];
        health.lastHeartbeat = Date.now();
      }

      if (status === 'error') {
        this.alertModuleFailure(name, status);
      }
    });

    console.log('[SystemIntegrator] Registry hooks installed');
  }

  /**
   * Initialize module health tracking
   */
  private initializeModuleHealth(moduleName?: string) {
    const modules = moduleName ? [moduleName] : ['cortex', 'precog', 'nexus', 'qa-guardian'];

    for (const name of modules) {
      if (!this.moduleHealth.has(name)) {
        this.moduleHealth.set(name, {
          name,
          status: 'booting',
          lastHeartbeat: Date.now(),
          metrics: {
            eventsProcessed: 0,
            errorRate: 0,
            avgLatency: 0,
          },
        });
      }
    }
  }

  /**
   * Record an event in the log
   */
  private recordEvent(event: SynapsysEvent) {
    // Guard against malformed events
    if (!event || typeof event.type !== 'string') {
      return;
    }

    const entry: EventLogEntry = {
      id: event.id || crypto.randomUUID(),
      type: event.type,
      source: event.source || 'unknown',
      timestamp: event.timestamp || Date.now(),
      payloadSize: event.payload ? JSON.stringify(event.payload).length : 0,
    };

    this.eventLog.push(entry);

    // Update statistics
    const stats = this.eventStats.get(event.type) || {
      count: 0,
      lastSeen: 0,
      avgLatency: 0,
    };
    stats.count++;
    stats.lastSeen = event.timestamp || Date.now();
    this.eventStats.set(event.type, stats);

    // Update module metrics
    const health = this.moduleHealth.get(event.source);
    if (health) {
      health.metrics.eventsProcessed++;
      health.lastHeartbeat = Date.now();
    }

    // Trim log
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize / 2);
    }
  }

  /**
   * Validate event against schema
   */
  private async validateEvent(event: SynapsysEvent): Promise<boolean> {
    const schema = EventSchemas[event.type as EventType];

    if (schema) {
      const result = schema.safeParse(event.payload);
      if (!result.success) {
        this.schemaViolations.push({
          eventType: event.type,
          timestamp: Date.now(),
          error: result.error.message,
        });

        console.warn(`[SystemIntegrator] Event schema violation for ${event.type}`);

        // Don't block events, just log
        return true;
      }
    }

    return true;
  }

  /**
   * Update module health from heartbeat
   */
  private updateModuleHealthFromHeartbeat(event: SynapsysEvent) {
    const modules = event.payload.modules || [];

    for (const mod of modules) {
      const health = this.moduleHealth.get(mod.name);
      if (health) {
        health.status = mod.status;
        health.lastHeartbeat = Date.now();
      }
    }
  }

  /**
   * Alert on module failure
   */
  private alertModuleFailure(moduleName: string, status: string) {
    console.error(`[SystemIntegrator] 🚨 Module failure: ${moduleName} (${status})`);

    bus.publish('system', 'qa:module_failure', {
      module: moduleName,
      status,
      timestamp: Date.now(),
    });
  }

  /**
   * Get complete system wiring status
   */
  getWiringStatus(): SystemWiringStatus {
    const getModuleHealth = (name: string): ModuleHealth => {
      const health = this.moduleHealth.get(name);
      if (health) return health;

      // Try to get from registry
      const mod = registry.get(name);
      return {
        name,
        status: mod?.status || 'error',
        lastHeartbeat: 0,
        metrics: {
          eventsProcessed: 0,
          errorRate: 0,
          avgLatency: 0,
        },
      };
    };

    return {
      cortex: getModuleHealth('cortex'),
      precog: getModuleHealth('precog'),
      nexus: getModuleHealth('nexus'),
      qaGuardian: getModuleHealth('qa-guardian'),
      eventBus: this.getEventFlowMetrics(),
      lastHeartbeat: this.lastHeartbeat,
    };
  }

  /**
   * Get event flow metrics
   */
  getEventFlowMetrics(): EventFlowMetrics {
    const eventsByType: Record<string, number> = {};
    const eventsBySource: Record<string, number> = {};
    let totalLatency = 0;
    const errorCount = 0;

    for (const [type, stats] of this.eventStats) {
      eventsByType[type] = stats.count;
    }

    for (const entry of this.eventLog) {
      eventsBySource[entry.source] = (eventsBySource[entry.source] || 0) + 1;
      if (entry.processingTime) {
        totalLatency += entry.processingTime;
      }
    }

    return {
      totalEvents: this.eventLog.length,
      eventsByType,
      eventsBySource,
      avgLatency: this.eventLog.length > 0 ? totalLatency / this.eventLog.length : 0,
      errorRate: this.eventLog.length > 0 ? errorCount / this.eventLog.length : 0,
    };
  }

  /**
   * Check expected events are firing
   */
  checkExpectedEvents(expectations: EventExpectation[]): Array<{
    event: string;
    issue: string;
    severity: 'warning' | 'critical';
  }> {
    const issues: Array<{
      event: string;
      issue: string;
      severity: 'warning' | 'critical';
    }> = [];
    const now = Date.now();

    for (const exp of expectations) {
      const stats = this.eventStats.get(exp.eventType);

      if (!stats) {
        issues.push({
          event: exp.eventType,
          issue: 'Event never seen',
          severity: exp.required ? 'critical' : 'warning',
        });
        continue;
      }

      // Check if event hasn't fired recently
      if (now - stats.lastSeen > exp.maxInterval) {
        issues.push({
          event: exp.eventType,
          issue: `Not seen for ${Math.round((now - stats.lastSeen) / 1000)}s`,
          severity: 'warning',
        });
      }
    }

    return issues;
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 50): EventLogEntry[] {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get event flow visualization data
   */
  getEventFlow(minutes = 5): {
    period: string;
    totalEvents: number;
    flows: Record<string, number>;
    topEvents: Array<[string, { count: number; lastSeen: number }]>;
  } {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const recentEvents = this.eventLog.filter((e) => e.timestamp > cutoff);

    const flows: Record<string, number> = {};
    for (const event of recentEvents) {
      const key = `${event.source} → ${event.type}`;
      flows[key] = (flows[key] || 0) + 1;
    }

    const topEvents = Array.from(this.eventStats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    return {
      period: `Last ${minutes} minutes`,
      totalEvents: recentEvents.length,
      flows,
      topEvents,
    };
  }

  /**
   * Get schema violation summary
   */
  getSchemaViolations(limit = 20): typeof this.schemaViolations {
    return this.schemaViolations.slice(-limit);
  }

  /**
   * Clear logs (for testing)
   */
  clearLogs() {
    this.eventLog = [];
    this.eventStats.clear();
    this.schemaViolations = [];
  }

  /**
   * Get quick summary
   */
  getSummary(): string {
    const status = this.getWiringStatus();
    const allHealthy =
      status.cortex.status === 'ready' &&
      status.precog.status === 'ready' &&
      status.nexus.status === 'ready';

    const icon = allHealthy ? '✅' : '⚠️';
    const heartbeatAge = Math.round((Date.now() - this.lastHeartbeat) / 1000);

    return `${icon} Systems: Cortex[${status.cortex.status}] Precog[${status.precog.status}] Nexus[${status.nexus.status}] | Last heartbeat: ${heartbeatAge}s ago`;
  }
}

// Singleton instance
export const systemIntegrator = new SystemIntegrator();
