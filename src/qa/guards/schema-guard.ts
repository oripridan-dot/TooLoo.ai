// @version 2.2.175
/**
 * Schema Guard - API Request/Response Validation
 *
 * Validates all API requests and responses against Zod schemas.
 * Acts as the first line of defense against malformed data.
 *
 * @module qa/guards/schema-guard
 */

import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { bus } from '../../core/event-bus.js';
import { APIContract, EventSchemas, EventType } from '../types/index.js';
import { API_CONTRACTS } from '../contracts-generated.js';

interface ValidationResult {
  valid: boolean;
  errors?: z.ZodIssue[];
  path: string;
  method: string;
}

interface SchemaViolation {
  timestamp: number;
  route: string;
  direction: 'request' | 'response';
  errors: z.ZodIssue[];
  sample?: unknown;
}

/**
 * SchemaGuard - Validates API requests/responses and event payloads
 */
export class SchemaGuard {
  private violations: SchemaViolation[] = [];
  private maxViolations = 1000;
  private enabled = true;

  constructor() {
    console.log('[SchemaGuard] Initializing schema validation...');
    this.registerEventInterceptor();
  }

  /**
   * Express middleware for API validation
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.enabled) return next();

      const route = `${req.method} ${req.baseUrl}${req.path}`;
      const contract = this.findContract(req.method, req.baseUrl + req.path);

      if (!contract) {
        // Unknown route - log but don't block
        this.reportUnknownRoute(route);
        return next();
      }

      // Validate request body if schema exists
      if (contract.request && req.body) {
        const result = contract.request.safeParse(req.body);
        if (!result.success) {
          this.recordViolation(route, 'request', result.error.issues, req.body);

          return res.status(400).json({
            ok: false,
            error: 'Invalid request format',
            violations: result.error.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
            hint: `Expected format for ${contract.intent}`,
          });
        }
      }

      // Wrap response.json to validate outgoing data
      const originalJson = res.json.bind(res);
      res.json = (data: unknown) => {
        if (contract.response && this.enabled) {
          const result = contract.response.safeParse(data);
          if (!result.success) {
            // Response doesn't match contract - this is a bug!
            this.recordViolation(route, 'response', result.error.issues, data);
            console.error(
              `[SchemaGuard] ⚠️ Response schema violation on ${route}:`,
              result.error.issues
            );
            // Still send it (don't break user experience) but alert
            bus.publish('system', 'qa:schema_violation', {
              route,
              direction: 'response',
              errors: result.error.issues,
            });
          }
        }
        return originalJson(data);
      };

      next();
    };
  }

  /**
   * Find the contract for a given route
   */
  private findContract(method: string, path: string): APIContract | undefined {
    // Try exact match first
    const exactKey = `${method} ${path}`;
    if (API_CONTRACTS[exactKey]) {
      return API_CONTRACTS[exactKey];
    }

    // Try pattern matching for parameterized routes
    for (const [key, contract] of Object.entries(API_CONTRACTS)) {
      const [contractMethod, contractPath] = key.split(' ');
      if (contractMethod !== method || !contractPath) continue;

      // Convert Express path params to regex
      const pattern = contractPath.replace(/:\w+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(path)) {
        return contract;
      }
    }

    return undefined;
  }

  /**
   * Register interceptor for EventBus events
   */
  private registerEventInterceptor() {
    bus.addInterceptor(async (event) => {
      if (!this.enabled) return true;

      const schema = EventSchemas[event.type as EventType];
      if (schema) {
        const result = schema.safeParse(event.payload);
        if (!result.success) {
          console.warn(
            `[SchemaGuard] Event schema violation for ${event.type}:`,
            result.error.issues
          );
          bus.publish('system', 'qa:event_schema_violation', {
            eventType: event.type,
            source: event.source,
            errors: result.error.issues,
          });
          // Don't block events, just log
          return true;
        }
      }
      return true;
    });
  }

  /**
   * Record a schema violation
   */
  private recordViolation(
    route: string,
    direction: 'request' | 'response',
    errors: z.ZodIssue[],
    sample?: unknown
  ) {
    const violation: SchemaViolation = {
      timestamp: Date.now(),
      route,
      direction,
      errors,
      sample:
        process.env['NODE_ENV'] === 'development'
          ? JSON.stringify(sample).slice(0, 500)
          : undefined,
    };

    this.violations.push(violation);

    // Trim old violations
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(-this.maxViolations / 2);
    }
  }

  /**
   * Report unknown route
   */
  private reportUnknownRoute(route: string) {
    // Only log once per route per session
    const key = `unknown:${route}`;
    if (!(global as any).__qaSchemaGuardSeen) {
      (global as any).__qaSchemaGuardSeen = new Set();
    }
    if (!(global as any).__qaSchemaGuardSeen.has(key)) {
      (global as any).__qaSchemaGuardSeen?.add(key);
      console.log(`[SchemaGuard] Unknown route (no contract): ${route}`);
    }
  }

  /**
   * Validate a value against a schema manually
   */
  validate<T>(schema: z.ZodType<T>, value: unknown): ValidationResult & { data?: T } {
    const result = schema.safeParse(value);
    if (result.success) {
      return { valid: true, path: '', method: '', data: result.data };
    }
    return { valid: false, errors: result.error.issues, path: '', method: '' };
  }

  /**
   * Get recent violations
   */
  getViolations(limit = 50): SchemaViolation[] {
    return this.violations.slice(-limit);
  }

  /**
   * Get violation statistics
   */
  getStats(): {
    total: number;
    byRoute: Record<string, number>;
    byDirection: Record<string, number>;
    recentRate: number;
  } {
    const byRoute: Record<string, number> = {};
    const byDirection: Record<string, number> = { request: 0, response: 0 };

    for (const v of this.violations) {
      byRoute[v.route] = (byRoute[v.route] || 0) + 1;
      const count = byDirection[v.direction];
      if (count !== undefined) {
        byDirection[v.direction] = count + 1;
      }
    }

    // Calculate rate (violations per hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentCount = this.violations.filter((v) => v.timestamp > oneHourAgo).length;

    return {
      total: this.violations.length,
      byRoute,
      byDirection,
      recentRate: recentCount,
    };
  }

  /**
   * Enable/disable validation
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    console.log(`[SchemaGuard] Validation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if validation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear violation history
   */
  clearViolations() {
    this.violations = [];
  }
}

// Singleton instance
export const schemaGuard = new SchemaGuard();
