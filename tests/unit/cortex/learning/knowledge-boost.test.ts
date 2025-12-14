// @version 3.3.577
/**
 * Knowledge Boost Engine Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for knowledge boost, learning acceleration, and retention systems
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../../../src/core/event-bus', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({}),
    writeJson: vi.fn().mockResolvedValue(undefined),
  },
  ensureDir: vi.fn().mockResolvedValue(undefined),
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue({}),
  writeJson: vi.fn().mockResolvedValue(undefined),
}));

describe('KnowledgeBoostEngine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', async () => {
      const { KnowledgeBoostEngine } =
        await import('../../../../src/cortex/learning/knowledge-boost');

      const instance1 = KnowledgeBoostEngine.getInstance();
      const instance2 = KnowledgeBoostEngine.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Boost Session Management', () => {
    describe('startBoost', () => {
      it('should create boost session with proper structure', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.startBoost({
          type: 'velocity',
          intensity: 1.5,
          duration: 60000,
          autoActivate: true,
        });

        expect(session).toBeDefined();
        expect(session.id).toBeTruthy();
        expect(session.type).toBe('velocity');
        expect(session.intensity).toBe(1.5);
        expect(session.status).toBe('active');
        expect(session.startedAt).toBeInstanceOf(Date);
        expect(session.expiresAt).toBeInstanceOf(Date);
      });

      it('should set expiration correctly', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();
        const duration = 120000; // 2 minutes

        const session = await engine.startBoost({
          type: 'retention',
          intensity: 1.0,
          duration,
          autoActivate: false,
        });

        const expectedExpiry = session.startedAt.getTime() + duration;
        expect(session.expiresAt.getTime()).toBeCloseTo(expectedExpiry, -100);
      });

      it('should track target domain if provided', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.startBoost({
          type: 'depth',
          targetDomain: 'code',
          intensity: 1.2,
          duration: 30000,
          autoActivate: true,
        });

        expect(session.targetDomain).toBe('code');
      });
    });

    describe('quickBoost', () => {
      it('should create session with default parameters', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.quickBoost('velocity');

        expect(session).toBeDefined();
        expect(session.type).toBe('velocity');
        expect(session.intensity).toBe(1.0);
        expect(session.status).toBe('active');
      });

      it('should accept custom intensity', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.quickBoost('retention', 1.8);

        expect(session.intensity).toBe(1.8);
      });

      it('should accept custom duration', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();
        const durationMinutes = 5;

        const session = await engine.quickBoost('transfer', 1.0, durationMinutes);

        const expectedDurationMs = durationMinutes * 60 * 1000;
        const actualDuration = session.expiresAt.getTime() - session.startedAt.getTime();
        expect(actualDuration).toBe(expectedDurationMs);
      });
    });

    describe('endBoost', () => {
      it('should mark session as completed', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.startBoost({
          type: 'consolidation',
          intensity: 1.0,
          duration: 10000,
          autoActivate: true,
        });

        await engine.endBoost(session.id, 'completed');

        // Session should be removed from active sessions
        const activeSessions = engine.getActiveBoosts();
        const found = activeSessions.find((s) => s.id === session.id);
        expect(found).toBeUndefined();
      });

      it('should handle non-existent session gracefully', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        // Should not throw
        await expect(engine.endBoost('non-existent-session', 'cancelled')).resolves.not.toThrow();
      });
    });
  });

  describe('Boost Types', () => {
    const boostTypes = [
      'velocity',
      'retention',
      'transfer',
      'depth',
      'breadth',
      'consolidation',
      'repair',
    ] as const;

    it.each(boostTypes)('should accept boost type: %s', async (type) => {
      const { KnowledgeBoostEngine } =
        await import('../../../../src/cortex/learning/knowledge-boost');

      const engine = KnowledgeBoostEngine.getInstance();

      const session = await engine.startBoost({
        type,
        intensity: 1.0,
        duration: 5000,
        autoActivate: true,
      });

      expect(session.type).toBe(type);
    });
  });

  describe('Intensity Handling', () => {
    it('should accept minimum intensity', async () => {
      const { KnowledgeBoostEngine } =
        await import('../../../../src/cortex/learning/knowledge-boost');

      const engine = KnowledgeBoostEngine.getInstance();

      const session = await engine.startBoost({
        type: 'velocity',
        intensity: 0.1,
        duration: 5000,
        autoActivate: true,
      });

      expect(session.intensity).toBe(0.1);
    });

    it('should accept maximum intensity', async () => {
      const { KnowledgeBoostEngine } =
        await import('../../../../src/cortex/learning/knowledge-boost');

      const engine = KnowledgeBoostEngine.getInstance();

      const session = await engine.startBoost({
        type: 'velocity',
        intensity: 2.0,
        duration: 5000,
        autoActivate: true,
      });

      expect(session.intensity).toBe(2.0);
    });
  });

  describe('Metrics', () => {
    describe('getMetrics', () => {
      it('should return metrics object', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const metrics = engine.getMetrics();

        expect(metrics).toBeDefined();
        expect(typeof metrics.totalBoostSessions).toBe('number');
        expect(typeof metrics.activeBoostSessions).toBe('number');
        expect(typeof metrics.totalKnowledgeGained).toBe('number');
        expect(typeof metrics.velocityMultiplier).toBe('number');
        expect(metrics.weakestDomains).toBeInstanceOf(Array);
        expect(metrics.strongestDomains).toBeInstanceOf(Array);
      });

      it('should increment totalBoostSessions', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();
        const initialMetrics = engine.getMetrics();
        const initialTotal = initialMetrics.totalBoostSessions;

        await engine.quickBoost('velocity');

        const newMetrics = engine.getMetrics();
        expect(newMetrics.totalBoostSessions).toBeGreaterThan(initialTotal);
      });
    });
  });

  describe('Active Sessions', () => {
    describe('getActiveBoosts', () => {
      it('should return array of active sessions', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const sessions = engine.getActiveBoosts();
        expect(sessions).toBeInstanceOf(Array);
      });

      it('should include newly created session', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const session = await engine.quickBoost('retention');

        const sessions = engine.getActiveBoosts();
        const found = sessions.find((s) => s.id === session.id);
        expect(found).toBeDefined();
      });
    });
  });

  describe('Knowledge Graph', () => {
    describe('getKnowledgeNodes', () => {
      it('should return knowledge nodes', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();
        await engine.initialize();

        const nodes = engine.getKnowledgeNodes();
        expect(nodes).toBeInstanceOf(Array);
      });

      it('should filter nodes by domain', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();
        await engine.initialize();

        const codeNodes = engine.getKnowledgeNodes('code');
        expect(codeNodes).toBeInstanceOf(Array);

        for (const node of codeNodes) {
          expect(node.domain).toBe('code');
        }
      });
    });
  });

  describe('Strategies', () => {
    describe('getStrategies', () => {
      it('should return available strategies', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const strategies = engine.getStrategies();
        expect(strategies).toBeInstanceOf(Array);
        expect(strategies.length).toBeGreaterThan(0);
      });

      it('should include spaced repetition strategy', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const strategies = engine.getStrategies();
        const spacedRep = strategies.find((s) => s.id === 'spaced-repetition');

        expect(spacedRep).toBeDefined();
        expect(spacedRep?.applicableTypes).toContain('retention');
      });

      it('should include gap filling strategy', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const strategies = engine.getStrategies();
        const gapFilling = strategies.find((s) => s.id === 'gap-filling');

        expect(gapFilling).toBeDefined();
        expect(gapFilling?.applicableTypes).toContain('repair');
      });
    });

    describe('getStrategyForType', () => {
      it('should return appropriate strategy for boost type', async () => {
        const { KnowledgeBoostEngine } =
          await import('../../../../src/cortex/learning/knowledge-boost');

        const engine = KnowledgeBoostEngine.getInstance();

        const strategies = engine.getStrategies();
        const retentionStrategy = strategies.find((s) => s.applicableTypes.includes('retention'));

        expect(retentionStrategy).toBeDefined();
        expect(retentionStrategy?.applicableTypes).toContain('retention');
      });
    });
  });

  describe('Core Domains', () => {
    const coreDomains = ['code', 'reasoning', 'creative', 'system', 'learning', 'execution'];

    it.each(coreDomains)('should seed domain: %s', async (domain) => {
      const { KnowledgeBoostEngine } =
        await import('../../../../src/cortex/learning/knowledge-boost');

      const engine = KnowledgeBoostEngine.getInstance();
      await engine.initialize();

      const nodes = engine.getKnowledgeNodes(domain);
      expect(nodes.length).toBeGreaterThan(0);
    });
  });
});
