import { bus } from "../core/event-bus.js";

export interface TraceStep {
  id: string;
  timestamp: string;
  type: "thought" | "tool" | "result" | "error";
  content: unknown;
  meta?: Record<string, unknown>;
}

export interface ExecutionTrace {
  id: string;
  goal: string;
  startTime: string;
  endTime?: string;
  status: "running" | "completed" | "failed";
  steps: TraceStep[];
  result?: unknown;
  error?: unknown;
}

export class ExecutionTracer {
  private traces: ExecutionTrace[] = [];
  private activeTraceId: string | null = null;
  private maxTraces: number = 50;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // Start of a new goal
    bus.on("planning:intent", (event) => {
      const { goal } = event.payload;
      this.startTrace(goal);
    });

    // Completion of a goal
    bus.on("planning:plan:completed", (event) => {
      this.endTrace("completed", event.payload.result);
    });

    // Failure of a goal
    bus.on("planning:plan:failed", (event) => {
      this.endTrace("failed", undefined, event.payload.error);
    });

    // Tool Execution (We need to hook into this later, but defining the listener now)
    bus.on("cortex:tool:call", (event) => {
      this.addStep("tool", event.payload);
    });

    bus.on("cortex:tool:result", (event) => {
      this.addStep("result", event.payload);
    });

    // Thought/Reasoning (If exposed by the provider)
    bus.on("cortex:thought", (event) => {
      this.addStep("thought", event.payload);
    });
  }

  private startTrace(goal: string) {
    const id = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const trace: ExecutionTrace = {
      id,
      goal,
      startTime: new Date().toISOString(),
      status: "running",
      steps: [],
    };

    this.traces.unshift(trace); // Add to beginning
    if (this.traces.length > this.maxTraces) {
      this.traces.pop();
    }

    this.activeTraceId = id;
    console.log(`[Tracer] Started trace: ${id} for goal: "${goal}"`);
  }

  private endTrace(status: "completed" | "failed", result?: unknown, error?: unknown) {
    if (!this.activeTraceId) return;

    const trace = this.traces.find((t) => t.id === this.activeTraceId);
    if (trace) {
      trace.endTime = new Date().toISOString();
      trace.status = status;
      if (result) trace.result = result;
      if (error) trace.error = error;
      console.log(
        `[Tracer] Ended trace: ${this.activeTraceId} with status: ${status}`,
      );
    }

    this.activeTraceId = null;
  }

  private addStep(type: TraceStep["type"], content: any, meta?: any) {
    if (!this.activeTraceId) return;

    const trace = this.traces.find((t) => t.id === this.activeTraceId);
    if (trace) {
      trace.steps.push({
        id: `step-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type,
        content,
        meta,
      });
    }
  }

  public getTraces(): ExecutionTrace[] {
    return this.traces;
  }

  public getTrace(id: string): ExecutionTrace | undefined {
    return this.traces.find((t) => t.id === id);
  }
}

export const tracer = new ExecutionTracer();
