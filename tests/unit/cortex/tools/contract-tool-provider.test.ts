/**
 * Contract Tool Provider Tests
 *
 * Tests for the tools/contract-tool-provider module which
 * converts API contracts to OpenAI tool definitions
 *
 * @version 3.3.510
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContractToolProvider, type OpenAITool } from '../../../../src/cortex/tools/contract-tool-provider.js';

describe('ContractToolProvider', () => {
  describe('Static Methods', () => {
    it('should have getTools static method', () => {
      expect(typeof ContractToolProvider.getTools).toBe('function');
    });
  });

  describe('getTools', () => {
    it('should return array of tools', () => {
      const tools = ContractToolProvider.getTools();
      expect(Array.isArray(tools)).toBe(true);
    });

    it('should return tools with correct structure', () => {
      const tools = ContractToolProvider.getTools();
      if (tools.length > 0) {
        const tool = tools[0];
        expect(tool).toHaveProperty('type');
        expect(tool).toHaveProperty('function');
        expect(tool.type).toBe('function');
      }
    });

    it('should have function property with name', () => {
      const tools = ContractToolProvider.getTools();
      if (tools.length > 0) {
        expect(tools[0].function).toHaveProperty('name');
        expect(typeof tools[0].function.name).toBe('string');
      }
    });

    it('should have function property with description', () => {
      const tools = ContractToolProvider.getTools();
      if (tools.length > 0) {
        expect(tools[0].function).toHaveProperty('description');
        expect(typeof tools[0].function.description).toBe('string');
      }
    });

    it('should have function property with parameters', () => {
      const tools = ContractToolProvider.getTools();
      if (tools.length > 0) {
        expect(tools[0].function).toHaveProperty('parameters');
        expect(typeof tools[0].function.parameters).toBe('object');
      }
    });
  });

  describe('Tool Name Generation', () => {
    it('should generate valid tool names', () => {
      const tools = ContractToolProvider.getTools();
      for (const tool of tools) {
        // Name should not contain special characters except underscore
        expect(tool.function.name).toMatch(/^[A-Z_a-z0-9]+$/);
      }
    });

    it('should prefix with HTTP method', () => {
      const tools = ContractToolProvider.getTools();
      const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      for (const tool of tools) {
        const hasHttpPrefix = httpMethods.some(method => tool.function.name.startsWith(method));
        expect(hasHttpPrefix).toBe(true);
      }
    });
  });

  describe('Parameters Schema', () => {
    it('should have type: object for parameters', () => {
      const tools = ContractToolProvider.getTools();
      for (const tool of tools) {
        expect(tool.function.parameters.type).toBe('object');
      }
    });

    it('should have properties object', () => {
      const tools = ContractToolProvider.getTools();
      for (const tool of tools) {
        expect(tool.function.parameters).toHaveProperty('properties');
        expect(typeof tool.function.parameters.properties).toBe('object');
      }
    });

    it('should have required array', () => {
      const tools = ContractToolProvider.getTools();
      for (const tool of tools) {
        expect(tool.function.parameters).toHaveProperty('required');
        expect(Array.isArray(tool.function.parameters.required)).toBe(true);
      }
    });
  });

  describe('OpenAITool Interface', () => {
    it('should validate OpenAITool structure', () => {
      const tool: OpenAITool = {
        type: 'function',
        function: {
          name: 'test_function',
          description: 'A test function',
          parameters: {
            type: 'object',
            properties: {
              param1: { type: 'string', description: 'A parameter' }
            },
            required: ['param1']
          }
        }
      };
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('test_function');
    });
  });

  describe('Type Mapping', () => {
    it('should map common types correctly', () => {
      const tools = ContractToolProvider.getTools();
      for (const tool of tools) {
        const properties = tool.function.parameters.properties;
        for (const [key, value] of Object.entries(properties)) {
          const prop = value as { type: string };
          // Type should be one of JSON Schema types
          expect(['string', 'number', 'boolean', 'array', 'object']).toContain(prop.type);
        }
      }
    });
  });

  describe('Tool Count', () => {
    it('should generate multiple tools from contracts', () => {
      const tools = ContractToolProvider.getTools();
      // Should have at least some tools from the API contracts
      expect(tools.length).toBeGreaterThan(0);
    });
  });
});

describe('ContractToolProvider Integration', () => {
  it('should be importable', async () => {
    const mod = await import('../../../../src/cortex/tools/contract-tool-provider.js');
    expect(mod.ContractToolProvider).toBeDefined();
  });

  it('should export OpenAITool type', async () => {
    // Type exports are compile-time only, module should load
    const mod = await import('../../../../src/cortex/tools/contract-tool-provider.js');
    expect(mod).toBeDefined();
  });
});
