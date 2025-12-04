// @version 2.2.238
/**
 * XAI Configuration — Feature flags and thresholds for V3
 */

export interface XAIConfig {
  // Feature Flags
  V3_ENABLED: boolean;
  V3_FULL_VALIDATION: boolean;

  // Thresholds
  CONFIDENCE_THRESHOLD: number; // Below this triggers regeneration
  CRITICALITY_THRESHOLD: number; // Above this triggers full validation
  CONSENSUS_REQUIRED: number; // Minimum agreement between providers

  // Limits
  MAX_REGENERATION_ATTEMPTS: number;
  MAX_VALIDATION_PROVIDERS: number;
  VALIDATION_TIMEOUT_MS: number;

  // Cost Controls
  MAX_COST_PER_REQUEST: number;
  WARN_COST_THRESHOLD: number;

  // Display Options
  SHOW_VERBOSE_TRACE: boolean; // Full trace vs badge
  COLLAPSE_BY_DEFAULT: boolean;
}

const defaultConfig: XAIConfig = {
  // Feature Flags
  V3_ENABLED: true,
  V3_FULL_VALIDATION: false, // Start with off, enable per-request or globally

  // Thresholds
  CONFIDENCE_THRESHOLD: 0.8, // Below 0.8 triggers regeneration
  CRITICALITY_THRESHOLD: 0.7, // Tasks scoring above this get full validation
  CONSENSUS_REQUIRED: 0.75, // 75% agreement for ensemble mode

  // Limits
  MAX_REGENERATION_ATTEMPTS: 3,
  MAX_VALIDATION_PROVIDERS: 4,
  VALIDATION_TIMEOUT_MS: 60000, // 60s for full validation pipeline

  // Cost Controls
  MAX_COST_PER_REQUEST: 0.5, // $0.50 max per request
  WARN_COST_THRESHOLD: 0.1, // Warn above $0.10

  // Display Options
  SHOW_VERBOSE_TRACE: false, // Badge by default, expand for trace
  COLLAPSE_BY_DEFAULT: true,
};

// Runtime config (can be modified)
let runtimeConfig: XAIConfig = { ...defaultConfig };

/**
 * Get current XAI configuration
 */
export function getXAIConfig(): XAIConfig {
  return { ...runtimeConfig };
}

/**
 * Update XAI configuration
 */
export function updateXAIConfig(updates: Partial<XAIConfig>): XAIConfig {
  runtimeConfig = { ...runtimeConfig, ...updates };
  return getXAIConfig();
}

/**
 * Reset to default configuration
 */
export function resetXAIConfig(): XAIConfig {
  runtimeConfig = { ...defaultConfig };
  return getXAIConfig();
}

/**
 * Determine if a task requires full validation based on criticality
 */
export function requiresFullValidation(
  taskClassification: 'simple' | 'moderate' | 'complex' | 'critical',
  explicitFlag?: boolean
): boolean {
  if (explicitFlag !== undefined) return explicitFlag;
  if (!runtimeConfig.V3_FULL_VALIDATION) return false;

  const criticalityScore = {
    simple: 0.2,
    moderate: 0.5,
    complex: 0.75,
    critical: 1.0,
  }[taskClassification];

  return criticalityScore >= runtimeConfig.CRITICALITY_THRESHOLD;
}
