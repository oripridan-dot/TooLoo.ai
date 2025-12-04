// @version 3.0.0
import { z } from 'zod';
import OpenAI from 'openai';
import { getXAIConfig } from '../shared/xai/config.js';
import { TransparencyWrapper } from '../shared/xai/transparency-wrapper.js';
import { ProviderTrace, ReasoningTrace } from '../shared/xai/schemas.js';

/**
 * Schema for a single step in the reasoning process.
 * Represents a node in the "Tree of Thoughts".
 */
export const ReasoningStepSchema = z.object({
  thought: z.string().describe('The reasoning thought process'),
  evidence: z.string().describe('Evidence or context supporting this thought'),
  confidence: z.number().min(0).max(1).describe('Confidence score for this reasoning path'),
  next_action: z.string().describe('The proposed next action or conclusion'),
});

export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;

/**
 * ReasoningChain
 * Implements a "Tree of Thoughts" approach for complex problem solving.
 * Generates multiple potential reasoning paths before selecting the best one.
 *
 * V3: Includes regeneration loop for low-confidence responses.
 */
export class ReasoningChain {
  private openai: OpenAI;
  private regenerationCount: number = 0;
  private readonly MAX_REGENERATIONS = 3;

  constructor() {
    // Initialize OpenAI client
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      console.warn('OPENAI_API_KEY is not set. ReasoningChain will fail.');
    }
    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key', // Prevent crash on init, fail on call
    });
  }

  /**
   * Generates multiple potential reasoning steps (thoughts) for a given input.
   * @param input The problem or query to reason about.
   * @param branchCount Number of alternative thoughts to generate.
   */
  async generateThoughts(input: string, branchCount: number = 3): Promise<ReasoningStep[]> {
    if (!process.env['OPENAI_API_KEY']) {
      console.error('Cannot generate thoughts: OPENAI_API_KEY is missing.');
      return [];
    }

    console.log(`Generating ${branchCount} reasoning branches for: ${input}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env['OPENAI_MODEL'] || 'gpt-4o', // Use configured model or default
        messages: [
          {
            role: 'system',
            content: `You are a high-level reasoning engine. 
            Analyze the user's input and generate a structured reasoning step.
            You must return a valid JSON object matching this schema:
            {
              "thought": "Your detailed reasoning process",
              "evidence": "Facts or context supporting this thought",
              "confidence": 0.0 to 1.0,
              "next_action": "What should be done next?"
            }
            Do not include markdown formatting like \`\`\`json. Just the raw JSON object.`,
          },
          {
            role: 'user',
            content: input,
          },
        ],
        n: branchCount, // Generate multiple independent thoughts
        temperature: 0.7, // Allow for some diversity in reasoning
      });

      const steps: ReasoningStep[] = [];

      for (const choice of response.choices) {
        try {
          const content = choice.message.content;
          if (!content) continue;

          // Clean up potential markdown code blocks if the model ignores instructions
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();

          const parsed = JSON.parse(cleanContent);
          const step = ReasoningStepSchema.parse(parsed);
          steps.push(step);
        } catch (err) {
          console.warn('Failed to parse reasoning step:', err);
        }
      }

      return steps;
    } catch (error) {
      console.error('Error generating thoughts with OpenAI:', error);
      return [];
    }
  }

  /**
   * Evaluates a list of reasoning steps and selects the best one based on confidence and logic.
   * @param steps The list of generated reasoning steps.
   */
  async selectBestPath(steps: ReasoningStep[]): Promise<ReasoningStep | null> {
    if (steps.length === 0) return null;

    // Sort by confidence descending
    const sortedSteps = [...steps].sort((a, b) => b.confidence - a.confidence);

    // Return the highest confidence step
    return sortedSteps[0] ?? null;
  }

  /**
   * V3: Self-Reflection Rubric — evaluates response against Accuracy, Bias, Clarity
   */
  async evaluateWithRubric(
    response: ReasoningStep,
    originalInput: string
  ): Promise<{ score: number; issues: string[]; shouldRegenerate: boolean }> {
    const config = getXAIConfig();

    try {
      const evalResponse = await this.openai.chat.completions.create({
        model: process.env['OPENAI_MODEL'] || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a meta-cognitive evaluator. Evaluate the following reasoning against this rubric:

1. ACCURACY (0-1): Are the facts correct? Any potential hallucinations?
2. BIAS (0-1): Is the reasoning balanced and fair?
3. CLARITY (0-1): Is the thought process clear and well-structured?

Return JSON:
{
  "accuracy": 0.0-1.0,
  "bias": 0.0-1.0,
  "clarity": 0.0-1.0,
  "overall": 0.0-1.0,
  "issues": ["list of specific issues found"],
  "improvement_hints": ["suggestions for improvement"]
}`,
          },
          {
            role: 'user',
            content: `Original Query: ${originalInput}

Reasoning to evaluate:
Thought: ${response.thought}
Evidence: ${response.evidence}
Confidence: ${response.confidence}
Next Action: ${response.next_action}`,
          },
        ],
        temperature: 0.2, // Low temperature for consistent evaluation
      });

      const content = evalResponse.choices[0]?.message?.content;
      if (!content) {
        return { score: response.confidence, issues: [], shouldRegenerate: false };
      }

      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const evaluation = JSON.parse(cleanContent);

      const overallScore =
        evaluation.overall || (evaluation.accuracy + evaluation.bias + evaluation.clarity) / 3;

      return {
        score: overallScore,
        issues: evaluation.issues || [],
        shouldRegenerate: overallScore < config.CONFIDENCE_THRESHOLD,
      };
    } catch (error) {
      console.warn('[ReasoningChain] Rubric evaluation failed:', error);
      return {
        score: response.confidence,
        issues: [],
        shouldRegenerate: response.confidence < config.CONFIDENCE_THRESHOLD,
      };
    }
  }

  /**
   * V3: Regeneration Loop — retries with refined prompt if confidence is low
   */
  async regenerateWithRefinement(
    input: string,
    previousAttempt: ReasoningStep,
    issues: string[]
  ): Promise<ReasoningStep | null> {
    this.regenerationCount++;
    console.log(
      `[ReasoningChain] Regeneration attempt ${this.regenerationCount}/${this.MAX_REGENERATIONS}`
    );

    if (this.regenerationCount >= this.MAX_REGENERATIONS) {
      console.warn('[ReasoningChain] Max regeneration attempts reached');
      return previousAttempt; // Return best effort
    }

    // Build refined prompt with feedback
    const refinedPrompt = `${input}

[SELF-REFLECTION FEEDBACK]
The previous reasoning attempt had the following issues:
${issues.map((i) => `- ${i}`).join('\n')}

Previous thought (needs improvement):
"${previousAttempt.thought}"

Please provide improved reasoning that addresses these issues.
Be more specific, provide stronger evidence, and ensure accuracy.`;

    // Generate with more branches for diversity
    const thoughts = await this.generateThoughts(refinedPrompt, 5);
    const bestPath = await this.selectBestPath(thoughts);

    if (!bestPath) return previousAttempt;

    // Evaluate the new attempt
    const evaluation = await this.evaluateWithRubric(bestPath, input);

    if (evaluation.shouldRegenerate && this.regenerationCount < this.MAX_REGENERATIONS) {
      return this.regenerateWithRefinement(input, bestPath, evaluation.issues);
    }

    return bestPath;
  }

  /**
   * Executes the full reasoning chain with V3 regeneration loop.
   * @param input The user input.
   */
  async execute(input: string): Promise<ReasoningStep | null> {
    const config = getXAIConfig();
    this.regenerationCount = 0; // Reset counter for new execution

    const thoughts = await this.generateThoughts(input);
    let bestPath = await this.selectBestPath(thoughts);

    if (!bestPath) return null;

    // V3: Evaluate with self-reflection rubric
    const evaluation = await this.evaluateWithRubric(bestPath, input);

    console.log(
      `[ReasoningChain] Initial confidence: ${bestPath.confidence.toFixed(2)}, ` +
        `Rubric score: ${evaluation.score.toFixed(2)}`
    );

    // V3: Trigger regeneration loop if below threshold
    if (evaluation.shouldRegenerate) {
      console.log(
        `[ReasoningChain] Confidence ${evaluation.score.toFixed(2)} < ${config.CONFIDENCE_THRESHOLD}. ` +
          `Triggering regeneration loop...`
      );
      bestPath = await this.regenerateWithRefinement(input, bestPath, evaluation.issues);
    }

    return bestPath;
  }

  /**
   * V3: Execute with XAI transparency envelope
   */
  async executeWithTransparency(input: string): Promise<{
    result: ReasoningStep | null;
    wrapper: TransparencyWrapper;
  }> {
    const wrapper = TransparencyWrapper.create();
    const startTime = Date.now();

    const result = await this.execute(input);

    const latencyMs = Date.now() - startTime;

    // Build reasoning trace
    if (result) {
      wrapper.meta.addReasoning({
        thought: result.thought,
        evidence: result.evidence,
        confidence: result.confidence,
        branch_id: 1,
      });
    }

    wrapper.meta
      .addProvider({
        provider: 'openai',
        model: process.env['OPENAI_MODEL'] || 'gpt-4o',
        role: 'generator',
        latency_ms: latencyMs,
        cost_usd: 0.02, // Approximate
        success: result !== null,
      })
      .setPrimary('openai', process.env['OPENAI_MODEL'] || 'gpt-4o')
      .setRouting('Tree of Thoughts reasoning chain', 'complex', 'single')
      .setConfidence(result?.confidence || 0);

    if (this.regenerationCount > 0) {
      wrapper.meta.recordRegeneration(this.regenerationCount);
    }

    return { result, wrapper };
  }
}
