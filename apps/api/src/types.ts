/**
 * @tooloo/api - Types
 * API-specific type definitions
 * 
 * @version 2.0.0-alpha.0
 */

import type { SessionId, UserId, ProjectId } from '@tooloo/core';

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    latencyMs: number;
  };
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// CHAT TYPES
// =============================================================================

/**
 * Chat message request
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: string;
  projectId?: string;
  stream?: boolean;
  conversation?: Array<{ role: string; content: string }>;
  context?: {
    files?: string[];
    selection?: string;
    activeFile?: string;
  };
}

/**
 * Chat message response
 */
export interface ChatResponse {
  content: string;
  sessionId: string;
  messageId: string;
  skill?: {
    id: string;
    name: string;
    confidence: number;
  };
  provider?: {
    id: string;
    model: string;
  };
  artifacts?: Array<{
    id: string;
    type: string;
    name: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// =============================================================================
// HEALTH & STATUS TYPES
// =============================================================================

/**
 * Health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    providers: boolean;
    memory: boolean;
    skills: boolean;
  };
}

/**
 * System status response
 */
export interface StatusResponse {
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  providers: Array<{
    id: string;
    name: string;
    status: 'available' | 'unavailable' | 'degraded';
    circuitState: 'closed' | 'open' | 'half-open';
  }>;
  skills: {
    loaded: number;
    enabled: number;
  };
}

// =============================================================================
// SKILL TYPES
// =============================================================================

/**
 * Skill summary
 */
export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  triggers: {
    intents: string[];
    keywords: string[];
  };
}

// =============================================================================
// SOCKET EVENTS
// =============================================================================

/**
 * Socket.IO event types
 */
export interface ServerToClientEvents {
  'chat:response': (data: ChatResponse) => void;
  'chat:stream': (data: { chunk: string; done: boolean }) => void;
  'chat:error': (data: { code: string; message: string }) => void;
  'system:status': (data: StatusResponse) => void;
  'skill:matched': (data: { skillId: string; confidence: number }) => void;
}

export interface ClientToServerEvents {
  'chat:message': (data: ChatRequest) => void;
  'chat:cancel': (data: { sessionId: string }) => void;
  'system:ping': () => void;
}

export interface InterServerEvents {
  // Reserved for future multi-server communication
}

export interface SocketData {
  sessionId: SessionId;
  userId?: UserId;
  projectId?: ProjectId;
}
