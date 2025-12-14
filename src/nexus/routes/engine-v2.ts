// @version 2.0.NaN
// @version 2.0.NaN
// @version 2.0.NaN
/**
 * Engine V2 Routes - Tool-enabled AI chat
 * 
 * This exposes tool execution capabilities directly in the chat flow.
 * The AI can now use file_write, file_read, list_files tools.
 */

import { Router, Request, Response } from 'express';
import { successResponse, errorResponse } from '../utils.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { precog } from '../../precog/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();
const PROJECT_ROOT = process.cwd();

// =============================================================================
// TOOL IMPLEMENTATIONS ("The Hands")
// =============================================================================

const TOOL_IMPLEMENTATIONS: Record<string, (params: Record<string, unknown>) => Promise<string>> = {
  file_write: async (params) => {
    const filePath = params['path'] as string;
    const content = params['content'] as string;
    
    if (!filePath || content === undefined) {
      throw new Error('file_write requires "path" and "content" parameters');
    }
    
    const targetPath = path.resolve(PROJECT_ROOT, filePath);
    
    // Security checks
    if (!targetPath.startsWith(PROJECT_ROOT)) {
      throw new Error('Access Denied: Path traversal detected');
    }
    
    const forbidden = ['.git', 'node_modules', '.env'];
    if (forbidden.some(f => targetPath.includes(`/${f}/`) || targetPath.endsWith(`/${f}`))) {
      throw new Error('Access Denied: Cannot write to protected path');
    }
    
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf-8');
    
    console.log(`✍️  [Engine-V2] Wrote ${content.length} chars to ${filePath}`);
    return `Success: Wrote ${content.length} characters to ${filePath}`;
  },
  
  file_read: async (params) => {
    const filePath = params['path'] as string;
    
    if (!filePath) {
      throw new Error('file_read requires "path" parameter');
    }
    
    const targetPath = path.resolve(PROJECT_ROOT, filePath);
    
    if (!targetPath.startsWith(PROJECT_ROOT)) {
      throw new Error('Access Denied: Path traversal detected');
    }
    
    const content = await fs.readFile(targetPath, 'utf-8');
    console.log(`📖 [Engine-V2] Read ${content.length} chars from ${filePath}`);
    return content;
  },
  
  list_files: async (params) => {
    const dirPath = (params['path'] as string) || '.';
    const targetPath = path.resolve(PROJECT_ROOT, dirPath);
    
    if (!targetPath.startsWith(PROJECT_ROOT)) {
      throw new Error('Access Denied: Path traversal detected');
    }
    
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const result = entries.map(e => e.isDirectory() ? `${e.name}/` : e.name);
    return result.join('\n');
  },
};

// =============================================================================
// TOOL SYSTEM PROMPT
// =============================================================================

const TOOL_SYSTEM_PROMPT = `
## TOOL USAGE - SELF-MODIFICATION CAPABILITY
You have the ability to modify the codebase. To use a tool, output this EXACT format on a new line:

:::tool{name="tool_name"}
{"param": "value"}
:::

### Available Tools:
- **file_write**: Write content to a file. Params: {"path": "relative/path.ts", "content": "file content"}
- **file_read**: Read a file. Params: {"path": "relative/path.ts"}
- **list_files**: List directory. Params: {"path": "relative/dir"}

### IMPORTANT RULES:
1. Always use relative paths from project root
2. Never use absolute paths
3. When asked to create a file, USE THE TOOL - don't just show code
4. Multiple tool calls are allowed in one response
`;

// =============================================================================
// EXECUTE TOOLS FROM RESPONSE
// =============================================================================

interface ToolCallResult {
  tool: string;
  params: Record<string, unknown>;
  success: boolean;
  output: string;
  error?: string;
}

