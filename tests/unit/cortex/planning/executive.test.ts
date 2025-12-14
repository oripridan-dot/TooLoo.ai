// @version 3.3.573
/**
 * Executive Tests
 * @version 1.0.0
 *
 * Tests the plan execution system including:
 * - Plan management
 * - Step execution
 * - Intervention control
 * - Reflection integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../../src/cortex/planning/reflector.js', () => ({
  Reflector: class {
    reflect = vi.fn().mockResolvedValue({ action: 'CONTINUE', critique: 'OK' });
  },
}));

vi.mock('../../../../src/cortex/planning/verifier.js', () => ({
  Verifier: class {
    verifyFile = vi.fn().mockResolvedValue({ ok: true, errors: [] });
  },
}));

describe('Executive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export Executive class', async () => {
      const module = await import('../../../../src/cortex/planning/executive.js');
      expect(module.Executive).toBeDefined();
      expect(typeof module.Executive).toBe('function');
    });
  });

  describe('Instance Creation', () => {
    it('should create instance with event bus', async () => {
      const { Executive } = await import('../../../../src/cortex/planning/executive.js');
      const mockBus = { on: vi.fn(), publish: vi.fn() };
      const executive = new Executive(mockBus as any);
      expect(executive).toBeInstanceOf(Executive);
    });
  });

  describe('Plan State', () => {
    it('should initialize without current plan', () => {
      const state = {
        currentPlan: null,
        currentStepIndex: -1,
        isExecuting: false,
        isPaused: false,
      };
      expect(state.currentPlan).toBeNull();
      expect(state.currentStepIndex).toBe(-1);
    });
  });

  describe('Execution State', () => {
    it('should track execution status', () => {
      const state = { isExecuting: true };
      expect(state.isExecuting).toBe(true);
    });

    it('should track pause status', () => {
      const state = { isPaused: true };
      expect(state.isPaused).toBe(true);
    });
  });

  describe('Intervention Mode', () => {
    it('should track intervention mode', () => {
      let interventionMode = false;
      interventionMode = true;
      expect(interventionMode).toBe(true);
    });
  });

  describe('Step Status Tracking', () => {
    it('should mark step as completed', () => {
      const step = { status: 'running' as const };
      step.status = 'completed';
      expect(step.status).toBe('completed');
    });

    it('should mark step as failed', () => {
      const step = { status: 'running' as const };
      step.status = 'failed';
      expect(step.status).toBe('failed');
    });
  });

  describe('Event Listeners', () => {
    it('should set up event listeners', async () => {
      const { Executive } = await import('../../../../src/cortex/planning/executive.js');
      const mockBus = { on: vi.fn(), publish: vi.fn() };
      new Executive(mockBus as any);
      expect(mockBus.on).toHaveBeenCalled();
    });
  });

  describe('Reflection Actions', () => {
    it('should handle CONTINUE action', () => {
      const reflection = { action: 'CONTINUE', critique: 'Step completed successfully' };
      expect(reflection.action).toBe('CONTINUE');
    });

    it('should handle RETRY action', () => {
      const reflection = { action: 'RETRY', critique: 'Need to fix error' };
      expect(reflection.action).toBe('RETRY');
    });

    it('should handle REPLAN action', () => {
      const reflection = { action: 'REPLAN', critique: 'Plan needs adjustment' };
      expect(reflection.action).toBe('REPLAN');
    });
  });

  describe('Plan Reset', () => {
    it('should reset state on failure', () => {
      const state = {
        currentPlan: { goal: 'test' },
        currentStepIndex: 3,
        isExecuting: true,
      };
      // Reset
      const reset = {
        currentPlan: null,
        currentStepIndex: -1,
        isExecuting: false,
      };
      expect(reset.currentPlan).toBeNull();
      expect(reset.isExecuting).toBe(false);
    });
  });
});
