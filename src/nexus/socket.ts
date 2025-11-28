// @version 2.2.50

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { bus, SynapsysEvent } from "../core/event-bus.js";

export class SocketServer {
  private io: Server;
  private socketMap: Map<string, any> = new Map(); // Maps requestId → socket

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

      // When client sends 'generate' request (chat message), store the socket for later routing
      socket.on("generate", (data: any) => {
        try {
          const { message, requestId, sessionId } = data;
          console.log(
            `[Socket] Received generate request: ${requestId} - Message: "${message.substring(0, 50)}..."`,
          );

          // Store socket mapping for this request so we can route response back
          this.socketMap.set(requestId, socket);
          console.log(`[Socket] Stored mapping for ${requestId}`);

          // Emit thinking status to client immediately
          socket.emit("thinking", { requestId });
          console.log(`[Socket] Emitted thinking to client`);

          // Publish chat request to cortex
          bus.publish("nexus", "nexus:chat_request", {
            message,
            requestId,
            sessionId,
            projectId: null,
            responseType: "chat",
          });
          console.log(`[Socket] Published nexus:chat_request`);
        } catch (err) {
          console.error(`[Socket] Error handling generate:`, err);
        }
      });

      socket.on("error", (err: any) => {
        console.error(`[Socket] Client error: ${socket.id}`, err);
      });

      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        // Clean up socketMap entries for this socket
        for (const [requestId, s] of this.socketMap.entries()) {
          if (s === socket) {
            this.socketMap.delete(requestId);
            console.log(`[Socket] Cleaned up mapping for ${requestId}`);
          }
        }
      });
    });
  }

  private bridgeEvents() {
    // Listen for cortex responses and route them to specific sockets
    bus.on("cortex:response", (event: SynapsysEvent) => {
      const requestId = event.payload?.requestId;
      console.log(`[Socket] Received cortex:response for: ${requestId}`);

      if (requestId) {
        const socket = this.socketMap.get(requestId);
        if (socket) {
          console.log(`[Socket] Routing response to socket: ${socket.id}`);
          socket.emit("response", event.payload.data);
          this.socketMap.delete(requestId); // Clean up
        } else {
          console.warn(`[Socket] No socket found for requestId: ${requestId}`);
        }
      }
    });

    // List of event types to forward to all clients (status updates, etc.)
    // Synapsys V3: Replaced hardcoded list with Pattern-Based Bridge
    // This allows the UI to see all relevant "thought" processes in real-time.

    // Broadcast events to all connected clients based on pattern
    bus.on("*", (event: SynapsysEvent) => {
      // Forward all Cortex, Visual, System, and Planning events automatically
      // This is the "Nervous System" of Synapsys V3
      if (
        /^(cortex|visual|system|planning|motor|sensory|arena|precog|provider):/.test(
          event.type,
        )
      ) {
        this.io.emit("synapsys:event", event);
      }
    });
  }
}
