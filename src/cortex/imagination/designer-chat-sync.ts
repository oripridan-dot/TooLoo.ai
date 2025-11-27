// @version 2.1.341
/**
 * Designer-Chat Sync Engine
 * Enables real-time bidirectional synchronization between Designer and Chat
 * Components are tracked via UUID for consistent state management
 */

import {
  bus,
  DesignerAction,
  EnhancedEventPayload,
  EventContext,
} from "../../core/event-bus.js";
import { randomUUID as uuidv4 } from "crypto";

export interface DesignComponent {
  id: string; // UUID
  type: string;
  label: string;
  definition: any;
  system?: string; // Design system reference
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface SyncEvent {
  id: string;
  action: "create" | "update" | "delete" | "broadcast";
  component: DesignComponent;
  source: "designer" | "chat";
  timestamp: Date;
  acknowledged: boolean;
}

export class DesignerChatSyncEngine {
  private components: Map<string, DesignComponent> = new Map();
  private syncHistory: SyncEvent[] = [];
  private maxHistorySize: number = 500;
  private pendingUpdates: Map<string, SyncEvent> = new Map();

  constructor() {
    this.setupListeners();
    console.log("[DesignerChatSyncEngine] Initialized");
  }

  /**
   * Setup event listeners for Designer and Chat events
   */
  private setupListeners() {
    // Listen for designer actions from chat context
    bus.on("designer:action", async (event) => {
      const payload = event.payload as EnhancedEventPayload;
      if (payload.designerAction) {
        await this.handleDesignerAction(
          payload.designerAction,
          payload.context,
        );
      }
    });

    // Listen for component updates from Designer
    bus.on("designer:component", async (event) => {
      const payload = event.payload as EnhancedEventPayload;
      if (payload.designerAction) {
        await this.syncComponentFromDesigner(
          payload.designerAction,
          payload.context,
        );
      }
    });

    // Listen for sync requests from Chat
    bus.on("chat:sync_request", async (event) => {
      const { componentId, context } = event.payload;
      await this.broadcastComponentToChat(componentId, context);
    });
  }

  /**
   * Create a new design component
   */
  async createComponent(
    type: string,
    definition: any,
    createdBy: string = "system",
    metadata?: Record<string, any>,
  ): Promise<DesignComponent> {
    const component: DesignComponent = {
      id: uuidv4(),
      type,
      label: definition.label || type,
      definition,
      version: 1,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };

    this.components.set(component.id, component);
    this.recordSyncEvent({
      id: uuidv4(),
      action: "create",
      component,
      source: "designer",
      timestamp: new Date(),
      acknowledged: false,
    });

    // Broadcast to chat
    this.broadcastComponentToChat(component.id);

    return component;
  }

  /**
   * Update a design component
   */
  async updateComponent(
    componentId: string,
    updates: Partial<DesignComponent>,
  ): Promise<DesignComponent | null> {
    const component = this.components.get(componentId);
    if (!component) return null;

    // Update fields
    if (updates.definition) component.definition = updates.definition;
    if (updates.label) component.label = updates.label;
    if (updates.metadata) component.metadata = updates.metadata;

    component.version++;
    component.updatedAt = new Date();

    this.components.set(componentId, component);
    this.recordSyncEvent({
      id: uuidv4(),
      action: "update",
      component,
      source: "designer",
      timestamp: new Date(),
      acknowledged: false,
    });

    // Broadcast to chat
    this.broadcastComponentToChat(componentId);

    return component;
  }

  /**
   * Delete a design component
   */
  async deleteComponent(componentId: string): Promise<boolean> {
    const component = this.components.get(componentId);
    if (!component) return false;

    this.components.delete(componentId);
    this.recordSyncEvent({
      id: uuidv4(),
      action: "delete",
      component,
      source: "designer",
      timestamp: new Date(),
      acknowledged: false,
    });

    // Broadcast deletion to chat
    bus.publishDesignerAction("cortex", "designer:action", {
      action: "delete",
      target: "component",
      payload: { componentId },
    });

    return true;
  }

  /**
   * Get a component by ID
   */
  getComponent(componentId: string): DesignComponent | null {
    return this.components.get(componentId) || null;
  }

