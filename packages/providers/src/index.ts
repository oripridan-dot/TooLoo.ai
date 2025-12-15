// @version 1.1.0.0
/**
 * @tooloo/providers - Main Entry Point
 * Unified LLM provider interface with circuit breakers and streaming
 * 
 * @version 1.1.0.0
 * @updated 2025-12-15
 */

// Types
export * from './types.js';

// Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitManager,
  CircuitOpenError,
  CircuitTimeoutError,
} from './circuit-breaker.js';

// Streaming
export {
  StreamAccumulator,
  streamWithValidation,
  collectStream,
  streamToSSE,
  textStream,
  createMaxLengthValidator,
  createContentFilterValidator,
  createJSONValidator,
  combineValidators,
  type ChunkValidator,
  type ValidationResult,
  type StreamState,
} from './streaming.js';

// Base Provider
export {
  BaseProvider,
  ProviderRegistry,
  providerRegistry,
} from './base.js';

// Provider Adapters
export {
  DeepSeekProvider,
  AnthropicProvider,
  OpenAIProvider,
  GeminiProvider,
  GEMINI_MODELS,
} from './adapters/index.js';

// Embedding Service
export {
  OpenAIEmbeddingProvider,
  LocalEmbeddingProvider,
  createEmbeddingFunction,
  createEmbeddingProvider,
  getDefaultEmbeddingProvider,
  setDefaultEmbeddingProvider,
  type EmbeddingConfig,
  type EmbeddingResult,
  type EmbeddingProvider,
  type EmbeddingServiceConfig,
} from './embeddings.js';

// Version
export const VERSION = '1.1.0.0';
