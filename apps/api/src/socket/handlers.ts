/**
 * @tooloo/api - Socket Handlers V2
 * Real-time WebSocket handlers with Orchestrator integration
 *
 * @version 2.0.0-alpha.0
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createSessionId, type Message } from '@tooloo/core';
import type { Orchestrator, OrchestrationResult } from '@tooloo/engine';
import type { SkillRegistry } from '@tooloo/skills';
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

// Active requests for cancellation
const activeRequests = new Map<string, AbortController>();

// Helper to convert simple conversation to Message format
function toMessage(role: string, content: string): Message {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role: role as 'user' | 'assistant' | 'system' | 'tool',
    content,
    timestamp: new Date(),
  };
}

export function setupSocketHandlers(
  io: TypedIO,
  orchestrator: Orchestrator,
  skillRegistry: SkillRegistry
): void {
  io.on('connection', (socket: TypedSocket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Initialize socket data with session
    const sessionId = createSessionId(`ws_${socket.id}_${Date.now()}`);
    socket.data.sessionId = sessionId;
    socket.data.conversation = [];

    // Handle chat messages with orchestrator
    socket.on('chat:message', async (data: ChatRequest) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const abortController = new AbortController();
      activeRequests.set(requestId, abortController);

      try {
        // Add to conversation history
        socket.data.conversation?.push({
          role: 'user',
          content: data.message,
        });

        // Convert to proper Message[] format for orchestrator
        const conversation: Message[] =
          socket.data.conversation?.map(m => toMessage(m.role, m.content)) || [];

        if (data.stream) {
          // STREAMING MODE - Use orchestrator's streaming API
          const stream = orchestrator.processStream(data.message, sessionId, {
            userId: data.userId,
            projectId: data.projectId,
            conversation,
          });

          let result: OrchestrationResult | null = null;
          let firstChunk = true;

          for await (const chunk of stream) {
            // Check for cancellation
            if (abortController.signal.aborted) {
              socket.emit('chat:stream', { chunk: '', done: true, cancelled: true });
              break;
            }

            if (typeof chunk === 'string') {
              // Emit skill matched on first chunk
              if (firstChunk) {
                firstChunk = false;
              }

              // Stream content chunk
              socket.emit('chat:stream', {
                chunk,
                done: false,
              });
            } else {
              // Final result object
              result = chunk;
            }
          }

          // Emit completion with final response
          if (result && !abortController.signal.aborted) {
            // Emit skill matched event with routing info
            socket.emit('skill:matched', {
              skillId: result.routing?.skill?.id || 'default-chat',
              confidence: result.routing?.confidence || 0,
            });

            // Signal stream complete
            socket.emit('chat:stream', { chunk: '', done: true });

            // Add to conversation
            if (result.response) {
              socket.data.conversation?.push({
                role: 'assistant',
                content: result.response.content,
              });
            }
          }
        } else {
          // NON-STREAMING MODE - Use regular process
          const result = await orchestrator.process(data.message, sessionId, {
            userId: data.userId,
            projectId: data.projectId,
            conversation,
          });

          // Emit skill matched event
          socket.emit('skill:matched', {
            skillId: result.routing?.skill?.id || 'default-chat',
            confidence: result.routing?.confidence || 0,
          });

          // Build and emit response
          const response: ChatResponse = {
            content: result.response?.content || 'No response generated',
            sessionId: sessionId as string,
            messageId: `msg_${Date.now()}`,
            skill: {
              id: result.routing?.skill?.id || 'default-chat',
              name: result.routing?.skill?.name || 'Default Chat',
              confidence: result.routing?.confidence || 0,
            },
            usage: result.response?.metadata?.tokenCount
              ? {
                  promptTokens: result.response.metadata.tokenCount.prompt || 0,
                  completionTokens: result.response.metadata.tokenCount.completion || 0,
                  totalTokens: result.response.metadata.tokenCount.total || 0,
                }
              : undefined,
          };

          socket.emit('chat:response', response);

          // Add to conversation
          if (result.response) {
            socket.data.conversation?.push({
              role: 'assistant',
              content: result.response.content,
            });
          }
        }
      } catch (error) {
        console.error('Socket chat error:', error);
        socket.emit('chat:error', {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        activeRequests.delete(requestId);
      }
    });

    // Handle chat cancellation
    socket.on('chat:cancel', data => {
      const requestId = data?.requestId;
      if (requestId && activeRequests.has(requestId)) {
        activeRequests.get(requestId)?.abort();
        console.log(`Chat cancelled: ${requestId}`);
      }
      // Also cancel any active request for this session
      for (const [id, controller] of activeRequests) {
        if (id.includes(socket.id)) {
          controller.abort();
        }
      }
    });

    // Handle ping with real system status
    socket.on('system:ping', () => {
      const skills = skillRegistry.getAll();

      socket.emit('system:status', {
        version: '2.0.0-alpha.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: Math.round(
            (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
          ),
        },
        providers: [], // TODO: Get from provider registry
        skills: {
          loaded: skills.length,
          enabled: skills.length, // All loaded skills are enabled
        },
      });
    });

    // Handle disconnect
    socket.on('disconnect', reason => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);
      // Cancel any active requests
      for (const [id, controller] of activeRequests) {
        if (id.includes(socket.id)) {
          controller.abort();
          activeRequests.delete(id);
        }
      }
    });
  });

  console.log('Socket.IO handlers initialized with Orchestrator');
}
