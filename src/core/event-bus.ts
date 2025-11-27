// @version 2.1.341
import { EventEmitter } from "events";

// Enhanced Visual Data Interface
export interface VisualData {
  type: "image" | "diagram" | "component" | "comparison" | "process" | "data";
  data: string; // base64 encoded image, mermaid diagram, or JSON component definition
  mimeType?: string; // e.g., "image/png", "image/jpeg"
  altText?: string; // Accessibility
  metadata?: Record<string, any>; // Additional info (size, duration, etc.)
}

// Designer Action Interface
export interface DesignerAction {
  action: "create" | "update" | "delete" | "get" | "sync" | "broadcast";
  target: "component" | "design" | "style" | "system" | "layout";
  payload: any; // Data for the action
  componentId?: string; // UUID for component tracking
  timestamp?: number;
}

// Enhanced Event Context
export interface EventContext {
  userId?: string;
  conversationId?: string;
  projectId?: string;
  sessionId?: string;
  [key: string]: any;
}

// Enhanced Payload Structure
export interface EnhancedEventPayload<T = any> {
  type: string;
  data: T;
  visual?: VisualData;
  designerAction?: DesignerAction;
  context?: EventContext;
  metadata?: {
    priority?: "low" | "normal" | "high";
    retryable?: boolean;
    timeout?: number;
    [key: string]: any;
  };
}

// Define the standard event shape for Synapsys
export interface SynapsysEvent<T = any> {
  source: "cortex" | "precog" | "nexus" | "system";
  type: string;
  payload: T | EnhancedEventPayload<T>;
  timestamp: number;
  id?: string; // Unique event identifier
}

export type EventInterceptor = (
  event: SynapsysEvent,
) => boolean | Promise<boolean>;

// Event Filter for selective subscriptions
export interface EventFilter {
  types?: string[];
  visualTypes?: VisualData["type"][];
  designerTargets?: DesignerAction["target"][];
  sources?: SynapsysEvent["source"][];
}

export class EventBus extends EventEmitter {
  private id: string;
  private interceptors: EventInterceptor[] = [];
  private eventHistory: SynapsysEvent[] = [];
  private maxHistorySize: number = 1000;
  private eventFilters: Map<string, EventFilter> = new Map();

  constructor() {
    super();
    this.id = Math.random().toString(36).substring(7);
    console.log(`[EventBus] Initialized instance ${this.id}`);
    this.setMaxListeners(100); // Increased from 50 for visual events
  }

  addInterceptor(interceptor: EventInterceptor) {
    this.interceptors.push(interceptor);
  }

  // Register an event filter for efficient filtering
  registerFilter(subscriberId: string, filter: EventFilter) {
    this.eventFilters.set(subscriberId, filter);
  }

  // Check if event matches filter criteria
  private matchesFilter(event: SynapsysEvent, filter: EventFilter): boolean {
    if (filter.types && !filter.types.includes(event.type)) return false;

    const payload = event.payload as EnhancedEventPayload;

    if (
      filter.visualTypes &&
      payload.visual &&
      !filter.visualTypes.includes(payload.visual.type)
    ) {
      return false;
    }

    if (
      filter.designerTargets &&
      payload.designerAction &&
      !filter.designerTargets.includes(payload.designerAction.target)
    ) {
      return false;
    }

    if (filter.sources && !filter.sources.includes(event.source)) {
      return false;
    }

    return true;
  }

  async emitEvent(event: SynapsysEvent) {
    // Add unique ID and store in history
    if (!event.id) {
      event.id = crypto.randomUUID();
    }
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Run interceptors
    for (const interceptor of this.interceptors) {
      try {
        const allow = await interceptor(event);
        if (!allow) return; // Block event
      } catch (e) {
        console.error("[EventBus] Interceptor error:", e);
      }
    }

    // Emit to wildcard listeners
    this.emit("*", event);

    // Emit to specific type listeners
    this.emit(event.type, event);

    // Emit visual updates if present
    const payload = event.payload as EnhancedEventPayload;
    if (payload.visual) {
      this.emit("visual:update", event);
      this.emit(`visual:${payload.visual.type}`, event);
    }

    // Emit designer updates if present
    if (payload.designerAction) {
      this.emit("designer:action", event);
      this.emit(`designer:${payload.designerAction.target}`, event);
    }
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

  // Enhanced publish with visual data
  publishVisual(
    source: SynapsysEvent["source"],
    type: string,
    data: any,
    visual: VisualData,
    context?: EventContext,
  ) {
    const payload: EnhancedEventPayload = {
      type,
      data,
      visual,
      context,
    };
    this.publish(source, type, payload);
  }

  // Enhanced publish with designer action
  publishDesignerAction(
    source: SynapsysEvent["source"],
    type: string,
    action: DesignerAction,
    context?: EventContext,
  ) {
    const payload: EnhancedEventPayload = {
      type,
      data: action.payload,
      designerAction: action,
      context,
    };
    this.publish(source, type, payload);
  }

  // Subscribe with filtering
  subscribeTo(
    eventName: string,
    handler: (payload: SynapsysEvent) => void,
    filter?: EventFilter,
  ): string {
    const subscriberId = crypto.randomUUID();

    if (filter) {
      this.registerFilter(subscriberId, filter);
    }

    const wrappedHandler = (event: SynapsysEvent) => {
      if (filter && !this.matchesFilter(event, filter)) {
        return;
      }
      handler(event);
    };

    this.on(eventName, wrappedHandler);
    return subscriberId;
  }

  // Get event history (useful for debugging)
  getEventHistory(limit: number = 50): SynapsysEvent[] {
    return this.eventHistory.slice(-limit);
  }

  // Clear event history
  clearEventHistory() {
    this.eventHistory = [];
  }
}

export const bus = new EventBus();
