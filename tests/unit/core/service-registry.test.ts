// @version 3.3.573
/**
 * Service Registry Test Suite
 * @version 3.3.510
 *
 * Tests for the runtime dependency injection system including:
 * - Service categories
 * - Service registration
 * - Conflict detection
 * - Health checks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// TYPE DEFINITIONS (mirrors implementation)
// ============================================================================

const SERVICE_CATEGORIES = [
  'provider-tracking',
  'provider-routing',
  'provider-health',
  'memory-storage',
  'memory-retrieval',
  'memory-generation',
  'context-management',
  'session-tracking',
  'event-bus',
  'event-persistence',
  'file-system',
  'database',
  'cache',
  'api-gateway',
  'websocket-server',
  'logging',
  'metrics',
  'tracing',
  'health-monitoring',
  'ui-provider-display',
  'ui-memory-display',
  'ui-activity-log',
  'ui-plan-visualization',
  'architecture-analysis',
  'component-registry',
] as const;

type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

interface ServiceRegistration {
  name: string;
  category: ServiceCategory;
  version: string;
  instance: unknown;
  registeredAt: Date;
  metadata?: Record<string, unknown>;
  healthCheck?: () => Promise<boolean>;
}

interface ServiceConflict {
  category: ServiceCategory;
  existingService: string;
  attemptedService: string;
  resolution: 'rejected' | 'replaced' | 'coexist';
}

interface RegisterOptions {
  version?: string;
  metadata?: Record<string, unknown>;
  healthCheck?: () => Promise<boolean>;
  force?: boolean;
}

// ============================================================================
// MOCK SERVICE REGISTRY
// ============================================================================

class MockServiceRegistry {
  private services: Map<ServiceCategory, ServiceRegistration> = new Map();
  private conflicts: ServiceConflict[] = [];
  private strictMode: boolean = true;

  register<T>(
    category: ServiceCategory,
    name: string,
    instance: T,
    options: RegisterOptions = {}
  ): boolean {
    const { version = '1.0.0', metadata = {}, healthCheck, force = false } = options;

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
        return false;
      }
    }

    this.services.set(category, {
      name,
      category,
      version,
      instance,
      registeredAt: new Date(),
      metadata,
      healthCheck,
    });

    return true;
  }

  get<T>(category: ServiceCategory): T | undefined {
    const registration = this.services.get(category);
    return registration?.instance as T | undefined;
  }

  has(category: ServiceCategory): boolean {
    return this.services.has(category);
  }

  unregister(category: ServiceCategory): boolean {
    return this.services.delete(category);
  }

  getRegistration(category: ServiceCategory): ServiceRegistration | undefined {
    return this.services.get(category);
  }

  getConflicts(): ServiceConflict[] {
    return [...this.conflicts];
  }

  getAllCategories(): ServiceCategory[] {
    return Array.from(this.services.keys());
  }

  setStrictMode(strict: boolean): void {
    this.strictMode = strict;
  }

  async checkHealth(category: ServiceCategory): Promise<boolean> {
    const registration = this.services.get(category);
    if (!registration?.healthCheck) {
      return true; // No health check = assume healthy
    }
    return registration.healthCheck();
  }

  clear(): void {
    this.services.clear();
    this.conflicts = [];
  }
}

// ============================================================================
// SERVICE CATEGORIES TESTS
// ============================================================================

describe('Service Categories', () => {
  it('should have provider categories', () => {
    expect(SERVICE_CATEGORIES).toContain('provider-tracking');
    expect(SERVICE_CATEGORIES).toContain('provider-routing');
    expect(SERVICE_CATEGORIES).toContain('provider-health');
  });

  it('should have memory categories', () => {
    expect(SERVICE_CATEGORIES).toContain('memory-storage');
    expect(SERVICE_CATEGORIES).toContain('memory-retrieval');
    expect(SERVICE_CATEGORIES).toContain('memory-generation');
  });

  it('should have infrastructure categories', () => {
    expect(SERVICE_CATEGORIES).toContain('file-system');
    expect(SERVICE_CATEGORIES).toContain('database');
    expect(SERVICE_CATEGORIES).toContain('cache');
  });

  it('should have observability categories', () => {
    expect(SERVICE_CATEGORIES).toContain('logging');
    expect(SERVICE_CATEGORIES).toContain('metrics');
    expect(SERVICE_CATEGORIES).toContain('tracing');
  });

  it('should have UI categories', () => {
    expect(SERVICE_CATEGORIES).toContain('ui-provider-display');
    expect(SERVICE_CATEGORIES).toContain('ui-memory-display');
    expect(SERVICE_CATEGORIES).toContain('ui-activity-log');
  });
});

// ============================================================================
// SERVICE REGISTRATION TESTS
// ============================================================================

describe('Service Registration', () => {
  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
  });

  it('should register new service', () => {
    const mockService = { name: 'TestLogger' };
    const result = registry.register('logging', 'TestLogger', mockService);

    expect(result).toBe(true);
    expect(registry.has('logging')).toBe(true);
  });

  it('should retrieve registered service', () => {
    const mockService = { logLevel: 'debug' };
    registry.register('logging', 'Logger', mockService);

    const retrieved = registry.get<typeof mockService>('logging');
    expect(retrieved?.logLevel).toBe('debug');
  });

  it('should store registration metadata', () => {
    registry.register(
      'metrics',
      'MetricsCollector',
      {},
      {
        version: '2.0.0',
        metadata: { port: 9090 },
      }
    );

    const reg = registry.getRegistration('metrics');
    expect(reg?.version).toBe('2.0.0');
    expect(reg?.metadata?.port).toBe(9090);
  });

  it('should track registration timestamp', () => {
    const before = new Date();
    registry.register('cache', 'RedisCache', {});
    const after = new Date();

    const reg = registry.getRegistration('cache');
    expect(reg?.registeredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(reg?.registeredAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ============================================================================
// CONFLICT DETECTION TESTS
// ============================================================================

describe('Conflict Detection', () => {
  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
    registry.setStrictMode(true);
  });

  it('should reject duplicate registration in strict mode', () => {
    registry.register('logging', 'Logger1', {});
    const result = registry.register('logging', 'Logger2', {});

    expect(result).toBe(false);
    expect(registry.getRegistration('logging')?.name).toBe('Logger1');
  });

  it('should record conflict', () => {
    registry.register('database', 'PostgresDB', {});
    registry.register('database', 'MongoDB', {});

    const conflicts = registry.getConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].existingService).toBe('PostgresDB');
    expect(conflicts[0].attemptedService).toBe('MongoDB');
    expect(conflicts[0].resolution).toBe('rejected');
  });

  it('should allow force registration', () => {
    registry.register('cache', 'OldCache', {});
    const result = registry.register('cache', 'NewCache', {}, { force: true });

    expect(result).toBe(true);
    expect(registry.getRegistration('cache')?.name).toBe('NewCache');
  });

  it('should replace in non-strict mode', () => {
    registry.setStrictMode(false);
    registry.register('metrics', 'OldMetrics', {});
    registry.register('metrics', 'NewMetrics', {});

    const conflicts = registry.getConflicts();
    expect(conflicts[0].resolution).toBe('replaced');
  });
});

// ============================================================================
// SERVICE LIFECYCLE TESTS
// ============================================================================

describe('Service Lifecycle', () => {
  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
  });

  it('should unregister service', () => {
    registry.register('logging', 'Logger', {});

    const result = registry.unregister('logging');

    expect(result).toBe(true);
    expect(registry.has('logging')).toBe(false);
  });

  it('should return false when unregistering non-existent service', () => {
    const result = registry.unregister('non-existent' as ServiceCategory);
    expect(result).toBe(false);
  });

  it('should clear all services', () => {
    registry.register('logging', 'Logger', {});
    registry.register('metrics', 'Metrics', {});
    registry.register('cache', 'Cache', {});

    registry.clear();

    expect(registry.getAllCategories().length).toBe(0);
  });
});

// ============================================================================
// HEALTH CHECK TESTS
// ============================================================================

describe('Health Checks', () => {
  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
  });

  it('should return true when no health check defined', async () => {
    registry.register('logging', 'Logger', {});

    const healthy = await registry.checkHealth('logging');
    expect(healthy).toBe(true);
  });

  it('should execute health check function', async () => {
    const healthCheck = vi.fn().mockResolvedValue(true);
    registry.register('database', 'PostgresDB', {}, { healthCheck });

    const healthy = await registry.checkHealth('database');

    expect(healthCheck).toHaveBeenCalled();
    expect(healthy).toBe(true);
  });

  it('should report unhealthy service', async () => {
    const healthCheck = vi.fn().mockResolvedValue(false);
    registry.register('cache', 'BrokenCache', {}, { healthCheck });

    const healthy = await registry.checkHealth('cache');
    expect(healthy).toBe(false);
  });
});

// ============================================================================
// SERVICE CONFLICT TESTS
// ============================================================================

describe('ServiceConflict', () => {
  it('should create rejected conflict', () => {
    const conflict: ServiceConflict = {
      category: 'logging',
      existingService: 'Logger1',
      attemptedService: 'Logger2',
      resolution: 'rejected',
    };
    expect(conflict.resolution).toBe('rejected');
  });

  it('should create replaced conflict', () => {
    const conflict: ServiceConflict = {
      category: 'metrics',
      existingService: 'OldMetrics',
      attemptedService: 'NewMetrics',
      resolution: 'replaced',
    };
    expect(conflict.resolution).toBe('replaced');
  });

  it('should create coexist conflict', () => {
    const conflict: ServiceConflict = {
      category: 'health-monitoring',
      existingService: 'Monitor1',
      attemptedService: 'Monitor2',
      resolution: 'coexist',
    };
    expect(conflict.resolution).toBe('coexist');
  });
});

// ============================================================================
// SERVICE REGISTRATION INTERFACE TESTS
// ============================================================================

describe('ServiceRegistration Interface', () => {
  it('should create full registration', () => {
    const reg: ServiceRegistration = {
      name: 'TestService',
      category: 'logging',
      version: '1.0.0',
      instance: { log: () => {} },
      registeredAt: new Date(),
      metadata: { env: 'production' },
      healthCheck: async () => true,
    };

    expect(reg.name).toBe('TestService');
    expect(reg.category).toBe('logging');
    expect(reg.version).toBe('1.0.0');
  });

  it('should support optional fields', () => {
    const reg: ServiceRegistration = {
      name: 'MinimalService',
      category: 'cache',
      version: '0.1.0',
      instance: null,
      registeredAt: new Date(),
    };

    expect(reg.metadata).toBeUndefined();
    expect(reg.healthCheck).toBeUndefined();
  });
});

// ============================================================================
// REGISTER OPTIONS TESTS
// ============================================================================

describe('RegisterOptions', () => {
  it('should support all options', () => {
    const options: RegisterOptions = {
      version: '2.0.0',
      metadata: { port: 3000 },
      healthCheck: async () => true,
      force: true,
    };

    expect(options.version).toBe('2.0.0');
    expect(options.force).toBe(true);
  });

  it('should allow partial options', () => {
    const options: RegisterOptions = {
      version: '1.0.0',
    };

    expect(options.version).toBe('1.0.0');
    expect(options.force).toBeUndefined();
  });

  it('should allow empty options', () => {
    const options: RegisterOptions = {};
    expect(Object.keys(options).length).toBe(0);
  });
});

// ============================================================================
// MULTI-SERVICE SCENARIOS TESTS
// ============================================================================

describe('Multi-Service Scenarios', () => {
  let registry: MockServiceRegistry;

  beforeEach(() => {
    registry = new MockServiceRegistry();
  });

  it('should register services in multiple categories', () => {
    registry.register('logging', 'Logger', {});
    registry.register('metrics', 'Metrics', {});
    registry.register('cache', 'Cache', {});
    registry.register('database', 'Database', {});

    expect(registry.getAllCategories().length).toBe(4);
  });

  it('should maintain independence between categories', () => {
    const logger = { type: 'logger' };
    const metrics = { type: 'metrics' };

    registry.register('logging', 'Logger', logger);
    registry.register('metrics', 'Metrics', metrics);

    expect(registry.get<typeof logger>('logging')?.type).toBe('logger');
    expect(registry.get<typeof metrics>('metrics')?.type).toBe('metrics');
  });

  it('should track multiple conflicts', () => {
    registry.register('logging', 'Logger1', {});
    registry.register('logging', 'Logger2', {});
    registry.register('metrics', 'Metrics1', {});
    registry.register('metrics', 'Metrics2', {});

    expect(registry.getConflicts().length).toBe(2);
  });
});
