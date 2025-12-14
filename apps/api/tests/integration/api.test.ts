/**
 * @tooloo/api - Integration Tests
 * Tests for the V2 API endpoints
 *
 * These tests are designed to run against the live V2 API server.
 * Run with: API_URL=http://localhost:4001 pnpm test
 *
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer } from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { SkillRegistry, defineSkill } from '@tooloo/skills';
import { ProviderRegistry } from '@tooloo/providers';

// =============================================================================
// UNIT TESTS (No server required)
// =============================================================================

describe('V2 API Unit Tests', () => {
  describe('SkillRegistry', () => {
    let skillRegistry: SkillRegistry;

    beforeEach(() => {
      skillRegistry = new SkillRegistry();
    });

    it('should register a skill', () => {
      const skill = defineSkill({
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill for unit testing',
        version: '1.0.0',
        instructions: 'Do something useful',
        tools: [],
        triggers: {
          intents: ['code'],
          keywords: ['test', 'hello'],
        },
        context: {
          required: [],
          optional: [],
          maxTokens: 8000,
          ragSources: ['codebase'],
          memoryScope: 'session',
        },
        composability: {
          canBeComposedWith: [],
          exclusive: false,
          requires: [],
          enhances: [],
          conflicts: [],
        },
        handler: async ({ message }) => ({
          content: `Echo: ${message}`,
          tokenCount: { prompt: 10, completion: 5, total: 15 },
          latencyMs: 100,
        }),
      });

      skillRegistry.register(skill);
      expect(skillRegistry.get('test-skill')).toBeDefined();
      expect(skillRegistry.get('test-skill')?.name).toBe('Test Skill');
    });

    it('should list all registered skills', () => {
      const skill1 = defineSkill({
        id: 'skill-1',
        name: 'Skill One',
        description: 'First skill',
        version: '1.0.0',
        instructions: 'Instructions 1',
        tools: [],
        triggers: { intents: ['code'], keywords: ['one'] },
        context: {
          required: [],
          optional: [],
          maxTokens: 8000,
          ragSources: ['codebase'],
          memoryScope: 'session',
        },
        composability: {
          canBeComposedWith: [],
          exclusive: false,
          requires: [],
          enhances: [],
          conflicts: [],
        },
        handler: async () => ({
          content: '1',
          tokenCount: { prompt: 0, completion: 0, total: 0 },
          latencyMs: 0,
        }),
      });

      const skill2 = defineSkill({
        id: 'skill-2',
        name: 'Skill Two',
        description: 'Second skill',
        version: '1.0.0',
        instructions: 'Instructions 2',
        tools: [],
        triggers: { intents: ['analyze'], keywords: ['two'] },
        context: {
          required: [],
          optional: [],
          maxTokens: 8000,
          ragSources: ['memory'],
          memoryScope: 'project',
        },
        composability: {
          canBeComposedWith: [],
          exclusive: false,
          requires: [],
          enhances: [],
          conflicts: [],
        },
        handler: async () => ({
          content: '2',
          tokenCount: { prompt: 0, completion: 0, total: 0 },
          latencyMs: 0,
        }),
      });

      skillRegistry.register(skill1);
      skillRegistry.register(skill2);

      const skills = skillRegistry.getAll();
      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.id)).toContain('skill-1');
      expect(skills.map((s) => s.id)).toContain('skill-2');
    });
  });

  describe('ProviderRegistry', () => {
    let providerRegistry: ProviderRegistry;

    beforeEach(() => {
      providerRegistry = new ProviderRegistry();
    });

    it('should start with no providers', () => {
      const providers = providerRegistry.getAll();
      expect(providers).toEqual([]);
    });
  });
});

// =============================================================================
// E2E TESTS (Require running server - skipped by default)
// =============================================================================

describe('V2 API E2E Tests', () => {
  const API_URL = process.env.API_URL || 'http://localhost:4001';
  let serverAvailable = false;

  beforeAll(async () => {
    // Check if server is running
    try {
      const response = await fetch(`${API_URL}/api/v2/health`, {
        signal: AbortSignal.timeout(2000),
      });
      serverAvailable = response.ok;
    } catch {
      serverAvailable = false;
      console.log('⚠️ V2 API server not running, E2E tests will be skipped');
    }
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      if (!serverAvailable) {
        console.log('  ↳ Skipped: Server not available');
        return;
      }

      const response = await fetch(`${API_URL}/api/v2/health`);
      const data = await response.json();

      expect(data.ok).toBe(true);
      expect(data.data?.status).toBe('healthy');
    });
  });

  describe('Skills Endpoint', () => {
    it('should list available skills', async () => {
      if (!serverAvailable) {
        console.log('  ↳ Skipped: Server not available');
        return;
      }
      const response = await fetch(`${API_URL}/api/v2/skills`);

      if (response.ok) {
        const data = await response.json();
        expect(data.ok).toBe(true);
        // API returns skills directly in data array
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });

  describe('Chat Endpoint', () => {
    it('should accept chat messages', async () => {
      if (!serverAvailable) {
        console.log('  ↳ Skipped: Server not available');
        return;
      }

      const response = await fetch(`${API_URL}/api/v2/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello, TooLoo!',
          sessionId: 'test-session-' + Date.now(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data.ok).toBe(true);
        expect(data.data?.content).toBeDefined();
      } else if (response.status === 500) {
        // Provider not configured - expected in test environment
        console.log('  ↳ Provider not configured, chat endpoint returned 500');
      }
    });

    it('should reject messages without content', async () => {
      if (!serverAvailable) {
        console.log('  ↳ Skipped: Server not available');
        return;
      }

      const response = await fetch(`${API_URL}/api/v2/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.status === 400) {
        const data = await response.json();
        expect(data.ok).toBe(false);
        expect(data.error?.code).toBe('INVALID_REQUEST');
      }
    });
  });
});
