// @version 3.3.531

import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { bus, SynapsysEvent } from '../core/event-bus.js';
import fs from 'fs-extra';
import path from 'path';

// Project room tracking
interface ProjectRoom {
  projectId: string;
  users: Map<string, { socketId: string; userId: string; joinedAt: number }>;
  lastActivity: number;
}

export class SocketServer {
  private io: Server;
  private socketMap: Map<string, any> = new Map(); // Maps requestId → socket
  private projectRooms: Map<string, ProjectRoom> = new Map(); // Maps projectId → room info
  private socketToProject: Map<string, string> = new Map(); // Maps socketId → projectId

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

      // ============================================================================
      // V3.3.531: Project Sync Handlers - Real-time collaboration support
      // ============================================================================

      /**
       * project:join - Join a project room for real-time updates
       * @param data { projectId: string, userId?: string }
       */
      socket.on('project:join', async (data: any) => {
        try {
          const { projectId, userId = 'anonymous' } = data;
          if (!projectId) {
            socket.emit('project:error', { error: 'projectId is required' });
            return;
          }

          // Verify project exists
          const projectPath = path.join(process.cwd(), 'projects', projectId);
          if (!(await fs.pathExists(projectPath))) {
            socket.emit('project:error', { error: 'Project not found', projectId });
            return;
          }

          // Leave any previous project room
          const previousProject = this.socketToProject.get(socket.id);
          if (previousProject && previousProject !== projectId) {
            await this.leaveProjectRoom(socket, previousProject);
          }

          // Join the Socket.IO room
          socket.join(`project:${projectId}`);
          this.socketToProject.set(socket.id, projectId);

          // Track in our project rooms
          if (!this.projectRooms.has(projectId)) {
            this.projectRooms.set(projectId, {
              projectId,
              users: new Map(),
              lastActivity: Date.now(),
            });
          }

          const room = this.projectRooms.get(projectId)!;
          room.users.set(socket.id, {
            socketId: socket.id,
            userId,
            joinedAt: Date.now(),
          });
          room.lastActivity = Date.now();

          // Load project state
          const projectFile = path.join(projectPath, 'project.json');
          const projectData = await fs.readJSON(projectFile).catch(() => null);

          // Notify the joining user
          socket.emit('project:joined', {
            projectId,
            project: projectData,
            users: Array.from(room.users.values()).map(u => ({
              id: u.userId,
              joinedAt: u.joinedAt,
            })),
            timestamp: new Date().toISOString(),
          });

          // Notify other users in the room
          socket.to(`project:${projectId}`).emit('project:user_joined', {
            projectId,
            userId,
            timestamp: new Date().toISOString(),
          });

          console.log(`[Socket] User ${userId} joined project ${projectId}`);
          bus.publish('project', 'project:user_joined', { projectId, userId, socketId: socket.id });
        } catch (err) {
          console.error(`[Socket] Error handling project:join:`, err);
          socket.emit('project:error', {
            error: err instanceof Error ? err.message : 'Failed to join project',
          });
        }
      });

      /**
       * project:leave - Leave a project room
       * @param data { projectId: string }
       */
      socket.on('project:leave', async (data: any) => {
        try {
          const { projectId } = data;
          if (!projectId) {
            socket.emit('project:error', { error: 'projectId is required' });
            return;
          }

          await this.leaveProjectRoom(socket, projectId);
          socket.emit('project:left', { projectId, timestamp: new Date().toISOString() });
        } catch (err) {
          console.error(`[Socket] Error handling project:leave:`, err);
          socket.emit('project:error', {
            error: err instanceof Error ? err.message : 'Failed to leave project',
          });
        }
      });

