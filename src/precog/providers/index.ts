// @version 3.3.350
/**
 * Precog Providers Index
 *
 * Exports all provider modules and utilities for AI provider orchestration.
 * @module precog/providers
 */

// Core providers
export { default as LLMProvider, generateLLM } from './llm-provider.js';
export { default as DomainExpertise } from './domain-router.js';
export { GeminiImageProvider } from './gemini-image.js';
export { OpenAIImageProvider } from './openai-image.js';

// Smart routing
export { SmartRouter, smartRouter } from './smart-router.js';
export type {
  ProviderCapability,
  RoutingDecision,
  TaskProfile,
  ProviderMetrics,
  SynthesisResult,
} from './smart-router.js';

// Local AI
export { OllamaProvider, ollamaProvider, RECOMMENDED_MODELS } from './ollama-provider.js';
export type {
  OllamaModel,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatMessage,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaHealthStatus,
} from './ollama-provider.js';

// Types
export * from './types.js';
