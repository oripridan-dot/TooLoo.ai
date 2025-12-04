// @version 2.2.125
/**
 * Service Registry
 * Runtime dependency injection that enforces single implementation per interface.
 * Prevents duplicate services from registering for the same responsibility.
 *
 * @version 2.2.125
 * @responsibility service-registration
 * @category core-infrastructure
 */

import { bus } from './event-bus.js';

// Service categories - only ONE service allowed per category
export const SERVICE_CATEGORIES = [
  // Provider Management
  'provider-tracking', // Tracks provider metrics, latency, success rates
  'provider-routing', // Routes requests to appropriate providers
  'provider-health', // Health checks for providers

  // Memory Systems
  'memory-storage', // Stores short/long-term memories (Hippocampus)
  'memory-retrieval', // Retrieves relevant memories
  'memory-generation', // Generates memory summaries (MemoryAutoFiller)

  // Context & Session
  'context-management', // Manages conversation context
  'session-tracking', // Tracks session state, highlights, goals

  // Event Systems
  'event-bus', // Central event bus
  'event-persistence', // Persists events for replay

  // Infrastructure
  'file-system', // Smart file operations
  'database', // Database connections
  'cache', // Caching layer

  // API & Routing
  'api-gateway', // Main API router
  'websocket-server', // WebSocket management

  // Observability
  'logging', // Centralized logging
  'metrics', // Metrics collection
  'tracing', // Distributed tracing
  'health-monitoring', // System health checks

  // UI Components (frontend categories)
  'ui-provider-display', // Provider status display
  'ui-memory-display', // Memory/context display
  'ui-activity-log', // Activity/event log display
  'ui-plan-visualization', // Plan/task visualization

  // Architecture & Quality
  'architecture-analysis', // Code quality and duplicate detection
  'component-registry', // Frontend component catalog
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export interface ServiceRegistration {
  name: string;
  category: ServiceCategory;
  version: string;
  instance: unknown;
  registeredAt: Date;
  metadata?: Record<string, unknown>;
  healthCheck?: () => Promise<boolean>;
}

export interface ServiceConflict {
  category: ServiceCategory;
  existingService: string;
  attemptedService: string;
  resolution: 'rejected' | 'replaced' | 'coexist';
}

export interface RegisterOptions {
  version?: string;
  metadata?: Record<string, unknown>;
  healthCheck?: () => Promise<boolean>;
  force?: boolean;
}

/**
 * Service Registry - Enforces single implementation per category
 */
class ServiceRegistry {
  private services: Map<ServiceCategory, ServiceRegistration> = new Map();
  private conflicts: ServiceConflict[] = [];
  private strictMode: boolean = true;

  constructor() {
    console.log('[ServiceRegistry] Initialized - Strict mode enabled');
  }

  /**
   * Register a service for a specific category
   * @throws Error if category already has a service (in strict mode)
   */
  register<T>(
    category: ServiceCategory,
    name: string,
    instance: T,
    options: RegisterOptions = {}
  ): void {
    const { version = '1.0.0', metadata = {}, healthCheck, force = false } = options;

    // Check for existing registration
    const existing = this.services.get(category);

    if (existing && !force) {
      const conflict: ServiceConflict = {
        category,
        existingService: existing.name,
        attemptedService: name,
        resolution: this.strictMode ? 'rejected' : 'replaced',
      };
      this.conflicts.push(conflict);

      if (this.strictMode) {
        const error = new Error(
          `[ServiceRegistry] DUPLICATE SERVICE DETECTED!\n` +
            `Category: ${category}\n` +
            `Existing: ${existing.name} (v${existing.version})\n` +
            `Attempted: ${name} (v${version})\n\n` +
            `Resolution: Add @duplicates-intentional annotation or consolidate services.`
        );
        console.error(error.message);

        // Emit event for monitoring
        bus.publish('system', 'registry:conflict', {
          conflict,
          timestamp: new Date().toISOString(),
        });

        throw error;
      }

      console.warn(
        `[ServiceRegistry] Replacing ${existing.name} with ${name} for category ${category}`
      );
    }

    const registration: ServiceRegistration = {
      name,
      category,
      version,
      instance,
      registeredAt: new Date(),
      metadata,
      healthCheck,
    };

    this.services.set(category, registration);

    console.log(`[ServiceRegistry] ✓ Registered: ${name} (v${version}) → ${category}`);

    // Emit registration event
    bus.publish('system', 'registry:service_registered', {
      name,
      category,
      version,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get a service by category
   */
  get<T>(category: ServiceCategory): T | null {
    const registration = this.services.get(category);
    return registration ? (registration.instance as T) : null;
  }

  /**
   * Get a service or throw if not found
   */
  getRequired<T>(category: ServiceCategory): T {
    const service = this.get<T>(category);

    if (!service) {
      throw new Error(`[ServiceRegistry] Required service not found: ${category}`);
    }
    return service;
  }

  /**
   * Check if a category is registered
   */
  has(category: ServiceCategory): boolean {
    return this.services.has(category);
  }

  /**
   * Unregister a service
   */
  unregister(category: ServiceCategory): boolean {
    const existed = this.services.delete(category);
    if (existed) {
      console.log(`[ServiceRegistry] Unregistered service for: ${category}`);
      bus.publish('system', 'registry:service_unregistered', {
        category,
        timestamp: new Date().toISOString(),
      });
    }
    return existed;
  }

  /**
   * Get all registered services
   */
  getAll(): ServiceRegistration[] {
    return Array.from(this.services.values());
  }

  /**
   * Get registration conflicts
   */
  getConflicts(): ServiceConflict[] {
    return [...this.conflicts];
  }

  /**
   * Run health checks on all services
   */
  async healthCheck(): Promise<{
    healthy: string[];
    unhealthy: string[];
    noCheck: string[];
  }> {
    const results = {
      healthy: [] as string[],
      unhealthy: [] as string[],
      noCheck: [] as string[],
    };

    for (const [category, registration] of this.services) {
      if (registration.healthCheck) {
        try {
          const isHealthy = await registration.healthCheck();
          if (isHealthy) {
            results.healthy.push(category);
          } else {
            results.unhealthy.push(category);
          }
        } catch (error) {
          results.unhealthy.push(category);
          console.error(`[ServiceRegistry] Health check failed for ${category}:`, error);
        }
      } else {
        results.noCheck.push(category);
      }
    }

    return results;
  }

  /**
   * Get responsibility matrix - which service owns what
   */
  getResponsibilityMatrix(): Record<ServiceCategory, string | null> {
    const matrix: Record<string, string | null> = {};

    for (const category of SERVICE_CATEGORIES) {
      const registration = this.services.get(category);
      matrix[category] = registration?.name || null;
    }

    return matrix as Record<ServiceCategory, string | null>;
  }

  /**
   * Validate that required services are registered
   */
  validateRequired(required: ServiceCategory[]): {
    valid: boolean;
    missing: ServiceCategory[];
  } {
    const missing = required.filter((cat) => !this.services.has(cat));
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Get a formatted status report
   */
  getStatusReport(): string {
    const lines: string[] = [
      '╔════════════════════════════════════════════════════════════════╗',
      '║               SERVICE REGISTRY STATUS                          ║',
      '╚════════════════════════════════════════════════════════════════╝',
      '',
    ];

    const registered = Array.from(this.services.entries());
    const unregistered = SERVICE_CATEGORIES.filter((cat) => !this.services.has(cat));

    lines.push('✅ REGISTERED SERVICES:');
    lines.push('─'.repeat(60));
    for (const [category, reg] of registered) {
      lines.push(`  ${category.padEnd(25)} → ${reg.name} (v${reg.version})`);
    }

    if (unregistered.length > 0) {
      lines.push('');
      lines.push('⚪ UNREGISTERED CATEGORIES:');
      lines.push('─'.repeat(60));
      for (const category of unregistered) {
        lines.push(`  ${category}`);
      }
    }

    if (this.conflicts.length > 0) {
      lines.push('');
      lines.push('🔴 CONFLICTS DETECTED:');
      lines.push('─'.repeat(60));
      for (const conflict of this.conflicts) {
        lines.push(
          `  ${conflict.category}: ${conflict.existingService} vs ${conflict.attemptedService} [${conflict.resolution}]`
        );
      }
    }

    return lines.join('\n');
  }

  /**
   * Enable/disable strict mode
   */
  setStrictMode(enabled: boolean): void {
    this.strictMode = enabled;
    console.log(`[ServiceRegistry] Strict mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.services.clear();
    this.conflicts = [];
    console.log('[ServiceRegistry] Cleared all registrations');
  }

  /**
   * Export registry state for persistence
   */
  toJSON(): {
    services: Array<Omit<ServiceRegistration, 'instance' | 'healthCheck'>>;
    conflicts: ServiceConflict[];
  } {
    return {
      services: Array.from(this.services.values()).map((s) => ({
        name: s.name,
        category: s.category,
        version: s.version,
        registeredAt: s.registeredAt,
        metadata: s.metadata,
      })),
      conflicts: this.conflicts,
    };
  }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();

/**
 * Helper decorator for automatic registration
 * Usage: @RegisterService("provider-tracking", "1.0.0")
 */
export function RegisterService(category: ServiceCategory, version: string = '1.0.0') {
  return function <T extends { new (...args: unknown[]): object }>(constructor: T) {
    const original = constructor;

    const wrapped = function (this: unknown, ...args: unknown[]) {
      const instance = new original(...args);
      serviceRegistry.register(category, constructor.name, instance, {
        version,
      });
      return instance;
    };

    wrapped.prototype = original.prototype;
    return wrapped as unknown as T;
  };
}
