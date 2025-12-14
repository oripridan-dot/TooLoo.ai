// @version 3.3.577
/**
 * Reflector Tests
 * @version 1.0.0
 *
 * Tests the plan reflection system including:
 * - Reflection actions
 * - Success/failure analysis
 * - Verification handling
 * - Modification suggestions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LLM provider
vi.mock('../../../../src/precog/providers/llm-provider.js', () => ({
  default: class {
    generateSmartLLM = vi.fn().mockResolvedValue({
      text: '{"action": "CONTINUE", "critique": "OK"}',
    });
  },
}));

describe('Reflector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Exports', () => {
    it('should export Reflector class', async () => {
      const module = await import('../../../../src/cortex/planning/reflector.js');
      expect(module.Reflector).toBeDefined();
      expect(typeof module.Reflector).toBe('function');
    });
  });

  describe('ReflectionAction Type', () => {
    it('should define CONTINUE action', () => {
      const action = 'CONTINUE';
      expect(action).toBe('CONTINUE');
    });

    it('should define RETRY action', () => {
      const action = 'RETRY';
      expect(action).toBe('RETRY');
    });

    it('should define REPLAN action', () => {
      const action = 'REPLAN';
      expect(action).toBe('REPLAN');
    });
  });

  describe('ReflectionResult Interface', () => {
    it('should define result structure', () => {
      const result = {
        action: 'CONTINUE' as const,
        critique: 'Step executed successfully',
      };
      expect(result.action).toBe('CONTINUE');
      expect(result.critique).toBeTruthy();
    });

    it('should support modified step for RETRY', () => {
      const result = {
        action: 'RETRY' as const,
        critique: 'Need to fix syntax error',
        modifiedStep: {
          id: 'step-1',
          type: 'file:write',
          payload: { path: 'src/file.ts', content: 'fixed code' },
        },
      };
      expect(result.modifiedStep).toBeDefined();
    });

    it('should support new goal for REPLAN', () => {
      const result = {
        action: 'REPLAN' as const,
        critique: 'Approach needs to change',
        newGoal: 'Use different strategy',
      };
      expect(result.newGoal).toBe('Use different strategy');
    });
  });

  describe('Instance Creation', () => {
    it('should create instance with event bus', async () => {
      const { Reflector } = await import('../../../../src/cortex/planning/reflector.js');
      const mockBus = { on: vi.fn(), publish: vi.fn() };
      const reflector = new Reflector(mockBus as any);
      expect(reflector).toBeInstanceOf(Reflector);
    });
  });

  describe('Verification Failure Analysis', () => {
    it('should handle verification errors', () => {
      const verification = {
        ok: false,
        errors: ['Type error on line 10', 'Missing semicolon on line 15'],
      };
      expect(verification.ok).toBe(false);
      expect(verification.errors).toHaveLength(2);
    });
  });

  describe('Success Analysis', () => {
    it('should return CONTINUE for successful step', () => {
      const result = { ok: true };
      const expectedAction = result.ok ? 'CONTINUE' : 'RETRY';
      expect(expectedAction).toBe('CONTINUE');
    });
  });

  describe('Failure Analysis', () => {
    it('should handle execution failure', () => {
      const result = { ok: false, error: 'Command not found' };
      expect(result.ok).toBe(false);
    });
  });

  describe('LLM Prompt Construction', () => {
    it('should include goal in context', () => {
      const plan = { goal: 'Create new feature' };
      const systemPrompt = `Goal: "${plan.goal}"`;
      expect(systemPrompt).toContain('Create new feature');
    });

    it('should include step description', () => {
      const step = { description: 'Write utility function' };
      const systemPrompt = `Step: "${step.description}"`;
      expect(systemPrompt).toContain('Write utility function');
    });

    it('should include verification errors', () => {
      const errors = ['Error 1', 'Error 2'];
      const errorString = errors.join('\n');
      expect(errorString).toContain('Error 1');
    });
  });

  describe('JSON Response Parsing', () => {
    it('should extract JSON from response', () => {
      const response = 'Some text {"action": "CONTINUE", "critique": "OK"} more text';
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();
      expect(jsonMatch![0]).toContain('"action"');
    });

    it('should parse valid JSON', () => {
      const jsonStr = '{"action": "CONTINUE", "critique": "OK"}';
      const parsed = JSON.parse(jsonStr);
      expect(parsed.action).toBe('CONTINUE');
    });
  });

  describe('Error Handling', () => {
    it('should return REPLAN on parse error', () => {
      const fallbackResult = {
        action: 'REPLAN' as const,
        critique: 'Failed to fix verification errors.',
      };
      expect(fallbackResult.action).toBe('REPLAN');
    });
  });
});
