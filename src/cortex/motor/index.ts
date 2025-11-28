// @version 2.1.28
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import { Executor, ExecutionResult } from "./executor.js";
import { CodeExecutor } from "./code-execution.js";
import * as fs from "fs/promises";
import * as path from "path";

export class MotorCortex {
  private executor: Executor;
  private codeExecutor: CodeExecutor;
  private isActive: boolean = false;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string,
  ) {
    this.executor = new Executor(workspaceRoot);
    this.codeExecutor = new CodeExecutor(workspaceRoot);
  }

  async initialize() {
    this.isActive = true;
    this.setupListeners();
    console.log("[MotorCortex] Online - Ready for physical action");

    // Announce presence
    this.bus.publish("cortex", "system:component_ready", {
      component: "motor-cortex",
    });
  }

  private setupListeners() {
    // Code Execution (Docker Sandbox)
    this.bus.on("motor:code:execute", async (event: SynapsysEvent) => {
      const payload = event.payload;
      console.log(
        `[MotorCortex] Received code execution request (${payload.language})`,
      );

      const result = await this.codeExecutor.executeInDocker(
        payload.code,
        payload.language,
      );

      this.bus.publish("cortex", "motor:result", {
        requestId: payload.id,
        ...result,
      });
    });

    // Command Execution
    this.bus.on("motor:execute", async (event: SynapsysEvent) => {
      const payload = event.payload;
      console.log(
        `[MotorCortex] Received execution request: ${payload.command}`,
      );

      const result = await this.executor.runCommand(
        payload.command,
        payload.cwd,
      );

      this.bus.publish("cortex", "motor:result", {
        requestId: payload.id,
        ...result,
      });
    });

    // File Operations (Basic "Hands")
    this.bus.on("motor:file:write", async (event: SynapsysEvent) => {
      const payload = event.payload;
      try {
        const fullPath = path.isAbsolute(payload.path)
          ? payload.path
          : path.join(this.workspaceRoot, payload.path);

        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, payload.content, "utf-8");

        this.bus.publish("cortex", "motor:result", {
          requestId: payload.id,
          ok: true,
          stdout: `File written: ${payload.path}`,
          stderr: "",
          exitCode: 0,
        });
      } catch (err: any) {
        this.bus.publish("cortex", "motor:result", {
          requestId: payload.id,
          ok: false,
          stdout: "",
          stderr: err.message,
          exitCode: 1,
        });
      }
    });

    this.bus.on("motor:file:read", async (event: SynapsysEvent) => {
      const payload = event.payload;
      try {
        const fullPath = path.isAbsolute(payload.path)
          ? payload.path
          : path.join(this.workspaceRoot, payload.path);

        const content = await fs.readFile(fullPath, "utf-8");

        this.bus.publish("cortex", "motor:result", {
          requestId: payload.id,
          ok: true,
          stdout: content,
          stderr: "",
          exitCode: 0,
        });
      } catch (err: any) {
        this.bus.publish("cortex", "motor:result", {
          requestId: payload.id,
          ok: false,
          stdout: "",
          stderr: err.message,
          exitCode: 1,
        });
      }
    });
  }
}
