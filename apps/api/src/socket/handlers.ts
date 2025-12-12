/**
 * @tooloo/api - Socket Handlers
 * WebSocket event handlers for real-time communication
 * 
 * @version 2.0.0-alpha.0
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createSessionId } from '@tooloo/core';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData,
  ChatRequest,
  ChatResponse,
} from '../types.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type TypedIO = SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export function setupSocketHandlers(io: TypedIO): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Initialize socket data with session
    socket.data.sessionId = createSessionId(`ws_${socket.id}_${Date.now()}`);

    // Handle chat messages
    socket.on('chat:message', async (data: ChatRequest) => {
      try {
        // TODO: Wire to @tooloo/engine orchestrator
        // For now, echo back with placeholder response

        // Emit skill matched event
        socket.emit('skill:matched', {
          skillId: 'default-chat',
          confidence: 0.5,
        });

        // Simulate streaming response
        if (data.stream) {
          const words = data.message.split(' ');
          for (const word of words) {
            socket.emit('chat:stream', { chunk: word + ' ', done: false });
            await sleep(50);
          }
          socket.emit('chat:stream', { chunk: '', done: true });
        } else {
          // Non-streaming response
          const response: ChatResponse = {
            content: `[Echo] ${data.message}\n\n*Socket response - orchestrator integration pending.*`,
            sessionId: socket.data.sessionId as string,
            messageId: `msg_${Date.now()}`,
            skill: {
              id: 'default-chat',
              name: 'Default Chat',
              confidence: 0.5,
            },
          };
          socket.emit('chat:response', response);
        }
      } catch (error) {
        socket.emit('chat:error', {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Handle chat cancellation
    socket.on('chat:cancel', (_data) => {
      // TODO: Implement request cancellation
      console.log(`Chat cancelled for session: ${socket.data.sessionId}`);
    });

    // Handle ping
    socket.on('system:ping', () => {
      // Respond with current status
      socket.emit('system:status', {
        version: '2.0.0-alpha.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        },
        providers: [],
        skills: { loaded: 0, enabled: 0 },
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('Socket.IO handlers initialized');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
