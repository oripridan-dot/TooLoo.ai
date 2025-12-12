/**
 * Cognitive Evaluator
 * Runs golden inputs through skills and grades outputs
 * 
 * @version 2.0.0-alpha.0
 */

import type { Provider, CompletionRequest, CompletionResponse } from '@tooloo/providers';
import type { SkillRouter, SkillDefinition } from '@tooloo/skills';
import { 
  type GoldenInput, 
  type EvalResult, 
  type EvalReport,
  type EvalScores,
  type EvaluatorConfig,
  type EvalCategory,
  JUDGE_SYSTEM_PROMPT,
  defaultEvaluatorConfig,
} from './types.js';
import { loadGoldenInputs } from './loader.js';

export class CognitiveEvaluator {
  private config: EvaluatorConfig;
  private targetProvider: Provider;
  private judgeProvider: Provider;
  private router?: SkillRouter;
  
  constructor(
    config: Partial<EvaluatorConfig> & Pick<EvaluatorConfig, 'targetModel' | 'targetProvider' | 'goldenInputsPath'>,
    targetProvider: Provider,
    judgeProvider: Provider,
    router?: SkillRouter
  ) {
    this.config = {
      ...defaultEvaluatorConfig,
      ...config,
      judgeModel: config.judgeModel ?? 'gpt-4o-mini',
      judgeProvider: config.judgeProvider ?? 'openai',
      concurrency: config.concurrency ?? 3,
      timeout: config.timeout ?? 60000,
      saveResults: config.saveResults ?? true,
    } as EvaluatorConfig;
    
    this.targetProvider = targetProvider;
    this.judgeProvider = judgeProvider;
    this.router = router;
  }
  
  /**
   * Run full evaluation suite
   */
  async evaluate(): Promise<EvalReport> {
    const runId = crypto.randomUUID();
    const timestamp = Date.now();
    
    // Load golden inputs
    const inputs = await loadGoldenInputs(this.config.goldenInputsPath, {
      categories: this.config.categories,
      tags: this.config.tags,
      regressionOnly: this.config.regressionOnly,
    });
    
    console.log(`🧪 Starting evaluation run ${runId}`);
    console.log(`   Model: ${this.config.targetModel} (${this.config.targetProvider})`);
    console.log(`   Judge: ${this.config.judgeModel} (${this.config.judgeProvider})`);
    console.log(`   Inputs: ${inputs.length}`);
    
    // Run evaluations with concurrency limit
    const results: EvalResult[] = [];
    
    for (let i = 0; i < inputs.length; i += this.config.concurrency) {
      const batch = inputs.slice(i, i + this.config.concurrency);
      const batchResults = await Promise.all(
        batch.map(input => this.evaluateSingle(input))
      );
      results.push(...batchResults);
      
      // Progress
      const done = Math.min(i + this.config.concurrency, inputs.length);
      console.log(`   Progress: ${done}/${inputs.length}`);
    }
    
    // Generate report
    const report = this.generateReport(runId, timestamp, results);
    
    // Save results if configured
    if (this.config.saveResults && this.config.resultsPath) {
      await this.saveReport(report);
    }
    
    return report;
  }
  
