/**
 * @tooloo/skills - Registry Tests
 * Unit tests for the SkillRegistry
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillRegistry, defineSkill } from '../src/index.js';
import type { SkillDefinition } from '../src/types.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

function createTestSkill(overrides: Partial<SkillDefinition> = {}): SkillDefinition {
  return defineSkill({
    id: 'test-skill',
    name: 'Test Skill',
    version: '1.0.0',
    description: 'A test skill',
    instructions: 'Do something useful',
    tools: [],
    triggers: {
      intents: ['code'],
      keywords: ['test', 'example'],
    },
    context: {
      maxTokens: 8000,
      ragSources: ['codebase'],
      memoryScope: 'session',
    },
    composability: {
      requires: [],
      enhances: [],
      conflicts: [],
    },
    ...overrides,
  });
}

// =============================================================================
// SKILL REGISTRY TESTS
// =============================================================================

describe('SkillRegistry', () => {
  let registry: SkillRegistry;

  beforeEach(() => {
    registry = new SkillRegistry();
  });

  describe('register', () => {
    it('should register a valid skill', () => {
      const skill = createTestSkill();
      
      registry.register(skill);
      
      const retrieved = registry.get('test-skill');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Skill');
    });

    it('should reject invalid skill definitions', () => {
      const invalidSkill = {
        id: 'invalid',
        name: 'Invalid',
        // Missing required fields
      };

      expect(() => {
        registry.register(invalidSkill as SkillDefinition);
      }).toThrow();
    });

    it('should overwrite existing skill with same id', () => {
      const skill1 = createTestSkill({ name: 'Version 1' });
      const skill2 = createTestSkill({ name: 'Version 2' });

      registry.register(skill1);
      registry.register(skill2);

      const retrieved = registry.get('test-skill');
      expect(retrieved?.name).toBe('Version 2');
    });
  });

  describe('unregister', () => {
    it('should unregister an existing skill', () => {
      const skill = createTestSkill();
      registry.register(skill);

      const result = registry.unregister('test-skill');

      expect(result).toBe(true);
      expect(registry.get('test-skill')).toBeUndefined();
    });

    it('should return false for non-existent skill', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent skill', () => {
      const skill = registry.get('non-existent');
      expect(skill).toBeUndefined();
    });

    it('should return skill definition for existing skill', () => {
      const skill = createTestSkill();
      registry.register(skill);

      const retrieved = registry.get('test-skill');
      expect(retrieved).toEqual(skill);
    });
  });

  describe('getAll', () => {
    it('should return empty array when no skills registered', () => {
      const skills = registry.getAll();
      expect(skills).toEqual([]);
    });

    it('should return all registered skills', () => {
      const skill1 = createTestSkill({ id: 'skill-1', name: 'Skill One' });
      const skill2 = createTestSkill({ id: 'skill-2', name: 'Skill Two' });

      registry.register(skill1);
      registry.register(skill2);

      const skills = registry.getAll();
      expect(skills).toHaveLength(2);
      expect(skills.map(s => s.id)).toContain('skill-1');
      expect(skills.map(s => s.id)).toContain('skill-2');
    });
  });

  describe('findByIntent', () => {
    it('should find skills by intent type via matchSkills', () => {
      const codeSkill = createTestSkill({
        id: 'code-skill',
        triggers: { intents: ['code'], keywords: [] },
      });
      const analyzeSkill = createTestSkill({
        id: 'analyze-skill',
        triggers: { intents: ['analyze'], keywords: [] },
      });

      registry.register(codeSkill);
      registry.register(analyzeSkill);

      const matches = registry.matchSkills(
        { type: 'code', confidence: 0.9, keywords: [] },
        'write code'
      );
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0]?.skill.id).toBe('code-skill');
    });
  });

  describe('matchSkills', () => {
    it('should return matches sorted by score', () => {
      const skill1 = createTestSkill({
        id: 'skill-1',
        triggers: { intents: ['code'], keywords: ['typescript'] },
      });
      const skill2 = createTestSkill({
        id: 'skill-2',
        triggers: { intents: ['code'], keywords: ['javascript', 'typescript', 'react'] },
      });

      registry.register(skill1);
      registry.register(skill2);

      const matches = registry.matchSkills(
        { type: 'code', confidence: 0.9, keywords: ['typescript', 'react'] },
        'write typescript react code'
      );
      
      expect(matches.length).toBeGreaterThanOrEqual(1);
      // Matches should be sorted by score (descending)
      if (matches.length > 1) {
        const firstScore = matches[0]?.score ?? 0;
        const secondScore = matches[1]?.score ?? 0;
        expect(firstScore).toBeGreaterThanOrEqual(secondScore);
      }
    });

    it('should respect minScore option', () => {
      const skill = createTestSkill({
        triggers: { intents: ['design'], keywords: ['ui'] },
      });
      registry.register(skill);

      const matches = registry.matchSkills(
        { type: 'code', confidence: 0.9, keywords: [] },
        'write code',
        { minScore: 0.9 }
      );
      
      expect(matches).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('should disable a skill', () => {
      const skill = createTestSkill();
      registry.register(skill);

      const result = registry.setEnabled('test-skill', false);
      
      expect(result).toBe(true);
      // Disabled skills should not appear in getAll
      const all = registry.getAll();
      expect(all.find(s => s.id === 'test-skill')).toBeUndefined();
    });

    it('should re-enable a disabled skill', () => {
      const skill = createTestSkill();
      registry.register(skill);
      registry.setEnabled('test-skill', false);

      const result = registry.setEnabled('test-skill', true);
      
      expect(result).toBe(true);
      const all = registry.getAll();
      expect(all.find(s => s.id === 'test-skill')).toBeDefined();
    });

    it('should return false for non-existent skill', () => {
      const result = registry.setEnabled('non-existent', false);
      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// DEFINE SKILL TESTS
// =============================================================================

describe('defineSkill', () => {
  it('should create a valid skill definition', () => {
    const skill = defineSkill({
      id: 'my-skill',
      name: 'My Skill',
      version: '1.0.0',
      description: 'Does something',
      instructions: 'Be helpful',
      tools: [],
      triggers: {
        intents: ['code'],
        keywords: ['help'],
      },
      context: {
        maxTokens: 4096,
        ragSources: ['docs'],
        memoryScope: 'session',
      },
      composability: {
        requires: [],
        enhances: [],
        conflicts: [],
      },
    });

    expect(skill.id).toBe('my-skill');
    expect(skill.name).toBe('My Skill');
  });

  it('should provide defaults for optional fields', () => {
    const skill = defineSkill({
      name: 'Minimal Skill',
      instructions: 'Do something',
    });

    // Should have generated an ID from name
    expect(skill.id).toBe('minimal-skill');
    // Should have default version
    expect(skill.version).toBe('1.0.0');
    // Should have default triggers
    expect(skill.triggers.intents).toContain('unknown');
    // Should have default context
    expect(skill.context.maxTokens).toBe(32000);
  });

  it('should generate ID from name if not provided', () => {
    const skill = defineSkill({
      name: 'My Cool Skill',
      instructions: 'Do cool things',
    });

    expect(skill.id).toBe('my-cool-skill');
  });
});
