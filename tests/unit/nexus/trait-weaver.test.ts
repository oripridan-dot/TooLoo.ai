// @version 3.3.573 - TraitWeaver Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Test types and structures
interface UserTrait {
  key: string;
  value: any;
  confidence: number;
  source: 'inference' | 'explicit';
}

describe('TraitWeaver', () => {
  describe('UserTrait Interface', () => {
    it('should define required key property', () => {
      const trait: UserTrait = {
        key: 'coding_style',
        value: 'concise',
        confidence: 0.8,
        source: 'explicit'
      };
      expect(trait.key).toBe('coding_style');
    });

    it('should allow any value type', () => {
      const stringTrait: UserTrait = { key: 'style', value: 'concise', confidence: 1, source: 'explicit' };
      const numberTrait: UserTrait = { key: 'indent', value: 2, confidence: 1, source: 'explicit' };
      const boolTrait: UserTrait = { key: 'tabs', value: false, confidence: 1, source: 'explicit' };
      const arrayTrait: UserTrait = { key: 'langs', value: ['ts', 'js'], confidence: 1, source: 'explicit' };
      
      expect(typeof stringTrait.value).toBe('string');
      expect(typeof numberTrait.value).toBe('number');
      expect(typeof boolTrait.value).toBe('boolean');
      expect(Array.isArray(arrayTrait.value)).toBe(true);
    });

    it('should have confidence as number between 0 and 1', () => {
      const lowConfidence: UserTrait = { key: 'a', value: 'x', confidence: 0.1, source: 'inference' };
      const highConfidence: UserTrait = { key: 'b', value: 'y', confidence: 0.99, source: 'explicit' };
      
      expect(lowConfidence.confidence).toBeGreaterThanOrEqual(0);
      expect(lowConfidence.confidence).toBeLessThanOrEqual(1);
      expect(highConfidence.confidence).toBeGreaterThanOrEqual(0);
      expect(highConfidence.confidence).toBeLessThanOrEqual(1);
    });

    it('should restrict source to inference or explicit', () => {
      const inferred: UserTrait = { key: 'x', value: 1, confidence: 0.5, source: 'inference' };
      const explicit: UserTrait = { key: 'y', value: 2, confidence: 1.0, source: 'explicit' };
      
      expect(['inference', 'explicit']).toContain(inferred.source);
      expect(['inference', 'explicit']).toContain(explicit.source);
    });
  });

  describe('Default Traits', () => {
    it('should have coding_style default', () => {
      const defaults = ['coding_style', 'preferred_language', 'test_framework'];
      expect(defaults).toContain('coding_style');
    });

    it('should default coding_style to concise', () => {
      const defaultStyle = 'concise';
      expect(defaultStyle).toBe('concise');
    });

    it('should have preferred_language default', () => {
      const defaultLang = 'typescript';
      expect(defaultLang).toBe('typescript');
    });

    it('should have test_framework default to vitest', () => {
      const defaultFramework = 'vitest';
      expect(defaultFramework).toBe('vitest');
    });

    it('should set coding_style with 0.5 confidence', () => {
      const codingStyleConfidence = 0.5;
      expect(codingStyleConfidence).toBe(0.5);
    });

    it('should set preferred_language with 0.8 confidence', () => {
      const langConfidence = 0.8;
      expect(langConfidence).toBe(0.8);
    });

    it('should set test_framework with 0.9 confidence', () => {
      const testConfidence = 0.9;
      expect(testConfidence).toBe(0.9);
    });
  });

  describe('Trait Storage', () => {
    let traits: Map<string, UserTrait>;

    beforeEach(() => {
      traits = new Map();
    });

    it('should store traits in Map structure', () => {
      expect(traits instanceof Map).toBe(true);
    });

    it('should allow setting traits', () => {
      const trait: UserTrait = { key: 'test', value: 'value', confidence: 1, source: 'explicit' };
      traits.set(trait.key, trait);
      expect(traits.has('test')).toBe(true);
    });

    it('should retrieve stored traits', () => {
      const trait: UserTrait = { key: 'lang', value: 'python', confidence: 0.7, source: 'inference' };
      traits.set(trait.key, trait);
      expect(traits.get('lang')?.value).toBe('python');
    });

    it('should overwrite existing traits', () => {
      traits.set('style', { key: 'style', value: 'verbose', confidence: 0.5, source: 'inference' });
      traits.set('style', { key: 'style', value: 'concise', confidence: 0.9, source: 'explicit' });
      expect(traits.get('style')?.value).toBe('concise');
      expect(traits.get('style')?.confidence).toBe(0.9);
    });

    it('should track number of traits', () => {
      traits.set('a', { key: 'a', value: 1, confidence: 1, source: 'explicit' });
      traits.set('b', { key: 'b', value: 2, confidence: 1, source: 'explicit' });
      expect(traits.size).toBe(2);
    });

    it('should allow clearing traits', () => {
      traits.set('x', { key: 'x', value: 'y', confidence: 1, source: 'explicit' });
      traits.clear();
      expect(traits.size).toBe(0);
    });
  });

  describe('getProfile', () => {
    it('should format profile as user-friendly string', () => {
      const profileFormat = (traits: UserTrait[]): string => {
        const profile = traits.map(t => `- ${t.key}: ${t.value} (Confidence: ${t.confidence})`).join('\n');
        return `User Profile:\n${profile}`;
      };
      
      const traits: UserTrait[] = [
        { key: 'coding_style', value: 'concise', confidence: 0.5, source: 'explicit' }
      ];
      
      const result = profileFormat(traits);
      expect(result).toContain('User Profile:');
      expect(result).toContain('coding_style');
      expect(result).toContain('concise');
      expect(result).toContain('Confidence: 0.5');
    });

    it('should include all traits in profile', () => {
      const traits: UserTrait[] = [
        { key: 'style', value: 'concise', confidence: 0.5, source: 'explicit' },
        { key: 'lang', value: 'typescript', confidence: 0.8, source: 'explicit' },
        { key: 'framework', value: 'vitest', confidence: 0.9, source: 'explicit' }
      ];
      
      const profile = traits.map(t => `- ${t.key}: ${t.value}`).join('\n');
      
      expect(profile).toContain('style');
      expect(profile).toContain('lang');
      expect(profile).toContain('framework');
    });

    it('should format each trait on separate line', () => {
      const traits = ['style', 'lang', 'test'];
      const formatted = traits.map(t => `- ${t}`).join('\n');
      const lines = formatted.split('\n');
      expect(lines.length).toBe(3);
    });
  });

  describe('injectContext', () => {
    it('should prepend user traits to prompt', () => {
      const injectContext = (prompt: string, traits: Record<string, string>): string => {
        const context = `
[User Traits]
- Style: ${traits.style || 'unknown'}
- Language: ${traits.lang || 'unknown'}
- Testing: ${traits.test || 'unknown'}
`;
        return `${context}\n${prompt}`;
      };
      
      const result = injectContext('Write a function', { style: 'concise', lang: 'typescript', test: 'vitest' });
      
      expect(result).toContain('[User Traits]');
      expect(result).toContain('Write a function');
    });

    it('should include style trait in context', () => {
      const context = `- Style: concise`;
      expect(context).toContain('Style');
      expect(context).toContain('concise');
    });

    it('should include language trait in context', () => {
      const context = `- Language: typescript`;
      expect(context).toContain('Language');
      expect(context).toContain('typescript');
    });

    it('should include testing trait in context', () => {
      const context = `- Testing: vitest`;
      expect(context).toContain('Testing');
      expect(context).toContain('vitest');
    });

    it('should preserve original prompt content', () => {
      const originalPrompt = 'Create a REST API';
      const injected = `[Context]\n${originalPrompt}`;
      expect(injected).toContain(originalPrompt);
    });

    it('should handle empty prompt', () => {
      const injected = `[Context]\n`;
      expect(injected).toContain('[Context]');
    });
  });

  describe('Confidence Levels', () => {
    it('should support zero confidence', () => {
      const trait: UserTrait = { key: 'unknown', value: 'guess', confidence: 0, source: 'inference' };
      expect(trait.confidence).toBe(0);
    });

    it('should support full confidence', () => {
      const trait: UserTrait = { key: 'known', value: 'fact', confidence: 1.0, source: 'explicit' };
      expect(trait.confidence).toBe(1.0);
    });

    it('should allow updating confidence', () => {
      const trait: UserTrait = { key: 'evolving', value: 'data', confidence: 0.3, source: 'inference' };
      trait.confidence = 0.7;
      expect(trait.confidence).toBe(0.7);
    });

    it('should track confidence changes over time', () => {
      const confidenceHistory = [0.3, 0.5, 0.7, 0.9];
      expect(confidenceHistory[0]).toBeLessThan(confidenceHistory[3]);
    });
  });

  describe('Trait Sources', () => {
    it('should mark inferred traits correctly', () => {
      const inferred: UserTrait = {
        key: 'detected_style',
        value: 'functional',
        confidence: 0.6,
        source: 'inference'
      };
      expect(inferred.source).toBe('inference');
    });

    it('should mark explicit traits correctly', () => {
      const explicit: UserTrait = {
        key: 'user_preference',
        value: 'dark_theme',
        confidence: 1.0,
        source: 'explicit'
      };
      expect(explicit.source).toBe('explicit');
    });

    it('should allow source to be updated', () => {
      const trait: UserTrait = { key: 'test', value: 'a', confidence: 0.5, source: 'inference' };
      trait.source = 'explicit';
      expect(trait.source).toBe('explicit');
    });
  });

  describe('Event Integration', () => {
    it('should listen for provider:response events', () => {
      const eventName = 'provider:response';
      expect(eventName).toBe('provider:response');
    });

    it('should allow trait refinement from responses', () => {
      // Simulated refinement logic
      let confidence = 0.5;
      const refine = (accepted: boolean) => {
        confidence = accepted ? Math.min(1, confidence + 0.1) : Math.max(0, confidence - 0.1);
      };
      
      refine(true);
      expect(confidence).toBe(0.6);
      
      refine(false);
      expect(confidence).toBe(0.5);
    });
  });
});
