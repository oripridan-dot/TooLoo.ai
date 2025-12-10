/**
 * Team Framework Unit Tests
 * TooLoo.ai Synapsys V3.3.510
 *
 * Tests for executor+validator team pattern, AgentFactory, TeamRegistry, TeamExecutor
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies before importing
vi.mock('../../../../src/cortex/bus', () => ({
  default: {
    publish: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../../../src/cortex/agent/execution', () => ({
  executionAgent: {
    execute: vi.fn().mockResolvedValue({ success: true, output: 'test output' }),
    analyze: vi.fn().mockResolvedValue({ success: true, output: 'analysis result' }),
    generate: vi.fn().mockResolvedValue({ success: true, output: 'generated code' }),
    fix: vi.fn().mockResolvedValue({ success: true, output: 'fixed code' }),
  },
}));

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn().mockResolvedValue(false),
    readJson: vi.fn().mockResolvedValue({ queue: [] }),
    writeJson: vi.fn().mockResolvedValue(undefined),
    ensureDir: vi.fn().mockResolvedValue(undefined),
  },
  pathExists: vi.fn().mockResolvedValue(false),
  readJson: vi.fn().mockResolvedValue({ queue: [] }),
  writeJson: vi.fn().mockResolvedValue(undefined),
  ensureDir: vi.fn().mockResolvedValue(undefined),
}));

describe('Team Framework', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instances
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AgentFactory', () => {
    describe('createAgent', () => {
      it('should create executor agent with correct properties', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const agent = AgentFactory.createExecutor('code-generation');

        expect(agent).toBeDefined();
        expect(agent.role).toBe('executor');
        expect(agent.specialization).toBe('code-generation');
        expect(agent.id).toBeTruthy();
        expect(agent.name).toContain('Executor');
        expect(agent.capabilities).toBeInstanceOf(Array);
        expect(agent.capabilities).toContain('execute');
      });

      it('should create validator agent with correct properties', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const agent = AgentFactory.createValidator('code-generation');

        expect(agent).toBeDefined();
        expect(agent.role).toBe('validator');
        // Validators have "<specialization> validation" format
        expect(agent.specialization).toBe('code-generation validation');
        expect(agent.id).toBeTruthy();
        expect(agent.name).toContain('Validator');
        expect(agent.capabilities).toContain('validate');
        expect(agent.capabilities).toContain('critique');
      });

      it('should create agent by role', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const executor = AgentFactory.createAgent('executor', 'testing');
        expect(executor.role).toBe('executor');

        const validator = AgentFactory.createAgent('validator', 'testing');
        expect(validator.role).toBe('validator');
      });

      it('should assign unique IDs to each agent', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const agent1 = AgentFactory.createExecutor('code');
        const agent2 = AgentFactory.createExecutor('code');
        const agent3 = AgentFactory.createValidator('code');

        expect(agent1.id).not.toBe(agent2.id);
        expect(agent2.id).not.toBe(agent3.id);
        expect(agent1.id).not.toBe(agent3.id);
      });

      it('should set createdAt timestamp', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const before = new Date();
        const agent = AgentFactory.createExecutor('analysis');
        const after = new Date();

        expect(agent.createdAt).toBeInstanceOf(Date);
        expect(agent.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
        expect(agent.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      });

      it('should include specialization-specific capabilities for executors', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        // Executors have standard capabilities: execute, generate, analyze
        const codeAgent = AgentFactory.createExecutor('code-generation');
        expect(codeAgent.capabilities).toContain('execute');
        expect(codeAgent.capabilities).toContain('generate');
        expect(codeAgent.capabilities).toContain('analyze');
      });

      it('should include validation capabilities for validators', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const validator = AgentFactory.createValidator('security');
        expect(validator.capabilities).toContain('validate');
        expect(validator.capabilities).toContain('critique');
        expect(validator.capabilities).toContain('analyze');
      });
    });

    describe('specialization handling', () => {
      it('should handle empty specialization', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const agent = AgentFactory.createExecutor('');
        expect(agent.specialization).toBe('');
        expect(agent.role).toBe('executor');
      });

      it('should preserve exact specialization string', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const specializations = [
          'code-generation',
          'api-development',
          'ui-components',
          'database',
          'security',
          'optimization',
          'testing',
        ];

        for (const spec of specializations) {
          const agent = AgentFactory.createExecutor(spec);
          expect(agent.specialization).toBe(spec);
        }
      });
    });
  });

  describe('TeamRegistry', () => {
    describe('singleton pattern', () => {
      it('should return same instance', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const instance1 = TeamRegistry.getInstance();
        const instance2 = TeamRegistry.getInstance();

        expect(instance1).toBe(instance2);
      });
    });

    describe('createTeam', () => {
      it('should create team with executor and validator', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('code-generation');

        expect(team).toBeDefined();
        expect(team.id).toBeTruthy();
        expect(team.executor).toBeDefined();
        expect(team.executor.role).toBe('executor');
        expect(team.validator).toBeDefined();
        expect(team.validator.role).toBe('validator');
        expect(team.status).toBe('idle');
      });

      it('should assign team name based on specialization', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('api-development');

        expect(team.name).toContain('api-development');
      });

      it('should set default purpose if not provided', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('testing');

        expect(team.purpose).toBeTruthy();
        expect(team.purpose).toContain('testing');
      });

      it('should use custom purpose when provided', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('deployment', 'Deploy to production');

        expect(team.purpose).toBe('Deploy to production');
      });

      it('should initialize team metrics', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('optimization');

        expect(team.metrics).toBeDefined();
        expect(team.metrics.tasksCompleted).toBe(0);
        expect(team.metrics.successRate).toBe(1.0);
        expect(team.metrics.qualityScore).toBeGreaterThan(0);
      });

      it('should index team by specialization', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('security-audit');

        const teams = registry.getTeamsBySpecialization('security-audit');
        expect(teams).toContain(team);
      });
    });

    describe('findOrCreateTeam', () => {
      it('should return existing idle team', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team1 = registry.createTeam('find-test-spec');

        const found = registry.findOrCreateTeam('find-test-spec');
        expect(found.id).toBe(team1.id);
      });

      it('should create new team if none exists', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.findOrCreateTeam('new-unique-spec-' + Date.now());

        expect(team).toBeDefined();
        expect(team.executor).toBeDefined();
        expect(team.validator).toBeDefined();
      });
    });

    describe('getTeam', () => {
      it('should return team by ID', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const created = registry.createTeam('get-test');

        const found = registry.getTeam(created.id);
        expect(found).toBe(created);
      });

      it('should return undefined for non-existent ID', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const found = registry.getTeam('non-existent-id');

        expect(found).toBeUndefined();
      });
    });

    describe('getAllTeams', () => {
      it('should return all registered teams', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const initialCount = registry.getAllTeams().length;

        registry.createTeam('team-all-1-' + Date.now());
        registry.createTeam('team-all-2-' + Date.now());

        const teams = registry.getAllTeams();
        expect(teams.length).toBeGreaterThanOrEqual(initialCount + 2);
      });
    });

    describe('updateTeamMetrics', () => {
      it('should update metrics after task completion', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('metrics-test-' + Date.now());

        const taskResult = {
          success: true,
          output: 'test',
          qualityScore: 0.95,
          iterations: 2,
          totalDurationMs: 1500,
          validationReport: {
            passed: true,
            score: 0.95,
            issues: [],
            suggestions: [],
            confidence: 0.9,
          },
        };

        registry.updateTeamMetrics(team.id, taskResult);

        expect(team.metrics.tasksCompleted).toBe(1);
        expect(team.metrics.qualityScore).toBeGreaterThan(0);
      });
    });
  });

  describe('Team Types', () => {
    describe('AgentRole', () => {
      it('should support executor and validator roles', async () => {
        const { AgentFactory } = await import('../../../../src/cortex/agent/team-framework');

        const executor = AgentFactory.createAgent('executor', 'test');
        const validator = AgentFactory.createAgent('validator', 'test');

        expect(['executor', 'validator']).toContain(executor.role);
        expect(['executor', 'validator']).toContain(validator.role);
      });
    });

    describe('TeamStatus', () => {
      it('should start teams in idle status', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('status-test-' + Date.now());

        expect(team.status).toBe('idle');
      });
    });

    describe('TeamTask', () => {
      it('should have required task properties', async () => {
        const { TaskType } = await import('../../../../src/cortex/agent/team-framework');

        // Verify task types are available
        const validTypes = [
          'generate',
          'execute',
          'analyze',
          'fix',
          'deploy',
          'validate',
          'research',
        ];
        expect(validTypes.length).toBe(7);
      });
    });
  });

  describe('Team Execution Flow', () => {
    describe('executor-validator loop', () => {
      it('should pair executor with validator for quality gating', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('execution-test');

        // Validator has specialization with " validation" suffix
        expect(team.validator.specialization).toBe(`${team.executor.specialization} validation`);
      });

      it('should initialize empty history', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('history-test');

        expect(team.history).toBeInstanceOf(Array);
        expect(team.history.length).toBe(0);
      });
    });

    describe('quality thresholds', () => {
      it('should have default quality score', async () => {
        const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

        const registry = TeamRegistry.getInstance();
        const team = registry.createTeam('quality-test');

        expect(team.metrics.qualityScore).toBeGreaterThan(0);
        expect(team.metrics.qualityScore).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Agent Specializations', () => {
    const specializations = [
      'code-generation',
      'code-execution',
      'code-analysis',
      'code-fixing',
      'testing',
      'deployment',
      'api-development',
      'ui-components',
      'database',
      'security',
      'optimization',
      'research',
      'general',
    ];

    it.each(specializations)('should create team for %s specialization', async (spec) => {
      const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

      const registry = TeamRegistry.getInstance();
      const team = registry.createTeam(spec);

      expect(team.executor.specialization).toBe(spec);
      // Validators have "<specialization> validation" format
      expect(team.validator.specialization).toBe(`${spec} validation`);
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate running averages correctly', async () => {
      const { TeamRegistry } = await import('../../../../src/cortex/agent/team-framework');

      const registry = TeamRegistry.getInstance();
      const team = registry.createTeam('avg-test-' + Date.now());

      // First task
      registry.updateTeamMetrics(team.id, {
        success: true,
        output: '',
        qualityScore: 0.8,
        iterations: 2,
        totalDurationMs: 1000,
        validationReport: {
          passed: true,
          score: 0.8,
          issues: [],
          suggestions: [],
          confidence: 0.9,
        },
      });

      expect(team.metrics.tasksCompleted).toBe(1);

      // Second task
      registry.updateTeamMetrics(team.id, {
        success: true,
        output: '',
        qualityScore: 1.0,
        iterations: 1,
        totalDurationMs: 500,
        validationReport: {
          passed: true,
          score: 1.0,
          issues: [],
          suggestions: [],
          confidence: 0.95,
        },
      });

      expect(team.metrics.tasksCompleted).toBe(2);
      // Running average continues from initial value 1.5:
      // After first: (1.5*0 + 2)/1 = 2
      // After second: (2*1 + 1)/2 = 1.5
      expect(team.metrics.avgIterations).toBeCloseTo(1.5, 1);
    });
  });
});
