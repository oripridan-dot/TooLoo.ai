import { EventBus } from "../../core/event-bus.js";
import LLMProvider from "../../precog/providers/llm-provider.js";
import { Plan, PlanStep } from "./planner.js";

export type ReflectionAction = "CONTINUE" | "RETRY" | "REPLAN";

export interface ReflectionResult {
  action: ReflectionAction;
  critique: string;
  modifiedStep?: PlanStep; // For RETRY with modification
  newGoal?: string; // For REPLAN
}

export class Reflector {
  private llmProvider: LLMProvider;

  constructor(private bus: EventBus) {
    this.llmProvider = new LLMProvider();
  }

  /**
   * Analyzes the result of a step execution and decides the next course of action.
   */
  async reflect(
    step: PlanStep,
    result: any,
    plan: Plan,
    verification?: { ok: boolean; errors: string[] }
  ): Promise<ReflectionResult> {
    console.log(`[Reflector] Analyzing step: "${step.description}"`);

    // If verification failed, we treat it as a failure or partial success that needs correction
    if (verification && !verification.ok) {
        console.log(`[Reflector] Verification failed. Analyzing errors...`);
        return this.analyzeVerificationFailure(step, result, verification, plan);
    }

    // If the step failed at the system level (e.g. command not found), we likely need to retry or replan
    if (!result.ok) {
      console.log(`[Reflector] Step failed execution. Analyzing error...`);
      return this.analyzeFailure(step, result, plan);
    }

    // Even if it succeeded, we verify if the output matches the intent
    return this.analyzeSuccess(step, result, plan);
  }

  private async analyzeVerificationFailure(
    step: PlanStep,
    result: any,
    verification: { ok: boolean; errors: string[] },
    plan: Plan
  ): Promise<ReflectionResult> {
      const systemPrompt = `You are the Reflector module.
The step executed, but the generated code failed verification (Lint/Type checks).

CONTEXT:
Goal: "${plan.goal}"
Step: "${step.description}"
File: "${step.payload.path}"
Verification Errors:
${verification.errors.join("\n")}

OPTIONS:
1. RETRY: Fix the code to resolve the errors. Provide the FULL corrected file content in 'modifiedPayload'.
2. CONTINUE: If the errors are minor warnings that can be ignored.
3. REPLAN: If the errors indicate a fundamental misunderstanding.

Return ONLY a JSON object:
{
  "action": "RETRY" | "CONTINUE" | "REPLAN",
  "critique": "Explanation.",
  "modifiedPayload": { "path": "...", "content": "..." } (For RETRY)
}
`;

    try {
      const response = await this.llmProvider.generateSmartLLM({
        prompt: `Fix verification errors for: ${step.payload.path}`,
        system: systemPrompt,
        taskType: "code",
        criticality: "high",
      });

      const content = response.text || response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        action: parsed.action,
        critique: parsed.critique,
        modifiedStep: parsed.modifiedPayload
          ? { ...step, payload: parsed.modifiedPayload }
          : undefined,
      };
    } catch (error) {
        return { action: "REPLAN", critique: "Failed to fix verification errors." };
    }
  }

  private async analyzeFailure(
    step: PlanStep,
    result: any,
    plan: Plan
  ): Promise<ReflectionResult> {
    const systemPrompt = `You are the Reflector module of an autonomous AI. 
A step in the execution plan has failed. Your job is to analyze the error and decide what to do.

CONTEXT:
Goal: "${plan.goal}"
Step: "${step.description}"
Type: "${step.type}"
Payload: ${JSON.stringify(step.payload)}
Error Output: "${result.stderr || result.error || "Unknown error"}"

OPTIONS:
1. RETRY: If the error is transient or can be fixed by slightly modifying the command (e.g., installing a missing dependency, fixing a typo).
2. REPLAN: If the current approach is fundamentally flawed and we need a new plan.
3. CONTINUE: (Rare) If the error is non-critical and we can proceed (e.g., "warning" treated as error).

Return ONLY a JSON object:
{
  "action": "RETRY" | "REPLAN" | "CONTINUE",
  "critique": "Explanation of why it failed and why this action was chosen.",
  "modifiedPayload": { ... } (Only for RETRY: the corrected payload for the step)
}
`;

    try {
      const response = await this.llmProvider.generateSmartLLM({
        prompt: `Analyze failure for step: ${step.description}`,
        system: systemPrompt,
        taskType: "reasoning",
        criticality: "high",
      });

      const content = response.text || response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        action: parsed.action,
        critique: parsed.critique,
        modifiedStep: parsed.modifiedPayload
          ? { ...step, payload: parsed.modifiedPayload }
          : undefined,
      };
    } catch (error) {
      console.error(`[Reflector] Failed to analyze failure: ${error}`);
      // Default fallback
      return {
        action: "REPLAN",
        critique: "Reflector failed to analyze error. Defaulting to Replan.",
      };
    }
  }

  private async analyzeSuccess(
    step: PlanStep,
    result: any,
    plan: Plan
  ): Promise<ReflectionResult> {
    // For simple commands, we might skip deep reflection to save tokens, 
    // but for "Bespoke" mode, we reflect on everything important.
    
    // If it's a simple file read or write that succeeded, we usually continue.
    // But if it's a command output, we should check if it actually did what we wanted.
    if (step.type === "file:write" || step.type === "file:read") {
        return { action: "CONTINUE", critique: "File operation successful." };
    }

    const systemPrompt = `You are the Reflector module. 
A step has completed successfully (exit code 0), but we must verify if the semantic intent was achieved.

CONTEXT:
Goal: "${plan.goal}"
Step: "${step.description}"
Command: "${step.payload.command}"
Output: "${(result.stdout || "").substring(0, 1000)}"

Did this actually achieve the step's intent?
Sometimes a command runs but prints "0 files found" or "Nothing to do", which might mean it failed semantically.

Return ONLY a JSON object:
{
  "action": "CONTINUE" | "RETRY" | "REPLAN",
  "critique": "Assessment of the result."
}
`;

    try {
       const response = await this.llmProvider.generateSmartLLM({
        prompt: `Analyze success for step: ${step.description}`,
        system: systemPrompt,
        taskType: "reasoning",
        criticality: "normal",
      });

      const content = response.text || response.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      const parsed = JSON.parse(jsonStr);

      return {
        action: parsed.action,
        critique: parsed.critique,
      };
    } catch (error) {
        // If we can't reflect, assume success if the system reported success
        return { action: "CONTINUE", critique: "Reflection failed, assuming success." };
    }
  }
}
