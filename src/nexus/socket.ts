// @version 2.1.182

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { bus, SynapsysEvent } from "../core/event-bus.js";

export class SocketServer {
  private io: Server;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "*", // Allow all for local dev
        methods: ["GET", "POST"],
      },
    });

    this.setupConnection();
    this.bridgeEvents();
  }

  private setupConnection() {
    this.io.on("connection", (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });

      // Allow clients to subscribe to specific channels if needed
      // For now, we broadcast everything to everyone (single user mode)
    });
  }

  private bridgeEvents() {
    // List of event types to forward to the frontend
    const forwardEvents = [
      "cortex:tool:call",
      "cortex:tool:result",
      "planning:plan:created",
      "planning:plan:updated",
      "planning:plan:completed",
      "planning:plan:failed",
      "planning:replan:request",
      "motor:execute",
      "motor:file:write",
      "motor:file:read",
      "sensory:observation:error",
      "cortex:response" // Final response
    ];

    // Listen to all events on the bus
    // Note: EventBus emits '*' for all events
    bus.on("*", (event: SynapsysEvent) => {
      // Filter or forward all?
      // Let's forward interesting ones
      if (forwardEvents.includes(event.type) || event.type.startsWith("cortex:")) {
        this.io.emit("synapsys:event", event);
      }
    });
  }
}
