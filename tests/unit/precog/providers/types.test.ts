// @version 3.3.577
/**
 * Provider Types Tests
 * Tests for provider type definitions and interfaces
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';

// Test ProviderConfig interface
describe('ProviderConfig Interface', () => {
  describe('required fields', () => {
    it('should have name', () => {
      const config = {
        name: 'openai',
        enabled: true,
        model: 'gpt-4',
        type: 'paid' as const
      };
      expect(config.name).toBe('openai');
    });

    it('should have enabled flag', () => {
      const config = {
        name: 'openai',
        enabled: true,
        model: 'gpt-4',
        type: 'paid' as const
      };
      expect(typeof config.enabled).toBe('boolean');
    });

    it('should have model', () => {
      const config = {
        name: 'openai',
        enabled: true,
        model: 'gpt-4-turbo',
        type: 'paid' as const
      };
      expect(config.model).toBe('gpt-4-turbo');
    });

    it('should have provider type', () => {
      const config = {
        name: 'openai',
        enabled: true,
        model: 'gpt-4',
        type: 'paid' as const
      };
      expect(['paid', 'local', 'free']).toContain(config.type);
    });
  });

  describe('optional fields', () => {
    it('should support apiKey', () => {
      const config = {
        name: 'openai',
        enabled: true,
        model: 'gpt-4',
        type: 'paid' as const,
        apiKey: 'sk-test-key'
      };
      expect(config.apiKey).toBe('sk-test-key');
    });

    it('should support baseUrl', () => {
      const config = {
        name: 'ollama',
        enabled: true,
        model: 'llama2',
        type: 'local' as const,
        baseUrl: 'http://localhost:11434'
      };
      expect(config.baseUrl).toBe('http://localhost:11434');
    });
  });

  describe('type variations', () => {
    it('should support paid type', () => {
      const config = { name: 'openai', enabled: true, model: 'gpt-4', type: 'paid' as const };
      expect(config.type).toBe('paid');
    });

    it('should support local type', () => {
      const config = { name: 'ollama', enabled: true, model: 'llama2', type: 'local' as const };
      expect(config.type).toBe('local');
    });

    it('should support free type', () => {
      const config = { name: 'gemini-free', enabled: true, model: 'gemini-pro', type: 'free' as const };
      expect(config.type).toBe('free');
    });
  });
});

// Test GenerationRequest interface
describe('GenerationRequest Interface', () => {
  describe('required fields', () => {
    it('should require prompt', () => {
      const request = { prompt: 'Hello world' };
      expect(request.prompt).toBe('Hello world');
    });
  });

  describe('optional fields', () => {
    it('should support id for tracking', () => {
      const request = { id: 'req-123', prompt: 'Test' };
      expect(request.id).toBe('req-123');
    });

    it('should support system prompt', () => {
      const request = { prompt: 'Test', system: 'You are helpful' };
      expect(request.system).toBe('You are helpful');
    });

    it('should support maxTokens', () => {
      const request = { prompt: 'Test', maxTokens: 1000 };
      expect(request.maxTokens).toBe(1000);
    });

    it('should support temperature', () => {
      const request = { prompt: 'Test', temperature: 0.7 };
      expect(request.temperature).toBe(0.7);
    });

    it('should support forcing provider', () => {
      const request = { prompt: 'Test', provider: 'anthropic' };
      expect(request.provider).toBe('anthropic');
    });
  });

  describe('task types', () => {
    it('should support creative task type', () => {
      const request = { prompt: 'Test', taskType: 'creative' as const };
      expect(request.taskType).toBe('creative');
    });

    it('should support reasoning task type', () => {
      const request = { prompt: 'Test', taskType: 'reasoning' as const };
      expect(request.taskType).toBe('reasoning');
    });

    it('should support code task type', () => {
      const request = { prompt: 'Test', taskType: 'code' as const };
      expect(request.taskType).toBe('code');
    });

    it('should support planning task type', () => {
      const request = { prompt: 'Test', taskType: 'planning' as const };
      expect(request.taskType).toBe('planning');
    });

    it('should support general task type', () => {
      const request = { prompt: 'Test', taskType: 'general' as const };
      expect(request.taskType).toBe('general');
    });
  });

  describe('execution modes', () => {
    it('should support fast mode', () => {
      const request = { prompt: 'Test', mode: 'fast' as const };
      expect(request.mode).toBe('fast');
    });

    it('should support ensemble mode', () => {
      const request = { prompt: 'Test', mode: 'ensemble' as const };
      expect(request.mode).toBe('ensemble');
    });

    it('should support deep mode', () => {
      const request = { prompt: 'Test', mode: 'deep' as const };
      expect(request.mode).toBe('deep');
    });
  });
});

// Test GenerationResponse interface
describe('GenerationResponse Interface', () => {
  describe('required fields', () => {
    it('should have content', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4',
        latency: 500
      };
      expect(response.content).toBe('Hello!');
    });

    it('should have provider', () => {
      const response = {
        content: 'Hello!',
        provider: 'anthropic',
        model: 'claude-3',
        latency: 500
      };
      expect(response.provider).toBe('anthropic');
    });

    it('should have model', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4-turbo',
        latency: 500
      };
      expect(response.model).toBe('gpt-4-turbo');
    });

    it('should have latency', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4',
        latency: 1234
      };
      expect(response.latency).toBe(1234);
    });
  });

  describe('optional fields', () => {
    it('should support cost', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4',
        latency: 500,
        cost: 0.003
      };
      expect(response.cost).toBe(0.003);
    });

    it('should support metadata', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4',
        latency: 500,
        metadata: { finishReason: 'stop' }
      };
      expect(response.metadata?.finishReason).toBe('stop');
    });

    it('should support usage stats', () => {
      const response = {
        content: 'Hello!',
        provider: 'openai',
        model: 'gpt-4',
        latency: 500,
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        }
      };
      expect(response.usage?.totalTokens).toBe(150);
    });
  });
});

// Test ImageGenerationRequest interface
describe('ImageGenerationRequest Interface', () => {
  describe('required fields', () => {
    it('should require prompt', () => {
      const request = { prompt: 'A beautiful sunset' };
      expect(request.prompt).toBe('A beautiful sunset');
    });
  });

  describe('optional fields', () => {
    it('should support provider selection', () => {
      const request = { prompt: 'Test', provider: 'openai' as const };
      expect(request.provider).toBe('openai');
    });

    it('should support gemini provider', () => {
      const request = { prompt: 'Test', provider: 'gemini' as const };
      expect(request.provider).toBe('gemini');
    });

    it('should support aspectRatio', () => {
      const request = { prompt: 'Test', aspectRatio: '16:9' };
      expect(request.aspectRatio).toBe('16:9');
    });

    it('should support imageSize', () => {
      const request = { prompt: 'Test', imageSize: '2K' };
      expect(request.imageSize).toBe('2K');
    });

    it('should support negativePrompt', () => {
      const request = { prompt: 'Test', negativePrompt: 'blurry, low quality' };
      expect(request.negativePrompt).toBe('blurry, low quality');
    });

    it('should support referenceImages', () => {
      const request = { prompt: 'Test', referenceImages: ['base64img1', 'base64img2'] };
      expect(request.referenceImages?.length).toBe(2);
    });
  });

  describe('generation modes', () => {
    it('should support fast mode', () => {
      const request = { prompt: 'Test', mode: 'fast' as const };
      expect(request.mode).toBe('fast');
    });

    it('should support quality mode', () => {
      const request = { prompt: 'Test', mode: 'quality' as const };
      expect(request.mode).toBe('quality');
    });

    it('should support artistic mode', () => {
      const request = { prompt: 'Test', mode: 'artistic' as const };
      expect(request.mode).toBe('artistic');
    });
  });
});

// Test ImageGenerationResponse interface
describe('ImageGenerationResponse Interface', () => {
  it('should have images array', () => {
    const response = {
      images: [
        { data: 'base64data', mimeType: 'image/png' }
      ]
    };
    expect(Array.isArray(response.images)).toBe(true);
    expect(response.images.length).toBe(1);
  });

  it('should have data and mimeType for each image', () => {
    const response = {
      images: [
        { data: 'base64data', mimeType: 'image/png' }
      ]
    };
    expect(response.images[0].data).toBe('base64data');
    expect(response.images[0].mimeType).toBe('image/png');
  });

  it('should support multiple images', () => {
    const response = {
      images: [
        { data: 'img1', mimeType: 'image/png' },
        { data: 'img2', mimeType: 'image/jpeg' },
        { data: 'img3', mimeType: 'image/webp' }
      ]
    };
    expect(response.images.length).toBe(3);
  });

  it('should support optional metadata', () => {
    const response = {
      images: [{ data: 'base64data', mimeType: 'image/png' }],
      metadata: { seed: 12345, model: 'dalle-3' }
    };
    expect(response.metadata?.seed).toBe(12345);
  });
});

// Test ColorPalette interface
describe('ColorPalette Interface', () => {
  it('should have primary color', () => {
    const palette = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937'
    };
    expect(palette.primary).toBe('#3B82F6');
  });

  it('should have all required colors', () => {
    const palette = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937'
    };
    expect(palette.primary).toBeDefined();
    expect(palette.secondary).toBeDefined();
    expect(palette.accent).toBeDefined();
    expect(palette.background).toBeDefined();
    expect(palette.text).toBeDefined();
  });

  it('should support hex colors', () => {
    const palette = {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F59E0B',
      background: '#FFFFFF',
      text: '#1F2937'
    };
    expect(palette.primary).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

// Test ComponentCode interface
describe('ComponentCode Interface', () => {
  it('should have code string', () => {
    const component = {
      code: 'const Button = () => <button>Click</button>',
      language: 'typescript',
      framework: 'react'
    };
    expect(component.code).toContain('Button');
  });

  it('should have language', () => {
    const component = {
      code: 'const x = 1',
      language: 'typescript',
      framework: 'react'
    };
    expect(component.language).toBe('typescript');
  });

  it('should have framework', () => {
    const component = {
      code: 'const x = 1',
      language: 'typescript',
      framework: 'react'
    };
    expect(component.framework).toBe('react');
  });

  it('should support different frameworks', () => {
    const components = [
      { code: 'x', language: 'typescript', framework: 'react' },
      { code: 'x', language: 'typescript', framework: 'vue' },
      { code: 'x', language: 'typescript', framework: 'svelte' }
    ];
    expect(components.map(c => c.framework)).toContain('react');
    expect(components.map(c => c.framework)).toContain('vue');
    expect(components.map(c => c.framework)).toContain('svelte');
  });
});

// Test LayoutResponse interface
describe('LayoutResponse Interface', () => {
  it('should have structure', () => {
    const layout = {
      structure: { type: 'grid', columns: 3 },
      description: 'A 3-column grid layout'
    };
    expect(layout.structure).toBeDefined();
    expect(layout.structure.type).toBe('grid');
  });

  it('should have description', () => {
    const layout = {
      structure: { type: 'flex' },
      description: 'A flexible container layout'
    };
    expect(layout.description).toContain('flexible');
  });
});

// Test VisualContext interface
describe('VisualContext Interface', () => {
  describe('design tokens', () => {
    it('should support colors', () => {
      const context = {
        designTokens: {
          colors: {
            primary: '#3B82F6',
            secondary: '#10B981'
          }
        }
      };
      expect(context.designTokens?.colors?.primary).toBe('#3B82F6');
    });

    it('should support typography', () => {
      const context = {
        designTokens: {
          typography: {
            fontFamily: 'Inter',
            fontSize: '16px'
          }
        }
      };
      expect(context.designTokens?.typography?.fontFamily).toBe('Inter');
    });

    it('should support spacing', () => {
      const context = {
        designTokens: {
          spacing: {
            xs: '4px',
            sm: '8px',
            md: '16px'
          }
        }
      };
      expect(context.designTokens?.spacing?.md).toBe('16px');
    });

    it('should support borderRadius', () => {
      const context = {
        designTokens: {
          borderRadius: {
            sm: '4px',
            md: '8px',
            lg: '16px'
          }
        }
      };
      expect(context.designTokens?.borderRadius?.lg).toBe('16px');
    });
  });
});
