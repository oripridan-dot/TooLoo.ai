// @version 2.1.28
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import { FileWatcher } from "./watcher.js";
import { SemanticParser } from "./semantic-parser.js";

interface MotorResult {
  ok: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

export class SensoryCortex {
  private watcher: FileWatcher;
  private parser: SemanticParser;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string,
  ) {
    this.watcher = new FileWatcher(bus, workspaceRoot);
    this.parser = new SemanticParser(bus, workspaceRoot);
  }

  async initialize() {
    console.log("[SensoryCortex] Initializing Sensory Systems...");

    // Start watching the workspace
    // We watch the root by default, but exclude heavy folders in the watcher config
    this.watcher.start(["."]);

    // Initial Project Analysis
    await this.parser.analyzeProject();

    this.setupListeners();

    this.bus.publish("cortex", "system:component_ready", {
      component: "sensory-cortex",
    });
    console.log("[SensoryCortex] Online - Eyes open.");
  }

  private setupListeners() {
    // Listen for requests to watch specific paths (focus attention)
    this.bus.on("sensory:focus", (event: SynapsysEvent) => {
      // TODO: Implement dynamic watch path updates
      console.log(
        `[SensoryCortex] Focus request received: ${JSON.stringify(event.payload)}`,
      );
    });

    // Listen for project re-analysis request
    this.bus.on("sensory:analyze_project", async () => {
      await this.parser.analyzeProject();
    });

    // Listen for motor output to "see" what the hands are doing
    this.bus.on("motor:result", (event: SynapsysEvent) => {
      this.analyzeMotorOutput(event.payload);
    });
  }

  private analyzeMotorOutput(result: MotorResult) {
    // This is where we "read" the terminal output
    if (!result.ok) {
      console.log(
        `[SensoryCortex] Observed execution failure: ${result.stderr}`,
      );
      this.bus.publish("cortex", "sensory:observation:error", {
        source: "motor",
        details: result.stderr,
      });
    } else {
      // If the output is interesting, we might publish an observation
      if (result.stdout && result.stdout.length > 0) {
        // Simple heuristic: if it's short, log it. If it's long, maybe summarize?
        // For now, just acknowledge.
        console.log(
          `[SensoryCortex] Observed execution output (${result.stdout.length} chars)`,
        );
      }
    }
  }
}
