// @version 2.2.2
/**
 * Tool Definition Standard
 * 
 * Defines the interface for all tools that can be executed by the system.
 * This ensures a consistent way to discover, validate, and execute tools.
 */

export interface ToolSchema {
  type: "object";
  properties: Record<string, any>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: ToolSchema;
  execute: (args: any, context?: any) => Promise<any>;
}

export interface ToolRegistry {
  register(tool: ToolDefinition): void;
  get(name: string): ToolDefinition | undefined;
  list(): ToolDefinition[];
}
