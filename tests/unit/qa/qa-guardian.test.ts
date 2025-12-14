// @version 3.3.573
/**
 * QA Guardian Test Suite
 *
 * Comprehensive tests for the QA Guardian system including:
 * - Schema validation
 * - Wire verification
 * - Filesystem hygiene
 * - Legacy detection
 * - System integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock modules
vi.mock('../../../src/core/event-bus.js', () => ({
  bus: {
    publish: vi.fn(),
    on: vi.fn(),
    addInterceptor: vi.fn(),
  },
}));

vi.mock('../../../src/core/module-registry.js', () => ({
  registry: {
    register: vi.fn(),
    updateStatus: vi.fn(),
    on: vi.fn(),
    getAll: vi.fn(() => [
      { name: 'cortex', status: 'ready' },
      { name: 'precog', status: 'ready' },
      { name: 'nexus', status: 'ready' },
    ]),
  },
}));

describe('QA Guardian', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Guard', () => {
    it('should validate request payload against schema', async () => {
      const { SchemaGuard } = await import('../../../src/qa/guards/schema-guard.js');
      const guard = new SchemaGuard();

      const schema = z.object({
        message: z.string(),
        context: z.object({
          projectId: z.string().optional(),
        }),
      });

      const validData = { message: 'Hello', context: {} };
      const result = guard.validate(schema, validData);

      expect(result.valid).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid payload', async () => {
      const { SchemaGuard } = await import('../../../src/qa/guards/schema-guard.js');
      const guard = new SchemaGuard();

      const schema = z.object({
        message: z.string(),
      });

      const invalidData = { message: 123 }; // number instead of string
      const result = guard.validate(schema, invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should record violations in history', async () => {
      const { SchemaGuard } = await import('../../../src/qa/guards/schema-guard.js');
      const guard = new SchemaGuard();

      const schema = z.object({ id: z.number() });
      guard.validate(schema, { id: 'not-a-number' });

      const history = guard.getViolations();
      expect(history).toBeDefined();
    });
  });

  describe('Types', () => {
    it('should export all required types', async () => {
      const types = await import('../../../src/qa/types/index.js');

      expect(types.ChatMessageRequestSchema).toBeDefined();
      expect(types.ChatMessageResponseSchema).toBeDefined();
      expect(types.SystemStatusResponseSchema).toBeDefined();
      expect(types.API_CONTRACTS).toBeDefined();
      expect(types.EventSchemas).toBeDefined();
    });

    it('should have valid API contracts', async () => {
      const { API_CONTRACTS } = await import('../../../src/qa/types/index.js');

      // Check contracts exist with full paths
      expect(API_CONTRACTS['POST /api/v1/chat/message']).toBeDefined();
      expect(API_CONTRACTS['GET /api/v1/system/status']).toBeDefined();
      expect(Object.keys(API_CONTRACTS).length).toBeGreaterThan(100);
    });
  });

  describe('Wire Verifier', () => {
    it('should be instantiable', async () => {
      const { WireVerifier } = await import('../../../src/qa/wiring/wire-verifier.js');
      const verifier = new WireVerifier();

      expect(verifier).toBeDefined();
      expect(typeof verifier.verify).toBe('function');
      expect(typeof verifier.scanFrontendAPICalls).toBe('function');
      expect(typeof verifier.scanBackendRoutes).toBe('function');
    });
  });

  describe('Filesystem Hygiene', () => {
    it('should be instantiable', async () => {
      const { FileSystemHygiene } = await import('../../../src/qa/hygiene/filesystem-hygiene.js');
      const hygiene = new FileSystemHygiene();

      expect(hygiene).toBeDefined();
      expect(typeof hygiene.runAllChecks).toBe('function');
      expect(typeof hygiene.findDuplicates).toBe('function');
      expect(typeof hygiene.findOrphans).toBe('function');
    });
  });

  describe('Legacy Hunter', () => {
    it('should be instantiable', async () => {
      const { LegacyHunter } = await import('../../../src/qa/hygiene/legacy-hunter.js');
      const hunter = new LegacyHunter();

      expect(hunter).toBeDefined();
      expect(typeof hunter.runAllScans).toBe('function');
      expect(typeof hunter.findTODOs).toBe('function');
      expect(typeof hunter.findDeadExports).toBe('function');
    });
  });

  describe('System Integrator', () => {
    it('should export singleton integrator', async () => {
      const { systemIntegrator } = await import('../../../src/qa/core/system-integrator.js');

      expect(systemIntegrator).toBeDefined();
      expect(typeof systemIntegrator.getWiringStatus).toBe('function');
    });
  });

  describe('QA Guardian Agent', () => {
    it('should export singleton agent', async () => {
      const { qaGuardianAgent } = await import('../../../src/qa/agent/qa-guardian-agent.js');

      expect(qaGuardianAgent).toBeDefined();
      expect(typeof qaGuardianAgent.start).toBe('function');
      expect(typeof qaGuardianAgent.stop).toBe('function');
      expect(typeof qaGuardianAgent.runFullCheck).toBe('function');
    });

    it('should have correct default config', async () => {
      const { qaGuardianAgent } = await import('../../../src/qa/agent/qa-guardian-agent.js');

      const status = qaGuardianAgent.getStatus();
      expect(status.config).toBeDefined();
      expect(status.config.enabled).toBe(true);
    });
  });

  describe('Main Export', () => {
    it('should export initQAGuardian function', async () => {
      const qa = await import('../../../src/qa/index.js');

      expect(qa.initQAGuardian).toBeDefined();
      expect(typeof qa.initQAGuardian).toBe('function');
    });

    it('should export all core modules', async () => {
      const qa = await import('../../../src/qa/index.js');

      expect(qa.SchemaGuard).toBeDefined();
      expect(qa.WireVerifier).toBeDefined();
      expect(qa.FileSystemHygiene).toBeDefined();
      expect(qa.LegacyHunter).toBeDefined();
      expect(qa.SystemIntegrator).toBeDefined();
      expect(qa.QAGuardianAgent).toBeDefined();
      expect(qa.qaRoutes).toBeDefined();
    });
  });
});

describe('Integration Tests', () => {
  describe('Schema Validation Flow', () => {
    it('should validate chat message request correctly', async () => {
      const { ChatMessageRequestSchema } = await import('../../../src/qa/types/index.js');

      const validMessage = {
        message: 'Hello, TooLoo!',
        context: { projectId: 'test-123' },
      };

      const result = ChatMessageRequestSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject invalid chat message', async () => {
      const { ChatMessageRequestSchema } = await import('../../../src/qa/types/index.js');

      const invalidMessage = {
        message: '', // empty message
        context: {},
      };

      const result = ChatMessageRequestSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });
  });

  describe('Event Schema Validation', () => {
    it('should validate heartbeat event', async () => {
      const { EventSchemas } = await import('../../../src/qa/types/index.js');

      const heartbeat = {
        timestamp: Date.now(),
        uptime: 12345,
        modules: [],
      };

      const result = EventSchemas['system:heartbeat'].safeParse(heartbeat);
      expect(result.success).toBe(true);
    });

    it('should validate qa:guardian_ready event', async () => {
      const { EventSchemas } = await import('../../../src/qa/types/index.js');

      const event = {
        timestamp: Date.now(),
        version: '2.0.0',
      };

      const result = EventSchemas['qa:guardian_ready'].safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});
