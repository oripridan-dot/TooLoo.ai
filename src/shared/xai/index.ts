// @version 2.2.238
/**
 * XAI (Explainable AI) Module
 * TooLoo.ai V3 — Multi-Provider Orchestration Transparency Layer
 *
 * This module provides the transparency wrapper that justifies TooLoo.ai's existence:
 * showing exactly which providers collaborated, how validation worked, and the costs involved.
 */

export { TransparencyWrapper, wrapResponse } from './transparency-wrapper.js';
export {
  XAIEnvelopeSchema,
  ProviderTraceSchema,
  ValidationTraceSchema,
  type XAIEnvelope,
  type ProviderTrace,
  type ValidationTrace,
  type XAIMeta,
} from './schemas.js';
export { type XAIConfig, getXAIConfig, requiresFullValidation } from './config.js';