      /**
       * project:save - Save project state and broadcast to all users
       * @param data { projectId: string, state: object, userId?: string }
       */
      socket.on('project:save', async (data: any) => {
        try {
          const { projectId, state, userId = 'anonymous' } = data;
          if (!projectId || !state) {
            socket.emit('project:error', { error: 'projectId and state are required' });
            return;
          }

          const projectPath = path.join(process.cwd(), 'projects', projectId);
          const projectFile = path.join(projectPath, 'project.json');

          if (!(await fs.pathExists(projectPath))) {
            socket.emit('project:error', { error: 'Project not found', projectId });
            return;
          }

          // Merge with existing data and save
          const existing = await fs.readJSON(projectFile).catch(() => ({}));
          const updated = {
            ...existing,
            ...state,
            updatedAt: new Date().toISOString(),
            lastModifiedBy: userId,
          };

          await fs.writeJSON(projectFile, updated, { spaces: 2 });

          // Update room activity
          const room = this.projectRooms.get(projectId);
          if (room) {
            room.lastActivity = Date.now();
          }

          // Acknowledge save to sender
          socket.emit('project:saved', {
            projectId,
            version: updated.updatedAt,
            timestamp: new Date().toISOString(),
          });

          // Broadcast update to all OTHER users in the room
          socket.to(`project:${projectId}`).emit('project:updated', {
            projectId,
            state: updated,
            updatedBy: userId,
            timestamp: new Date().toISOString(),
          });

          console.log(`[Socket] Project ${projectId} saved by ${userId}`);
          bus.publish('project', 'project:saved', { projectId, userId });
        } catch (err) {
          console.error(`[Socket] Error handling project:save:`, err);
          socket.emit('project:error', {
            error: err instanceof Error ? err.message : 'Failed to save project',
          });
        }
      });

      /**
       * project:sync - Request full project state sync
       * @param data { projectId: string }
       */
      socket.on('project:sync', async (data: any) => {
        try {
          const { projectId } = data;
          if (!projectId) {
            socket.emit('project:error', { error: 'projectId is required' });
            return;
          }

          const projectPath = path.join(process.cwd(), 'projects', projectId);
          const projectFile = path.join(projectPath, 'project.json');

          if (!(await fs.pathExists(projectPath))) {
            socket.emit('project:error', { error: 'Project not found', projectId });
            return;
          }

          const projectData = await fs.readJSON(projectFile).catch(() => null);
          const room = this.projectRooms.get(projectId);

          socket.emit('project:synced', {
            projectId,
            project: projectData,
            users: room
              ? Array.from(room.users.values()).map(u => ({ id: u.userId, joinedAt: u.joinedAt }))
              : [],
            timestamp: new Date().toISOString(),
          });

          console.log(`[Socket] Project ${projectId} synced to ${socket.id}`);
        } catch (err) {
          console.error(`[Socket] Error handling project:sync:`, err);
          socket.emit('project:error', {
            error: err instanceof Error ? err.message : 'Failed to sync project',
          });
        }
      });

      /**
       * project:cursor - Broadcast cursor position for collaboration
       * @param data { projectId: string, cursor: { x: number, y: number, userId: string } }
       */
      socket.on('project:cursor', (data: any) => {
        const { projectId, cursor } = data;
        if (!projectId || !cursor) return;

        // Broadcast cursor to other users in the room (lightweight, no persistence)
        socket.to(`project:${projectId}`).emit('project:cursor_moved', {
          projectId,
          cursor: { ...cursor, socketId: socket.id },
          timestamp: Date.now(),
        });
      });

      /**
       * project:presence - Update user presence status
       * @param data { projectId: string, status: 'active' | 'idle' | 'away' }
       */
      socket.on('project:presence', (data: any) => {
        const { projectId, status, userId } = data;
        if (!projectId) return;

        socket.to(`project:${projectId}`).emit('project:presence_changed', {
          projectId,
          userId: userId || socket.id,
          status,
          timestamp: Date.now(),
        });
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

        // V3.3.531: Clean up project room membership
        const projectId = this.socketToProject.get(socket.id);
        if (projectId) {
          this.leaveProjectRoom(socket, projectId);
        }
      });
    });
  }

  /**
   * V3.3.531: Helper to remove a socket from a project room
   */
  private async leaveProjectRoom(socket: Socket, projectId: string): Promise<void> {
    const room = this.projectRooms.get(projectId);
    if (room) {
      const userData = room.users.get(socket.id);
      const userId = userData?.userId || 'unknown';
      
      room.users.delete(socket.id);
      room.lastActivity = Date.now();

      // If room is empty, clean it up after a delay
      if (room.users.size === 0) {
        setTimeout(() => {
          const currentRoom = this.projectRooms.get(projectId);
          if (currentRoom && currentRoom.users.size === 0) {
            this.projectRooms.delete(projectId);
            console.log(`[Socket] Cleaned up empty project room: ${projectId}`);
          }
        }, 60000); // 1 minute delay before cleanup
      }

      // Notify other users
      socket.to(`project:${projectId}`).emit('project:user_left', {
        projectId,
        userId,
        timestamp: new Date().toISOString(),
      });

      console.log(`[Socket] User ${userId} left project ${projectId}`);
      bus.publish('project', 'project:user_left', { projectId, userId, socketId: socket.id });
    }

    socket.leave(`project:${projectId}`);
    this.socketToProject.delete(socket.id);
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
