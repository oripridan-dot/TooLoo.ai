// @version 2.1.28
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import { Planner, Plan } from "./planner.js";
import { Executive } from "./executive.js";

export class PrefrontalCortex {
  private planner: Planner;
  private executive: Executive;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string,
  ) {
    this.planner = new Planner(bus);
    this.executive = new Executive(bus);
  }

  async initialize() {
    console.log("[PrefrontalCortex] Initializing Executive Functions...");
    this.setupListeners();
    this.bus.publish("cortex", "system:component_ready", {
      component: "prefrontal-cortex",
    });
    console.log("[PrefrontalCortex] Online - Ready to plan.");
  }

  private setupListeners() {
    // Listen for high-level intents
    this.bus.on("planning:intent", async (event: SynapsysEvent) => {
      const { goal } = event.payload;
      console.log(`[PrefrontalCortex] Received intent: "${goal}"`);

      // 1. Plan
      const plan = await this.planner.createPlan(goal);

      // 2. Announce Plan
      this.bus.publish("cortex", "planning:plan:created", { plan });

      // 3. Execute (Auto-execute for now, could require approval later)
      try {
        await this.executive.execute(plan);
      } catch (err: any) {
        console.error(`[PrefrontalCortex] Execution error: ${err.message}`);
      }
    });

    // Listen for replan requests
    this.bus.on("planning:replan:request", async (event: SynapsysEvent) => {
      const { originalPlan, failedStep, critique } = event.payload;
      console.log(`[PrefrontalCortex] Replanning for: "${originalPlan.goal}"`);

      // 1. Re-Plan with context
      const plan = await this.planner.createPlan(originalPlan.goal, {
        critique,
        failedStep,
      });

      // 2. Announce New Plan
      this.bus.publish("cortex", "planning:plan:created", { plan });

      // 3. Execute
      try {
        await this.executive.execute(plan);
      } catch (err: any) {
        console.error(
          `[PrefrontalCortex] Execution error (Replan): ${err.message}`,
        );
      }
    });
  }
}
