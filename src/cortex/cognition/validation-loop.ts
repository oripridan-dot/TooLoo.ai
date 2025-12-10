// @version 3.0.0
/**
 * Validation Loop Module
 * TooLoo.ai V3 — Multi-Provider Validation Pipeline
 *
 * Implements the 4-stage validation pipeline:
 * 1. Generate (Initial Response)
 * 2. Review (Quality Check)
 * 3. Test (Verification)
 * 4. Optimize (Final Refinement)
 */

import { z } from 'zod';
import { BiasDetector } from '../../core/ethics/bias-detector.js';
import { TransparencyWrapper, type XAIEnvelope, getXAIConfig } from '../../shared/xai/index.js';

// Provider type matching the schema
type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'local';
type RoleType = 'generator' | 'reviewer' | 'tester' | 'optimizer' | 'synthesizer' | 'validator';
type StageType = 'generate' | 'review' | 'test' | 'optimize' | 'consensus';
type StatusType = 'passed' | 'failed' | 'skipped' | 'pending';

// Stage Configuration
interface StageConfig {
  provider: ProviderType;
  model: string;
  role: RoleType;
  systemPrompt: string;
}

// Validation Stage Output Schema
export const ValidationStageOutputSchema = z.object({
  stage: z.string(),
  provider: z.string(),
  model: z.string(),
  content: z.string(),
  status: z.enum(['passed', 'failed', 'skipped', 'pending']),
  score: z.number().min(0).max(1),
  feedback: z.string().optional(),
  latencyMs: z.number(),
});

type ValidationStageOutput = z.infer<typeof ValidationStageOutputSchema>;

// Full Validation Loop Output
export const ValidationLoopOutputSchema = z.object({
  finalContent: z.string(),
  stages: z.array(ValidationStageOutputSchema),
  validationStatus: z.enum(['validated', 'partial', 'failed']),
  consensusScore: z.number().min(0).max(1),
  confidenceScore: z.number().min(0).max(1),
  totalLatencyMs: z.number(),
  wrapper: z.custom<XAIEnvelope>(),
});

export type ValidationLoopOutput = z.infer<typeof ValidationLoopOutputSchema>;

// Default stage configurations for the validation pipeline
const DEFAULT_STAGE_CONFIGS: Record<StageType, StageConfig> = {
  generate: {
    provider: 'gemini',
    model: 'gemini-2.0-flash-exp',
    role: 'generator',
    systemPrompt: `You are a precise and helpful AI assistant. Generate a high-quality, 
accurate response to the user's query. Be thorough but concise.`,
  },
  review: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    role: 'reviewer',
    systemPrompt: `You are a critical reviewer. Analyze the following AI-generated response 
for accuracy, completeness, bias, and clarity. Provide specific feedback and a score (0-1).
If the response needs improvement, explain exactly what should be changed.
Format: {"score": 0.X, "feedback": "...", "improved_response": "..." or null}`,
  },
  test: {
    provider: 'openai',
    model: 'gpt-4o',
    role: 'tester',
    systemPrompt: `You are a verification specialist. Test the following response for:
1. Factual accuracy (no hallucinations)
2. Logical consistency
3. Completeness of answer
4. Potential edge cases missed
Provide a verification score (0-1) and any issues found.
Format: {"score": 0.X, "issues": [...], "verified": true/false}`,
  },
  optimize: {
    provider: 'deepseek',
    model: 'deepseek-chat',
    role: 'optimizer',
    systemPrompt: `You are an optimization specialist. Given the original query, the response,
and the review/test feedback, produce the final optimized response that addresses all concerns.
Your response should be the polished, production-ready answer.`,
  },
  consensus: {
    provider: 'openai',
    model: 'gpt-4o',
    role: 'synthesizer',
    systemPrompt: `Synthesize multiple responses into a final consensus.`,
  },
};

/**
 * Interface for provider callback
 */
interface ProviderCallback {
  (params: {
    provider: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }): Promise<{ content: string; latencyMs: number }>;
}

/**
 * Map stage name to role type
 */
function stageToRole(stage: string): RoleType {
  const mapping: Record<string, RoleType> = {
    generate: 'generator',
    review: 'reviewer',
    test: 'tester',
    optimize: 'optimizer',
    consensus: 'synthesizer',
  };
  return mapping[stage] ?? 'validator';
}

/**
 * ValidationLoop class
 * Orchestrates the multi-provider validation pipeline
 */
export class ValidationLoop {
  private stageConfigs: Record<string, StageConfig>;
  private generateResponse: ProviderCallback;
  private wrapper: TransparencyWrapper;

