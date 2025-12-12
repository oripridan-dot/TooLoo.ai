/**
 * API Contract Registry
 * Maps endpoints to request/response schemas
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';
import {
  ChatRequestSchema,
  ChatResponseSchema,
  TaskRequestSchema,
  TaskResponseSchema,
  CreateArtifactRequestSchema,
  ArtifactSchema,
  RouteRequestSchema,
  RouteResponseSchema,
  SkillMatchRequestSchema,
  SkillMatchResponseSchema,
  HealthCheckResponseSchema,
  SystemMetricsSchema,
  ValidateRequestSchema,
  ValidationResultSchema,
  PaginationSchema,
  APIResponseSchema,
} from './types.js';

// ============================================================================
// Contract Definition
// ============================================================================

export interface APIContract {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  request?: z.ZodTypeAny;
  response: z.ZodTypeAny;
  description: string;
  tags: string[];
  auth?: 'required' | 'optional' | 'none';
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// ============================================================================
// Contract Registry
// ============================================================================

export const contracts = {
  // Health & System
  'GET /api/v1/health': {
    method: 'GET',
    path: '/api/v1/health',
    response: APIResponseSchema(HealthCheckResponseSchema),
    description: 'System health check',
    tags: ['system'],
    auth: 'none',
  },
  
  'GET /api/v1/metrics': {
    method: 'GET',
    path: '/api/v1/metrics',
    response: APIResponseSchema(SystemMetricsSchema),
    description: 'System metrics',
    tags: ['system'],
    auth: 'required',
  },

  // Chat
  'POST /api/v1/chat': {
    method: 'POST',
    path: '/api/v1/chat',
    request: ChatRequestSchema,
    response: APIResponseSchema(ChatResponseSchema),
    description: 'Send a message to the AI',
    tags: ['chat'],
    auth: 'required',
    rateLimit: { requests: 100, windowMs: 60000 },
  },

  // Tasks
  'POST /api/v1/tasks': {
    method: 'POST',
    path: '/api/v1/tasks',
    request: TaskRequestSchema,
    response: APIResponseSchema(TaskResponseSchema),
    description: 'Create a new task',
    tags: ['tasks'],
    auth: 'required',
  },
  
  'GET /api/v1/tasks/:id': {
    method: 'GET',
    path: '/api/v1/tasks/:id',
    response: APIResponseSchema(TaskResponseSchema),
    description: 'Get task by ID',
    tags: ['tasks'],
    auth: 'required',
  },
  
  'GET /api/v1/tasks': {
    method: 'GET',
    path: '/api/v1/tasks',
    request: PaginationSchema.extend({
      status: z.string().optional(),
      priority: z.string().optional(),
    }),
    response: APIResponseSchema(z.object({
      items: z.array(TaskResponseSchema),
      pagination: z.object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        hasMore: z.boolean(),
      }),
    })),
    description: 'List tasks',
    tags: ['tasks'],
    auth: 'required',
  },

  // Artifacts
  'POST /api/v1/artifacts': {
    method: 'POST',
    path: '/api/v1/artifacts',
    request: CreateArtifactRequestSchema,
    response: APIResponseSchema(ArtifactSchema),
    description: 'Create an artifact',
    tags: ['artifacts'],
    auth: 'required',
  },
  
  'GET /api/v1/artifacts/:id': {
    method: 'GET',
    path: '/api/v1/artifacts/:id',
    response: APIResponseSchema(ArtifactSchema),
    description: 'Get artifact by ID',
    tags: ['artifacts'],
    auth: 'required',
  },

  // Routing
  'POST /api/v1/routing/route': {
    method: 'POST',
    path: '/api/v1/routing/route',
    request: RouteRequestSchema,
    response: APIResponseSchema(RouteResponseSchema),
    description: 'Route a task to optimal provider',
    tags: ['routing'],
    auth: 'required',
  },

  // Skills
  'POST /api/v1/skills/match': {
    method: 'POST',
    path: '/api/v1/skills/match',
    request: SkillMatchRequestSchema,
    response: APIResponseSchema(SkillMatchResponseSchema),
    description: 'Match query to skills',
    tags: ['skills'],
    auth: 'required',
  },
  
  'GET /api/v1/skills': {
    method: 'GET',
    path: '/api/v1/skills',
    response: APIResponseSchema(z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      triggers: z.object({
        keywords: z.array(z.string()).optional(),
        intents: z.array(z.string()).optional(),
      }).optional(),
    }))),
    description: 'List available skills',
    tags: ['skills'],
    auth: 'optional',
  },

  // Validation
  'POST /api/v1/validate': {
    method: 'POST',
    path: '/api/v1/validate',
    request: ValidateRequestSchema,
    response: APIResponseSchema(ValidationResultSchema),
    description: 'Validate content',
    tags: ['validation'],
    auth: 'required',
  },
} as const satisfies Record<string, APIContract>;

export type ContractKey = keyof typeof contracts;
export type ContractRegistry = typeof contracts;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get contract by key
 */
export function getContract(key: ContractKey): APIContract {
  return contracts[key] as APIContract;
}

/**
 * Get all contracts for a tag
 */
export function getContractsByTag(tag: string): APIContract[] {
  return (Object.values(contracts) as APIContract[]).filter(c => c.tags.includes(tag));
}

/**
 * Validate request against contract
 */
export function validateRequest(
  key: ContractKey,
  data: unknown
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
  const contract = contracts[key] as APIContract;
  if (!contract.request) {
    return { success: true, data };
  }
  
  const result = contract.request.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate response against contract
 */
export function validateResponse(
  key: ContractKey,
  data: unknown
): { success: true; data: unknown } | { success: false; error: z.ZodError } {
  const contract = contracts[key] as APIContract;
  const result = contract.response.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
