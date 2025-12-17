/**
 * @tooloo/api - Socket Handlers V2
 * Real-time WebSocket handlers with Orchestrator integration
 * V3.3.588: Added orchestration event forwarding for Cognitive Bridge
 * V3.3.600: Added Observatory real-time events
 *
 * @version 2.0.0-alpha.1
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { createSessionId, type Message } from '@tooloo/core';
import type { Orchestrator, OrchestrationResult } from '@tooloo/engine';
import type { SkillRegistry } from '@tooloo/skills';
import { kernel } from '../../../../src/kernel/kernel.js';
import { createSkillEngineService } from '../../../../src/skills/engine-service.js';
import { getSelfHealingService } from '@tooloo/skills';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  ChatRequest,
  ChatResponse,
} from '../types.js';

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type TypedIO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

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

/**
 * Setup Observatory real-time events
 * Provides live system metrics, alerts, and proactive insights
 */
function setupObservatoryEvents(io: TypedIO): NodeJS.Timeout {
  // Send pulse every 5 seconds to subscribed clients
  const pulseInterval = setInterval(() => {
    try {
      // Get engine metrics
      let engines = {
        learning: { healthy: false, states: 0, explorationRate: 0 },
        evolution: { healthy: false, activeTests: 0, improvements: 0 },
        emergence: { healthy: false, patterns: 0, synergies: 0 },
        routing: { healthy: false, providersOnline: 0, successRate: 0 },
      };

      try {
        const context = (kernel as any).context;
        const service = createSkillEngineService(context);
        const metrics = service.getAllMetrics();
        const health = service.getEngineHealth();

        engines = {
          learning: {
            healthy: health.engines.learning,
            states: metrics.learning.totalStates ?? 0,
            explorationRate: metrics.learning.explorationRate ?? 0.1,
          },
          evolution: {
            healthy: health.engines.evolution,
            activeTests: metrics.evolution.activeTests ?? 0,
            improvements: metrics.evolution.totalIterations ?? 0,
          },
          emergence: {
            healthy: health.engines.emergence,
            patterns: metrics.emergence.totalPatterns ?? 0,
            synergies: metrics.emergence.totalSynergies ?? 0,
          },
          routing: {
            healthy: health.engines.routing,
            providersOnline: metrics.routing.providersOnline ?? 0,
            successRate: metrics.routing.successRate ?? 1.0,
          },
        };
      } catch (e) {
        // Engines not available
      }

      // Get healing status
      let healingStatus: { activeIssues: number; status: 'idle' | 'monitoring' | 'healing' } = {
        activeIssues: 0,
        status: 'idle',
      };
      try {
        const healingService = getSelfHealingService();
        const activeIssues = healingService.getActiveIssues?.() ?? [];
        healingStatus = {
          activeIssues: activeIssues.length,
          status: activeIssues.length > 0 ? 'healing' : 'monitoring',
        };
      } catch (e) {
        // Self-healing not available
      }

      // Memory stats
      const memUsage = process.memoryUsage();
      const memoryStats = kernel.getMemoryStats?.() ?? { activeSessions: 0 };

      // Emit to all connected clients (observatory:pulse is handled client-side)
      // Since it's not in the typed events, we use emit with any
      (io as any).emit('observatory:pulse', {
        timestamp: new Date().toISOString(),
        status: Object.values(engines).every((e) => e.healthy) ? 'healthy' : 'degraded',
        engines,
        healing: healingStatus,
        memory: {
          percentage: Number(((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)),
          activeSessions: memoryStats.activeSessions,
        },
      });
    } catch (e) {
      // Silent fail - don't crash on pulse errors
    }
  }, 5000);

  console.log('Observatory real-time events configured');
  return pulseInterval;
}

export function setupSocketHandlers(
  io: TypedIO,
  orchestrator: Orchestrator,
  skillRegistry: SkillRegistry
): void {
  // V3.3.588: Setup orchestration event forwarding for Cognitive Bridge
  setupOrchestrationEvents(io, orchestrator);

  // V3.3.600: Setup Observatory real-time events
  const pulseInterval = setupObservatoryEvents(io);

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
          socket.data.conversation?.map((m) => toMessage(m.role, m.content)) || [];

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
    socket.on('chat:cancel', (data) => {
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

      // Get provider status from routing engine via kernel
      let providers: Array<{
        id: string;
        name: string;
        status: 'available' | 'degraded' | 'unavailable';
        circuitState: 'closed' | 'open' | 'half-open';
      }> = [];
      try {
        const context = (kernel as any).context;
        const service = createSkillEngineService(context);
        const metrics = service.getAllMetrics();
        // Build provider list from routing metrics
        const providerNames = ['deepseek', 'anthropic', 'openai', 'gemini'];
        const isAvailable = metrics.routing.providersOnline > 0;
        providers = providerNames.map((name) => ({
          id: name,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          status: isAvailable ? 'available' : 'unavailable',
          circuitState: 'closed' as const,
        }));
      } catch (_e) {
        // Fallback to default providers
        providers = ['deepseek', 'anthropic', 'openai', 'gemini'].map((name) => ({
          id: name,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          status: 'unavailable' as const,
          circuitState: 'open' as const,
        }));
      }

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
        providers,
        skills: {
          loaded: skills.length,
          enabled: skills.length, // All loaded skills are enabled
        },
      });
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
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
