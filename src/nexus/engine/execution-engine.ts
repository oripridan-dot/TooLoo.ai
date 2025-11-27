// @version 2.2.4
import { Plan, PlanStep } from "../../cortex/planning/planner.js";
import { Reflector } from "../../cortex/planning/reflector.js";
import { SandboxManager } from "../../core/sandbox/sandbox-manager.js";
import { ArtifactLedger } from "./artifact-ledger.js";
import * as fs from 'fs/promises';
import * as path from 'path';

export class ExecutionEngine {
  private sandboxManager: SandboxManager;
  private ledger: ArtifactLedger;
  private reflector: Reflector;

  constructor(ledger: ArtifactLedger, reflector: Reflector) {
    this.sandboxManager = new SandboxManager();
    this.ledger = ledger;
    this.reflector = reflector;
  }

  async executePlan(plan: Plan): Promise<void> {
    console.log(`[ExecutionEngine] Starting execution of plan: ${plan.id}`);
    plan.status = "in-progress";

    // Create a sandbox for this plan execution
    const sandbox = await this.sandboxManager.createSandbox({
      id: plan.id,
      cwd: process.cwd() // For local sandbox, we use CWD, but be careful!
    });

    try {
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        console.log(`[ExecutionEngine] Executing step ${i + 1}/${plan.steps.length}: ${step.description}`);
        step.status = "running";

        try {
          const result = await this.executeStep(step, sandbox);
          step.result = result;
          step.status = "completed";

          // Register artifact if applicable
          if (step.type === "file:write") {
            await this.ledger.registerArtifact({
              type: "code", // or document
              title: path.basename(step.payload.path),
              content: step.payload.content,
              description: step.description,
              relatedTaskId: step.id
            });
          } else if (step.type === "code:execute" || step.type === "command") {
             // Register output as artifact
             await this.ledger.registerArtifact({
               type: "data",
               title: `Output of ${step.description}`,
               content: result.stdout || result.stderr,
               description: `Execution output for step ${step.id}`,
               relatedTaskId: step.id
             });
          }

          // Reflect on success
          const reflection = await this.reflector.reflect(step, result, plan);
          if (reflection.action === "RETRY" || reflection.action === "REPLAN") {
             // Handle dynamic replanning (simplified for now)
             console.warn(`[ExecutionEngine] Reflector suggested ${reflection.action}, but dynamic replanning is not fully implemented yet.`);
          }

        } catch (error: any) {
          console.error(`[ExecutionEngine] Step failed: ${error.message}`);
          step.status = "failed";
          step.result = { error: error.message };
          plan.status = "failed";
          
          // Reflect on failure
          const reflection = await this.reflector.reflect(step, { error: error.message, ok: false }, plan);
          console.log(`[ExecutionEngine] Reflector analysis: ${JSON.stringify(reflection)}`);
          
          throw error; // Stop execution
        }
      }

      plan.status = "completed";
      console.log(`[ExecutionEngine] Plan completed successfully.`);

    } finally {
      await this.sandboxManager.terminateAll();
    }
  }

  private async executeStep(step: PlanStep, sandbox: any): Promise<any> {
    switch (step.type) {
      case "command":
        return sandbox.exec(step.payload.command);
      
      case "file:write":
        await fs.mkdir(path.dirname(step.payload.path), { recursive: true });
        await fs.writeFile(step.payload.path, step.payload.content);
        return { ok: true };

      case "file:read":
        const content = await fs.readFile(step.payload.path, 'utf-8');
        return { ok: true, content };

      case "code:execute":
        const lang = step.payload.language;
        const code = step.payload.code;
        const scriptPath = path.join("temp", `script-${step.id}.${lang === 'python' ? 'py' : 'js'}`);
        
        // Write script to temp file
        await fs.mkdir(path.dirname(scriptPath), { recursive: true });
        await fs.writeFile(scriptPath, code);

        // Execute script
        let cmd = "";
        if (lang === 'python') cmd = `python3 ${scriptPath}`;
        else if (lang === 'javascript' || lang === 'typescript') cmd = `node ${scriptPath}`;
        else throw new Error(`Unsupported language: ${lang}`);

        return sandbox.exec(cmd);

      default:
        throw new Error(`Unknown step type: ${(step as any).type}`);
    }
  }
}
