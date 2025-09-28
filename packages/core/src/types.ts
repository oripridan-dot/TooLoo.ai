import { z } from 'zod';

// AI Provider Types
export const AIProviderSchema = z.enum(['openai', 'claude', 'gemini', 'deepseek']);
export type AIProvider = z.infer<typeof AIProviderSchema>;

// Request and Response Types
export const AIRequestSchema = z.object({
  prompt: z.string(),
  provider: AIProviderSchema.optional(),
  context: z.record(z.unknown()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  systemMessage: z.string().optional(),
});

export type AIRequest = z.infer<typeof AIRequestSchema>;

export const AIResponseSchema = z.object({
  content: z.string(),
  provider: AIProviderSchema,
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
  performance: z.object({
    responseTimeMs: z.number(),
    executionTimeMs: z.number().optional(),
    memoryUsageMB: z.number().optional(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// Code Execution Types
export const CodeExecutionRequestSchema = z.object({
  code: z.string(),
  language: z.enum(['javascript', 'typescript', 'python']),
  timeout: z.number().positive().default(30000),
  memoryLimit: z.number().positive().default(128), // MB
});

export type CodeExecutionRequest = z.infer<typeof CodeExecutionRequestSchema>;

export const CodeExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
  executionTime: z.number(),
  memoryUsed: z.number(),
  complexity: z.object({
    timeComplexity: z.string().optional(),
    spaceComplexity: z.string().optional(),
  }).optional(),
});

export type CodeExecutionResult = z.infer<typeof CodeExecutionResultSchema>;

// Conversation Types
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const ConversationMessageSchema = z.object({
  id: z.string(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.date(),
  provider: AIProviderSchema.optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

export const ConversationSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  messages: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export type Conversation = z.infer<typeof ConversationSchema>;

// Learning and Wisdom Types
export const WisdomPatternSchema = z.object({
  id: z.string(),
  pattern: z.string(),
  context: z.string(),
  confidence: z.number().min(0).max(1),
  crossModelValidated: z.boolean(),
  successRate: z.number().min(0).max(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type WisdomPattern = z.infer<typeof WisdomPatternSchema>;

// Performance Metrics Types
export const PerformanceMetricSchema = z.object({
  provider: AIProviderSchema,
  promptType: z.string(),
  responseTime: z.number(),
  tokenUsage: z.number(),
  successRate: z.number().min(0).max(1),
  timestamp: z.date(),
});

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>;

// API Response Wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};

// Configuration Types
export const ConfigSchema = z.object({
  providers: z.record(AIProviderSchema, z.object({
    apiKey: z.string(),
    baseUrl: z.string().optional(),
    enabled: z.boolean().default(true),
    weight: z.number().min(0).max(1).default(1),
  })),
  database: z.object({
    url: z.string(),
    maxConnections: z.number().positive().default(10),
  }),
  server: z.object({
    port: z.number().positive().default(3001),
    host: z.string().default('localhost'),
    corsOrigin: z.string().default('http://localhost:3000'),
  }),
  ai: z.object({
    defaultProvider: AIProviderSchema.default('openai'),
    maxRetries: z.number().positive().default(3),
    timeoutMs: z.number().positive().default(30000),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;