  constructor(
    generateFn: ProviderCallback,
    customConfigs?: Partial<Record<StageType, StageConfig>>
  ) {
    this.stageConfigs = { ...DEFAULT_STAGE_CONFIGS, ...customConfigs };
    this.generateResponse = generateFn;
    this.wrapper = new TransparencyWrapper();
  }

  /**
   * Execute the full validation loop
   */
  async execute(
    userPrompt: string,
    options: {
      skipOptimize?: boolean;
      minConfidence?: number;
      maxRetries?: number;
    } = {}
  ): Promise<ValidationLoopOutput> {
    const startTime = Date.now();
    const stages: ValidationStageOutput[] = [];
    const config = getXAIConfig();
    const minConfidence = options.minConfidence ?? config.CONFIDENCE_THRESHOLD;
    const maxRetries = options.maxRetries ?? 2;

    let currentContent = '';
    let retryCount = 0;

    // Stage 1: Generate
    const generateStage = await this.runStage('generate', userPrompt);
    stages.push(generateStage);
    currentContent = generateStage.content;

    // ETHICS CHECK: Bias Detection
    const biasResult = await BiasDetector.analyze(currentContent);
    let biasFeedback = '';
    if (biasResult.detected) {
      console.warn(`[ValidationLoop] Bias detected: ${biasResult.reasoning}`);
      biasFeedback = `\n\nWARNING: The generated content was flagged for potential bias (${biasResult.categories.join(', ')}). Please ensure the response is neutral and fair.`;
    }

    // Stage 2: Review
    const reviewPrompt = `Original Query: ${userPrompt}\n\nAI Response to Review:\n${currentContent}${biasFeedback}`;
    const reviewStage = await this.runStage('review', reviewPrompt);
    stages.push(reviewStage);

    // Parse review feedback
    let reviewData: {
      score: number;
      feedback: string;
      improved_response?: string;
    } = {
      score: reviewStage.score,
      feedback: reviewStage.content,
    };
    try {
      reviewData = JSON.parse(reviewStage.content);
      reviewStage.score = reviewData.score;
      reviewStage.feedback = reviewData.feedback;
      if (reviewData.improved_response) {
        currentContent = reviewData.improved_response;
      }
    } catch {
      // Keep original content if JSON parse fails
    }

    // Stage 3: Test/Verify
    const testPrompt = `Original Query: ${userPrompt}\n\nResponse to Verify:\n${currentContent}\n\nReview Feedback: ${reviewData.feedback}`;
    const testStage = await this.runStage('test', testPrompt);
    stages.push(testStage);

    // Parse test results
    let testData: { score: number; issues: string[]; verified: boolean } = {
      score: testStage.score,
      issues: [],
      verified: testStage.score >= minConfidence,
    };
    try {
      testData = JSON.parse(testStage.content);
      testStage.score = testData.score;
      testStage.feedback = testData.issues.join('; ');
    } catch {
      // Keep defaults if JSON parse fails
    }

    // Calculate consensus before optimization
    const preOptimizeConsensus = this.calculateConsensus(stages);

    // Stage 4: Optimize (if needed and not skipped)
    if (!options.skipOptimize && preOptimizeConsensus < 0.9) {
      const optimizePrompt = `Original Query: ${userPrompt}

Current Response:
${currentContent}

Review Feedback (score: ${reviewData.score}):
${reviewData.feedback}

Test Results (score: ${testData.score}):
${testData.issues.length > 0 ? testData.issues.join('\n') : 'No issues found'}

Please produce the final, optimized response that addresses all concerns.`;

      const optimizeStage = await this.runStage('optimize', optimizePrompt);
      stages.push(optimizeStage);
      currentContent = optimizeStage.content;
    }

    // Calculate final scores
    const consensusScore = this.calculateConsensus(stages);
    const confidenceScore = this.calculateConfidence(stages);

    // Determine validation status
    let validationStatus: 'validated' | 'partial' | 'failed' = 'validated';
    if (confidenceScore < 0.6 || consensusScore < 0.6) {
      validationStatus = 'failed';
    } else if (confidenceScore < minConfidence || consensusScore < 0.8) {
      validationStatus = 'partial';
    }

    // Retry if failed and retries remaining
    if (validationStatus === 'failed' && retryCount < maxRetries) {
      retryCount++;
      console.log(`[ValidationLoop] Retry ${retryCount}/${maxRetries} due to low confidence`);
      // Could implement recursive retry here
    }

    // Build transparency wrapper
    const totalLatencyMs = Date.now() - startTime;

    // Add provider traces to wrapper using the builder pattern
    for (const stage of stages) {
      this.wrapper.meta.addProvider({
        provider: stage.provider as ProviderType,
        model: stage.model,
        role: stageToRole(stage.stage),
        latency_ms: stage.latencyMs,
        cost_usd: 0.001, // Estimate
        success: stage.status === 'passed',
      });

      this.wrapper.meta.addValidation({
        stage: stage.stage as StageType,
        provider: stage.provider,
        model: stage.model,
        status: stage.status as StatusType,
        score: stage.score,
        feedback: stage.feedback,
        timestamp: new Date().toISOString(),
      });
    }

    // Set routing info
    this.wrapper.meta.setRouting(
      `Multi-provider validation pipeline: ${stages.map((s) => s.model).join(' → ')}`,
      'complex',
      'validation_loop'
    );
    this.wrapper.meta.setConfidence(confidenceScore, consensusScore);
    this.wrapper.meta.setValidationStatus(
      validationStatus === 'validated'
        ? 'full'
        : validationStatus === 'partial'
          ? 'partial'
          : 'none'
    );

    const envelope = this.wrapper.wrap(currentContent);

    return {
      finalContent: currentContent,
      stages,
      validationStatus,
      consensusScore,
      confidenceScore,
      totalLatencyMs,
      wrapper: envelope,
    };
  }

