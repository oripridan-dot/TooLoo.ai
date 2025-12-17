/**
 * @tooloo/api - Chat Routes
 * Conversation and messaging endpoints with Precog routing integration
 *
 * @version 2.0.0-alpha.1
 */

import { Router, type Request, type Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { createSessionId, type SessionId } from '@tooloo/core';
import type { Orchestrator } from '@tooloo/engine';
import type { APIResponse, ChatRequest, ChatResponse } from '../types.js';
import { kernel } from '../../../../src/kernel/kernel.js';

// =============================================================================
// TYPES
// =============================================================================

interface ChatRouterDeps {
  io: SocketIOServer;
  orchestrator?: Orchestrator;
}

/**
 * Complexity levels for routing decisions
 */
type ComplexityLevel = 'trivial' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Routing context extracted from request headers
 */
interface RoutingContext {
  complexityHint: ComplexityLevel;
  sessionId: string;
  requestCount: number;
  conversationDepth: number;
  preferredProvider?: string;
  routingHints?: Record<string, unknown>;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Extract routing context from request headers
 * This enables frontend → Precog communication for intelligent routing
 */
function extractRoutingContext(req: Request): RoutingContext {
  return {
    complexityHint: (req.headers['x-complexity-hint'] as ComplexityLevel) || 'medium',
    sessionId: (req.headers['x-session-id'] as string) || `session_${Date.now()}`,
    requestCount: parseInt(req.headers['x-request-count'] as string) || 0,
    conversationDepth: parseInt(req.headers['x-conversation-depth'] as string) || 0,
    preferredProvider: req.headers['x-preferred-provider'] as string | undefined,
    routingHints: req.headers['x-routing-hints']
      ? JSON.parse(req.headers['x-routing-hints'] as string)
      : undefined,
  };
}

/**
 * Map complexity to provider preference
 * This is the "smart routing" logic that uses frontend hints
 */
function getProviderPreference(complexity: ComplexityLevel): { speed: number; quality: number } {
  switch (complexity) {
    case 'trivial':
      return { speed: 1.0, quality: 0.3 }; // Fastest model
    case 'low':
      return { speed: 0.7, quality: 0.5 };
    case 'medium':
      return { speed: 0.5, quality: 0.7 };
    case 'high':
      return { speed: 0.3, quality: 0.9 };
    case 'critical':
      return { speed: 0.1, quality: 1.0 }; // Best model
    default:
      return { speed: 0.5, quality: 0.7 };
  }
}

export function createChatRouter(deps: ChatRouterDeps): Router {
  const router = Router();
  const { orchestrator } = deps;

  /**
   * POST /chat
   * Send a chat message with intelligent routing
   */
  router.post('/', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const body = req.body as ChatRequest;

    // Extract routing context from headers (Precog integration)
    const routingContext = extractRoutingContext(req);
    const providerPrefs = getProviderPreference(routingContext.complexityHint);

    // Log routing decision for debugging/monitoring
    console.log('[Chat] Routing context:', {
      complexity: routingContext.complexityHint,
      sessionId: routingContext.sessionId,
      depth: routingContext.conversationDepth,
      providerPrefs,
    });

    // Validate request
    if (!body.message || typeof body.message !== 'string') {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Message is required and must be a string',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Use session ID from routing context (frontend-maintained continuity)
    const sessionId = createSessionId(body.sessionId || routingContext.sessionId) as SessionId;

    try {
      let chatResponse: ChatResponse;

      if (orchestrator) {
        // Use the real orchestrator with routing context
        const result = await orchestrator.process(body.message, sessionId, {
          userId: body.userId,
          projectId: body.projectId,
          conversation: body.conversation?.map((m, i) => ({
            id: `msg_${i}`,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: new Date(),
          })),
          // Pass routing hints to orchestrator
          routingHints: {
            complexity: routingContext.complexityHint,
            preferredProvider: routingContext.preferredProvider,
            speedWeight: providerPrefs.speed,
            qualityWeight: providerPrefs.quality,
            ...routingContext.routingHints,
          },
        });

        chatResponse = {
          content: result.response?.content || '',
          sessionId: sessionId as string,
          messageId: `msg_${Date.now()}`,
          skill: result.routing
            ? {
                id: result.routing.skill.id,
                name: result.routing.skill.name,
                confidence: result.routing.confidence,
              }
            : {
                id: 'unknown',
                name: 'Unknown',
                confidence: 0,
              },
          usage: result.response?.metadata?.tokenCount
            ? {
                promptTokens: result.response.metadata.tokenCount.prompt,
                completionTokens: result.response.metadata.tokenCount.completion,
                totalTokens: result.response.metadata.tokenCount.total,
              }
            : {
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
              },
        };
      } else {
        // Fallback placeholder response
        chatResponse = {
          content: `[Echo] ${body.message}\n\n*Note: Orchestrator not initialized. Configure providers to enable AI responses.*`,
          sessionId: sessionId as string,
          messageId: `msg_${Date.now()}`,
          skill: {
            id: 'default-chat',
            name: 'Default Chat',
            confidence: 0.5,
          },
          usage: {
            promptTokens: Math.ceil(body.message.length / 4),
            completionTokens: 50,
            totalTokens: Math.ceil(body.message.length / 4) + 50,
          },
        };
      }

      const response: APIResponse<ChatResponse> = {
        ok: true,
        data: chatResponse,
        meta: {
          requestId: (req as any).requestId,
          timestamp: new Date().toISOString(),
          latencyMs: Date.now() - startTime,
        },
      };

      res.json(response);
    } catch (error) {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'CHAT_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
      res.status(500).json(response);
    }
  });

  /**
   * POST /chat/stream
   * Send a chat message with streaming response
   */
  router.post('/stream', async (req: Request, res: Response) => {
    const body = req.body as ChatRequest;

    if (!body.message) {
      res.status(400).json({
        ok: false,
        error: { code: 'INVALID_REQUEST', message: 'Message is required' },
      });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sessionId = (body.sessionId || createSessionId(`session_${Date.now()}`)) as SessionId;

    if (orchestrator) {
      try {
        // Use the real orchestrator streaming
        for await (const chunk of orchestrator.processStream(body.message, sessionId, {
          userId: body.userId,
          projectId: body.projectId,
          conversation: body.conversation?.map((m, i) => ({
            id: `msg_${i}`,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: new Date(),
          })),
        })) {
          // Only yield string chunks, not the final result object
          if (typeof chunk === 'string') {
            res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
          }
        }
        res.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Stream error', done: true })}\n\n`
        );
      }
    } else {
      // Fallback: simulate streaming
      const words = body.message.split(' ');

      for (const word of words) {
        res.write(`data: ${JSON.stringify({ chunk: word + ' ', done: false })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      res.write(
        `data: ${JSON.stringify({ chunk: '\n\n*[Orchestrator not configured]*', done: true })}\n\n`
      );
    }

    res.end();
  });

  /**
   * GET /chat/history/:sessionId
   * Get chat history for a session
   */
  router.get('/history/:sessionId', async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    try {
      // Get memory cortex from kernel and retrieve conversation history
      const memoryCortex = kernel.getMemoryCortex();
      const session = memoryCortex.getSession(sessionId!);

      if (session) {
        const messages = session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));

        const response: APIResponse<{ messages: unknown[]; sessionId: string }> = {
          ok: true,
          data: {
            sessionId: sessionId!,
            messages,
          },
        };
        res.json(response);
      } else {
        const response: APIResponse<{ messages: unknown[]; sessionId: string }> = {
          ok: true,
          data: {
            sessionId: sessionId!,
            messages: [],
          },
        };
        res.json(response);
      }
    } catch (error) {
      const response: APIResponse<{ messages: unknown[]; sessionId: string }> = {
        ok: true,
        data: {
          sessionId: sessionId!,
          messages: [],
        },
      };
      res.json(response);
    }
  });

  /**
   * DELETE /chat/history/:sessionId
   * Clear chat history for a session
   */
  router.delete('/history/:sessionId', async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    try {
      // Get memory cortex from kernel and clear session
      const memoryCortex = kernel.getMemoryCortex();
      memoryCortex.destroySession(sessionId!);

      const response: APIResponse<{ cleared: boolean; sessionId: string }> = {
        ok: true,
        data: {
          sessionId: sessionId!,
          cleared: true,
        },
      };
      res.json(response);
    } catch (error) {
      const response: APIResponse<{ cleared: boolean; sessionId: string }> = {
        ok: true,
        data: {
          sessionId: sessionId!,
          cleared: true,
        },
      };
      res.json(response);
    }
  });

  return router;
}
