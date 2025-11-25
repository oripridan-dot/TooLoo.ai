// @version 2.1.242
import { bus } from "../core/event-bus.js";
import { amygdala } from "./amygdala/index.js";
import { orchestrator } from "./orchestrator.js";
import { capabilities } from "./capabilities/index.js";
import { MotorCortex } from "./motor/index.js";
import { SensoryCortex } from "./sensory/index.js";
import { Hippocampus } from "./memory/index.js";
import { PrefrontalCortex } from "./planning/index.js";
import { synthesizer } from "../precog/synthesizer.js";
import { TOOLOO_PERSONA } from "./persona.js";
import { tracer } from "./tracer.js";
import { ProjectManager } from "./project-manager.js";

export class Cortex {
  private motor: MotorCortex;
  private sensory: SensoryCortex;
  private hippocampus: Hippocampus;
  private prefrontal: PrefrontalCortex;
  private projectManager: ProjectManager;

  constructor() {
    console.log("[Cortex] Initializing Cognitive Core...");
    // Ensure sub-modules are instantiated
    const _ = orchestrator;
    const __ = capabilities;
    const ___ = tracer;

    this.motor = new MotorCortex(bus, process.cwd());
    this.sensory = new SensoryCortex(bus, process.cwd());
    this.hippocampus = new Hippocampus(bus, process.cwd());
    this.prefrontal = new PrefrontalCortex(bus, process.cwd());
    this.projectManager = new ProjectManager(process.cwd());
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
          responseText = `I've started working on "${message}", but it's taking a while. I'll continue in the background.`;
          provider = "Synapsys Agent";
        } else if (result.ok) {
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
          const result = await synthesizer.synthesize(message, responseType);
          responseText = result.response;
          provider = "Synapsys Synthesizer";
          meta = result.meta;
        } catch (err: any) {
          responseText = `I'm having trouble thinking right now: ${err.message}`;
          provider = "Synapsys System";
        }
      }

      // Send Response
      bus.publish("cortex", "cortex:response", {
        requestId,
        data: {
          response: responseText,
          provider,
          timestamp: new Date().toISOString(),
          meta,
          confidence: 95, // High confidence for system responses
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
      } catch (e: any) {
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: e.message },
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
      } catch (e: any) {
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: e.message },
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
      } catch (e: any) {
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: e.message },
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
      } catch (e: any) {
        bus.publish("cortex", "cortex:response", {
          requestId: event.payload.requestId,
          data: { ok: false, error: e.message },
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

export const cortex = new Cortex();