  /**
   * Get all components of a specific type
   */
  getComponentsByType(type: string): DesignComponent[] {
    return Array.from(this.components.values()).filter((c) => c.type === type);
  }

  /**
   * Get all components
   */
  getAllComponents(): DesignComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Handle designer action from chat
   */
  private async handleDesignerAction(
    action: DesignerAction,
    _context?: EventContext,
  ) {
    switch (action.action) {
      case "create":
        await this.createComponent(
          action.target,
          action.payload.definition,
          _context?.userId || "chat",
          action.payload.metadata,
        );
        break;

      case "update":
        if (action.componentId) {
          await this.updateComponent(action.componentId, action.payload);
        }
        break;

      case "delete":
        if (action.componentId) {
          await this.deleteComponent(action.componentId);
        }
        break;

      case "get":
        if (action.componentId) {
          const component = this.getComponent(action.componentId);
          if (component) {
            this.broadcastComponentToChat(action.componentId, _context);
          }
        }
        break;

      case "sync":
        // Sync all components
        await this.syncAllComponents(_context);
        break;

      case "broadcast":
        if (action.componentId) {
          await this.broadcastComponentToChat(action.componentId, _context);
        }
        break;
    }
  }

  /**
   * Sync component from Designer to Chat
   */
  private async syncComponentFromDesigner(
    action: DesignerAction,
    context?: EventContext,
  ) {
    if (!action.componentId) return;

    const component = this.getComponent(action.componentId);
    if (!component) {
      // Component doesn't exist locally, create it
      const newComponent = await this.createComponent(
        action.target,
        action.payload.definition,
        context?.userId || "designer",
        action.payload.metadata,
      );
      this.broadcastComponentToChat(newComponent.id, context);
    } else {
      // Update existing component
      await this.updateComponent(action.componentId, action.payload);
    }
  }

  /**
   * Broadcast component to chat
   */
  private async broadcastComponentToChat(
    componentId: string,
    _context?: EventContext,
  ) {
    const component = this.getComponent(componentId);
    if (!component) return;

    bus.publishDesignerAction("cortex", "designer:broadcast", {
      action: "broadcast",
      target: "component",
      componentId,
      payload: component,
    } as DesignerAction);

    console.log(
      `[DesignerChatSyncEngine] Broadcasted component ${componentId} to chat`,
    );
  }

  /**
   * Sync all components
   */
  private async syncAllComponents(context?: EventContext) {
    const components = this.getAllComponents();
    for (const component of components) {
      await this.broadcastComponentToChat(component.id, context);
    }
  }

  /**
   * Record a sync event
   */
  private recordSyncEvent(event: SyncEvent) {
    this.syncHistory.push(event);
    if (this.syncHistory.length > this.maxHistorySize) {
      this.syncHistory.shift();
    }

    // Track pending updates
    this.pendingUpdates.set(event.id, event);

    // Auto-acknowledge after a timeout
    setTimeout(() => {
      event.acknowledged = true;
      this.pendingUpdates.delete(event.id);
    }, 5000);
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 50): SyncEvent[] {
    return this.syncHistory.slice(-limit);
  }

  /**
   * Get pending updates
   */
  getPendingUpdates(): SyncEvent[] {
    return Array.from(this.pendingUpdates.values());
  }

  /**
   * Acknowledge a sync event
   */
  acknowledgeSyncEvent(eventId: string): boolean {
    const event = this.pendingUpdates.get(eventId);
    if (!event) return false;

    event.acknowledged = true;
    this.pendingUpdates.delete(eventId);
    return true;
  }

  /**
   * Get component synchronization status
   */
  getStatus(): any {
    return {
      engine: "designer-chat-sync",
      totalComponents: this.components.size,
      syncHistorySize: this.syncHistory.length,
      pendingUpdates: this.pendingUpdates.size,
      components: Array.from(this.components.keys()),
    };
  }

  /**
   * Clear all data (for testing/reset)
   */
  clear() {
    this.components.clear();
    this.syncHistory = [];
    this.pendingUpdates.clear();
  }
}

// Singleton instance
export const designerChatSync = new DesignerChatSyncEngine();
