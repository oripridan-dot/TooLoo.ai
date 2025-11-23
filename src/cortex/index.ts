// @version 2.1.11
import { bus } from "../core/event-bus.js";
import { orchestrator } from "./orchestrator.js";
import { capabilities } from "./capabilities/index.js";
import { MotorCortex } from "./motor/index.js";
import { SensoryCortex } from "./sensory/index.js";
import { Hippocampus } from "./memory/index.js";
import { PrefrontalCortex } from "./planning/index.js";
import LLMProvider from "../precog/providers/llm-provider.js";

export class Cortex {
  private motor: MotorCortex;
  private sensory: SensoryCortex;
  private hippocampus: Hippocampus;
  private prefrontal: PrefrontalCortex;

  constructor() {
    console.log("[Cortex] Initializing Cognitive Core...");
    // Ensure sub-modules are instantiated
    const _ = orchestrator;
    const __ = capabilities;

    this.motor = new MotorCortex(bus, process.cwd());
    this.sensory = new SensoryCortex(bus, process.cwd());
    this.hippocampus = new Hippocampus(bus, process.cwd());
    this.prefrontal = new PrefrontalCortex(bus, process.cwd());
    this.setupListeners();
  }

  private setupListeners() {
    // Handle Chat Requests
    bus.on("nexus:chat_request", async (event) => {
      const { message, requestId } = event.payload;
      console.log("[Cortex] Processing chat request:", requestId);

      // 1. Quick Intent Analysis (Heuristic for now)
      const actionKeywords = [
        "create",
        "make",
        "build",
        "generate",
        "run",
        "execute",
        "delete",
        "remove",
        "update",
        "modify",
        "write",
      ];
      const isAction = actionKeywords.some((k) =>
        message.toLowerCase().startsWith(k)
      );

      if (isAction) {
        console.log(
          "[Cortex] Detected intent. Delegating to Prefrontal Cortex."
        );

        // Wait for plan completion (with timeout)
        const planPromise = new Promise((resolve) => {
          const onComplete = (e: any) => {
            // Simple correlation check (in prod use IDs)
            if (e.payload.plan.goal === message) {
              cleanup();
              resolve({ ok: true, plan: e.payload.plan });
            }
          };
          const onFail = (e: any) => {
            if (e.payload.plan.goal === message) {
              cleanup();
              resolve({ ok: false, reason: e.payload.reason });
            }
          };

          const cleanup = () => {
            bus.off("planning:plan:completed", onComplete);
            bus.off("planning:plan:failed", onFail);
          };

          bus.on("planning:plan:completed", onComplete);
          bus.on("planning:plan:failed", onFail);

          // Trigger Planning
          bus.publish("cortex", "planning:intent", { goal: message });
        });

        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 25000);
        });

        const result: any = await Promise.race([planPromise, timeoutPromise]);

        if (result.timeout) {
          bus.publish("cortex", "cortex:response", {
            requestId,
            data: {
              response: `I've started working on "${message}", but it's taking a while. I'll continue in the background.`,
              provider: "Synapsys Agent",
              timestamp: new Date().toISOString(),
            },
          });
        } else if (result.ok) {
          bus.publish("cortex", "cortex:response", {
            requestId,
            data: {
              response: `✅ Task completed: "${message}".\n\nExecuted ${result.plan.steps.length} steps successfully.`,
              provider: "Synapsys Agent",
              timestamp: new Date().toISOString(),
              meta: { plan: result.plan },
            },
          });
        } else {
          bus.publish("cortex", "cortex:response", {
            requestId,
            data: {
              response: `❌ Task failed: ${result.reason}`,
              provider: "Synapsys Agent",
              timestamp: new Date().toISOString(),
            },
          });
        }
      } else {
        // It's just chat. Use LLMProvider directly.
        try {
          const llm = new LLMProvider();
          const response = await llm.generateSmartLLM({
            prompt: message,
            taskType: "chat",
          });

          bus.publish("cortex", "cortex:response", {
            requestId,
            data: {
              response: response.text || response.content,
              provider: response.providerUsed || "Synapsys Chat",
              timestamp: new Date().toISOString(),
            },
          });
        } catch (err: any) {
          bus.publish("cortex", "cortex:response", {
            requestId,
            data: {
              response: `I'm having trouble thinking right now: ${err.message}`,
              provider: "Synapsys System",
              timestamp: new Date().toISOString(),
            },
          });
        }
      }
    });

    // Handle Project List
    bus.on("nexus:project_list_request", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: { ok: true, projects: [] }, // Mock empty list
      });
    });

    // Handle Project Create
    bus.on("nexus:project_create_request", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          project: {
            id: "proj-mock",
            name: event.payload.name,
            created: new Date(),
          },
        },
      });
    });

    // Handle Project Details
    bus.on("nexus:project_details_request", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: {
          ok: true,
          project: { id: event.payload.projectId, name: "Mock Project" },
          memory: { shortTerm: "", longTerm: "" },
        },
      });
    });

    // Handle Memory Update
    bus.on("nexus:project_memory_update", (event) => {
      bus.publish("cortex", "cortex:response", {
        requestId: event.payload.requestId,
        data: { ok: true },
      });
    });

    // Handle Priority Changes
    bus.on("system:priority_change", (event) => {
      console.log(`[Cortex] Priority switched to: ${event.payload.mode}`);
    });
  }

  public async init() {
    await this.hippocampus.initialize();
    await this.motor.initialize();
    await this.sensory.initialize();
    await this.prefrontal.initialize();
    console.log("[Cortex] Online.");
    bus.publish("cortex", "system:ready", { module: "cortex" });
  }
}

export const cortex = new Cortex();
