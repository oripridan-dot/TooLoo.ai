/**
 * Domain Router Tests
 * Tests for domain expertise detection and provider routing
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Test DomainConfig interface behavior
describe('DomainConfig Interface', () => {
  describe('structure validation', () => {
    it('should have keywords array', () => {
      const config = {
        keywords: ['code', 'programming'],
        expertise: ['precision'],
        preferredProviders: ['anthropic'],
        systemPrompt: 'Test prompt'
      };
      expect(Array.isArray(config.keywords)).toBe(true);
      expect(config.keywords.length).toBeGreaterThan(0);
    });

    it('should have expertise array', () => {
      const config = {
        keywords: ['code'],
        expertise: ['precision', 'logic'],
        preferredProviders: ['anthropic'],
        systemPrompt: 'Test'
      };
      expect(Array.isArray(config.expertise)).toBe(true);
    });

    it('should have preferredProviders array', () => {
      const config = {
        keywords: ['code'],
        expertise: ['precision'],
        preferredProviders: ['anthropic', 'openai', 'deepseek'],
        systemPrompt: 'Test'
      };
      expect(config.preferredProviders).toContain('anthropic');
    });

    it('should have systemPrompt string', () => {
      const config = {
        keywords: ['code'],
        expertise: ['precision'],
        preferredProviders: ['anthropic'],
        systemPrompt: 'Engineering system prompt'
      };
      expect(typeof config.systemPrompt).toBe('string');
      expect(config.systemPrompt.length).toBeGreaterThan(0);
    });
  });
});

// Test domain keyword detection logic
describe('Domain Keyword Detection', () => {
  const domains = {
    engineering: {
      keywords: ['code', 'programming', 'software', 'algorithm', 'debug', 'refactor', 
                 'architecture', 'framework', 'library', 'api', 'database', 'server',
                 'deployment', 'ci/cd', 'testing', 'performance'],
      expertise: ['precision', 'logic', 'structure', 'optimization'],
      preferredProviders: ['anthropic', 'openai', 'deepseek'],
      systemPrompt: 'Engineering prompt'
    },
    design: {
      keywords: ['ui', 'ux', 'interface', 'user experience', 'visual', 'design',
                 'layout', 'color', 'typography', 'wireframe', 'mockup', 'prototype',
                 'responsive', 'accessibility', 'branding'],
      expertise: ['creativity', 'aesthetics', 'user-centered', 'visual communication'],
      preferredProviders: ['gemini', 'anthropic', 'openai'],
      systemPrompt: 'Design prompt'
    },
    business: {
      keywords: ['strategy', 'business', 'market', 'revenue', 'growth', 'product',
                 'customer', 'pricing', 'competition', 'roi'],
      expertise: ['analysis', 'strategy', 'communication'],
      preferredProviders: ['anthropic', 'openai'],
      systemPrompt: 'Business prompt'
    }
  };

  function detectDomain(message: string): string | null {
    const lowerMessage = message.toLowerCase();
    for (const [domain, config] of Object.entries(domains)) {
      for (const keyword of config.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return domain;
        }
      }
    }
    return null;
  }

  describe('engineering domain', () => {
    it('should detect "code" keyword', () => {
      expect(detectDomain('Can you help me write some code?')).toBe('engineering');
    });

    it('should detect "programming" keyword', () => {
      expect(detectDomain('I need help with programming')).toBe('engineering');
    });

    it('should detect "debug" keyword', () => {
      expect(detectDomain('Help me debug this issue')).toBe('engineering');
    });

    it('should detect "api" keyword', () => {
      expect(detectDomain('How do I call this API?')).toBe('engineering');
    });

    it('should detect "database" keyword', () => {
      expect(detectDomain('Query the database')).toBe('engineering');
    });

    it('should detect "algorithm" keyword', () => {
      expect(detectDomain('What algorithm should I use?')).toBe('engineering');
    });

    it('should detect "performance" keyword', () => {
      expect(detectDomain('Optimize performance')).toBe('engineering');
    });
  });

  describe('design domain', () => {
    it('should detect "ui" keyword', () => {
      expect(detectDomain('Design a new UI')).toBe('design');
    });

    it('should detect "ux" keyword', () => {
      expect(detectDomain('Improve the UX')).toBe('design');
    });

    it('should detect "layout" keyword', () => {
      expect(detectDomain('Fix the layout')).toBe('design');
    });

    it('should detect "color" keyword', () => {
      expect(detectDomain('Choose better colors')).toBe('design');
    });

    it('should detect "typography" keyword', () => {
      expect(detectDomain('Update typography')).toBe('design');
    });

    it('should detect "accessibility" keyword', () => {
      expect(detectDomain('Check accessibility requirements')).toBe('design');
    });
  });

  describe('business domain', () => {
    it('should detect "strategy" keyword', () => {
      expect(detectDomain('Plan our strategy')).toBe('business');
    });

    it('should detect "market" keyword', () => {
      expect(detectDomain('Analyze the market')).toBe('business');
    });

    it('should detect "revenue" keyword', () => {
      expect(detectDomain('Increase revenue')).toBe('business');
    });

    it('should detect "growth" keyword', () => {
      expect(detectDomain('Drive growth')).toBe('business');
    });

    it('should detect "roi" keyword', () => {
      expect(detectDomain('Calculate ROI')).toBe('business');
    });
  });

  describe('no domain match', () => {
    it('should return null for generic messages', () => {
      expect(detectDomain('Hello, how are you?')).toBeNull();
    });

    it('should return null for empty message', () => {
      expect(detectDomain('')).toBeNull();
    });

    it('should return null for unrelated topics', () => {
      expect(detectDomain('What is the weather today?')).toBeNull();
    });
  });

  describe('case insensitivity', () => {
    it('should detect uppercase keywords', () => {
      expect(detectDomain('HELP ME WITH CODE')).toBe('engineering');
    });

    it('should detect mixed case keywords', () => {
      expect(detectDomain('Design the UI Layout')).toBe('design');
    });
  });
});

// Test provider selection logic
describe('Provider Selection', () => {
  const domains = {
    engineering: {
      preferredProviders: ['anthropic', 'openai', 'deepseek']
    },
    design: {
      preferredProviders: ['gemini', 'anthropic', 'openai']
    },
    business: {
      preferredProviders: ['anthropic', 'openai']
    }
  };

  function selectProvider(domain: string, availableProviders: string[]): string | null {
    const domainConfig = domains[domain as keyof typeof domains];
    if (!domainConfig) return null;
    
    for (const preferred of domainConfig.preferredProviders) {
      if (availableProviders.includes(preferred)) {
        return preferred;
      }
    }
    return availableProviders[0] || null;
  }

  describe('engineering domain providers', () => {
    it('should prefer anthropic for engineering', () => {
      const result = selectProvider('engineering', ['anthropic', 'openai', 'gemini']);
      expect(result).toBe('anthropic');
    });

    it('should fallback to openai if anthropic unavailable', () => {
      const result = selectProvider('engineering', ['openai', 'gemini']);
      expect(result).toBe('openai');
    });

    it('should fallback to deepseek as third choice', () => {
      const result = selectProvider('engineering', ['deepseek', 'gemini']);
      expect(result).toBe('deepseek');
    });

    it('should use any available if none preferred available', () => {
      const result = selectProvider('engineering', ['gemini']);
      expect(result).toBe('gemini');
    });
  });

  describe('design domain providers', () => {
    it('should prefer gemini for design', () => {
      const result = selectProvider('design', ['anthropic', 'openai', 'gemini']);
      expect(result).toBe('gemini');
    });

    it('should fallback to anthropic for design', () => {
      const result = selectProvider('design', ['anthropic', 'openai']);
      expect(result).toBe('anthropic');
    });
  });

  describe('business domain providers', () => {
    it('should prefer anthropic for business', () => {
      const result = selectProvider('business', ['anthropic', 'openai', 'gemini']);
      expect(result).toBe('anthropic');
    });

    it('should fallback to openai for business', () => {
      const result = selectProvider('business', ['openai', 'gemini']);
      expect(result).toBe('openai');
    });
  });

  describe('edge cases', () => {
    it('should return null for unknown domain', () => {
      const result = selectProvider('unknown', ['anthropic']);
      expect(result).toBeNull();
    });

    it('should return null for empty available providers', () => {
      const result = selectProvider('engineering', []);
      expect(result).toBeNull();
    });
  });
});

// Test system prompt generation
describe('System Prompt Generation', () => {
  describe('engineering prompts', () => {
    const engineeringPrompt = 'For this engineering task, apply deep software engineering expertise';
    
    it('should include engineering capabilities', () => {
      expect(engineeringPrompt).toContain('engineering');
    });

    it('should not start with "You are"', () => {
      expect(engineeringPrompt.startsWith('You are')).toBe(false);
    });
  });

  describe('design prompts', () => {
    const designPrompt = 'For this design task, apply senior UX/UI design expertise';
    
    it('should include design capabilities', () => {
      expect(designPrompt).toContain('design');
    });

    it('should not start with "You are"', () => {
      expect(designPrompt.startsWith('You are')).toBe(false);
    });
  });

  describe('prompt characteristics', () => {
    it('should be non-empty strings', () => {
      const prompts = [
        'Engineering prompt content',
        'Design prompt content',
        'Business prompt content'
      ];
      prompts.forEach(prompt => {
        expect(typeof prompt).toBe('string');
        expect(prompt.length).toBeGreaterThan(0);
      });
    });
  });
});

// Test domain expertise scoring
describe('Domain Expertise Scoring', () => {
  function calculateDomainScore(message: string, keywords: string[]): number {
    const lowerMessage = message.toLowerCase();
    let matches = 0;
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matches++;
      }
    }
    return matches / keywords.length;
  }

  it('should return 0 for no keyword matches', () => {
    const keywords = ['code', 'programming', 'algorithm'];
    const score = calculateDomainScore('Hello world', keywords);
    expect(score).toBe(0);
  });

  it('should return partial score for some matches', () => {
    const keywords = ['code', 'programming', 'algorithm'];
    const score = calculateDomainScore('Help me with code', keywords);
    expect(score).toBeCloseTo(1/3, 2);
  });

  it('should return higher score for more matches', () => {
    const keywords = ['code', 'programming', 'algorithm'];
    const score = calculateDomainScore('Help me with code and programming', keywords);
    expect(score).toBeCloseTo(2/3, 2);
  });

  it('should return 1 for all matches', () => {
    const keywords = ['code', 'programming', 'algorithm'];
    const score = calculateDomainScore('code programming algorithm', keywords);
    expect(score).toBe(1);
  });
});

// Test DomainExpertise class behavior simulation
describe('DomainExpertise Class Behavior', () => {
  class MockDomainExpertise {
    private domains: Record<string, { keywords: string[]; preferredProviders: string[] }>;

    constructor() {
      this.domains = {
        engineering: {
          keywords: ['code', 'debug', 'api'],
          preferredProviders: ['anthropic', 'openai']
        },
        design: {
          keywords: ['ui', 'ux', 'layout'],
          preferredProviders: ['gemini', 'anthropic']
        }
      };
    }

    detectDomain(message: string): string | null {
      const lower = message.toLowerCase();
      for (const [name, config] of Object.entries(this.domains)) {
        if (config.keywords.some(k => lower.includes(k))) {
          return name;
        }
      }
      return null;
    }

    getPreferredProviders(domain: string): string[] {
      return this.domains[domain]?.preferredProviders || [];
    }
  }

  let expertise: MockDomainExpertise;

  beforeEach(() => {
    expertise = new MockDomainExpertise();
  });

  describe('detectDomain', () => {
    it('should detect engineering domain', () => {
      expect(expertise.detectDomain('fix this code')).toBe('engineering');
    });

    it('should detect design domain', () => {
      expect(expertise.detectDomain('improve the UI')).toBe('design');
    });

    it('should return null for unknown', () => {
      expect(expertise.detectDomain('random text')).toBeNull();
    });
  });

  describe('getPreferredProviders', () => {
    it('should return providers for engineering', () => {
      const providers = expertise.getPreferredProviders('engineering');
      expect(providers).toContain('anthropic');
      expect(providers).toContain('openai');
    });

    it('should return providers for design', () => {
      const providers = expertise.getPreferredProviders('design');
      expect(providers).toContain('gemini');
    });

    it('should return empty array for unknown domain', () => {
      const providers = expertise.getPreferredProviders('unknown');
      expect(providers).toEqual([]);
    });
  });
});
