// @version 2.1.317
import { bus, SynapsysEvent } from "../core/event-bus.js";
import { amygdala } from "./amygdala/index.js";
import { orchestrator } from "./orchestrator.js";
import { capabilities } from "./capabilities/index.js";
import { MotorCortex } from "./motor/index.js";
import { SensoryCortex } from "./sensory/index.js";
import { Hippocampus } from "./memory/index.js";
import { PrefrontalCortex } from "./planning/index.js";
import { synthesizer } from "../precog/synthesizer.js";
import { tracer } from "./tracer.js";
import { metaprogrammer } from "./metaprogrammer.js";
import { ProjectManager } from "./project-manager.js";
import { visualCortex } from "./imagination/visual-cortex.js";
import { responseVisualizer as visualizer } from "./imagination/response-visualizer.js";
import { registry } from "../core/module-registry.js";
import { Plan } from "./planning/planner.js";
import { SYSTEM_VERSION } from "../core/system-info.js";
import { ContextResonanceEngine } from "./context-resonance.js";

interface PlanResult {
  ok?: boolean;
  timeout?: boolean;
  plan?: Plan;
  reason?: string;
}

export class Cortex {
  private motor: MotorCortex;
  private sensory: SensoryCortex;
  private hippocampus: Hippocampus;
  private prefrontal: PrefrontalCortex;
  private projectManager: ProjectManager;
  public contextResonance: ContextResonanceEngine;

  constructor() {
    console.log("[Cortex] Initializing Cognitive Core...");

    registry.register({
      name: "cortex",
      version: SYSTEM_VERSION,
      status: "booting",
    });

    // Ensure sub-modules are instantiated
    // Initialize Amygdala first for protection
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    amygdala;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    orchestrator;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    capabilities;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    tracer;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    metaprogrammer;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    visualCortex;

    this.motor = new MotorCortex(bus, process.cwd());
    this.sensory = new SensoryCortex(bus, process.cwd());
    this.hippocampus = new Hippocampus(bus, process.cwd());
    this.prefrontal = new PrefrontalCortex(bus, process.cwd());
    this.projectManager = new ProjectManager(process.cwd());
    this.contextResonance = new ContextResonanceEngine();
    this.setupListeners();
  }

  private setupListeners() {
    // Handle Chat Requests
    bus.on("nexus:chat_request", async (event) => {
      const { message, requestId, projectId, responseType } = event.payload;
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
        message.toLowerCase().startsWith(k),
      );

      let responseText = "";
      let provider = "";
      let meta = {};

      if (isAction) {
        console.log(
          "[Cortex] Detected intent. Delegating to Prefrontal Cortex.",
        );

        // Wait for plan completion (with timeout)
        const planPromise = new Promise<PlanResult>((resolve) => {
          const onComplete = (e: SynapsysEvent) => {
            // Simple correlation check (in prod use IDs)
            if (e.payload.plan.goal === message) {
              cleanup();
              resolve({ ok: true, plan: e.payload.plan });
            }
          };
          const onFail = (e: SynapsysEvent) => {
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

        const timeoutPromise = new Promise<PlanResult>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 25000);
        });

        const result: PlanResult = await Promise.race([
          planPromise,
          timeoutPromise,
        ]);

        if (result.timeout) {
          responseText = `I've started working on "${message}", but it's taking a while. I'll continue in the background.`;
          provider = "Synapsys Agent";
        } else if (result.ok && result.plan) {
          responseText = `✅ Task completed: "${message}".\n\nExecuted ${result.plan.steps.length} steps successfully.`;
          provider = "Synapsys Agent";
          meta = { plan: result.plan };
        } else {
          responseText = `❌ Task failed: ${result.reason}`;
          provider = "Synapsys Agent";
        }
      } else {
        // It's just chat. Use Synthesizer for multi-provider aggregation.
        try {
          console.log(`[Cortex] Invoking synthesizer for: ${message.substring(0, 50)}`);
          const result = await Promise.race([
            synthesizer.synthesize(message, responseType),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Synthesizer timeout')), 10000)
            )
          ]) as any;
          responseText = result.response;
          provider = "Synapsys Synthesizer";
          meta = result.meta;
          console.log(`[Cortex] Synthesizer responded with ${responseText.length} chars`);
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          responseText = `I'm having trouble thinking right now: ${errorMessage}`;
          provider = "Synapsys System";
          console.error(`[Cortex] Synthesis error: ${errorMessage}`);
        }
      }

      console.log(`[Cortex] Publishing response for requestId: ${requestId}`);
      // Analyze response for visual rendering
      const visualData = visualizer.analyzeResponse(responseText, message);

      // Send Response
      bus.publish("cortex", "cortex:response", {
        requestId,
        data: {
          response: responseText,
          provider,
          timestamp: new Date().toISOString(),
          meta,
          confidence: 95,
          visual: visualData,
        },
      });

      // Auto-Update Memory
      if (projectId) {
        this.projectManager
          .autoUpdateMemory(projectId, message, responseText)
          .catch(console.error);
      }
    });

    // Handle Project List
    bus.on("nexus:project_list_request", async (event) => {
      try {
        const projects = await this.projectManager.listProjects();
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: true, projects },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Project Create
    bus.on("nexus:project_create_request", async (event) => {
      try {
        const project = await this.projectManager.createProject(
          event.payload.name,
        );
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: true, project },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Project Details
    bus.on("nexus:project_details_request", async (event) => {
      try {
        const project = await this.projectManager.getProject(
          event.payload.projectId,
        );
        if (project) {
          bus.publish("cortex", "cortex:response", {
            requestId: event.payload.requestId,
            data: {
              ok: true,
              project: { id: project.id, name: project.name },
              memory: project.memory,
            },
          });
        } else {
          bus.publish("cortex", "cortex:response", {
            requestId: event.payload.requestId,
            data: { ok: false, error: "Project not found" },
          });
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Memory Update
    bus.on("nexus:project_memory_update", async (event) => {
      try {
        await this.projectManager.updateMemory(
          event.payload.projectId,
          event.payload.type,
          event.payload.content,
        );
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: true },
        });
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: errorMessage },
        });
      }
    });

    // Handle Priority Changes
    bus.on("system:priority_change", (event) => {
      console.log(`[Cortex] Priority switched to: ${event.payload.mode}`);
    });
  }

  public async init() {
    await this.projectManager.init();
    await this.hippocampus.initialize();
    await this.motor.initialize();
    await this.sensory.initialize();
    await this.prefrontal.initialize();
    console.log("[Cortex] Online.");
    bus.publish("cortex", "system:ready", { module: "cortex" });
  }
}

export { visualCortex } from "./imagination/visual-cortex.js";
export const cortex = new Cortex();
export const contextResonance = cortex.contextResonance;
