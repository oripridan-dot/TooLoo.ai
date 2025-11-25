// @version 2.1.241
import { bus, SynapsysEvent } from "../../core/event-bus.js";

export enum AmygdalaState {
  CALM = "CALM",
  ALERT = "ALERT",
  PANIC = "PANIC",
  CRITICAL = "CRITICAL"
}

export class Amygdala {
  private cortisol: number = 0.0;
  private state: AmygdalaState = AmygdalaState.CALM;
  private eventCount: number = 0;
  private lastTick: number = Date.now();
  private eventHistory: number[] = []; // Rolling window of event counts per second
  
  // Thresholds
  private readonly MEMORY_WARNING_THRESHOLD = 0.7; // 70% of heap
  private readonly MEMORY_CRITICAL_THRESHOLD = 0.9; // 90% of heap
  private readonly EVENT_SPIKE_THRESHOLD = 50; // Events per second

  constructor() {
    console.log("[Amygdala] Initializing Survival Instincts...");
    this.startMonitoring();
    this.setupReflexes();
  }

  private startMonitoring() {
    // Heartbeat (1s)
    setInterval(() => this.tick(), 1000);
  }

  private tick() {
    const now = Date.now();
    // const delta = (now - this.lastTick) / 1000; // Unused for now
    this.lastTick = now;

    // 1. Measure Stressors
    const memoryStress = this.checkMemory();
    const cognitiveLoad = this.checkCognitiveLoad(); // Based on eventCount

    // 2. Update Cortisol (with decay)
    // Base decay
    this.cortisol = Math.max(0, this.cortisol - 0.05);

    // Add stress
    if (memoryStress > 0) this.cortisol += memoryStress;
    if (cognitiveLoad > 0) this.cortisol += cognitiveLoad;

    // Cap at 1.0
    this.cortisol = Math.min(1.0, this.cortisol);

    // 3. Determine State
    this.updateState();

    // Reset counters
    this.eventHistory.push(this.eventCount);
    if (this.eventHistory.length > 60) this.eventHistory.shift();
    this.eventCount = 0;

    // Log if stressed
    if (this.state !== AmygdalaState.CALM) {
      console.warn(`[Amygdala] State: ${this.state} | Cortisol: ${this.cortisol.toFixed(2)} | MemStress: ${memoryStress.toFixed(2)} | Load: ${cognitiveLoad.toFixed(2)}`);
    }
  }

  private checkMemory(): number {
    const mem = process.memoryUsage();
    const heapUsed = mem.heapUsed;
    const heapTotal = mem.heapTotal;
    const ratio = heapUsed / heapTotal;

    if (ratio > this.MEMORY_CRITICAL_THRESHOLD) return 0.3; // High stress increase
    if (ratio > this.MEMORY_WARNING_THRESHOLD) return 0.1; // Moderate stress increase
    return 0;
  }

  private checkCognitiveLoad(): number {
    // Simple heuristic: if events > threshold, stress increases
    if (this.eventCount > this.EVENT_SPIKE_THRESHOLD) {
        return 0.1 + ((this.eventCount - this.EVENT_SPIKE_THRESHOLD) / 100);
    }
    return 0;
  }

  private updateState() {
    const oldState = this.state;
    
    if (this.cortisol > 0.9) this.state = AmygdalaState.CRITICAL;
    else if (this.cortisol > 0.7) this.state = AmygdalaState.PANIC;
    else if (this.cortisol > 0.4) this.state = AmygdalaState.ALERT;
    else this.state = AmygdalaState.CALM;

    if (oldState !== this.state) {
      console.log(`[Amygdala] State changed: ${oldState} -> ${this.state}`);
      bus.publish("system", "amygdala:state_change", { 
        from: oldState, 
        to: this.state, 
        cortisol: this.cortisol 
      });
      
      if (this.state === AmygdalaState.CRITICAL) {
          this.emergencyShutdown();
      }
    }
  }

  private setupReflexes() {
    // Intercept all events
    bus.addInterceptor(async (event: SynapsysEvent) => {
      this.eventCount++;

      // Always allow system/amygdala events to pass (so we don't block our own recovery)
      if (event.type.startsWith("amygdala:") || event.type.startsWith("system:")) {
        return true;
      }

      // Reflexes based on state
      switch (this.state) {
        case AmygdalaState.CALM:
          return true; // All good

        case AmygdalaState.ALERT:
          // Mild throttling: Add small delay to slow down the loop
          await new Promise(resolve => setTimeout(resolve, 10)); 
          return true;

        case AmygdalaState.PANIC:
          // Fight or Flight: Block non-essential sensory inputs
          if (event.source === "nexus" || event.type.includes("sensory")) {
             // Flight: Ignore external stimuli
             return false; 
          }
          // Throttling
          await new Promise(resolve => setTimeout(resolve, 50));
          return true;

        case AmygdalaState.CRITICAL:
          // Freeze: Block almost everything
          return false;
      }
      return true;
    });
  }

  private emergencyShutdown() {
      console.error("[Amygdala] CRITICAL STRESS LEVEL. INITIATING EMERGENCY PROTOCOLS.");
      // In a real scenario, we might try to save state.
      // For now, we just want to stop the bleeding.
      // We could emit a special event to stop all loops.
      bus.publish("system", "system:emergency_stop", { reason: "Cortisol Overload" });
      
      // Force GC if possible (requires --expose-gc, usually not available but good intent)
      if (global.gc) {
          console.log("[Amygdala] Forcing Garbage Collection...");
          global.gc();
      }
  }
}

export const amygdala = new Amygdala();
