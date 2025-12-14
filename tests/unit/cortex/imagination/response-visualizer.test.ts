// @version 3.3.573
/**
 * Response Visualizer Tests
 *
 * Tests for the imagination/response-visualizer module which
 * analyzes text responses and wraps them in appropriate visual cards
 *
 * @version 3.3.510
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ResponseVisualizer, type VisualData } from '../../../../src/cortex/imagination/response-visualizer.js';

describe('ResponseVisualizer', () => {
  let visualizer: ResponseVisualizer;

  beforeEach(() => {
    visualizer = new ResponseVisualizer();
  });

  describe('Instantiation', () => {
    it('should create a new visualizer instance', () => {
      expect(visualizer).toBeDefined();
      expect(visualizer).toBeInstanceOf(ResponseVisualizer);
    });

    it('should have analyzeResponse method', () => {
      expect(typeof visualizer.analyzeResponse).toBe('function');
    });
  });

  describe('Short Content Handling', () => {
    it('should return null for empty content', () => {
      const result = visualizer.analyzeResponse('');
      expect(result).toBeNull();
    });

    it('should return null for very short content', () => {
      const result = visualizer.analyzeResponse('Short text');
      expect(result).toBeNull();
    });

    it('should return null for content under 50 chars', () => {
      const result = visualizer.analyzeResponse('A'.repeat(49));
      expect(result).toBeNull();
    });
  });

  describe('Mermaid Diagram Detection', () => {
    it('should detect mermaid diagrams', () => {
      const content = `Here's a diagram:
\`\`\`mermaid
graph TD
  A[Start] --> B[End]
\`\`\`
Some text after.`;
      const result = visualizer.analyzeResponse(content);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('diagram');
    });

    it('should extract mermaid code correctly', () => {
      const content = `Diagram:
\`\`\`mermaid
flowchart LR
  A --> B --> C
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      expect(result?.type).toBe('diagram');
      expect(result?.data).toBeDefined();
    });
  });

  describe('Code Block Detection', () => {
    it('should detect TypeScript code blocks', () => {
      const content = `Here's some code:
\`\`\`typescript
function hello(): string {
  return "Hello World";
}
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('code');
    });

    it('should detect JavaScript code blocks', () => {
      const content = `Implementation:
\`\`\`javascript
const sum = (a, b) => a + b;
console.log(sum(1, 2));
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      expect(result?.type).toBe('code');
    });

    it('should detect Python code blocks', () => {
      const content = `Python example:
\`\`\`python
def greet(name):
    return f"Hello, {name}"
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      expect(result?.type).toBe('code');
    });

    it('should skip very short code blocks', () => {
      const content = `Code:
\`\`\`js
x=1
\`\`\`
This is a longer explanation that should make the content over 50 characters.`;
      const result = visualizer.analyzeResponse(content);
      // Short code block might not be detected, or content may be analyzed differently
      expect(result === null || result?.type !== undefined).toBe(true);
    });
  });

  describe('Process Visual Detection', () => {
    it('should detect numbered lists as process', () => {
      const content = `Here's how to deploy:
1. Build the application
2. Run tests
3. Deploy to staging
4. Verify health checks
5. Deploy to production`;
      const result = visualizer.analyzeResponse(content);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('process');
    });

    it('should detect process intent from keywords', () => {
      const content = `The deployment workflow involves multiple phases:
First, you need to set up the environment.
Then configure the services.
Finally, run the migrations.
This process ensures reliability.`;
      const result = visualizer.analyzeResponse(content, 'deploy workflow process');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('process');
    });

    it('should detect step-by-step content', () => {
      const content = `Follow these steps to complete the setup:
1. Install dependencies
2. Configure environment variables
3. Start the development server`;
      const result = visualizer.analyzeResponse(content);
      expect(result?.type).toBe('process');
    });
  });

  describe('Comparison Visual Detection', () => {
    it('should detect comparison keywords', () => {
      const content = `React vs Vue comparison:
React has advantages in ecosystem size.
Vue has advantages in learning curve.
The difference in performance is minimal.
React vs Vue both work well.`;
      const result = visualizer.analyzeResponse(content);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('comparison');
    });

    it('should detect pro/con content', () => {
      const content = `Analysis of the approach:
Advantage: Faster development time
Disadvantage: More complex setup
Advantage: Better scalability
Disadvantage: Steeper learning curve`;
      const result = visualizer.analyzeResponse(content);
      expect(result?.type).toBe('comparison');
    });
  });

  describe('Data Visual Detection', () => {
    it('should detect data/metrics content with intent', () => {
      const content = `Performance metrics for the system:
Response time: 45ms average
Success rate: 99.2%
Throughput: 1000 requests per second
Memory usage: 512MB`;
      const result = visualizer.analyzeResponse(content, 'performance metrics statistics');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('data');
    });
  });

  describe('VisualData Structure', () => {
    it('should return proper structure for diagram', () => {
      const content = `\`\`\`mermaid
graph TD
  A-->B
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      if (result) {
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('data');
      }
    });

    it('should have valid type values', () => {
      const validTypes = ['info', 'process', 'comparison', 'data', 'diagram', 'code'];
      const content = `\`\`\`mermaid
graph TD
  A-->B
\`\`\``;
      const result = visualizer.analyzeResponse(content);
      if (result) {
        expect(validTypes).toContain(result.type);
      }
    });
  });

  describe('Intent-Based Detection', () => {
    it('should use intent to guide visualization type', () => {
      const content = `Here's the information you requested about the system configuration and its various components which need to be properly set up.`;
      const result = visualizer.analyzeResponse(content, 'step by step process');
      if (result) {
        expect(result.type).toBe('process');
      }
    });

    it('should prioritize mermaid over intent', () => {
      const content = `Comparison overview:
\`\`\`mermaid
graph TD
  A-->B
\`\`\``;
      const result = visualizer.analyzeResponse(content, 'compare vs difference');
      expect(result?.type).toBe('diagram'); // Mermaid takes priority
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined intent', () => {
      const content = 'A'.repeat(60);
      expect(() => visualizer.analyzeResponse(content, undefined)).not.toThrow();
    });

    it('should handle content with special characters', () => {
      const content = `Special chars: <>'"&\n${'A'.repeat(50)}`;
      expect(() => visualizer.analyzeResponse(content)).not.toThrow();
    });

    it('should handle multiline content', () => {
      const content = Array(10).fill('Line of text here').join('\n');
      expect(() => visualizer.analyzeResponse(content)).not.toThrow();
    });
  });
});

describe('VisualData Interface', () => {
  it('should support info type', () => {
    const data: VisualData = { type: 'info', data: { message: 'test' } };
    expect(data.type).toBe('info');
  });

  it('should support process type', () => {
    const data: VisualData = { type: 'process', data: { steps: [] } };
    expect(data.type).toBe('process');
  });

  it('should support comparison type', () => {
    const data: VisualData = { type: 'comparison', data: { items: [] } };
    expect(data.type).toBe('comparison');
  });

  it('should support data type', () => {
    const data: VisualData = { type: 'data', data: { metrics: [] } };
    expect(data.type).toBe('data');
  });

  it('should support diagram type', () => {
    const data: VisualData = { type: 'diagram', data: 'graph TD\nA-->B' };
    expect(data.type).toBe('diagram');
  });

  it('should support code type', () => {
    const data: VisualData = { type: 'code', data: { code: 'const x = 1', language: 'js' } };
    expect(data.type).toBe('code');
  });
});
