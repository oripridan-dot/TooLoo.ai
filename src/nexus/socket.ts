// @version 3.3.460

import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { bus, SynapsysEvent } from '../core/event-bus.js';

export class SocketServer {
  private io: Server;
  private socketMap: Map<string, any> = new Map(); // Maps requestId → socket

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow all for local dev
        methods: ['GET', 'POST'],
      },
      // v3.3.300: Improved connection stability settings
      pingTimeout: 60000, // Increase ping timeout to 60s
      pingInterval: 25000, // Ping every 25s
      transports: ['websocket', 'polling'], // Prefer websocket, fallback to polling
      allowUpgrades: true,
      upgradeTimeout: 10000,
      maxHttpBufferSize: 1e7, // 10MB max message size
      // Connection state recovery for better resilience
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
    });

    this.setupConnection();
    this.bridgeEvents();
  }

  private setupConnection() {
    this.io.on('connection', (socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // When client sends 'generate' request (chat message), store the socket for later routing
      socket.on('generate', (data: any) => {
        try {
          const { message, requestId, sessionId } = data;
          console.log(
            `[Socket] Received generate request: ${requestId} - Message: "${message.substring(0, 50)}..."`
          );

          // Store socket mapping for this request so we can route response back
          this.socketMap.set(requestId, socket);
          console.log(`[Socket] Stored mapping for ${requestId}`);

          // Emit thinking status to client immediately
          socket.emit('thinking', { requestId });
          console.log(`[Socket] Emitted thinking to client`);

          // Publish chat request to cortex
          bus.publish('nexus', 'nexus:chat_request', {
            message,
            requestId,
            sessionId,
            projectId: null,
            responseType: 'chat',
          });
          console.log(`[Socket] Published nexus:chat_request`);
        } catch (err) {
          console.error(`[Socket] Error handling generate:`, err);
        }
      });

      // Handle Sensory Input (Typing)
      socket.on('sensory:input', (data: any) => {
        try {
          bus.publish('nexus', 'sensory:input', {
            input: data.input,
            sessionId: data.sessionId,
            timestamp: data.timestamp,
          });
        } catch (err) {
          console.error(`[Socket] Error handling sensory input:`, err);
        }
      });

      // Handle Side-Chain Injection (system commands from NeuralState)
      socket.on('user:side_chain_inject', (data: any) => {
        try {
          const { sessionId, content, timestamp } = data;
          console.log(`[Socket] Side-chain inject: "${content.substring(0, 50)}..."`);

          // Publish to cortex for processing
          bus.publish('nexus', 'user:side_chain_inject', {
            sessionId,
            content,
            timestamp,
            socketId: socket.id,
          });

          // Acknowledge receipt
          socket.emit('side_chain:ack', {
            status: 'received',
            content: content.substring(0, 50),
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`[Socket] Error handling side-chain inject:`, err);
          socket.emit('side_chain:error', {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

      // V3.3.425: Live Design Wire - Real-time Visual Generation
      socket.on('visual:stream', async (data: any) => {
        try {
          const { prompt, type = 'svg', subtype = 'background', requestId } = data;
          console.log(`[Socket] Visual stream request: "${prompt?.substring(0, 50)}..."`);

          // Import VisualCortex2 dynamically to avoid circular deps
          const { visualCortex2 } = await import('../cortex/visual/visual-cortex-2.js');

          // Generate visual based on prompt
          const result = await visualCortex2.generate({
            type,
            subtype,
            data: { prompt }, // Pass prompt as data
            options: {
              width: 400,
              height: 300,
              animate: true,
            },
            style: {
              theme: 'dark',
              animate: true,
            },
          });

          // Emit result back to client
          socket.emit('visual:stream:result', {
            requestId,
            success: result.success,
            svg: result.svg,
            css: result.css,
            metadata: result.metadata,
            error: result.error,
          });

          console.log(
            `[Socket] Visual stream result sent: ${result.success ? 'success' : 'failed'}`
          );
        } catch (err) {
          console.error(`[Socket] Error handling visual:stream:`, err);
          socket.emit('visual:stream:result', {
            requestId: data?.requestId,
            success: false,
            error: err instanceof Error ? err.message : 'Visual generation failed',
          });
        }
      });

      // V3.3.460: User Feedback Handler - Captures feedback for learning systems
      socket.on('user:feedback', (data: any) => {
        try {
          const { type, targetId, rating, comment, timestamp } = data;
          console.log(`[Socket] User feedback received: ${type} for ${targetId || 'general'}`);

          // Publish feedback to learning systems
          bus.publish('learning', 'learning:feedback_recorded', {
            type,
            targetId,
            rating,
            comment,
            timestamp: timestamp || new Date().toISOString(),
            sessionId: socket.id,
          });

          // Acknowledge feedback received
          socket.emit('feedback:ack', {
            status: 'received',
            type,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`[Socket] Error handling user:feedback:`, err);
          socket.emit('feedback:error', {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      });

      socket.on('error', (err: any) => {
        console.error(`[Socket] Client error: ${socket.id}`, err);
      });

      socket.on('disconnect', () => {
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
    bus.on('cortex:response', (event: SynapsysEvent) => {
      const requestId = event.payload?.requestId;
      console.log(`[Socket] Received cortex:response for: ${requestId}`);

      if (requestId) {
        const socket = this.socketMap.get(requestId);
        if (socket) {
          console.log(`[Socket] Routing response to socket: ${socket.id}`);
          socket.emit('response', event.payload.data);
          this.socketMap.delete(requestId); // Clean up
        } else {
          console.warn(`[Socket] No socket found for requestId: ${requestId}`);
        }
      }
    });

    // V3.3.405: System Pulse - Wire FileWatcher to real-time UI
    // This broadcasts file change events to all connected clients for the HUD
    bus.on('sensory:file:change', (event: SynapsysEvent) => {
      const payload = event.payload as { type: string; path: string; timestamp: number };
      this.io.emit('system:pulse', {
        file: payload.path,
        changeType: payload.type as 'add' | 'change' | 'unlink',
        timestamp: payload.timestamp,
      });
    });

    // V3.3.425: Dedicated handler for Bio-Feedback Loop events
    bus.on('meta:cognitive_state_change', (event: SynapsysEvent) => {
      // Forward cognitive state changes directly for UI responsiveness
      this.io.emit('meta:cognitive_state_change', event.payload);
    });

    // ============================================================================
    // V3.3.460: Direct Socket Event Bridges
    // These events are listened for directly by the frontend (systemStateStore.js)
    // Previously only available via synapsys:event, now emitted directly for reliability
    // ============================================================================

    // Provider Events
    bus.on('provider:selected', (event: SynapsysEvent) => {
      this.io.emit('provider:selected', event.payload);
    });

    bus.on('provider:routing_decision', (event: SynapsysEvent) => {
      this.io.emit('provider:routing_decision', event.payload);
    });

    // Cost Events
    bus.on('precog:cost_update', (event: SynapsysEvent) => {
      this.io.emit('cost:update', event.payload);
    });

    // Planning Events
    bus.on('planning:dag_created', (event: SynapsysEvent) => {
      this.io.emit('planning:dag_created', event.payload);
    });

    bus.on('planning:segment_created', (event: SynapsysEvent) => {
      this.io.emit('planning:segment_created', event.payload);
    });

    // Motor Events
    bus.on('motor:execute', (event: SynapsysEvent) => {
      this.io.emit('motor:execute', event.payload);
    });

    bus.on('motor:result', (event: SynapsysEvent) => {
      this.io.emit('motor:result', event.payload);
    });

    // Memory Events
    bus.on('memory:context_retrieved', (event: SynapsysEvent) => {
      this.io.emit('memory:context_retrieved', event.payload);
    });

    // Knowledge Events
    bus.on('knowledge:graph_update', (event: SynapsysEvent) => {
      this.io.emit('knowledge:graph_update', event.payload);
    });

    // Evaluation Events
    bus.on('evaluation:confidence', (event: SynapsysEvent) => {
      this.io.emit('evaluation:confidence', event.payload);
    });

    // Learning Events (also emitted by user:feedback handler)
    bus.on('learning:feedback_recorded', (event: SynapsysEvent) => {
      this.io.emit('learning:feedback_recorded', event.payload);
    });

    // Visual Generation Events
    bus.on('visual:generation_start', (event: SynapsysEvent) => {
      this.io.emit('visual:generation_start', event.payload);
    });

    bus.on('visual:generation_complete', (event: SynapsysEvent) => {
      this.io.emit('visual:generation_complete', event.payload);
    });

    // List of event types to forward to all clients (status updates, etc.)
    // Synapsys V3: Replaced hardcoded list with Pattern-Based Bridge
    // This allows the UI to see all relevant "thought" processes in real-time.

    // Broadcast events to all connected clients based on pattern
    bus.on('*', (event: SynapsysEvent) => {
      // Forward all Cortex, Visual, System, Planning, Meta, and Project events automatically
      // This is the "Nervous System" of Synapsys V3
      if (
        /^(cortex|visual|system|planning|motor|sensory|arena|precog|provider|project|meta):/.test(
          event.type
        )
      ) {
        this.io.emit('synapsys:event', event);
      }
    });
  }
}
