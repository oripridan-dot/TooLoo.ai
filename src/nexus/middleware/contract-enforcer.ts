// @version 3.3.450
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { API_CONTRACTS } from '../../qa/contracts-generated.js';
import { APIContract } from '../../qa/types/index.js';
import { bus } from '../../core/event-bus.js';

// Configuration for contract enforcement behavior
export interface ContractEnforcerConfig {
  // Whether to enforce request schema validation (if contract has `request` schema)
  validateRequestSchema: boolean;
  // Whether to validate response schemas (wraps res.json)
  validateResponseSchema: boolean;
  // Whether to log violations to event bus for QA Guardian
  emitViolationEvents: boolean;
  // Whether to block requests that don't match any contract
  blockUnknownRoutes: boolean;
  // Skip validation in development mode for faster iteration
  developmentMode: boolean;
}

// Default configuration - strict but observable
const defaultConfig: ContractEnforcerConfig = {
  validateRequestSchema: true,
  validateResponseSchema: true,
  emitViolationEvents: true,
  blockUnknownRoutes: false, // Log but don't block - allows gradual migration
  developmentMode: process.env['NODE_ENV'] === 'development',
};

let config: ContractEnforcerConfig = { ...defaultConfig };

/**
 * Update contract enforcer configuration at runtime
 */
export function configureContractEnforcer(newConfig: Partial<ContractEnforcerConfig>): void {
  config = { ...config, ...newConfig };
  console.log('[ContractEnforcer] Configuration updated:', config);
}

/**
 * Get current configuration
 */
export function getContractEnforcerConfig(): ContractEnforcerConfig {
  return { ...config };
}

// Metrics tracking
const metrics = {
  totalRequests: 0,
  validatedRequests: 0,
  schemaViolations: 0,
  unknownRoutes: 0,
  responseViolations: 0,
};

export function getContractEnforcerMetrics() {
  return { ...metrics };
}

// Pre-process parameterized contracts for faster lookup
const parameterizedContracts: { regex: RegExp; contract: APIContract }[] = [];

Object.values(API_CONTRACTS).forEach((contract) => {
  if (contract.path.includes(':')) {
    // Convert /api/v1/users/:id to /^\/api\/v1\/users\/([^/]+)$/
    // We need to be careful with special regex characters in the path
    const escapedPath = contract.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = '^' + escapedPath.replace(/:[a-zA-Z0-9_]+/g, '([^/]+)') + '$';
    parameterizedContracts.push({
      regex: new RegExp(regexStr),
      contract,
    });
  }
});

/**
 * Contract Enforcer Middleware
 *
 * "Hard wires" the API contracts to the running system.
 * Ensures that every request matches a registered intention.
 * Validates required parameters.
 */