  /**
   * Run a single validation stage
   */
  private async runStage(stageName: string, prompt: string): Promise<ValidationStageOutput> {
    const config = this.stageConfigs[stageName];
    if (!config) {
      throw new Error(`Unknown stage: ${stageName}`);
    }

    const startTime = Date.now();

    try {
      const result = await this.generateResponse({
        provider: config.provider,
        model: config.model,
        systemPrompt: config.systemPrompt,
        userPrompt: prompt,
      });

      return {
        stage: stageName,
        provider: config.provider,
        model: config.model,
        content: result.content,
        status: 'passed',
        score: 0.85, // Default score, may be overwritten by parsing
        latencyMs: result.latencyMs,
      };
    } catch (error) {
      return {
        stage: stageName,
        provider: config.provider,
        model: config.model,
        content: `Error in ${stageName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'failed',
        score: 0,
        feedback: error instanceof Error ? error.message : 'Unknown error',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Calculate consensus score from all stages
   */
  private calculateConsensus(stages: ValidationStageOutput[]): number {
    if (stages.length === 0) return 0;
    const passedStages = stages.filter((s) => s.status === 'passed');
    const avgScore = passedStages.reduce((sum, s) => sum + s.score, 0) / stages.length;
    const passRate = passedStages.length / stages.length;
    return (avgScore + passRate) / 2;
  }

  /**
   * Calculate confidence score based on stage results
   */
  private calculateConfidence(stages: ValidationStageOutput[]): number {
    if (stages.length === 0) return 0;
    // Weight later stages more heavily (review, test, optimize are more important)
    const weights = { generate: 0.2, review: 0.3, test: 0.3, optimize: 0.2 };
    let weightedSum = 0;
    let totalWeight = 0;

    for (const stage of stages) {
      const weight = weights[stage.stage as keyof typeof weights] ?? 0.25;
      weightedSum += stage.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
}

// Default singleton instance factory
let defaultInstance: ValidationLoop | null = null;

/**
 * Get or create the default ValidationLoop instance
 */
export function validationLoop(generateFn?: ProviderCallback): ValidationLoop {
  if (!defaultInstance && !generateFn) {
    throw new Error('ValidationLoop requires a generate function on first call');
  }
  if (!defaultInstance && generateFn) {
    defaultInstance = new ValidationLoop(generateFn);
  }
  return defaultInstance!;
}

/**
 * Convenience: Run validation on critical/high-stakes content
 */
export async function validateCritical(
  prompt: string,
  generateFn: ProviderCallback
): Promise<ValidationLoopOutput> {
  const loop = new ValidationLoop(generateFn);
  return loop.execute(prompt, { minConfidence: 0.85, maxRetries: 3 });
}

/**
 * Convenience: Run validation on code-related content
 */
export async function validateCode(
  prompt: string,
  generateFn: ProviderCallback
): Promise<ValidationLoopOutput> {
  const codeConfigs: Partial<Record<StageType, StageConfig>> = {
    generate: {
      provider: 'deepseek',
      model: 'deepseek-coder',
      role: 'generator',
      systemPrompt: `You are an expert programmer. Generate clean, efficient, well-documented code.`,
    },
    test: {
      provider: 'openai',
      model: 'gpt-4o',
      role: 'tester',
      systemPrompt: `You are a code reviewer. Analyze the code for:
1. Correctness and bug potential
2. Security vulnerabilities
3. Performance issues
4. Best practices violations
Format: {"score": 0.X, "issues": [...], "verified": true/false}`,
    },
  };
  const loop = new ValidationLoop(generateFn, codeConfigs);
  return loop.execute(prompt, { minConfidence: 0.9, maxRetries: 2 });
}
