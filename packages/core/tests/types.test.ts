/**
 * @tooloo/core - Type Tests
 * Unit tests for core type definitions and factories
 * 
 * @version 2.0.0-alpha.0
 */

import { describe, it, expect } from 'vitest';
import {
  createSessionId,
  createUserId,
  createProjectId,
  createArtifactId,
  createSkillId,
  createProviderId,
  IntentSchema,
  MessageSchema,
  type Intent,
  type Message,
  type SessionId,
  type UserId,
} from '../src/types.js';

// =============================================================================
// BRANDED ID TESTS
// =============================================================================

describe('Branded IDs', () => {
  describe('createSessionId', () => {
    it('should create a valid SessionId', () => {
      const id = createSessionId('session-123');
      expect(id).toBe('session-123');
      // TypeScript ensures type safety at compile time
    });

    it('should accept UUID format', () => {
      const id = createSessionId('550e8400-e29b-41d4-a716-446655440000');
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('createUserId', () => {
    it('should create a valid UserId', () => {
      const id = createUserId('user-456');
      expect(id).toBe('user-456');
    });
  });

  describe('createProjectId', () => {
    it('should create a valid ProjectId', () => {
      const id = createProjectId('project-789');
      expect(id).toBe('project-789');
    });
  });

  describe('createArtifactId', () => {
    it('should create a valid ArtifactId', () => {
      const id = createArtifactId('artifact-abc');
      expect(id).toBe('artifact-abc');
    });
  });

  describe('createSkillId', () => {
    it('should create a valid SkillId', () => {
      const id = createSkillId('code-generation');
      expect(id).toBe('code-generation');
    });
  });

  describe('createProviderId', () => {
    it('should create a valid ProviderId', () => {
      const id = createProviderId('deepseek');
      expect(id).toBe('deepseek');
    });
  });
});

// =============================================================================
// INTENT SCHEMA TESTS
// =============================================================================

describe('IntentSchema', () => {
  it('should validate a valid intent', () => {
    const intent: Intent = {
      type: 'code',
      confidence: 0.95,
      keywords: ['typescript', 'function'],
    };

    const result = IntentSchema.safeParse(intent);
    expect(result.success).toBe(true);
  });

  it('should validate all intent types', () => {
    const intentTypes = [
      'code', 'design', 'analyze', 'research', 'plan', 'chat',
      'execute', 'create', 'fix', 'refactor', 'test', 'document', 'unknown'
    ];

    for (const type of intentTypes) {
      const intent = {
        type,
        confidence: 0.5,
        keywords: [],
      };
      const result = IntentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid intent type', () => {
    const intent = {
      type: 'invalid-type',
      confidence: 0.5,
      keywords: [],
    };

    const result = IntentSchema.safeParse(intent);
    expect(result.success).toBe(false);
  });

  it('should reject confidence out of range', () => {
    const intentHigh = {
      type: 'code',
      confidence: 1.5,
      keywords: [],
    };

    const intentLow = {
      type: 'code',
      confidence: -0.5,
      keywords: [],
    };

    expect(IntentSchema.safeParse(intentHigh).success).toBe(false);
    expect(IntentSchema.safeParse(intentLow).success).toBe(false);
  });

  it('should accept optional fields', () => {
    const intent: Intent = {
      type: 'analyze',
      confidence: 0.8,
      keywords: ['review', 'code'],
      reasoning: 'User asked to review code',
    };

    const result = IntentSchema.safeParse(intent);
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// MESSAGE SCHEMA TESTS
// =============================================================================

describe('MessageSchema', () => {
  it('should validate a valid message', () => {
    const message: Message = {
      id: 'msg-123',
      role: 'user',
      content: 'Hello, TooLoo!',
      timestamp: new Date(),
    };

    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it('should validate all roles', () => {
    const roles = ['user', 'assistant', 'system', 'tool'];

    for (const role of roles) {
      const message = {
        id: `msg-${role}`,
        role,
        content: 'Test content',
        timestamp: new Date(),
      };
      const result = MessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid role', () => {
    const message = {
      id: 'msg-invalid',
      role: 'invalid-role',
      content: 'Test',
      timestamp: new Date(),
    };

    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });

  it('should coerce date strings to Date objects', () => {
    const message = {
      id: 'msg-date',
      role: 'user',
      content: 'Test',
      timestamp: '2025-12-12T10:00:00Z',
    };

    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timestamp).toBeInstanceOf(Date);
    }
  });

  it('should accept messages with metadata', () => {
    const message = {
      id: 'msg-meta',
      role: 'assistant',
      content: 'Here is your code',
      timestamp: new Date(),
      metadata: {
        tokenCount: 150,
        latencyMs: 1200,
        provider: 'deepseek',
      },
    };

    const result = MessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });
});
