// @version 2.1.11
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import { Plan, PlanStep } from "./planner.js";

export class Executive {
  private currentPlan: Plan | null = null;
  private currentStepIndex: number = -1;
  private isExecuting: boolean = false;

  constructor(private bus: EventBus) {
    this.setupListeners();
  }

  private setupListeners() {
    // Listen for motor results to advance the plan
    this.bus.on("motor:result", (event: SynapsysEvent) => {
      if (!this.isExecuting || !this.currentPlan) return;

      const result = event.payload;
      const currentStep = this.currentPlan.steps[this.currentStepIndex];

      // Verify this result matches our current step's request ID (if we tracked it)
      // For simplicity in Phase 3, we assume sequential execution and matching IDs
      if (currentStep && currentStep.status === "running") {
        if (result.ok) {
          console.log(`[Executive] Step completed: ${currentStep.description}`);
          currentStep.status = "completed";
          currentStep.result = result;
          this.executeNextStep();
        } else {
          console.error(`[Executive] Step failed: ${currentStep.description}`);
          currentStep.status = "failed";
          currentStep.result = result;
          this.failPlan(`Step failed: ${result.stderr}`);
        }
      }
    });
  }

  public async execute(plan: Plan) {
    if (this.isExecuting) {
      throw new Error("Executive is already busy");
    }

    console.log(
      `[Executive] Starting execution of plan: ${plan.id} (${plan.steps.length} steps)`
    );
    this.currentPlan = plan;
    this.currentPlan.status = "in-progress";
    this.currentStepIndex = -1;
    this.isExecuting = true;

    this.executeNextStep();
  }

  private executeNextStep() {
    if (!this.currentPlan) return;

    this.currentStepIndex++;

    if (this.currentStepIndex >= this.currentPlan.steps.length) {
      this.completePlan();
      return;
    }

    const step = this.currentPlan.steps[this.currentStepIndex];
    step.status = "running";
    console.log(
      `[Executive] Executing step ${this.currentStepIndex + 1}/${this.currentPlan.steps.length}: ${step.description}`
    );

    // Dispatch to Motor Cortex
    if (step.type === "command") {
      this.bus.publish("cortex", "motor:execute", {
        id: step.id,
        command: step.payload.command,
        cwd: step.payload.cwd,
      });
    } else if (step.type === "file:write") {
      this.bus.publish("cortex", "motor:file:write", {
        id: step.id,
        path: step.payload.path,
        content: step.payload.content,
      });
    } else {
      console.warn(`[Executive] Unknown step type: ${step.type}`);
      step.status = "failed";
      this.failPlan(`Unknown step type: ${step.type}`);
    }
  }

  private completePlan() {
    if (!this.currentPlan) return;
    console.log(
      `[Executive] Plan ${this.currentPlan.id} completed successfully.`
    );
    this.currentPlan.status = "completed";
    this.bus.publish("cortex", "planning:plan:completed", {
      plan: this.currentPlan,
    });
    this.reset();
  }

  private failPlan(reason: string) {
    if (!this.currentPlan) return;
    console.error(`[Executive] Plan ${this.currentPlan.id} failed: ${reason}`);
    this.currentPlan.status = "failed";
    this.bus.publish("cortex", "planning:plan:failed", {
      plan: this.currentPlan,
      reason,
    });
    this.reset();
  }

  private reset() {
    this.currentPlan = null;
    this.currentStepIndex = -1;
    this.isExecuting = false;
  }
}