  /**
   * Evaluate a single golden input
   */
  async evaluateSingle(input: GoldenInput): Promise<EvalResult> {
    const timestamp = Date.now();
    
    try {
      // Route to skill if router available
      let routedSkill: string | undefined;
      let routingConfidence: number | undefined;
      let systemPrompt = '';
      
      if (this.router) {
        const routeResult = await this.router.routeSingle(input.input, input.context);
        if (routeResult) {
          routedSkill = routeResult.skill.id;
          routingConfidence = routeResult.confidence;
          systemPrompt = routeResult.skill.instructions;
        }
      }
      
      // Generate output from target model
      const startTime = Date.now();
      
      const request: CompletionRequest = {
        model: this.config.targetModel,
        systemPrompt,
        messages: [{ role: 'user', content: input.input }],
        maxTokens: 2000,
        temperature: 0.7,
      };
      
      const response = await Promise.race([
        this.targetProvider.complete(request),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        ),
      ]) as CompletionResponse;
      
      const latency = Date.now() - startTime;
      
      // Grade the output
      const scores = await this.gradeOutput(input, response.content);
      
      // Check pass/fail
      const passed = scores.overall >= input.minScore;
      
      // Check routing if expected
      if (input.expectedRoute && routedSkill) {
        const routingPassed = 
          routedSkill === input.expectedRoute.skillId &&
          (routingConfidence ?? 0) >= input.expectedRoute.minConfidence;
        
        if (!routingPassed) {
          return {
            inputId: input.id,
            timestamp,
            model: this.config.targetModel,
            provider: this.config.targetProvider,
            routedSkill,
            routingConfidence,
            output: response.content,
            tokens: {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens,
            },
            latency,
            scores,
            passed: false,
            error: `Routing mismatch: expected ${input.expectedRoute.skillId}, got ${routedSkill}`,
          };
        }
      }
      
      return {
        inputId: input.id,
        timestamp,
        model: this.config.targetModel,
        provider: this.config.targetProvider,
        routedSkill,
        routingConfidence,
        output: response.content,
        tokens: {
          prompt: response.usage.promptTokens,
          completion: response.usage.completionTokens,
          total: response.usage.totalTokens,
        },
        latency,
        scores,
        passed,
      };
    } catch (error) {
      return {
        inputId: input.id,
        timestamp,
        model: this.config.targetModel,
        provider: this.config.targetProvider,
        output: '',
        tokens: { prompt: 0, completion: 0, total: 0 },
        latency: Date.now() - timestamp,
        scores: {
          overall: 0,
          criteria: {},
          reasoning: 'Evaluation failed',
        },
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Grade an output using LLM judge
   */
  private async gradeOutput(input: GoldenInput, output: string): Promise<EvalScores> {
    const userPrompt = this.buildJudgePrompt(input, output);
    
    try {
      const response = await this.judgeProvider.complete({
        model: this.config.judgeModel,
        systemPrompt: JUDGE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 500,
        temperature: 0,
      });
      
      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON in judge response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]) as {
        relevance?: number;
        accuracy?: number;
        completeness?: number;
        formatting?: number;
        overall?: number;
        reasoning?: string;
      };
      
      // Normalize scores to 0-1 range
      const relevance = parsed.relevance ? parsed.relevance / 5 : undefined;
      const accuracy = parsed.accuracy ? parsed.accuracy / 5 : undefined;
      const completeness = parsed.completeness ? parsed.completeness / 5 : undefined;
      const formatting = parsed.formatting ? parsed.formatting / 5 : undefined;
      
      // Calculate overall if not provided
      const scores = [relevance, accuracy, completeness, formatting].filter(Boolean) as number[];
      const overall = parsed.overall ?? (scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0.5);
      
      return {
        overall,
        criteria: {
          relevance: parsed.relevance,
          accuracy: parsed.accuracy,
          completeness: parsed.completeness,
          formatting: parsed.formatting,
        },
        reasoning: parsed.reasoning ?? 'No reasoning provided',
      };
    } catch (error) {
      console.warn('Judge grading failed:', error);
      return {
        overall: 0.5,
        criteria: {},
        reasoning: `Grading failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
  
  private buildJudgePrompt(input: GoldenInput, output: string): string {
    let prompt = `Evaluate the following AI output:\n\n`;
    prompt += `## User Input\n${input.input}\n\n`;
    prompt += `## AI Output\n${output}\n\n`;
    
    if (input.referenceOutput) {
      prompt += `## Reference Output (Ideal)\n${input.referenceOutput}\n\n`;
    }
    
    if (input.criteria) {
      prompt += `## Evaluation Criteria\n`;
      if (input.criteria.relevance) prompt += `- Relevance weight: ${input.criteria.relevance}\n`;
      if (input.criteria.accuracy) prompt += `- Accuracy weight: ${input.criteria.accuracy}\n`;
      if (input.criteria.completeness) prompt += `- Completeness weight: ${input.criteria.completeness}\n`;
      prompt += '\n';
    }
    
    prompt += `Provide your evaluation in JSON format.`;
    
    return prompt;
  }
  
  private generateReport(
    runId: string,
    timestamp: number,
    results: EvalResult[]
  ): EvalReport {
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    
    // Calculate averages
    const avgScore = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length;
    const avgLatency = results.reduce((sum, r) => sum + r.latency, 0) / results.length;
    const totalTokens = results.reduce((sum, r) => sum + r.tokens.total, 0);
    
    // Group by category
    const byCategory: Record<EvalCategory, { total: number; passed: number; avgScore: number }> = {} as any;
    
    for (const result of results) {
      // Find category from golden input (would need to load inputs again or store category in result)
      // For now, skip category grouping
    }
    
    return {
      runId,
      timestamp,
      config: {
        model: this.config.targetModel,
        provider: this.config.targetProvider,
        judgeModel: this.config.judgeModel,
      },
      summary: {
        total: results.length,
        passed,
        failed,
        passRate: results.length > 0 ? passed / results.length : 0,
        avgScore,
        avgLatency,
        totalTokens,
      },
      byCategory,
      results,
    };
  }
  
  private async saveReport(report: EvalReport): Promise<void> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    
    const path = this.config.resultsPath!;
    await mkdir(dirname(path), { recursive: true });
    
    await writeFile(path, JSON.stringify(report, null, 2));
    console.log(`📊 Report saved to ${path}`);
  }
}

export default CognitiveEvaluator;
