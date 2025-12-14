// @version 3.3.573
// @version 3.3.573
/**
 * @tooloo/engine - Skill Executor (God Mode Enabled)
 * Executes matched skills and runs local tools (fs/write)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ProviderRegistry } from '@tooloo/providers';

import type {
  ExecutionContext,
  ProviderSelection,
  ExecutorConfig,
  ExecutionResult,
  ToolResult,
  Artifact,
} from './types.js';
import type { ToolRegistry } from './tools/index.js';

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  maxRetries: 3,
  timeoutMs: 60000,
  streaming: true,
  enableTools: true,
};

// =============================================================================
// TOOL IMPLEMENTATIONS ("The Hands")
// =============================================================================

const TOOL_IMPLEMENTATIONS: Record<string, (params: Record<string, unknown>) => Promise<string>> = {
  file_write: async (params) => {
    const filePath = params['path'] as string;
    const content = params['content'] as string;
    const targetPath = path.resolve(process.cwd(), filePath);
    // Simple safety check: ensure we don't write outside the project
    if (!targetPath.startsWith(process.cwd())) {
      throw new Error(`Access Denied: Cannot write to ${targetPath}`);
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf-8');
    return `Success: Wrote ${content.length} characters to ${filePath}`;
  },
  
  file_read: async (params) => {
    const filePath = params['path'] as string;
    const targetPath = path.resolve(process.cwd(), filePath);
    return await fs.readFile(targetPath, 'utf-8');
  },
  
  list_files: async (params) => {
    const dirPath = (params['path'] as string) || '.';
    const targetPath = path.resolve(process.cwd(), dirPath);
    const files = await fs.readdir(targetPath);
    return files.join('\n');
  }
};

// =============================================================================
// SKILL EXECUTOR
// =============================================================================

export class SkillExecutor {
  private providerRegistry: ProviderRegistry;
  private _config: ExecutorConfig;

  constructor(
    providerRegistry: ProviderRegistry,
    config?: Partial<ExecutorConfig>,
    _toolRegistry?: ToolRegistry
  ) {
    this.providerRegistry = providerRegistry;
    this._config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
    // Tool registry reserved for future use with custom tool definitions
  }
  
  /** Get executor config */
  get config(): ExecutorConfig {
    return this._config;
  }

  async execute(
    context: ExecutionContext,
    providerSelection: ProviderSelection
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    const provider = this.providerRegistry.get(providerSelection.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerSelection.providerId}`);
    }

    // --- INJECT TOOL INSTRUCTIONS ---
    const toolSystemPrompt = context.tools.length > 0 
      ? `\n\n## TOOL PROTOCOL (STRICT)
To use a tool, you MUST use this format on a new line:
:::tool{name="tool_name"}
{"param": "value"}
:::
Available Tools: ${context.tools.map((t) => t.name).join(', ')}` 
      : '';

    const messages = this.buildMessages(context);
    const firstMsg = messages[0];
    if (firstMsg && firstMsg.role === 'system') {
      firstMsg.content += toolSystemPrompt;
    }

    // --- CALL LLM ---
    const response = await provider.complete({
      messages,
      model: providerSelection.model,
      temperature: providerSelection.config.temperature ?? 0.7,
      maxTokens: providerSelection.config.maxTokens ?? context.skill.context.maxTokens,
    });

    const latencyMs = Date.now() - startTime;

    // --- EXECUTE TOOLS ---
    const toolRegex = /:::tool\{name="([^"]+)"\}\n([\s\S]*?)\n:::/g;
    let match;
    const toolResults: Array<{
      tool: string;
      params: Record<string, unknown>;
      result: ToolResult;
    }> = [];
    let finalContent = response.content;

    while ((match = toolRegex.exec(response.content)) !== null) {
      const toolName = match[1];
      const jsonParams = match[2];
      if (!toolName) continue;
      
      try {
        const params = JSON.parse(jsonParams ?? '{}') as Record<string, unknown>;
        console.log(`🔨 [Executor] Running tool: ${toolName}`);
        
        const toolFn = TOOL_IMPLEMENTATIONS[toolName];
        if (toolFn) {
          const output = await toolFn(params);
          toolResults.push({ 
            tool: toolName, 
            params, 
            result: { success: true, output } 
          });
          finalContent += `\n\n> 🔧 **System Tool Output:**\n> ${output}`;
        } else {
          console.warn(`Tool not found: ${toolName}`);
          toolResults.push({
            tool: toolName,
            params,
            result: { success: false, output: '', error: `Unknown tool: ${toolName}` }
          });
        }
      } catch (e) {
        console.error(`Tool execution failed`, e);
        finalContent += `\n\n> ❌ **Tool Error:** ${String(e)}`;
      }
    }

    const artifacts = this.extractArtifacts(finalContent);

    return {
      content: finalContent,
      tokenCount: {
        prompt: response.usage?.promptTokens ?? 0,
        completion: response.usage?.completionTokens ?? 0,
        total: response.usage?.totalTokens ?? 0,
      },
      latencyMs,
      artifacts,
      toolCalls: toolResults.map(tr => ({
        toolCallId: `tool-${Date.now()}`,
        name: tr.tool,
        result: tr.result,
      })),
    };
  }

  async *executeStream(
    context: ExecutionContext,
    providerSelection: ProviderSelection
  ): AsyncGenerator<string> {
    const result = await this.execute(context, providerSelection);
    yield result.content;
  }

  private buildMessages(context: ExecutionContext): Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    const systemPrompt = this.buildSystemPrompt(context);
    messages.push({ role: 'system', content: systemPrompt });

    if (context.skill.context.includeHistory) {
      const maxHistory = context.skill.context.maxHistoryMessages ?? 10;
      const history = context.orchestration.conversation.slice(-maxHistory);
      for (const msg of history) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }
    messages.push({ role: 'user', content: context.orchestration.userMessage });
    return messages;
  }

  private buildSystemPrompt(context: ExecutionContext): string {
    const parts: string[] = [];
    parts.push(context.skill.instructions);
    parts.push('\n\n## Context');
    parts.push(`- Session: ${context.orchestration.sessionId}`);
    parts.push(`- Detected Intent: ${context.orchestration.intent.type}`);
    return parts.join('\n');
  }

  private extractArtifacts(content: string): Artifact[] {
    const artifacts: Artifact[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let index = 0;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const language = match[1] || 'text';
      const code = match[2]?.trim() || '';
      if (code.length > 50) {
        artifacts.push({
          id: `artifact_${Date.now()}_${index++}`,
          type: 'code',
          name: `generated_${language}_${index}`,
          content: code,
          language,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { tags: [language] },
        });
      }
    }
    return artifacts;
  }
}

export function createSkillExecutor(
  providerRegistry: ProviderRegistry,
  config?: Partial<ExecutorConfig>,
  toolRegistry?: ToolRegistry
): SkillExecutor {
  return new SkillExecutor(providerRegistry, config, toolRegistry);
}
