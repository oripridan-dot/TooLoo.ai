// Local type definitions for the engine
export type AIProvider = 'openai' | 'claude' | 'gemini' | 'deepseek';

export interface AIRequest {
  prompt: string;
  provider?: AIProvider;
  context?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  systemMessage?: string;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  performance: {
    responseTimeMs: number;
    executionTimeMs?: number;
    memoryUsageMB?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface WisdomPattern {
  id: string;
  pattern: string;
  context: string;
  confidence: number;
  crossModelValidated: boolean;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIProviderClient {
  name: AIProvider;
  generate(request: AIRequest): Promise<AIResponse>;
  isAvailable(): Promise<boolean>;
  getConfig(): any;
}

export interface ProviderWeight {
  provider: AIProvider;
  weight: number;
  successRate: number;
  avgResponseTime: number;
}

export interface ExecutionContext {
  conversationId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface WisdomEngineConfig {
  enableLearning: boolean;
  confidenceThreshold: number;
  crossValidationRequired: boolean;
  maxPatterns: number;
}

export interface RoutingStrategy {
  selectProvider(
    request: AIRequest,
    availableProviders: AIProvider[],
    weights: ProviderWeight[]
  ): Promise<AIProvider>;
}

export interface CodeExecutor {
  execute(code: string, language: string, timeout?: number): Promise<any>;
  validateCode(code: string, language: string): boolean;
  getComplexityAnalysis(code: string, language: string): Promise<any>;
}