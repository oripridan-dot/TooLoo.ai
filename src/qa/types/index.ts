// @version 2.2.175
/**
 * QA Guardian Type Definitions
 *
 * Central type definitions for the QA Guardian system.
 * All modules should import types from here to ensure consistency.
 */

import { z } from 'zod';

// ============= API Contract Types =============

export interface APIContract {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  request?: z.ZodType;
  response: z.ZodType<any>;
  intent: string;
  owner: 'cortex' | 'precog' | 'nexus' | 'qa';
  auth: boolean;
  deprecated: boolean;
  parameters: Array<{ name: string; type: string; description: string; required: boolean }>;
}

// ============= API Schema Types =============

/**
 * Standard API response envelope
 */
export interface APIResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  meta?: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

// ============= Wire Verification Types =============

export interface FrontendAPICall {
  file: string;
  line: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  pattern: 'fetch' | 'axios' | 'socket';
}

export interface BackendRoute {
  file: string;
  method: string;
  path: string;
  fullPath: string;
  handler: string;
}

export interface SocketEvent {
  file: string;
  event: string;
  direction: 'emit' | 'on';
  handler?: string;
}

export interface WireMismatch {
  frontend: FrontendAPICall | SocketEvent;
  issue: string;
  severity: 'critical' | 'warning' | 'info';
  suggestion: string;
}

export interface WiringReport {
  timestamp: string;
  frontend: {
    apiCalls: FrontendAPICall[];
    socketEvents: SocketEvent[];
  };
  backend: {
    routes: BackendRoute[];
    socketHandlers: SocketEvent[];
  };
  matched: number;
  mismatches: WireMismatch[];
  coverage: number;
}

// ============= Filesystem Hygiene Types =============

export interface DuplicateFile {
  file1: string;
  file2: string;
  similarity: number;
  type: 'exact' | 'similar';
}

export interface OrphanFile {
  file: string;
  reason: string;
  lastModified: Date;
  size: number;
}

export interface CorruptionIssue {
  file: string;
  type: 'syntax_error' | 'broken_import' | 'invalid_encoding' | 'empty_file';
  details: string;
  fixable: boolean;
}

export interface UnusedConfig {
  key: string;
  source: string;
  lastUsed?: Date;
  category: 'port' | 'api_key' | 'feature_flag' | 'path' | 'other';
}

export interface HygieneReport {
  timestamp: string;
  duplicates: {
    count: number;
    files: DuplicateFile[];
  };
  orphans: {
    count: number;
    files: OrphanFile[];
    totalSize: number;
  };
  corruption: {
    count: number;
    issues: CorruptionIssue[];
  };
  unusedConfig: {
    count: number;
    items: UnusedConfig[];
  };
  recommendations: string[];
}

// ============= Legacy Detection Types =============

export interface TODOItem {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME' | 'HACK' | 'XXX';
  message: string;
  author?: string;
  date?: string;
}

export interface DeadExport {
  file: string;
  exportName: string;
  exportType: 'function' | 'class' | 'const' | 'type' | 'interface';
  line: number;
}

export interface DeprecatedUsage {
  file: string;
  component: string;
  line: number;
  deprecatedIn: string;
  replacement?: string;
}

export interface LegacyReport {
  timestamp: string;
  todos: {
    count: number;
    items: TODOItem[];
    byType: Record<string, number>;
  };
  deadExports: {
    count: number;
    items: DeadExport[];
  };
  deprecatedUsage: {
    count: number;
    items: DeprecatedUsage[];
  };
  recommendations: string[];
}

// ============= System Integration Types =============

export type ModuleStatus = 'booting' | 'ready' | 'degraded' | 'error';

export interface ModuleHealth {
  name: string;
  status: ModuleStatus;
  lastHeartbeat: number;
  metrics: {
    eventsProcessed: number;
    errorRate: number;
    avgLatency: number;
  };
}

export interface EventFlowMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySource: Record<string, number>;
  avgLatency: number;
  errorRate: number;
}

export interface SystemWiringStatus {
  cortex: ModuleHealth;
  precog: ModuleHealth;
  nexus: ModuleHealth;
  qaGuardian: ModuleHealth;
  eventBus: EventFlowMetrics;
  lastHeartbeat: number;
}

