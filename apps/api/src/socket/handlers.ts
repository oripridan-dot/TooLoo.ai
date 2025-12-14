/**
 * @tooloo/api - Socket Handlers V2
 * Real-time WebSocket handlers with Orchestrator integration
 * V3.3.588: Added orchestration event forwarding for Cognitive Bridge
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

/**
 * Setup orchestration event forwarding for Cognitive Bridge
 * Maps internal orchestrator events to client-facing socket events
 */
function setupOrchestrationEvents(io: TypedIO, orchestrator: Orchestrator): void {
  // Forward orchestration lifecycle events to all connected clients
  // These events drive the SynapysDNA visual state via CognitiveBridge
  
  orchestrator.on('orchestration:start', (event) => {
    if (event.type !== 'orchestration:start') return;
    io.emit('orchestration:start', {
      sessionId: event.context.sessionId,
      context: {
        intent: event.context.intent || { type: 'default' },
      },
      timestamp: new Date().toISOString(),
    });
  });

  orchestrator.on('orchestration:routed', (event) => {
    if (event.type !== 'orchestration:routed') return;
    io.emit('orchestration:routed', {
      result: {
        skill: event.result.skill,
        confidence: event.result.confidence,
      },
      timestamp: new Date().toISOString(),
    });
  });

  orchestrator.on('orchestration:provider_selected', (event) => {
    if (event.type !== 'orchestration:provider_selected') return;
    io.emit('orchestration:provider_selected', {
      selection: {
        providerId: event.selection.providerId,
        model: event.selection.model,
        reason: event.selection.reason,
      },
      timestamp: new Date().toISOString(),
    });
  });

  orchestrator.on('orchestration:executing', (event) => {
    if (event.type !== 'orchestration:executing') return;
    io.emit('orchestration:executing', {
      skill: {
        id: event.skill.id,
        name: event.skill.name,
      },
      timestamp: new Date().toISOString(),
    });
  });

  orchestrator.on('orchestration:complete', (event) => {
    if (event.type !== 'orchestration:complete') return;
    io.emit('orchestration:complete', {
      success: event.result.success,
      timestamp: new Date().toISOString(),
    });
  });

  console.log('Orchestration event forwarding configured for Cognitive Bridge');
}

export function setupSocketHandlers(
  io: TypedIO,
  orchestrator: Orchestrator,
  skillRegistry: SkillRegistry
): void {
  // V3.3.588: Setup orchestration event forwarding for Cognitive Bridge
  setupOrchestrationEvents(io, orchestrator);

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
        console.error('Socket chat error:', error instanceof Error ? error.message : error);
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
