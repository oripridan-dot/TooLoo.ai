// @version 3.3.174
import { Request, Response, NextFunction } from 'express';
import { API_CONTRACTS } from '../../qa/contracts-generated.js';
import { APIContract } from '../../qa/types/index.js';

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
    
    // 3. Parameter Validation
    if (contract.parameters && contract.parameters.length > 0) {
      const source = method === 'GET' ? req.query : req.body;
      const missingParams: string[] = [];
      const invalidParams: string[] = [];

      for (const param of contract.parameters) {
        const value = source[param.name];
        
        // Check Required
        if (param.required) {
           // Check for undefined, null, or empty string (if it's a string param)
           if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
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
        console.warn(`[ContractEnforcer] ❌ Rejected ${method} ${path}: Missing params ${missingParams.join(', ')}`);
        return res.status(400).json({
          ok: false,
          error: `Contract Violation: Missing required parameters: ${missingParams.join(', ')}`,
          meta: {
            contract: `${contract.method} ${contract.path}`,
            missing: missingParams
          }
        });
      }

      if (invalidParams.length > 0) {
        console.warn(`[ContractEnforcer] ❌ Rejected ${method} ${path}: Invalid param types ${invalidParams.join(', ')}`);
        return res.status(400).json({
          ok: false,
          error: `Contract Violation: Invalid parameter types: ${invalidParams.join(', ')}`,
          meta: {
            contract: `${contract.method} ${contract.path}`,
            invalid: invalidParams
          }
        });
      }
    }

    // 4. Deprecation Warning
    if (contract.deprecated) {
       res.setHeader('X-API-Warning', 'Deprecated Endpoint');
    }

  } else {
    // Contract Violation - No Intention Registered
    console.warn(`[ContractEnforcer] ⚠️  Contract Violation: No contract found for ${method} ${path}`);
    res.setHeader('X-Contract-Status', 'Unverified');
  }

  next();
};
