// @version 2.1.265
import { bus } from "../core/event-bus.js";
import { smartFS } from "../core/fs-manager.js";

interface OrchestratorState {
  initialized: boolean;
  autonomousMode: boolean;
  autonomousSettings: {
    mode: "safe" | "full";
    maxPerCycle: number;
  };
  activeCycles: number;
  lastCycleTime: string | null;
  planQueue: string[];
  currentFocus: string;
}

export class Orchestrator {
  private state: OrchestratorState = {
    initialized: false,
    autonomousMode: false,
    autonomousSettings: { mode: "safe", maxPerCycle: 1 },
    activeCycles: 0,
    lastCycleTime: null,
    planQueue: [],
    currentFocus: "idle",
  };

  private retryMap: Map<string, number> = new Map();
  private maxRetries: number = 3;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Initialize
    bus.on("nexus:orchestrator_init", (event) => {
      this.state.initialized = true;
      console.log("[Cortex] Orchestrator initialized.");
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: { ok: true, message: "Orchestrator initialized" },
      });
    });

    // Status
    bus.on("nexus:orchestrator_status", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: { ok: true, status: this.state },
      });
    });

    // Capability Map (Mock for now)
    bus.on("nexus:orchestrator_map", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          data: {
            capabilities: ["chat", "code", "search", "planning"],
            providers: ["gemini", "anthropic", "openai"],
          },
        },
      });
    });

    // Plan Retrieval
    bus.on("nexus:orchestrator_plan", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          data: {
            id: "synapsys-plan-v1",
            mode: this.state.autonomousMode ? "autonomous" : "manual",
            active_cycles: this.state.activeCycles,
            queue: this.state.planQueue,
            current_focus: this.state.currentFocus,
          },
        },
      });
    });

    // Plan Update
    bus.on("nexus:orchestrator_plan_update", async (event) => {
      const { action, item, items } = event.payload;

      if (action === "add" && item) {
        this.state.planQueue.push(item);
        console.log(`[Cortex] Added to plan queue: ${item}`);
      } else if (action === "add_batch" && items) {
        // Parallel Execution Logic
        console.log(
          `[Cortex] Received batch of ${items.length} tasks. Executing in parallel...`,
        );
        await Promise.all(
          items.map(async (task: string) => {
            console.log(`[Cortex] Starting parallel task: ${task}`);
            // Simulate task execution
            await new Promise((resolve) => setTimeout(resolve, 1000));
            console.log(`[Cortex] Completed parallel task: ${task}`);
          }),
        );
        this.state.planQueue.push(...items); // Keep in queue for history
      } else if (action === "clear") {
        this.state.planQueue = [];
        console.log("[Cortex] Plan queue cleared.");
      }

      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          queue: this.state.planQueue,
        },
      });
    });

    // Enable Autonomous
    bus.on("nexus:orchestrator_enable", (event) => {
      const { enabled, mode, maxPerCycle } = event.payload;
      this.state.autonomousMode = enabled;
      if (mode) this.state.autonomousSettings.mode = mode;
      if (maxPerCycle) this.state.autonomousSettings.maxPerCycle = maxPerCycle;

      console.log(
        `[Cortex] Autonomous mode set to ${enabled} (${this.state.autonomousSettings.mode})`,
      );

      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: { ok: true, state: this.state },
      });
    });

    // Activate Cycle
    bus.on("nexus:orchestrator_cycle", (event) => {
      if (!this.state.initialized) {
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: "Orchestrator not initialized" },
        });
        return;
      }

      this.state.activeCycles++;
      this.state.lastCycleTime = new Date().toISOString();
      this.state.currentFocus = "processing_cycle";
      console.log("[Cortex] Cycle activated.");

      this.processQueue();

      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          message: "Cycle started",
          cycleId: `cyc-${Date.now()}`,
        },
      });
    });

    // Listen for Plan Completion
    bus.on("planning:plan:completed", (_event) => {
      console.log("[Cortex] Plan completed. Checking queue...");
      this.state.activeCycles = Math.max(0, this.state.activeCycles - 1);
      this.state.currentFocus = "idle";

      if (this.state.autonomousMode) {
        this.processQueue();
      }
    });

    // Listen for Plan Failure
    bus.on("planning:plan:failed", (event) => {
      const { plan, reason } = event.payload;
      const goal = plan.goal;

      console.log(`[Cortex] Plan failed: ${reason}`);

      let retries = this.retryMap.get(goal) || 0;
      if (retries < this.maxRetries) {
        retries++;
        this.retryMap.set(goal, retries);
        console.log(
          `[Cortex] Retrying goal (${retries}/${this.maxRetries}): "${goal}"`,
        );

        // Re-queue at the front
        this.state.planQueue.unshift(goal);

        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        setTimeout(() => {
          if (this.state.autonomousMode) {
            this.processQueue();
          }
        }, delay);

        return;
      }

      console.log(`[Cortex] Max retries reached for: "${goal}"`);
      this.retryMap.delete(goal);

      this.state.activeCycles = Math.max(0, this.state.activeCycles - 1);
      this.state.currentFocus = "idle";

      if (this.state.autonomousMode) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.state.planQueue.length === 0) {
      console.log("[Cortex] Queue empty.");
      this.state.activeCycles = 0;
      this.state.currentFocus = "idle";
      return;
    }

    const nextGoal = this.state.planQueue.shift();
    if (nextGoal) {
      console.log(`[Cortex] Processing next goal: "${nextGoal}"`);
      this.state.currentFocus = `executing: ${nextGoal}`;
      this.state.activeCycles++;

      // Get Golden Plate if goal mentions a file
      let contextBundle = null;
      // Simple heuristic: check if goal contains a file path
      const fileMatch = nextGoal.match(/[\w-]+\.ts/);
      if (fileMatch) {
        try {
          contextBundle = await smartFS.getGoldenPlate(fileMatch[0]);
        } catch {
          // Ignore
        }
      }

      bus.publish("cortex", "planning:intent", {
        goal: nextGoal,
        context: contextBundle,
      });
    }
  }
}

export const orchestrator = new Orchestrator();
