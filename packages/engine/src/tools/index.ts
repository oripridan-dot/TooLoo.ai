// @version 3.3.576
/**
 * @tooloo/engine - Tool Registry
 * Central registry for all AI-callable tools
 * 
 * This module provides:
 * - Tool registration and discovery
 * - Tool execution with validation
 * - Security checks and confirmation flow
 * - Audit logging for all tool calls
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';
import type { 
  ToolDefinition, 
  ToolResult, 
  ToolCall, 
  ToolCallResponse 
} from '../types.js';
import { FileTools } from './fs.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Tool registry configuration
 */
export interface ToolRegistryConfig {
  /** Enable confirmation for high-risk tools */
  requireConfirmation: boolean;
  /** Confirmation callback for high-risk operations */
  confirmFn?: (tool: string, args: unknown) => Promise<boolean>;
  /** Enable audit logging */
  auditLog: boolean;
  /** Custom audit logger */
  auditFn?: (entry: AuditEntry) => void;
}

/**
 * Audit log entry
 */
export interface AuditEntry {
  timestamp: Date;
  toolName: string;
  arguments: unknown;
  result: ToolResult;
  duration: number;
  sessionId?: string;
  userId?: string;
}

// =============================================================================
// TOOL REGISTRY CLASS
// =============================================================================

