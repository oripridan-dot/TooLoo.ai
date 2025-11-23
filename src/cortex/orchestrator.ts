// @version 2.1.26
import { bus } from "../core/event-bus.js";

interface OrchestratorState {
  initialized: boolean;
  autonomousMode: boolean;
  autonomousSettings: {
    mode: "safe" | "full";
    maxPerCycle: number;
  };
  activeCycles: number;
  lastCycleTime: string | null;
}

export class Orchestrator {
  private state: OrchestratorState = {
    initialized: false,
    autonomousMode: false,
    autonomousSettings: { mode: "safe", maxPerCycle: 1 },
    activeCycles: 0,
    lastCycleTime: null,
  };

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
            queue: [],
            current_focus: "awaiting_input",
          },
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
        `[Cortex] Autonomous mode set to ${enabled} (${this.state.autonomousSettings.mode})`
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
      console.log("[Cortex] Cycle activated.");

      // Simulate cycle work
      setTimeout(() => {
        this.state.activeCycles--;
        console.log("[Cortex] Cycle completed.");
      }, 2000);

      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          message: "Cycle started",
          cycleId: `cyc-${Date.now()}`,
        },
      });
    });
  }
}

export const orchestrator = new Orchestrator();
