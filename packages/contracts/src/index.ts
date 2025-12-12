/**
 * @tooloo/contracts - Main Entry Point
 * API contracts with Zod validation
 * 
 * @version 2.0.0-alpha.0
 */

// All type schemas
export * from './types.js';

// Contract registry
export {
  contracts,
  getContract,
  getContractsByTag,
  validateRequest,
  validateResponse,
  type APIContract,
  type ContractKey,
  type ContractRegistry,
} from './registry.js';

// Version
export const VERSION = '2.0.0-alpha.0';