export const contractEnforcer = (req: Request, res: Response, next: NextFunction) => {
  // Only check API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  const method = req.method.toUpperCase();
  // Remove trailing slash for consistency
  const path = req.path.endsWith('/') && req.path.length > 1 ? req.path.slice(0, -1) : req.path;

  // 1. Try Exact Match
  const key = `${method} ${path}`;
  let contract = API_CONTRACTS[key];

  // 2. Try Parameterized Match
  if (!contract) {
    const match = parameterizedContracts.find(
      (pc) => pc.contract.method === method && pc.regex.test(path)
    );
    if (match) {
      contract = match.contract;
    }
  }

  if (contract) {
    // Contract found - Intention Verified
    (req as any).contract = contract;

    // 3. Full Zod Request Schema Validation (if contract defines a request schema)
    if (config.validateRequestSchema && contract.request) {
      try {
        const source = method === 'GET' ? req.query : req.body;
        contract.request.parse(source);
      } catch (error) {
        if (error instanceof ZodError) {
          const violations = error.issues.map((e) => ({
            path: String(e.path.join('.')),
            message: e.message,
            expected: String(e.code),
          }));

          metrics.schemaViolations++;

          // Emit event for QA Guardian (using 'system' as QA events go through system bus)
          if (config.emitViolationEvents) {
            bus.publish('system', 'qa:schema_violation', {
              type: 'request',
              method,
              path,
              contract: `${contract.method} ${contract.path}`,
              violations,
              timestamp: Date.now(),
            });
          }

          console.warn(`[ContractEnforcer] ❌ Schema violation ${method} ${path}:`, violations);

          if (!config.developmentMode) {
            return res.status(400).json({
              ok: false,
              error: 'Contract Violation: Request does not match schema',
              meta: {
                contract: `${contract.method} ${contract.path}`,
                violations,
              },
            });
          }
        }
      }
    }

    // 4. Parameter Validation (legacy support for contracts without full Zod schema)
    if (contract.parameters && contract.parameters.length > 0) {
      const source = method === 'GET' ? req.query : req.body;
      const missingParams: string[] = [];
      const invalidParams: string[] = [];

      for (const param of contract.parameters) {
        const value = source[param.name];

        // Check Required
        if (param.required) {
          // Check for undefined, null, or empty string (if it's a string param)
          if (
            value === undefined ||
            value === null ||
            (typeof value === 'string' && value.trim() === '')
          ) {
            missingParams.push(param.name);
            continue; // Skip type check if missing
          }
        }

        // Check Type (if value is present)
        if (value !== undefined && value !== null) {
          let isValidType = true;

          if (method === 'GET') {
            // Query params are always strings, so we need loose validation
            if (param.type === 'number') {
              isValidType = !isNaN(Number(value));
            } else if (param.type === 'boolean') {
              isValidType = value === 'true' || value === 'false';
            }
            // Strings are always valid as query params
          } else {
            // Body params should match the type
            if (param.type === 'array') {
              isValidType = Array.isArray(value);
            } else if (param.type === 'object') {
              isValidType = typeof value === 'object' && !Array.isArray(value);
            } else {
              isValidType = typeof value === param.type;
            }
          }

          if (!isValidType) {
            invalidParams.push(`${param.name} (expected ${param.type})`);
          }
        }
      }

      if (missingParams.length > 0) {
        console.warn(
          `[ContractEnforcer] ❌ Rejected ${method} ${path}: Missing params ${missingParams.join(', ')}`
        );
        return res.status(400).json({
          ok: false,
          error: `Contract Violation: Missing required parameters: ${missingParams.join(', ')}`,
          meta: {
            contract: `${contract.method} ${contract.path}`,
            missing: missingParams,
          },
        });
      }

      if (invalidParams.length > 0) {
        console.warn(
          `[ContractEnforcer] ❌ Rejected ${method} ${path}: Invalid param types ${invalidParams.join(', ')}`
        );
        return res.status(400).json({
          ok: false,
          error: `Contract Violation: Invalid parameter types: ${invalidParams.join(', ')}`,
          meta: {
            contract: `${contract.method} ${contract.path}`,
            invalid: invalidParams,
          },
        });
      }
    }

    // 5. Deprecation Warning
    if (contract.deprecated) {
      res.setHeader('X-API-Warning', 'Deprecated Endpoint');
    }

    // 6. Response Schema Validation (wrap res.json)
    if (config.validateResponseSchema && contract.response) {
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        try {
          // Validate response against contract schema
          contract.response.parse(body);
          metrics.validatedRequests++;
        } catch (error) {
          if (error instanceof ZodError) {
            const violations = error.issues.map((e) => ({
              path: String(e.path.join('.')),
              message: e.message,
              expected: String(e.code),
            }));

            metrics.responseViolations++;

            // Emit event for QA Guardian - this is critical for debugging
            if (config.emitViolationEvents) {
              bus.publish('system', 'qa:schema_violation', {
                type: 'response',
                method,
                path,
                contract: `${contract.method} ${contract.path}`,
                violations,
                timestamp: Date.now(),
              });
            }

            console.error(
              `[ContractEnforcer] ⚠️ Response schema violation ${method} ${path}:`,
              violations
            );

            // In development mode, add warning header but don't block
            res.setHeader('X-Contract-Warning', 'Response schema violation');
          }
        }
        return originalJson(body);
      };
    }
  } else {
    // Contract Violation - No Intention Registered
    metrics.unknownRoutes++;

    if (config.emitViolationEvents) {
      bus.publish('system', 'qa:unknown_route', {
        method,
        path,
        timestamp: Date.now(),
      });
    }

    console.warn(
      `[ContractEnforcer] ⚠️  Contract Violation: No contract found for ${method} ${path}`
    );
    res.setHeader('X-Contract-Status', 'Unverified');

    if (config.blockUnknownRoutes && !config.developmentMode) {
      return res.status(404).json({
        ok: false,
        error: `No API contract registered for ${method} ${path}`,
        meta: {
          hint: 'This endpoint may need to be added to API_CONTRACTS',
        },
      });
    }
  }

  metrics.totalRequests++;
  next();
};

/**
 * Get contract for a specific route (useful for SDK generation and documentation)
 */
export function getContractForRoute(method: string, path: string): APIContract | undefined {
  const key = `${method.toUpperCase()} ${path}`;
  let contract = API_CONTRACTS[key];

  if (!contract) {
    const match = parameterizedContracts.find(
      (pc) => pc.contract.method === method.toUpperCase() && pc.regex.test(path)
    );
    if (match) {
      contract = match.contract;
    }
  }

  return contract;
}

/**
 * Get all registered contracts (for SDK generation)
 */
export function getAllContracts(): Record<string, APIContract> {
  return { ...API_CONTRACTS };
}
