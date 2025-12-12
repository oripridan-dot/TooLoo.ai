/**
 * @tooloo/contracts - API Contract Types
 * Zod-based request/response validation
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z.string().optional(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      hasMore: z.boolean(),
      nextCursor: z.string().optional(),
    }),
  });

export const APIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  stack: z.string().optional(),
});

export type APIError = z.infer<typeof APIErrorSchema>;

export const APIResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.boolean(),
    data: dataSchema.optional(),
    error: APIErrorSchema.optional(),
    meta: z.object({
      requestId: z.string(),
      timestamp: z.number(),
      latency: z.number().optional(),
    }).optional(),
  });

// ============================================================================
// Chat Contracts
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(100000),
  sessionId: z.string().uuid().optional(),
  context: z.object({
    projectId: z.string().optional(),
    fileContext: z.array(z.object({
      path: z.string(),
      content: z.string(),
      language: z.string().optional(),
    })).optional(),
    intent: z.string().optional(),
  }).optional(),
  options: z.object({
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    stream: z.boolean().optional(),
  }).optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  message: ChatMessageSchema,
  routing: z.object({
    skill: z.string(),
    confidence: z.number(),
    provider: z.string(),
    model: z.string(),
  }).optional(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
    cost: z.number().optional(),
  }).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ============================================================================
// Agent/Task Contracts
// ============================================================================

export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum([
  'pending',
  'queued',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskRequestSchema = z.object({
  type: z.string(),
  title: z.string(),
  description: z.string().optional(),
  priority: TaskPrioritySchema.default('medium'),
  context: z.record(z.string(), z.unknown()).optional(),
  dependencies: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().nonnegative().default(3),
    backoffMs: z.number().positive().default(1000),
    backoffMultiplier: z.number().positive().default(2),
  }).optional(),
});

export type TaskRequest = z.infer<typeof TaskRequestSchema>;

export const TaskResponseSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  createdAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  progress: z.number().min(0).max(100).optional(),
  result: z.unknown().optional(),
  error: APIErrorSchema.optional(),
  artifacts: z.array(z.string()).optional(),
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

// ============================================================================
// Artifact Contracts
// ============================================================================

export const ArtifactTypeSchema = z.enum([
  'code',
  'document',
  'image',
  'config',
  'data',
  'test',
  'other',
]);

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  type: ArtifactTypeSchema,
  name: z.string(),
  path: z.string().optional(),
  content: z.string().optional(),
  contentHash: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
  createdBy: z.string().optional(),
  taskId: z.string().uuid().optional(),
  version: z.number().int().positive().default(1),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const CreateArtifactRequestSchema = z.object({
  type: ArtifactTypeSchema,
  name: z.string(),
  content: z.string(),
  path: z.string().optional(),
  mimeType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  taskId: z.string().uuid().optional(),
});

export type CreateArtifactRequest = z.infer<typeof CreateArtifactRequestSchema>;

// ============================================================================
// Routing Contracts
// ============================================================================

export const RouteRequestSchema = z.object({
  task: z.string(),
  context: z.object({
    language: z.string().optional(),
    framework: z.string().optional(),
    complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
    urgency: z.enum(['low', 'normal', 'high']).optional(),
    budget: z.enum(['economy', 'balanced', 'premium']).optional(),
  }).optional(),
  constraints: z.object({
    maxLatency: z.number().optional(),
    maxCost: z.number().optional(),
    requiredCapabilities: z.array(z.string()).optional(),
    excludeProviders: z.array(z.string()).optional(),
  }).optional(),
});

export type RouteRequest = z.infer<typeof RouteRequestSchema>;

export const RouteResponseSchema = z.object({
  provider: z.string(),
  model: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  alternatives: z.array(z.object({
    provider: z.string(),
    model: z.string(),
    confidence: z.number(),
  })).optional(),
  estimatedCost: z.number().optional(),
  estimatedLatency: z.number().optional(),
});

export type RouteResponse = z.infer<typeof RouteResponseSchema>;

// ============================================================================
// Skill Contracts
// ============================================================================

export const SkillMatchRequestSchema = z.object({
  query: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  maxResults: z.number().int().positive().max(10).default(3),
});

export type SkillMatchRequest = z.infer<typeof SkillMatchRequestSchema>;

export const SkillMatchResponseSchema = z.object({
  matches: z.array(z.object({
    skillId: z.string(),
    skillName: z.string(),
    confidence: z.number().min(0).max(1),
    matchType: z.enum(['semantic', 'keyword', 'intent', 'fallback']),
    reasoning: z.string().optional(),
  })),
  selectedSkill: z.string().optional(),
});

export type SkillMatchResponse = z.infer<typeof SkillMatchResponseSchema>;

// ============================================================================
// Health & System Contracts
// ============================================================================

export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']);

export const HealthCheckResponseSchema = z.object({
  status: HealthStatusSchema,
  version: z.string(),
  uptime: z.number(),
  timestamp: z.number(),
  services: z.record(z.string(), z.object({
    status: HealthStatusSchema,
    latency: z.number().optional(),
    message: z.string().optional(),
  })),
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const SystemMetricsSchema = z.object({
  requests: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
    avgLatency: z.number(),
  }),
  tokens: z.object({
    total: z.number(),
    prompt: z.number(),
    completion: z.number(),
  }),
  cache: z.object({
    hits: z.number(),
    misses: z.number(),
    hitRate: z.number(),
  }),
  providers: z.record(z.string(), z.object({
    requests: z.number(),
    errors: z.number(),
    avgLatency: z.number(),
    circuitState: z.enum(['closed', 'open', 'half-open']),
  })),
});

export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;

// ============================================================================
// Validation Contracts
// ============================================================================

export const ValidateRequestSchema = z.object({
  content: z.string(),
  contentType: z.enum(['code', 'text', 'json', 'markdown']),
  language: z.string().optional(),
  rules: z.array(z.string()).optional(),
});

export type ValidateRequest = z.infer<typeof ValidateRequestSchema>;

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  score: z.number().min(0).max(1),
  issues: z.array(z.object({
    severity: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    line: z.number().optional(),
    column: z.number().optional(),
    rule: z.string().optional(),
  })),
  suggestions: z.array(z.string()).optional(),
});

export type ValidationResult = z.infer<typeof ValidationResultSchema>;
