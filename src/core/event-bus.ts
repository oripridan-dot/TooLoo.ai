// @version 2.1.240
import { EventEmitter } from "events";

// Define the standard event shape for Synapsys
export interface SynapsysEvent<T = any> {
  source: "cortex" | "precog" | "nexus" | "system";
  type: string;
  payload: T;
  timestamp: number;
}

export type EventInterceptor = (event: SynapsysEvent) => boolean | Promise<boolean>;

export class EventBus extends EventEmitter {
  private id: string;
  private interceptors: EventInterceptor[] = [];

  constructor() {
    super();
    this.id = Math.random().toString(36).substring(7);
    console.log(`[EventBus] Initialized instance ${this.id}`);
    this.setMaxListeners(50); // Allow many modules to listen
  }

  addInterceptor(interceptor: EventInterceptor) {
    this.interceptors.push(interceptor);
  }

  async emitEvent(event: SynapsysEvent) {
    for (const interceptor of this.interceptors) {
      try {
        const allow = await interceptor(event);
        if (!allow) return; // Block event
      } catch (e) {
        console.error("[EventBus] Interceptor error:", e);
      }
    }
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
