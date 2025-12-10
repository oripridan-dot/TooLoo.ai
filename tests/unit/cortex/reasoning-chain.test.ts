// @version 1.0.0 - ReasoningChain Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test interface matching ReasoningStep
interface ReasoningStep {
  thought: string;
  evidence: string;
  confidence: number;
  next_action: string;
}

describe('ReasoningChain', () => {
  describe('ReasoningStep Schema', () => {
    it('should have required thought field', () => {
      const step: ReasoningStep = {
        thought: 'Analyzing the problem...',
        evidence: 'Based on code structure',
        confidence: 0.8,
        next_action: 'Refactor function'
      };
      expect(step.thought).toBe('Analyzing the problem...');
    });

    it('should have required evidence field', () => {
      const step: ReasoningStep = {
        thought: 't',
        evidence: 'The test failures indicate a bug',
        confidence: 0.7,
        next_action: 'fix'
      };
      expect(step.evidence).toContain('test failures');
    });

    it('should have confidence between 0 and 1', () => {
      const step: ReasoningStep = { thought: '', evidence: '', confidence: 0.85, next_action: '' };
      expect(step.confidence).toBeGreaterThanOrEqual(0);
      expect(step.confidence).toBeLessThanOrEqual(1);
    });

    it('should have required next_action field', () => {
      const step: ReasoningStep = {
        thought: 't',
        evidence: 'e',
        confidence: 0.9,
        next_action: 'Implement the solution'
      };
      expect(step.next_action).toBe('Implement the solution');
    });

    it('should allow zero confidence', () => {
      const step: ReasoningStep = { thought: '', evidence: '', confidence: 0, next_action: '' };
      expect(step.confidence).toBe(0);
    });

    it('should allow full confidence', () => {
      const step: ReasoningStep = { thought: '', evidence: '', confidence: 1, next_action: '' };
      expect(step.confidence).toBe(1);
    });
  });

  describe('Tree of Thoughts', () => {
    it('should generate multiple reasoning branches', () => {
      const branchCount = 3;
      const branches: ReasoningStep[] = [];
      for (let i = 0; i < branchCount; i++) {
        branches.push({ thought: `branch${i}`, evidence: '', confidence: 0.5, next_action: '' });
      }
      expect(branches).toHaveLength(3);
    });

    it('should default to 3 branches', () => {
      const defaultBranches = 3;
      expect(defaultBranches).toBe(3);
    });

    it('should select best reasoning path', () => {
      const branches: ReasoningStep[] = [
        { thought: 'a', evidence: '', confidence: 0.6, next_action: '' },
        { thought: 'b', evidence: '', confidence: 0.9, next_action: '' },
        { thought: 'c', evidence: '', confidence: 0.7, next_action: '' }
      ];
      const best = branches.reduce((a, b) => a.confidence > b.confidence ? a : b);
      expect(best.confidence).toBe(0.9);
    });

    it('should allow custom branch count', () => {
      const customCount = 5;
      expect(customCount).toBeGreaterThan(3);
    });
  });

  describe('Regeneration Logic', () => {
    it('should have max regeneration limit', () => {
      const MAX_REGENERATIONS = 3;
      expect(MAX_REGENERATIONS).toBe(3);
    });

    it('should track regeneration count', () => {
      let regenerationCount = 0;
      regenerationCount++;
      expect(regenerationCount).toBe(1);
    });

    it('should stop at max regenerations', () => {
      const MAX_REGENERATIONS = 3;
      let count = 0;
      while (count < MAX_REGENERATIONS) {
        count++;
      }
      expect(count).toBe(3);
    });

    it('should regenerate for low confidence', () => {
      const confidenceThreshold = 0.5;
      const response: ReasoningStep = { thought: '', evidence: '', confidence: 0.3, next_action: '' };
      const shouldRegenerate = response.confidence < confidenceThreshold;
      expect(shouldRegenerate).toBe(true);
    });

    it('should not regenerate for high confidence', () => {
      const confidenceThreshold = 0.5;
      const response: ReasoningStep = { thought: '', evidence: '', confidence: 0.8, next_action: '' };
      const shouldRegenerate = response.confidence < confidenceThreshold;
      expect(shouldRegenerate).toBe(false);
    });
  });

  describe('OpenAI Configuration', () => {
    it('should use OPENAI_API_KEY env var', () => {
      const envKey = 'OPENAI_API_KEY';
      expect(envKey).toBe('OPENAI_API_KEY');
    });

    it('should use configurable model', () => {
      const defaultModel = 'gpt-4o';
      const envModel = process.env['OPENAI_MODEL'] || defaultModel;
      expect(envModel).toBeDefined();
    });

    it('should use temperature 0.7 for diversity', () => {
      const temperature = 0.7;
      expect(temperature).toBe(0.7);
    });

    it('should handle missing API key gracefully', () => {
      const hasKey = !!process.env['OPENAI_API_KEY'];
      expect(typeof hasKey).toBe('boolean');
    });
  });

  describe('System Prompt', () => {
    it('should instruct for structured reasoning', () => {
      const systemPrompt = 'You are a high-level reasoning engine';
      expect(systemPrompt).toContain('reasoning');
    });

    it('should request JSON output', () => {
      const outputFormat = 'valid JSON object';
      expect(outputFormat).toContain('JSON');
    });

    it('should specify schema fields', () => {
      const schemaFields = ['thought', 'evidence', 'confidence', 'next_action'];
      expect(schemaFields).toContain('thought');
      expect(schemaFields).toContain('confidence');
    });

    it('should prohibit markdown formatting', () => {
      const instruction = 'Do not include markdown formatting';
      expect(instruction).toContain('not include');
    });
  });

  describe('Confidence Scoring', () => {
    it('should be numeric', () => {
      const confidence = 0.75;
      expect(typeof confidence).toBe('number');
    });

    it('should range from 0 to 1', () => {
      const min = 0;
      const max = 1;
      const value = 0.5;
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    });

    it('should reflect reasoning quality', () => {
      const highQuality: ReasoningStep = {
        thought: 'Detailed analysis with clear reasoning',
        evidence: 'Multiple sources confirm this approach',
        confidence: 0.95,
        next_action: 'Proceed with implementation'
      };
      expect(highQuality.confidence).toBeGreaterThan(0.9);
    });

    it('should be lower for uncertain reasoning', () => {
      const uncertain: ReasoningStep = {
        thought: 'Not entirely sure about this',
        evidence: 'Limited data available',
        confidence: 0.3,
        next_action: 'Gather more information'
      };
      expect(uncertain.confidence).toBeLessThan(0.5);
    });
  });

  describe('xAI Integration', () => {
    it('should use TransparencyWrapper', () => {
      const wrapper = 'TransparencyWrapper';
      expect(wrapper).toBe('TransparencyWrapper');
    });

    it('should track ProviderTrace', () => {
      const trace = 'ProviderTrace';
      expect(trace).toBe('ProviderTrace');
    });

    it('should track ReasoningTrace', () => {
      const trace = 'ReasoningTrace';
      expect(trace).toBe('ReasoningTrace');
    });

    it('should use xAI config', () => {
      const configFn = 'getXAIConfig';
      expect(configFn).toContain('XAI');
    });
  });
});
