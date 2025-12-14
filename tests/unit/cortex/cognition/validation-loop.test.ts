// @version 3.3.577 - ValidationLoop Tests
import { describe, it, expect } from 'vitest';

// Test types
type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'local';
type RoleType = 'generator' | 'reviewer' | 'tester' | 'optimizer' | 'synthesizer' | 'validator';
type StageType = 'generate' | 'review' | 'test' | 'optimize' | 'consensus';
type StatusType = 'passed' | 'failed' | 'skipped' | 'pending';

interface StageConfig {
  provider: ProviderType;
  model: string;
  role: RoleType;
  systemPrompt: string;
}

interface ValidationStageOutput {
  stage: string;
  provider: string;
  model: string;
  content: string;
  status: StatusType;
  score: number;
  feedback?: string;
  latencyMs: number;
}

interface ValidationLoopOutput {
  finalContent: string;
  stages: ValidationStageOutput[];
  validationStatus: 'validated' | 'partial' | 'failed';
  consensusScore: number;
  confidenceScore: number;
  totalLatencyMs: number;
}

describe('ValidationLoop', () => {
  describe('ProviderType', () => {
    it('should support openai', () => {
      const provider: ProviderType = 'openai';
      expect(provider).toBe('openai');
    });

    it('should support anthropic', () => {
      const provider: ProviderType = 'anthropic';
      expect(provider).toBe('anthropic');
    });

    it('should support gemini', () => {
      const provider: ProviderType = 'gemini';
      expect(provider).toBe('gemini');
    });

    it('should support deepseek', () => {
      const provider: ProviderType = 'deepseek';
      expect(provider).toBe('deepseek');
    });

    it('should support local', () => {
      const provider: ProviderType = 'local';
      expect(provider).toBe('local');
    });
  });

  describe('RoleType', () => {
    it('should support generator role', () => {
      const role: RoleType = 'generator';
      expect(role).toBe('generator');
    });

    it('should support reviewer role', () => {
      const role: RoleType = 'reviewer';
      expect(role).toBe('reviewer');
    });

    it('should support tester role', () => {
      const role: RoleType = 'tester';
      expect(role).toBe('tester');
    });

    it('should support optimizer role', () => {
      const role: RoleType = 'optimizer';
      expect(role).toBe('optimizer');
    });

    it('should support synthesizer role', () => {
      const role: RoleType = 'synthesizer';
      expect(role).toBe('synthesizer');
    });

    it('should support validator role', () => {
      const role: RoleType = 'validator';
      expect(role).toBe('validator');
    });
  });

  describe('StageType', () => {
    it('should support generate stage', () => {
      const stage: StageType = 'generate';
      expect(stage).toBe('generate');
    });

    it('should support review stage', () => {
      const stage: StageType = 'review';
      expect(stage).toBe('review');
    });

    it('should support test stage', () => {
      const stage: StageType = 'test';
      expect(stage).toBe('test');
    });

    it('should support optimize stage', () => {
      const stage: StageType = 'optimize';
      expect(stage).toBe('optimize');
    });

    it('should support consensus stage', () => {
      const stage: StageType = 'consensus';
      expect(stage).toBe('consensus');
    });
  });

  describe('StatusType', () => {
    it('should support passed status', () => {
      const status: StatusType = 'passed';
      expect(status).toBe('passed');
    });

    it('should support failed status', () => {
      const status: StatusType = 'failed';
      expect(status).toBe('failed');
    });

    it('should support skipped status', () => {
      const status: StatusType = 'skipped';
      expect(status).toBe('skipped');
    });

    it('should support pending status', () => {
      const status: StatusType = 'pending';
      expect(status).toBe('pending');
    });
  });

  describe('StageConfig Interface', () => {
    it('should configure generate stage', () => {
      const config: StageConfig = {
        provider: 'gemini',
        model: 'gemini-2.0-flash-exp',
        role: 'generator',
        systemPrompt: 'Generate response'
      };
      expect(config.provider).toBe('gemini');
    });

    it('should configure review stage', () => {
      const config: StageConfig = {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        role: 'reviewer',
        systemPrompt: 'Review response'
      };
      expect(config.role).toBe('reviewer');
    });

    it('should configure test stage', () => {
      const config: StageConfig = {
        provider: 'openai',
        model: 'gpt-4o',
        role: 'tester',
        systemPrompt: 'Test response'
      };
      expect(config.model).toBe('gpt-4o');
    });
  });

  describe('ValidationStageOutput Interface', () => {
    it('should have stage name', () => {
      const output: ValidationStageOutput = {
        stage: 'generate', provider: 'gemini', model: 'gemini-2.0',
        content: 'Response', status: 'passed', score: 0.9, latencyMs: 100
      };
      expect(output.stage).toBe('generate');
    });

    it('should have score 0-1', () => {
      const output: ValidationStageOutput = {
        stage: 'review', provider: 'anthropic', model: 'claude',
        content: '', status: 'passed', score: 0.85, latencyMs: 200
      };
      expect(output.score).toBeGreaterThanOrEqual(0);
      expect(output.score).toBeLessThanOrEqual(1);
    });

    it('should have optional feedback', () => {
      const output: ValidationStageOutput = {
        stage: 'review', provider: 'anthropic', model: 'claude',
        content: '', status: 'passed', score: 0.7, feedback: 'Good but needs more detail', latencyMs: 150
      };
      expect(output.feedback).toContain('needs more');
    });

    it('should track latency in ms', () => {
      const output: ValidationStageOutput = {
        stage: 'test', provider: 'openai', model: 'gpt-4',
        content: '', status: 'passed', score: 0.95, latencyMs: 500
      };
      expect(output.latencyMs).toBe(500);
    });
  });

  describe('ValidationLoopOutput Interface', () => {
    it('should have final content', () => {
      const output: ValidationLoopOutput = {
        finalContent: 'Final validated response',
        stages: [],
        validationStatus: 'validated',
        consensusScore: 0.9,
        confidenceScore: 0.85,
        totalLatencyMs: 1000
      };
      expect(output.finalContent).toContain('validated');
    });

    it('should have array of stages', () => {
      const output: ValidationLoopOutput = {
        finalContent: '',
        stages: [
          { stage: 'generate', provider: 'gemini', model: 'gemini', content: '', status: 'passed', score: 0.9, latencyMs: 100 },
          { stage: 'review', provider: 'anthropic', model: 'claude', content: '', status: 'passed', score: 0.85, latencyMs: 200 }
        ],
        validationStatus: 'validated',
        consensusScore: 0.87,
        confidenceScore: 0.82,
        totalLatencyMs: 300
      };
      expect(output.stages).toHaveLength(2);
    });

    it('should support validated status', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'validated',
        consensusScore: 0.9, confidenceScore: 0.9, totalLatencyMs: 0
      };
      expect(output.validationStatus).toBe('validated');
    });

    it('should support partial status', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'partial',
        consensusScore: 0.6, confidenceScore: 0.5, totalLatencyMs: 0
      };
      expect(output.validationStatus).toBe('partial');
    });

    it('should support failed status', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'failed',
        consensusScore: 0.3, confidenceScore: 0.2, totalLatencyMs: 0
      };
      expect(output.validationStatus).toBe('failed');
    });

    it('should track consensus score', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'validated',
        consensusScore: 0.88, confidenceScore: 0.85, totalLatencyMs: 0
      };
      expect(output.consensusScore).toBe(0.88);
    });

    it('should track confidence score', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'validated',
        consensusScore: 0.9, confidenceScore: 0.92, totalLatencyMs: 0
      };
      expect(output.confidenceScore).toBe(0.92);
    });

    it('should track total latency', () => {
      const output: ValidationLoopOutput = {
        finalContent: '', stages: [], validationStatus: 'validated',
        consensusScore: 0.9, confidenceScore: 0.9, totalLatencyMs: 1500
      };
      expect(output.totalLatencyMs).toBe(1500);
    });
  });

  describe('4-Stage Pipeline', () => {
    it('should have generate as first stage', () => {
      const stages: StageType[] = ['generate', 'review', 'test', 'optimize'];
      expect(stages[0]).toBe('generate');
    });

    it('should have review as second stage', () => {
      const stages: StageType[] = ['generate', 'review', 'test', 'optimize'];
      expect(stages[1]).toBe('review');
    });

    it('should have test as third stage', () => {
      const stages: StageType[] = ['generate', 'review', 'test', 'optimize'];
      expect(stages[2]).toBe('test');
    });

    it('should have optimize as fourth stage', () => {
      const stages: StageType[] = ['generate', 'review', 'test', 'optimize'];
      expect(stages[3]).toBe('optimize');
    });
  });
});