async function executeToolsFromResponse(content: string): Promise<{
  finalContent: string;
  toolResults: ToolCallResult[];
}> {
  const toolRegex = /:::tool\{name="([^"]+)"\}\n([\s\S]*?)\n:::/g;
  let match;
  const toolResults: ToolCallResult[] = [];
  let finalContent = content;
  
  while ((match = toolRegex.exec(content)) !== null) {
    const toolName = match[1];
    const jsonParams = match[2];
    
    if (!toolName) continue;
    
    try {
      const params = JSON.parse(jsonParams || '{}') as Record<string, unknown>;
      console.log(`🔨 [Engine-V2] Executing tool: ${toolName}`);
      
      const toolFn = TOOL_IMPLEMENTATIONS[toolName];
      if (toolFn) {
        const output = await toolFn(params);
        toolResults.push({
          tool: toolName,
          params,
          success: true,
          output,
        });
        finalContent += `\n\n> 🔧 **Tool: ${toolName}**\n> ${output}`;
      } else {
        toolResults.push({
          tool: toolName,
          params,
          success: false,
          output: '',
          error: `Unknown tool: ${toolName}`,
        });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error(`[Engine-V2] Tool execution failed: ${errMsg}`);
      toolResults.push({
        tool: toolName,
        params: {},
        success: false,
        output: '',
        error: errMsg,
      });
      finalContent += `\n\n> ❌ **Tool Error (${toolName}):** ${errMsg}`;
    }
  }
  
  return { finalContent, toolResults };
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * @route POST /api/v1/engine/chat
 * @description Process a message with tool execution capability
 */
router.post('/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, sessionId, provider: requestedProvider } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json(errorResponse('Message is required'));
    }
    
    const startTime = Date.now();
    
    // Build enhanced system prompt with tool instructions
    const systemPrompt = `You are TooLoo.ai, an advanced AI assistant with file system access.
${TOOL_SYSTEM_PROMPT}

When the user asks you to create, write, or modify files, USE THE TOOLS to actually do it.
Don't just show code - execute the file_write tool to create the file.`;
    
    // Use precog providers to get response
    const provider = requestedProvider || 'anthropic';
    const response = await precog.providers.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      provider,
      model: provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' 
           : provider === 'deepseek' ? 'deepseek-chat'
           : provider === 'openai' ? 'gpt-4o'
           : 'gemini-1.5-flash',
      temperature: 0.7,
      maxTokens: 4096,
    });
    
    // Execute any tool calls in the response
    const { finalContent, toolResults } = await executeToolsFromResponse(response.content);
    
    const latencyMs = Date.now() - startTime;
    
    return res.json(successResponse({
      response: finalContent,
      provider,
      model: response.model,
      toolCalls: toolResults,
      tokens: response.usage,
      latencyMs,
      sessionId: sessionId || `session-${Date.now()}`,
    }));
  } catch (error) {
    console.error('[Engine-V2] Chat error:', error);
    return res.status(500).json(errorResponse(String(error)));
  }
});

/**
 * @route GET /api/v1/engine/status
 * @description Get the status of the V2 engine
 */
router.get('/status', (_req: Request, res: Response) => {
  return res.json(successResponse({
    status: 'ready',
    version: '2.0.0-alpha',
    toolsEnabled: true,
    availableTools: Object.keys(TOOL_IMPLEMENTATIONS),
    providers: ['anthropic', 'deepseek', 'openai', 'gemini'],
  }));
});

/**
 * @route GET /api/v1/engine/tools
 * @description List available tools
 */
router.get('/tools', (_req: Request, res: Response) => {
  return res.json(successResponse({
    tools: Object.keys(TOOL_IMPLEMENTATIONS).map(name => ({
      name,
      description: getToolDescription(name),
    })),
  }));
});

function getToolDescription(toolName: string): string {
  const descriptions: Record<string, string> = {
    file_write: 'Write content to a file (creates directories as needed)',
    file_read: 'Read the contents of a file',
    list_files: 'List files in a directory',
  };
  return descriptions[toolName] || 'No description available';
}

/**
 * @route POST /api/v1/engine/tool
 * @description Execute a tool directly (for testing)
 */
router.post('/tool', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tool, params } = req.body;
    
    if (!tool || typeof tool !== 'string') {
      return res.status(400).json(errorResponse('Tool name is required'));
    }
    
    const toolFn = TOOL_IMPLEMENTATIONS[tool];
    if (!toolFn) {
      return res.status(400).json(errorResponse(`Unknown tool: ${tool}`));
    }
    
    const output = await toolFn(params || {});
    return res.json(successResponse({ tool, output }));
  } catch (error) {
    return res.status(500).json(errorResponse(String(error)));
  }
});

export default router;
