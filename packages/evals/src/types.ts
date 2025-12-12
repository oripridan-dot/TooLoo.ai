/**
 * @tooloo/evals - Cognitive Unit Testing Types
 * Golden Dataset evaluation harness
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';

// ============================================================================
// Golden Input Types
// ============================================================================

/**
 * Category of evaluation
 */
export const EvalCategorySchema = z.enum([
  'coding',       // Code generation, refactoring
  'review',       // Code review, quality analysis
  'planning',     // Task planning, architecture
  'research',     // Information gathering, analysis
  'creative',     // Writing, ideation
  'reasoning',    // Logic, problem solving
  'conversation', // General chat, clarification
  'multistep',    // Multi-step workflows
  'edge-case',    // Edge cases and boundary tests
]);

export type EvalCategory = z.infer<typeof EvalCategorySchema>;

/**
 * Expected skill match for routing evaluation
 */
export const ExpectedRouteSchema = z.object({
  skillId: z.string(),
  minConfidence: z.number().min(0).max(1).default(0.7),
});

export type ExpectedRoute = z.infer<typeof ExpectedRouteSchema>;

/**
 * Evaluation criteria for grading outputs
 */
export const EvalCriteriaSchema = z.object({
  /** Does the output address the request? */
  relevance: z.number().min(1).max(5).optional(),
  /** Is the output factually correct? */
  accuracy: z.number().min(1).max(5).optional(),
  /** Is the output complete? */
  completeness: z.number().min(1).max(5).optional(),
  /** Is the format appropriate? */
  formatting: z.number().min(1).max(5).optional(),
  /** For code: does it run? */
  executable: z.boolean().optional(),
  /** Custom criteria */
  custom: z.record(z.number().min(1).max(5)).optional(),
});

export type EvalCriteria = z.infer<typeof EvalCriteriaSchema>;

/**
 * A Golden Input - a known good test case
 */
export const GoldenInputSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Human-readable name */
  name: z.string(),
  /** Category for grouping */
  category: EvalCategorySchema,
  /** The user input/prompt */
  input: z.string(),
  /** Optional system context */
  context: z.record(z.unknown()).optional(),
  /** Expected skill routing (for router eval) */
  expectedRoute: ExpectedRouteSchema.optional(),
  /** Reference output (for comparison) */
  referenceOutput: z.string().optional(),
  /** Evaluation criteria */
  criteria: EvalCriteriaSchema.optional(),
  /** Tags for filtering */
  tags: z.array(z.string()).default([]),
  /** Difficulty level */
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  /** Is this a regression test? */
  regression: z.boolean().default(false),
  /** Minimum acceptable score (0-1) */
  minScore: z.number().min(0).max(1).default(0.7),
});

export type GoldenInput = z.infer<typeof GoldenInputSchema>;

// ============================================================================
// Evaluation Result Types
// ============================================================================

/**
 * Result of evaluating a single golden input
 */
export interface EvalResult {
  /** Golden input ID */
  inputId: string;
  /** Timestamp */
  timestamp: number;
  /** Model used */
  model: string;
  /** Provider used */
  provider: string;
  /** Skill that was routed to */
  routedSkill?: string;
  /** Routing confidence */
  routingConfidence?: number;
  /** The actual output */
  output: string;
  /** Token usage */
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  /** Latency in ms */
  latency: number;
  /** Graded scores */
  scores: EvalScores;
  /** Overall pass/fail */
  passed: boolean;
  /** Error if failed */
  error?: string;
}

/**
 * Graded scores from LLM judge
 */
export interface EvalScores {
  /** Overall score 0-1 */
  overall: number;
  /** Individual criteria scores */
  criteria: {
    relevance?: number;
    accuracy?: number;
    completeness?: number;
    formatting?: number;
    executable?: boolean;
    custom?: Record<string, number>;
  };
  /** LLM judge reasoning */
  reasoning: string;
}

/**
 * Aggregate results for an evaluation run
 */
export interface EvalReport {
  /** Run identifier */
  runId: string;
  /** Timestamp */
  timestamp: number;
  /** Configuration used */
  config: {
    model: string;
    provider: string;
    judgeModel: string;
  };
  /** Summary statistics */
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
    avgScore: number;
    avgLatency: number;
    totalTokens: number;
  };
  /** Results by category */
  byCategory: Record<EvalCategory, {
    total: number;
    passed: number;
    avgScore: number;
  }>;
  /** Individual results */
  results: EvalResult[];
  /** Comparison with previous run */
  comparison?: {
    previousRunId: string;
    scoreDelta: number;
    passRateDelta: number;
    regressions: string[];
    improvements: string[];
  };
}

// ============================================================================
// Evaluator Configuration
// ============================================================================

export interface EvaluatorConfig {
  /** Model to evaluate */
  targetModel: string;
  /** Provider for target model */
  targetProvider: string;
  /** Model to use for judging (cheaper model) */
  judgeModel: string;
  /** Provider for judge model */
  judgeProvider: string;
  /** Path to golden inputs */
  goldenInputsPath: string;
  /** Filter by category */
  categories?: EvalCategory[];
  /** Filter by tags */
  tags?: string[];
  /** Only run regression tests */
  regressionOnly?: boolean;
  /** Concurrency limit */
  concurrency: number;
  /** Timeout per evaluation (ms) */
  timeout: number;
  /** Save results to disk */
  saveResults: boolean;
  /** Results output path */
  resultsPath?: string;
}

export const defaultEvaluatorConfig: Partial<EvaluatorConfig> = {
  judgeModel: 'gpt-4o-mini',
  judgeProvider: 'openai',
  concurrency: 3,
  timeout: 60000,
  saveResults: true,
};

// ============================================================================
// Judge Prompts
// ============================================================================

export const JUDGE_SYSTEM_PROMPT = `You are an AI evaluation judge. Your job is to objectively score AI-generated outputs against evaluation criteria.

For each evaluation, you will receive:
1. The original user input/prompt
2. The AI's output
3. Optional reference output (ideal answer)
4. Evaluation criteria

Score each criterion from 1-5:
- 5: Excellent - Exceeds expectations
- 4: Good - Meets expectations well
- 3: Adequate - Meets minimum expectations
- 2: Poor - Below expectations
- 1: Failing - Does not meet expectations

Respond in JSON format:
{
  "relevance": <1-5>,
  "accuracy": <1-5>,
  "completeness": <1-5>,
  "formatting": <1-5>,
  "overall": <0.0-1.0>,
  "reasoning": "<brief explanation of scores>"
}

Be objective and consistent. Don't be too lenient or too harsh.`;

export const JUDGE_USER_TEMPLATE = `Evaluate the following AI output:

## User Input
{{input}}

## AI Output
{{output}}

{{#if reference}}
## Reference Output (Ideal)
{{reference}}
{{/if}}

{{#if criteria}}
## Evaluation Criteria
{{criteria}}
{{/if}}

Provide your evaluation in JSON format.`;