// ============= QA Agent Types =============

export type ActionType =
  | 'cleanup_config'
  | 'archive_orphans'
  | 'fix_imports'
  | 'remove_duplicates'
  | 'resolve_todo'
  | 'repair_wiring';

export interface QueuedAction {
  id: string;
  type: ActionType;
  target: string | string[];
  autoApprove: boolean;
  reason: string;
  createdAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  result?: {
    success: boolean;
    message: string;
    rollbackId?: string;
  };
}

export interface AgentSchedule {
  wireCheck: string; // cron
  healthPulse: string;
  hygieneCheck: string;
  weeklyReport: string;
}

export type OverallStatus = 'healthy' | 'degraded' | 'critical';

export interface FullCheckReport {
  timestamp: string;
  status: OverallStatus;
  wiring: {
    frontendBackendMatch: number;
    mismatches: number;
    issues: WireMismatch[];
  };
  hygiene: {
    duplicates: number;
    orphans: number;
    corrupted: number;
    unusedConfig: number;
  };
  legacy: {
    todos: number;
    deadCode: number;
    deprecatedInUse: number;
  };
  systems: SystemWiringStatus;
  recommendations: string[];
}

export interface WeeklyReport {
  period: string;
  generatedAt: string;
  summary: {
    totalChecks: number;
    issuesFound: number;
    issuesFixed: number;
    systemUptime: string;
  };
  highlights: string[];
  attention: Array<{
    issue: string;
    action: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  trends: {
    healthScore: number[];
    issueCount: number[];
    fixRate: number[];
  };
  nextSteps: string[];
}

export interface QuickStatus {
  overall: OverallStatus;
  lastCheck: string;
  quickStats: {
    wiringHealth: string;
    filesystemHealth: string;
    coreSystemsHealth: string;
    legacyDebt: string;
  };
  activeAlerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'critical';
    message: string;
    since: string;
  }>;
}

// ============= Schema Definitions =============

/**
 * Zod schema for chat message request
 */
export const ChatMessageRequestSchema = z.object({
  message: z.string().min(1).max(50000),
  context: z
    .object({
      projectId: z.string().optional(),
      conversationId: z.string().optional(),
      sessionId: z.string().optional(),
    })
    .optional(),
  options: z
    .object({
      provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'grok']).optional(),
      streaming: z.boolean().optional(),
      temperature: z.number().min(0).max(2).optional(),
    })
    .optional(),
});

/**
 * Zod schema for chat message response
 */
export const ChatMessageResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    response: z.string(),
    provider: z.string(),
    model: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    visual: z
      .object({
        type: z.string(),
        data: z.string(),
      })
      .optional(),
    requestId: z.string().optional(),
  }),
  meta: z
    .object({
      requestId: z.string(),
      processingTime: z.number(),
      timestamp: z.string(),
    })
    .optional(),
});

/**
 * Zod schema for system status response
 */
export const SystemStatusResponseSchema = z.object({
  ok: z.boolean(),
  data: z.object({
    version: z.string(),
    services: z.number(),
    active: z.boolean(),
    ready: z.boolean(),
    uptime: z.number(),
    architecture: z.string(),
    modules: z.record(
      z.string(),
      z.object({
        status: z.string(),
        role: z.string(),
      })
    ),
  }),
});

/**
 * Event schema definitions for EventBus validation
 */
export const EventSchemas = {
  'cortex:response': z.object({
    requestId: z.string(),
    data: z.any(),
    visual: z
      .object({
        type: z.string(),
        data: z.string(),
      })
      .optional(),
    provider: z.string().optional(),
  }),
  'precog:route_decision': z.object({
    provider: z.string(),
    reason: z.string(),
    confidence: z.number(),
  }),
  'nexus:chat_request': z.object({
    message: z.string(),
    requestId: z.string(),
    context: z.any().optional(),
  }),
  'system:heartbeat': z.object({
    timestamp: z.number(),
    uptime: z.number(),
    modules: z.array(z.any()),
  }),
  'qa:guardian_ready': z.object({
    timestamp: z.number(),
    version: z.string(),
  }),
} as const;

export type EventType = keyof typeof EventSchemas;

