// @version 3.3.573
/**
 * Monitoring Hub Tests
 *
 * Tests for the observability/monitoring-hub module which provides
 * unified observability for TooLoo's growth and learning systems
 *
 * @version 3.3.510
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue(null),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock event bus
vi.mock('../../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    subscribe: vi.fn(),
  },
}));

describe('MonitoringHub', () => {
  let MonitoringHub: any;
  let hub: any;
  let DEFAULT_ALERT_RULES: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    MonitoringHub = mod.MonitoringHub;
    DEFAULT_ALERT_RULES = mod.DEFAULT_ALERT_RULES;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Singleton Pattern', () => {
    it('should have getInstance method', () => {
      expect(typeof MonitoringHub.getInstance).toBe('function');
    });

    it('should return same instance on multiple calls', () => {
      const instance1 = MonitoringHub.getInstance();
      const instance2 = MonitoringHub.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      hub = MonitoringHub.getInstance();
    });

    it('should have initialize method', () => {
      expect(typeof hub.initialize).toBe('function');
    });

    it('should initialize successfully', async () => {
      await expect(hub.initialize()).resolves.not.toThrow();
    });
  });

  describe('Metric Collection', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have recordMetric method', () => {
      expect(typeof hub.recordMetric).toBe('function');
    });

    it('should record a metric', () => {
      expect(() => {
        hub.recordMetric({
          name: 'test.metric',
          id: 'test-metric-1',
          component: 'learning',
          type: 'gauge',
          value: 42,
          unit: 'count',
          timestamp: new Date(),
          labels: {},
        });
      }).not.toThrow();
    });

    it('should have getMetricSeries method', () => {
      expect(typeof hub.getMetricSeries).toBe('function');
    });

    it('should have getRecentMetrics method', () => {
      expect(typeof hub.getRecentMetrics).toBe('function');
    });

    it('should have getAllSeries method', () => {
      expect(typeof hub.getAllSeries).toBe('function');
    });
  });

  describe('Alert Management', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getActiveAlerts method', () => {
      expect(typeof hub.getActiveAlerts).toBe('function');
    });

    it('should return array of active alerts', () => {
      const alerts = hub.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should have acknowledgeAlert method', () => {
      expect(typeof hub.acknowledgeAlert).toBe('function');
    });

    it('should have resolveAlert method', () => {
      expect(typeof hub.resolveAlert).toBe('function');
    });

    it('should have getAlertHistory method', () => {
      expect(typeof hub.getAlertHistory).toBe('function');
    });
  });

  describe('Component Status', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getComponentStatus method', () => {
      expect(typeof hub.getComponentStatus).toBe('function');
    });

    it('should have getAllComponentStatus method', () => {
      expect(typeof hub.getAllComponentStatus).toBe('function');
    });

    it('should return component status object', () => {
      const status = hub.getAllComponentStatus();
      expect(typeof status).toBe('object');
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getSnapshot method that includes health', () => {
      const snapshot = hub.getSnapshot();
      expect(snapshot).toHaveProperty('health');
      expect(snapshot.health).toHaveProperty('score');
      expect(snapshot.health).toHaveProperty('status');
    });

    it('should return health score between 0 and 100', () => {
      const snapshot = hub.getSnapshot();
      expect(snapshot.health.score).toBeGreaterThanOrEqual(0);
      expect(snapshot.health.score).toBeLessThanOrEqual(100);
    });

    it('should have getState method', () => {
      expect(typeof hub.getState).toBe('function');
    });

    it('should have getMetrics method', () => {
      expect(typeof hub.getMetrics).toBe('function');
    });
  });

  describe('Correlation Analysis', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getCorrelations method', () => {
      expect(typeof hub.getCorrelations).toBe('function');
    });

    it('should return correlations array', () => {
      const correlations = hub.getCorrelations();
      expect(Array.isArray(correlations)).toBe(true);
    });
  });

  describe('Trend Forecasting', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getForecast method', () => {
      expect(typeof hub.getForecast).toBe('function');
    });
  });

  describe('Snapshot', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have getSnapshot method', () => {
      expect(typeof hub.getSnapshot).toBe('function');
    });

    it('should return system snapshot', () => {
      const snapshot = hub.getSnapshot();
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('health');
    });
  });

  describe('Start/Stop', () => {
    beforeEach(async () => {
      hub = MonitoringHub.getInstance();
      await hub.initialize();
    });

    it('should have start method', () => {
      expect(typeof hub.start).toBe('function');
    });

    it('should have stop method', () => {
      expect(typeof hub.stop).toBe('function');
    });

    it('should stop gracefully', () => {
      expect(() => hub.stop()).not.toThrow();
    });

    it('should start and stop collection', () => {
      hub.start();
      expect(() => hub.stop()).not.toThrow();
    });
  });
});

describe('Alert Rules', () => {
  let DEFAULT_ALERT_RULES: any;

  beforeEach(async () => {
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    DEFAULT_ALERT_RULES = mod.DEFAULT_ALERT_RULES;
  });

  it('should export DEFAULT_ALERT_RULES array', () => {
    expect(Array.isArray(DEFAULT_ALERT_RULES)).toBe(true);
    expect(DEFAULT_ALERT_RULES.length).toBeGreaterThan(0);
  });

  it('should have valid alert rule structure', () => {
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('enabled');
      expect(rule).toHaveProperty('component');
      expect(rule).toHaveProperty('metric');
      expect(rule).toHaveProperty('condition');
      expect(rule).toHaveProperty('severity');
    }
  });

  it('should have valid severity levels', () => {
    const validSeverities = ['info', 'warning', 'critical', 'emergency'];
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(validSeverities).toContain(rule.severity);
    }
  });

  it('should have valid condition operators', () => {
    const validOperators = ['>', '<', '>=', '<=', '==', '!=', 'change', 'absence'];
    for (const rule of DEFAULT_ALERT_RULES) {
      expect(validOperators).toContain(rule.condition.operator);
    }
  });
});

describe('Metric Types', () => {
  it('should define valid metric types', async () => {
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    // Module should export types
    expect(mod).toBeDefined();
    expect(mod.MonitoringHub).toBeDefined();
  });
});

describe('System Components', () => {
  it('should export MonitoringHub class', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    expect(mod.MonitoringHub).toBeDefined();
    expect(typeof mod.MonitoringHub.getInstance).toBe('function');
  });

  it('should export DEFAULT_ALERT_RULES', async () => {
    vi.resetModules();
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    expect(mod.DEFAULT_ALERT_RULES).toBeDefined();
    expect(Array.isArray(mod.DEFAULT_ALERT_RULES)).toBe(true);
  });
});

describe('Alert Rule Management', () => {
  let MonitoringHub: any;
  let hub: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    MonitoringHub = mod.MonitoringHub;
    hub = MonitoringHub.getInstance();
    await hub.initialize();
  });

  it('should have addAlertRule method', () => {
    expect(typeof hub.addAlertRule).toBe('function');
  });

  it('should have updateAlertRule method', () => {
    expect(typeof hub.updateAlertRule).toBe('function');
  });

  it('should have deleteAlertRule method', () => {
    expect(typeof hub.deleteAlertRule).toBe('function');
  });

  it('should have getAlertRules method', () => {
    expect(typeof hub.getAlertRules).toBe('function');
  });

  it('should return array of alert rules', () => {
    const rules = hub.getAlertRules();
    expect(Array.isArray(rules)).toBe(true);
  });

  it('should have enableAlertRule method', () => {
    expect(typeof hub.enableAlertRule).toBe('function');
  });

  it('should have disableAlertRule method', () => {
    expect(typeof hub.disableAlertRule).toBe('function');
  });
});

describe('Streaming/Subscription', () => {
  let MonitoringHub: any;
  let hub: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    MonitoringHub = mod.MonitoringHub;
    hub = MonitoringHub.getInstance();
    await hub.initialize();
  });

  it('should have subscribe method', () => {
    expect(typeof hub.subscribe).toBe('function');
  });

  it('should have unsubscribe method', () => {
    expect(typeof hub.unsubscribe).toBe('function');
  });

  it('should accept subscription callback', () => {
    const callback = vi.fn();
    expect(() => hub.subscribe('test-sub', callback)).not.toThrow();
    hub.unsubscribe('test-sub');
  });
});

describe('Policy Management', () => {
  let MonitoringHub: any;
  let hub: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('../../../../src/cortex/observability/monitoring-hub.js');
    MonitoringHub = mod.MonitoringHub;
    hub = MonitoringHub.getInstance();
    await hub.initialize();
  });

  it('should have getPolicy method', () => {
    expect(typeof hub.getPolicy).toBe('function');
  });

  it('should have updatePolicy method', () => {
    expect(typeof hub.updatePolicy).toBe('function');
  });

  it('should return policy object', () => {
    const policy = hub.getPolicy();
    expect(typeof policy).toBe('object');
  });

  it('should update policy', () => {
    const newPolicy = hub.updatePolicy({ collectionIntervalMs: 5000 });
    expect(newPolicy.collectionIntervalMs).toBe(5000);
  });
});
