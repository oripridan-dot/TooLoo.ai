/**
 * Visual Validator Tests
 *
 * Tests for the imagination/validator module which validates
 * visual artifacts before rendering to users
 *
 * @version 3.3.510
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VisualValidator, type ValidationResult } from '../../../../src/cortex/imagination/validator.js';

describe('VisualValidator', () => {
  let validator: VisualValidator;

  beforeEach(() => {
    validator = new VisualValidator();
  });

  describe('Instantiation', () => {
    it('should create a new validator instance', () => {
      expect(validator).toBeDefined();
      expect(validator).toBeInstanceOf(VisualValidator);
    });

    it('should have validate method', () => {
      expect(typeof validator.validate).toBe('function');
    });
  });

  describe('Diagram Validation', () => {
    it('should validate valid flowchart diagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'flowchart TD\n  A[Start] --> B[End]',
      });
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
      expect(result.issues).toHaveLength(0);
    });

    it('should validate valid graph diagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'graph LR\n  A --> B --> C',
      });
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should validate sequenceDiagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'sequenceDiagram\n  Alice->>Bob: Hello',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate classDiagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'classDiagram\n  Animal <|-- Dog',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate stateDiagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'stateDiagram-v2\n  [*] --> Active',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate erDiagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate gantt chart', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'gantt\n  title Project\n  section Phase 1\n  Task 1 :a1, 2024-01-01, 30d',
      });
      expect(result.isValid).toBe(true);
    });

    it('should validate pie chart', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'pie title Pets\n  "Dogs" : 386\n  "Cats" : 85',
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty diagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toContain('Empty diagram code');
    });

    it('should reject whitespace-only diagram', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: '   \n  \t  ',
      });
      expect(result.isValid).toBe(false);
    });

    it('should flag invalid mermaid start keyword', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'invalid\n  A --> B',
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes('valid Mermaid keyword'))).toBe(true);
    });

    it('should provide suggestion for invalid diagrams', async () => {
      const result = await validator.validate({
        type: 'diagram',
        data: 'bad diagram code',
      });
      expect(result.suggestion).toBeDefined();
    });
  });

  describe('Component Validation', () => {
    it('should validate valid component JSON', async () => {
      const result = await validator.validate({
        type: 'component',
        data: JSON.stringify({
          type: 'Button',
          props: { label: 'Click me', onClick: 'handleClick' },
        }),
      });
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
    });

    it('should reject component without type', async () => {
      const result = await validator.validate({
        type: 'component',
        data: JSON.stringify({
          props: { label: 'Test' },
        }),
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain("Missing 'type' field");
    });

    it('should reject component without props', async () => {
      const result = await validator.validate({
        type: 'component',
        data: JSON.stringify({
          type: 'Button',
        }),
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain("Missing 'props' field");
    });

    it('should flag dangerouslySetInnerHTML usage', async () => {
      const result = await validator.validate({
        type: 'component',
        data: JSON.stringify({
          type: 'div',
          props: { dangerouslySetInnerHTML: { __html: '<script>alert("xss")</script>' } },
        }),
      });
      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes('dangerouslySetInnerHTML'))).toBe(true);
    });

    it('should reject invalid JSON', async () => {
      const result = await validator.validate({
        type: 'component',
        data: 'not valid json {',
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid JSON format for component definition');
    });
  });

  describe('Image Validation', () => {
    it('should validate valid base64 image data', async () => {
      // Generate a fake base64 string of sufficient length
      const fakeBase64 = 'data:image/png;base64,' + 'A'.repeat(200);
      const result = await validator.validate({
        type: 'image',
        data: fakeBase64,
      });
      expect(result.isValid).toBe(true);
    });

    it('should reject empty image data', async () => {
      const result = await validator.validate({
        type: 'image',
        data: '',
      });
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Image data is too small or empty');
    });

    it('should reject very short image data', async () => {
      const result = await validator.validate({
        type: 'image',
        data: 'short',
      });
      expect(result.isValid).toBe(false);
    });
  });

  describe('Unknown Types', () => {
    it('should pass validation for unknown types', async () => {
      const result = await validator.validate({
        type: 'unknown' as any,
        data: 'anything',
      });
      expect(result.isValid).toBe(true);
      expect(result.score).toBe(1);
    });
  });

  describe('ValidationResult Structure', () => {
    it('should have isValid boolean', async () => {
      const result = await validator.validate({ type: 'diagram', data: 'graph TD\nA-->B' });
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should have score between 0 and 1', async () => {
      const result = await validator.validate({ type: 'diagram', data: 'graph TD\nA-->B' });
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should have issues array', async () => {
      const result = await validator.validate({ type: 'diagram', data: 'graph TD\nA-->B' });
      expect(result.issues).toBeInstanceOf(Array);
    });
  });
});

describe('ValidationResult Interface', () => {
  it('should define required fields', () => {
    const result: ValidationResult = {
      isValid: true,
      score: 1,
      issues: [],
    };
    expect(result).toBeDefined();
  });

  it('should support optional suggestion field', () => {
    const result: ValidationResult = {
      isValid: false,
      score: 0.5,
      issues: ['Some issue'],
      suggestion: 'Fix it this way',
    };
    expect(result.suggestion).toBe('Fix it this way');
  });
});
