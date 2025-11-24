// @version 2.1.203
import { EventEmitter } from "events";

// Define the standard event shape for Synapsys
export interface SynapsysEvent<T = any> {
  source: "cortex" | "precog" | "nexus" | "system";
  type: string;
  payload: T;
  timestamp: number;
}

export class EventBus extends EventEmitter {
  private id: string;
  constructor() {
    super();
    this.id = Math.random().toString(36).substring(7);
    console.log(`[EventBus] Initialized instance ${this.id}`);
    this.setMaxListeners(50); // Allow many modules to listen
  }

  emitEvent(event: SynapsysEvent) {
    this.emit(event.type, event);
    this.emit("*", event); // Wildcard for logging
  }

  // Helper to create and emit in one go
  publish(source: SynapsysEvent["source"], type: string, payload: any) {
    const event: SynapsysEvent = {
      source,
      type,
      payload,
      timestamp: Date.now(),
    };
    this.emitEvent(event);
  }
}

export const bus = new EventBus();
