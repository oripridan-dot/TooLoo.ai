// @version 2.1.198
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import { Plan, PlanStep } from "./planner.js";
import { Reflector, ReflectionResult } from "./reflector.js";
import { Verifier } from "./verifier.js";

export class Executive {
  private currentPlan: Plan | null = null;
  private currentStepIndex: number = -1;
  private isExecuting: boolean = false;
  private isPaused: boolean = false;
  private interventionMode: boolean = false;
  private reflector: Reflector;
  private verifier: Verifier;

  constructor(private bus: EventBus) {
    this.reflector = new Reflector(bus);
    this.verifier = new Verifier(process.cwd());
    this.setupListeners();
  }

  private setupListeners() {
    // Intervention Control
    this.bus.on("nexus:intervention:set_mode", (event) => {
      this.interventionMode = event.payload.enabled;
      console.log(`[Executive] Intervention Mode: ${this.interventionMode}`);
    });

    this.bus.on("nexus:intervention:pause", () => {
      this.pause();
    });

    this.bus.on("nexus:intervention:resume", () => {
      this.resume();
    });

    // Listen for motor results to advance the plan
    this.bus.on("motor:result", async (event: SynapsysEvent) => {
      if (!this.isExecuting || !this.currentPlan) return;

      const result = event.payload;
      const currentStep = this.currentPlan.steps[this.currentStepIndex];

      // Verify this result matches our current step's request ID (if we tracked it)
      if (currentStep && currentStep.status === "running") {
        this.bus.publish("cortex", "cortex:tool:result", {
          id: currentStep.id,
          result: result,
        });

        // Run Verification if it was a file write
        let verificationResult;
        if (result.ok && currentStep.type === "file:write") {
            verificationResult = await this.verifier.verifyFile(currentStep.payload.path);
        }

        // Invoke Reflector
        console.log(`[Executive] Reflecting on step: ${currentStep.description}`);
        const reflection: ReflectionResult = await this.reflector.reflect(
          currentStep,
          result,
          this.currentPlan,
          verificationResult
        );

        console.log(
          `[Executive] Reflection Result: ${reflection.action} - ${reflection.critique}`
        );

        if (reflection.action === "CONTINUE") {
          console.log(`[Executive] Step completed: ${currentStep.description}`);
          currentStep.status = "completed";
          currentStep.result = result;
          this.executeNextStep();
        } else if (reflection.action === "RETRY") {
          console.log(`[Executive] Retrying step: ${currentStep.description}`);
          if (reflection.modifiedStep) {
            // Update the step with the modification
            this.currentPlan.steps[this.currentStepIndex] =
              reflection.modifiedStep;
            console.log(
              `[Executive] Applied modification to step payload.`
            );
          }
          // Re-execute the current step (index hasn't changed)
          this.executeStep(this.currentPlan.steps[this.currentStepIndex]);
        } else if (reflection.action === "REPLAN") {
          console.error(`[Executive] Plan failed, requesting replan.`);
          currentStep.status = "failed";
          currentStep.result = result;
          
          // Publish replan request
          this.bus.publish("cortex", "planning:replan:request", {
            originalPlan: this.currentPlan,
            failedStep: currentStep,
            critique: reflection.critique,
            result: result
          });
          
          this.reset(); // Stop current execution
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
    this.isPaused = false;

    this.executeNextStep();
  }

  public pause() {
    if (this.isExecuting && !this.isPaused) {
      this.isPaused = true;
      console.log("[Executive] Execution paused.");
      this.bus.publish("cortex", "planning:paused", {
        planId: this.currentPlan?.id,
      });
    }
  }

  public resume() {
    if (this.isPaused && this.currentPlan) {
      this.isPaused = false;
      console.log("[Executive] Execution resumed.");
      this.bus.publish("cortex", "planning:resumed", {
        planId: this.currentPlan.id,
      });
      
      // If we haven't started the current step yet (paused before execution), execute it now.
      // If we are between steps, executeNextStep would have been called but returned early.
      // However, executeNextStep increments the index. We need to be careful.
      
      // Strategy: executeNextStep increments index. If we paused inside it, we returned.
      // So we need to call executeStep with the *current* index.
      
      if (this.currentStepIndex >= 0 && this.currentStepIndex < this.currentPlan.steps.length) {
          const step = this.currentPlan.steps[this.currentStepIndex];
          // Only execute if it's not already running or completed
          if (step.status === 'pending') {
              this.executeStep(step);
          } else {
              // If it was running when we paused, we just wait for it to finish.
              // If it was completed, we should move to next.
              if (step.status === 'completed') {
                  this.executeNextStep();
              }
          }
      } else {
          // Should not happen if paused, but safety check
          this.executeNextStep();
      }
    }
  }

  private executeNextStep() {
    if (!this.currentPlan) return;

    // If we are already paused, do not proceed.
    if (this.isPaused) return;

    this.currentStepIndex++;

    if (this.currentStepIndex >= this.currentPlan.steps.length) {
      this.completePlan();
      return;
    }

    const step = this.currentPlan.steps[this.currentStepIndex];

    console.log(`[Executive] Checking intervention mode: ${this.interventionMode}`);

    // Check for Intervention Mode
    if (this.interventionMode) {
      this.isPaused = true;
      console.log(
        `[Executive] Pausing for intervention before step: ${step.description}`
      );
      this.bus.publish("cortex", "planning:awaiting_approval", {
        planId: this.currentPlan.id,
        step: step,
      });
      return;
    }

    this.executeStep(step);
  }

  private executeStep(step: PlanStep) {
    step.status = "running";
    console.log(
      `[Executive] Executing step ${this.currentStepIndex + 1}/${
        this.currentPlan!.steps.length
      }: ${step.description}`
    );

    // Dispatch to Motor Cortex
    this.bus.publish("cortex", "cortex:tool:call", {
      id: step.id,
      type: step.type,
      payload: step.payload,
    });

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
    } else if (step.type === "file:read") {
       this.bus.publish("cortex", "motor:file:read", {
        id: step.id,
        path: step.payload.path,
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
      `[Executive] Plan ${this.currentPlan.id} completed successfully.`,
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
