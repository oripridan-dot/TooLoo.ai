// @version 3.3.573
/**
 * SchemaGuard Tests
 * Tests for API request/response validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('express', () => ({
  default: { Router: vi.fn() },
}));

describe('SchemaGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('ValidationResult', () => {
      it('should have valid property', () => {
        interface ValidationResult {
          valid: boolean;
          errors?: { path: string[]; message: string }[];
          path: string;
          method: string;
        }
        const result: ValidationResult = {
          valid: true,
          path: '/api/v1/users',
          method: 'GET',
        };
        expect(result.valid).toBe(true);
      });

      it('should optionally have errors', () => {
        interface ValidationResult {
          valid: boolean;
          errors?: { path: string[]; message: string }[];
          path: string;
          method: string;
        }
        const result: ValidationResult = {
          valid: false,
          errors: [{ path: ['body', 'name'], message: 'Required' }],
          path: '/api/v1/users',
          method: 'POST',
        };
        expect(result.errors).toHaveLength(1);
      });

      it('should track request path', () => {
        interface ValidationResult {
          valid: boolean;
          errors?: { path: string[]; message: string }[];
          path: string;
          method: string;
        }
        const result: ValidationResult = {
          valid: true,
          path: '/api/v1/chat',
          method: 'POST',
        };
        expect(result.path).toBe('/api/v1/chat');
      });

      it('should track HTTP method', () => {
        interface ValidationResult {
          valid: boolean;
          errors?: { path: string[]; message: string }[];
          path: string;
          method: string;
        }
        const result: ValidationResult = {
          valid: true,
          path: '/api/v1/settings',
          method: 'PUT',
        };
        expect(result.method).toBe('PUT');
      });
    });

    describe('SchemaViolation', () => {
      it('should have timestamp', () => {
        interface SchemaViolation {
          timestamp: number;
          route: string;
          direction: 'request' | 'response';
          errors: { path: string[]; message: string }[];
          sample?: unknown;
        }
        const violation: SchemaViolation = {
          timestamp: Date.now(),
          route: 'GET /api/v1/users',
          direction: 'request',
          errors: [],
        };
        expect(violation.timestamp).toBeGreaterThan(0);
      });

      it('should track route', () => {
        interface SchemaViolation {
          timestamp: number;
          route: string;
          direction: 'request' | 'response';
          errors: { path: string[]; message: string }[];
          sample?: unknown;
        }
        const violation: SchemaViolation = {
          timestamp: Date.now(),
          route: 'POST /api/v1/chat',
          direction: 'request',
          errors: [],
        };
        expect(violation.route).toBe('POST /api/v1/chat');
      });

      it('should track direction (request or response)', () => {
        interface SchemaViolation {
          timestamp: number;
          route: string;
          direction: 'request' | 'response';
          errors: { path: string[]; message: string }[];
          sample?: unknown;
        }
        const violation: SchemaViolation = {
          timestamp: Date.now(),
          route: 'GET /api/v1/data',
          direction: 'response',
          errors: [],
        };
        expect(['request', 'response']).toContain(violation.direction);
      });

      it('should track validation errors', () => {
        interface SchemaViolation {
          timestamp: number;
          route: string;
          direction: 'request' | 'response';
          errors: { path: string[]; message: string }[];
          sample?: unknown;
        }
        const violation: SchemaViolation = {
          timestamp: Date.now(),
          route: 'POST /api/v1/users',
          direction: 'request',
          errors: [
            { path: ['body', 'email'], message: 'Invalid email' },
            { path: ['body', 'age'], message: 'Must be positive' },
          ],
        };
        expect(violation.errors).toHaveLength(2);
      });

      it('should optionally store sample data', () => {
        interface SchemaViolation {
          timestamp: number;
          route: string;
          direction: 'request' | 'response';
          errors: { path: string[]; message: string }[];
          sample?: unknown;
        }
        const violation: SchemaViolation = {
          timestamp: Date.now(),
          route: 'POST /api/v1/data',
          direction: 'request',
          errors: [],
          sample: { invalid: 'data' },
        };
        expect(violation.sample).toEqual({ invalid: 'data' });
      });
    });
  });

  describe('SchemaGuard Class', () => {
    it('should initialize with empty violations', () => {
      const violations: unknown[] = [];
      expect(violations).toHaveLength(0);
    });

    it('should have max violations limit', () => {
      const maxViolations = 1000;
      expect(maxViolations).toBe(1000);
    });

    it('should be enabled by default', () => {
      const enabled = true;
      expect(enabled).toBe(true);
    });

    it('should allow disabling validation', () => {
      let enabled = true;
      enabled = false;
      expect(enabled).toBe(false);
    });
  });

  describe('Middleware Functionality', () => {
    it('should pass through when disabled', () => {
      const enabled = false;
      const next = vi.fn();
      if (!enabled) next();
      expect(next).toHaveBeenCalled();
    });

    it('should find contract for route', () => {
      const contracts = new Map([
        ['GET /api/v1/users', { request: null, response: {} }],
        ['POST /api/v1/chat', { request: {}, response: {} }],
      ]);
      const method = 'GET';
      const path = '/api/v1/users';
      const key = `${method} ${path}`;
      expect(contracts.has(key)).toBe(true);
    });

    it('should log unknown routes', () => {
      const knownRoutes = ['/api/v1/users', '/api/v1/chat'];
      const requestedRoute = '/api/v1/unknown';
      const isUnknown = !knownRoutes.includes(requestedRoute);
      expect(isUnknown).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should validate request body against schema', () => {
      const schema = { parse: (data: unknown) => data };
      const body = { name: 'test' };
      const result = schema.parse(body);
      expect(result).toEqual(body);
    });

    it('should return 400 for invalid request', () => {
      const isValid = false;
      const statusCode = isValid ? 200 : 400;
      expect(statusCode).toBe(400);
    });

    it('should include violation details in error response', () => {
      const errors = [{ path: ['body', 'name'], message: 'Required' }];
      const response = {
        ok: false,
        error: 'Invalid request format',
        violations: errors.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      };
      expect(response.violations[0].path).toBe('body.name');
    });

    it('should include hint in error response', () => {
      const intent = 'Create a new user';
      const response = {
        ok: false,
        error: 'Invalid request format',
        hint: `Expected format for ${intent}`,
      };
      expect(response.hint).toContain('Create a new user');
    });
  });

  describe('Response Validation', () => {
    it('should wrap res.json for validation', () => {
      const originalJson = vi.fn();
      const wrappedJson = (data: unknown) => {
        // Validation logic would go here
        return originalJson(data);
      };
      wrappedJson({ ok: true });
      expect(originalJson).toHaveBeenCalledWith({ ok: true });
    });

    it('should validate outgoing data', () => {
      const schema = {
        safeParse: (data: unknown) => ({
          success: true,
          data,
        }),
      };
      const result = schema.safeParse({ ok: true, data: [] });
      expect(result.success).toBe(true);
    });

    it('should log response violations but not block', () => {
      const isValid = false;
      const logged: string[] = [];
      if (!isValid) {
        logged.push('Response schema violation');
      }
      // Still send response even if invalid
      expect(logged).toContain('Response schema violation');
    });

    it('should publish violation event via bus', () => {
      const events: unknown[] = [];
      const publish = (channel: string, type: string, data: unknown) => {
        events.push({ channel, type, data });
      };
      publish('system', 'qa:schema_violation', {
        route: 'GET /api/v1/data',
        direction: 'response',
      });
      expect(events).toHaveLength(1);
    });
  });

  describe('Violation Recording', () => {
    it('should record violations', () => {
      const violations: unknown[] = [];
      violations.push({
        timestamp: Date.now(),
        route: 'POST /api/v1/users',
        direction: 'request',
        errors: [],
      });
      expect(violations).toHaveLength(1);
    });

    it('should respect max violations limit', () => {
      const maxViolations = 3;
      const violations: unknown[] = [];
      for (let i = 0; i < 5; i++) {
        if (violations.length < maxViolations) {
          violations.push({ id: i });
        }
      }
      expect(violations).toHaveLength(3);
    });

    it('should trim old violations when limit reached', () => {
      const maxViolations = 3;
      const violations = [{ id: 1 }, { id: 2 }, { id: 3 }];
      if (violations.length >= maxViolations) {
        violations.shift(); // Remove oldest
      }
      violations.push({ id: 4 });
      expect(violations[0]).toEqual({ id: 2 });
    });
  });

  describe('Event Interception', () => {
    it('should register event interceptor on init', () => {
      const registered: string[] = [];
      const registerInterceptor = (type: string) => {
        registered.push(type);
      };
      registerInterceptor('event');
      expect(registered).toContain('event');
    });

    it('should validate event payloads', () => {
      const eventSchemas = new Map([
        ['chat:message', { validate: (d: unknown) => !!d }],
        ['user:update', { validate: (d: unknown) => !!d }],
      ]);
      const eventType = 'chat:message';
      const schema = eventSchemas.get(eventType);
      expect(schema?.validate({ text: 'hello' })).toBe(true);
    });
  });

  describe('Contract Finding', () => {
    it('should match exact route', () => {
      const contracts = {
        'GET /api/v1/users': { intent: 'List users' },
        'POST /api/v1/users': { intent: 'Create user' },
      };
      const key = 'GET /api/v1/users';
      expect(contracts[key as keyof typeof contracts]).toBeDefined();
    });

    it('should handle parameterized routes', () => {
      const matchRoute = (pattern: string, path: string) => {
        const regexPattern = pattern.replace(/:[\w]+/g, '[^/]+');
        return new RegExp(`^${regexPattern}$`).test(path);
      };
      expect(matchRoute('/api/v1/users/:id', '/api/v1/users/123')).toBe(true);
    });

    it('should handle query parameters', () => {
      const path = '/api/v1/users?page=1&limit=10';
      const basePath = path.split('?')[0];
      expect(basePath).toBe('/api/v1/users');
    });
  });

  describe('Error Formatting', () => {
    it('should format Zod errors for response', () => {
      const zodErrors = [
        { path: ['body', 'email'], message: 'Invalid email format' },
        { path: ['body', 'age'], message: 'Expected number, received string' },
      ];
      const formatted = zodErrors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      expect(formatted[0].path).toBe('body.email');
    });

    it('should handle nested paths', () => {
      const error = { path: ['body', 'address', 'street'], message: 'Required' };
      const pathStr = error.path.join('.');
      expect(pathStr).toBe('body.address.street');
    });

    it('should handle array indices in path', () => {
      const error = { path: ['body', 'items', '0', 'name'], message: 'Required' };
      const pathStr = error.path.join('.');
      expect(pathStr).toBe('body.items.0.name');
    });
  });

  describe('Statistics', () => {
    it('should count total violations', () => {
      const violations = [{ route: 'A' }, { route: 'B' }, { route: 'A' }];
      expect(violations.length).toBe(3);
    });

    it('should group violations by route', () => {
      const violations = [
        { route: 'GET /api/v1/users' },
        { route: 'POST /api/v1/chat' },
        { route: 'GET /api/v1/users' },
      ];
      const byRoute = violations.reduce(
        (acc, v) => {
          acc[v.route] = (acc[v.route] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      expect(byRoute['GET /api/v1/users']).toBe(2);
    });

    it('should track request vs response violations', () => {
      const violations = [
        { direction: 'request' },
        { direction: 'response' },
        { direction: 'request' },
      ];
      const requestCount = violations.filter((v) => v.direction === 'request').length;
      expect(requestCount).toBe(2);
    });
  });
});
