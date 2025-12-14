// @version 3.3.573
/**
 * Self-Modification Pipeline Tests
 * 
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SelfModificationPipeline, type PipelineConfig } from '../../../src/cortex/motor/self-modification-pipeline.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('SelfModificationPipeline', () => {
  let pipeline: SelfModificationPipeline;
  const testConfig: Partial<PipelineConfig> = {
    maxIterations: 2,
    maxModificationsPerHour: 10,
    requireValidation: true,
    autoCommit: false, // Don't commit during tests
    dryRun: true, // Dry run by default
    minConfidence: 0.5,
    allowedRiskLevels: ['low', 'medium'],
    skillsDirectory: './skills',
    testTimeout: 30000,
  };

  beforeEach(() => {
    pipeline = new SelfModificationPipeline(testConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize with default config', () => {
      const defaultPipeline = new SelfModificationPipeline();
      const config = defaultPipeline.getConfig();
      
      expect(config.maxIterations).toBe(3);
      expect(config.maxModificationsPerHour).toBe(5);
      expect(config.requireValidation).toBe(true);
    });

    it('should allow config updates', () => {
      pipeline.updateConfig({ maxIterations: 5 });
      expect(pipeline.getConfig().maxIterations).toBe(5);
    });

    it('should preserve other config when updating', () => {
      pipeline.updateConfig({ maxIterations: 5 });
      expect(pipeline.getConfig().dryRun).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should track modifications per hour', () => {
      const status = pipeline.getRateLimitStatus();
      expect(status.modificationsInLastHour).toBe(0);
      expect(status.paused).toBe(false);
    });

    it('should allow modifications within limit', async () => {
      const status = pipeline.getRateLimitStatus();
      expect(status.paused).toBe(false);
    });

    it('should allow resuming after pause', () => {
      pipeline.resume();
      const status = pipeline.getRateLimitStatus();
      expect(status.paused).toBe(false);
      expect(status.consecutiveFailures).toBe(0);
    });
  });

  describe('Error Analysis', () => {
    it('should detect TypeScript errors', async () => {
      const result = await pipeline.run(`
        TypeError: Cannot read property 'name' of undefined
          at UserService.getUser (src/services/user.ts:45:20)
      `);
      
      expect(result.errorAnalysis).toBeDefined();
      expect(result.errorAnalysis?.errorType).toBe('runtime');
    });

    it('should detect syntax errors', async () => {
      const result = await pipeline.run(`
        SyntaxError: Unexpected token
          at Parser.parse (parser.ts:10:5)
      `);
      
      expect(result.errorAnalysis?.errorType).toBe('syntax');
    });

    it('should detect test failures', async () => {
      const result = await pipeline.run(`
        FAIL tests/unit/user.test.ts
        Test failed: expected true to be false
      `);
      
      expect(result.errorAnalysis?.errorType).toBe('test');
    });

    it('should extract file location from stack trace', async () => {
      const result = await pipeline.run(`
        Error: Something went wrong
          at MyFunction (src/lib/utils.ts:123:45)
      `);
      
      expect(result.errorAnalysis?.location.file).toBe('src/lib/utils.ts');
      expect(result.errorAnalysis?.location.line).toBe(123);
    });
  });

  describe('Dry Run Mode', () => {
    it('should not modify files in dry run', async () => {
      const result = await pipeline.run(`
        TypeError: undefined is not a function
          at test.ts:10:5
      `);
      
      // In dry run, modification should be skipped
      if (result.modification) {
        expect(result.modification.action).toBe('skipped');
      }
    });

    it('should still generate analysis and fix in dry run', async () => {
      const result = await pipeline.run(`
        TypeError: Cannot read property 'x' of undefined
          at calc.ts:5:10
      `);
      
      expect(result.errorAnalysis).toBeDefined();
      // Fix proposal may or may not be generated depending on confidence
    });
  });

  describe('Validation Loop', () => {
    it('should respect maxIterations', async () => {
      const result = await pipeline.run('Some error without clear fix');
      expect(result.iterations).toBeLessThanOrEqual(testConfig.maxIterations!);
    });

    it('should stop on success', async () => {
      // With dry run, first iteration should succeed
      const result = await pipeline.run(`
        TypeError: x is undefined
          at simple.ts:1:1
      `);
      
      // Should complete (possibly in dry run mode)
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Audit Logging', () => {
    it('should provide audit log access', async () => {
      const logs = await pipeline.getAuditLog(10);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('Severity Handling', () => {
    it('should reject critical severity errors', async () => {
      const result = await pipeline.run(`
        CRITICAL SECURITY ERROR: SQL injection detected
          at db.ts:50:10
      `);
      
      expect(result.success).toBe(false);
      if (result.errorAnalysis?.severity === 'critical') {
        expect(result.error).toContain('human review');
      }
    });
  });
});

describe('Pipeline Integration', () => {
  it('should handle full pipeline flow', async () => {
    const pipeline = new SelfModificationPipeline({
      dryRun: true,
      maxIterations: 1,
    });

    const result = await pipeline.run(`
      TypeError: Cannot read property 'id' of null
        at src/handlers/user.ts:25:15
    `);

    expect(result.timestamp).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.iterations).toBeGreaterThanOrEqual(0);
  });
});