/**
 * Central tool registry
 * Manages tool registration, discovery, and execution
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private config: ToolRegistryConfig;
  
  constructor(config: Partial<ToolRegistryConfig> = {}) {
    this.config = {
      requireConfirmation: true,
      auditLog: true,
      ...config,
    };
    
    // Register built-in tools
    this.registerBuiltInTools();
  }
  
  // ===========================================================================
  // REGISTRATION
  // ===========================================================================
  
  /**
   * Register a tool
   */
  register<T>(name: string, tool: ToolDefinition<T>): void {
    if (this.tools.has(name)) {
      console.warn(`[ToolRegistry] Overwriting existing tool: ${name}`);
    }
    this.tools.set(name, tool as ToolDefinition<unknown>);
    
    // Log registration
    console.log(`[ToolRegistry] Registered tool: ${name}`);
  }
  
  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const existed = this.tools.delete(name);
    if (existed) {
      console.log(`[ToolRegistry] Unregistered tool: ${name}`);
    }
    return existed;
  }
  
  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }
  
  /**
   * Get a tool definition
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }
  
  /**
   * List all registered tools
   */
  list(): Array<{
    name: string;
    description?: string;
    riskLevel?: string;
    requiresConfirmation?: boolean;
  }> {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      name,
      description: tool.description,
      riskLevel: tool.riskLevel,
      requiresConfirmation: tool.requiresConfirmation,
    }));
  }
  
  /**
   * Get tool schemas for LLM function calling
   */
  getSchemas(): Array<{
    name: string;
    description: string;
    parameters: unknown;
  }> {
    const schemas: Array<{
      name: string;
      description: string;
      parameters: unknown;
    }> = [];
    
    for (const [name, tool] of this.tools) {
      // Convert Zod schema to JSON Schema for LLM
      const jsonSchema = this.zodToJsonSchema(tool.schema);
      
      schemas.push({
        name,
        description: tool.description || `Execute ${name} tool`,
        parameters: jsonSchema,
      });
    }
    
    return schemas;
  }
  
  // ===========================================================================
  // EXECUTION
  // ===========================================================================
  
  /**
   * Execute a single tool call
   */
  async execute(call: ToolCall): Promise<ToolCallResponse> {
    const tool = this.tools.get(call.name);
    
    if (!tool) {
      return {
        toolCallId: call.id,
        name: call.name,
        result: {
          success: false,
          output: '',
          error: `Unknown tool: ${call.name}`,
        },
      };
    }
    
    const startTime = Date.now();
    
    try {
      // Validate input against schema
      const parseResult = tool.schema.safeParse(call.arguments);
      if (!parseResult.success) {
        const error = parseResult.error;
        return {
          toolCallId: call.id,
          name: call.name,
          result: {
            success: false,
            output: '',
            error: `Invalid arguments: ${error.message}`,
          },
        };
      }
      
      const validatedInput = parseResult.data;
      
      // Check confirmation for high-risk tools
      if (this.config.requireConfirmation && tool.requiresConfirmation) {
        if (this.config.confirmFn) {
          const confirmed = await this.config.confirmFn(call.name, validatedInput);
          if (!confirmed) {
            return {
              toolCallId: call.id,
              name: call.name,
              result: {
                success: false,
                output: '',
                error: 'Operation cancelled by user',
              },
            };
          }
        }
      }
      
      // Execute the tool
      const rawResult = await tool.execute(validatedInput);
      
      // Normalize result
      const result: ToolResult = typeof rawResult === 'string'
        ? { success: true, output: rawResult }
        : rawResult;
      
      // Audit log
      if (this.config.auditLog) {
        const entry: AuditEntry = {
          timestamp: new Date(),
          toolName: call.name,
          arguments: validatedInput,
          result,
          duration: Date.now() - startTime,
        };
        
        if (this.config.auditFn) {
          this.config.auditFn(entry);
        } else {
          this.defaultAuditLog(entry);
        }
      }
      
      return {
        toolCallId: call.id,
        name: call.name,
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      const result: ToolResult = {
        success: false,
        output: '',
        error: message,
      };
      
      // Audit log error
      if (this.config.auditLog) {
        const entry: AuditEntry = {
          timestamp: new Date(),
          toolName: call.name,
          arguments: call.arguments,
          result,
          duration: Date.now() - startTime,
        };
        
        if (this.config.auditFn) {
          this.config.auditFn(entry);
        } else {
          this.defaultAuditLog(entry);
        }
      }
      
      return {
        toolCallId: call.id,
        name: call.name,
        result,
      };
    }
  }
  
  /**
   * Execute multiple tool calls in parallel
   */
  async executeMany(calls: ToolCall[]): Promise<ToolCallResponse[]> {
    return Promise.all(calls.map(call => this.execute(call)));
  }
  
  /**
   * Execute tool calls sequentially (for dependent operations)
   */
  async executeSequential(calls: ToolCall[]): Promise<ToolCallResponse[]> {
    const results: ToolCallResponse[] = [];
    
    for (const call of calls) {
      const result = await this.execute(call);
      results.push(result);
      
      // Stop on first failure if tool execution chain depends on it
      if (!result.result.success) {
        break;
      }
    }
    
    return results;
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  /**
   * Register built-in tools
   */
  private registerBuiltInTools(): void {
    // Register file system tools
    for (const [name, tool] of Object.entries(FileTools)) {
      this.tools.set(name, tool as ToolDefinition<unknown>);
    }
  }
  
  /**
   * Convert Zod schema to JSON Schema
   * Simplified implementation - works for basic schemas
   */
  private zodToJsonSchema(schema: z.ZodType): unknown {
    // For now, return a placeholder
    // In production, use zod-to-json-schema package
    if ('_def' in schema) {
      const def = schema._def as { typeName?: string; shape?: () => unknown };
      
      if (def.typeName === 'ZodObject' && def.shape) {
        const shape = def.shape();
        const properties: Record<string, unknown> = {};
        const required: string[] = [];
        
        for (const [key, value] of Object.entries(shape as Record<string, z.ZodType>)) {
          properties[key] = this.zodToJsonSchema(value);
          
          // Check if optional
          const valueDef = value._def as { typeName?: string };
          if (valueDef.typeName !== 'ZodOptional' && valueDef.typeName !== 'ZodDefault') {
            required.push(key);
          }
        }
        
        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined,
        };
      }
      
      if (def.typeName === 'ZodString') {
        return { type: 'string' };
      }
      
      if (def.typeName === 'ZodBoolean') {
        return { type: 'boolean' };
      }
      
      if (def.typeName === 'ZodNumber') {
        return { type: 'number' };
      }
    }
    
    return { type: 'string' };
  }
  
  /**
   * Default audit logging
   */
  private defaultAuditLog(entry: AuditEntry): void {
    const status = entry.result.success ? '✓' : '✗';
    console.log(
      `[TOOL-AUDIT] ${status} ${entry.toolName} (${entry.duration}ms)`,
      entry.result.success ? '' : `- ${entry.result.error}`
    );
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create a new tool registry
 */
export function createToolRegistry(
  config?: Partial<ToolRegistryConfig>
): ToolRegistry {
  return new ToolRegistry(config);
}

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from './fs.js';
