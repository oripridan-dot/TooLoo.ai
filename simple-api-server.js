#!/usr/bin/env node
/**
 * TooLoo.ai Simple API Server
 * Personal AI Development Assistant - Single User Focus
 * 
 * Purpose: Lean, reliable backend for personal use
 * No complex monorepo - just what you need to build apps
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const SecureCodeExecutor = require('./secure-code-executor');
const PersonalFilesystemManager = require('./personal-filesystem-manager');
const SelfAwarenessManager = require('./self-awareness-manager');
const GitHubManager = require('./github-manager');
require('dotenv').config();

const app = express();
// Behind GitHub Codespaces/other proxies, trust X-Forwarded-* headers
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
// Serve built frontend if it exists (production-like)
const distDir = path.join(process.cwd(), 'web-app', 'dist');
app.use(express.static(distDir));

// Root route: serve SPA index.html if built, otherwise show friendly API page
app.get('/', (req, res) => {
  const indexPath = path.join(distDir, 'index.html');
  try {
    // If a production build exists, serve the app at '/'
    return res.sendFile(indexPath);
  } catch {
    return res.type('html').send(`<!doctype html>
    <html><head><meta charset="utf-8"/><title>TooLoo.ai API</title>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;padding:32px;line-height:1.6}</style>
    </head><body>
    <h1>TooLoo.ai API Server</h1>
    <p>This is the API. The frontend dev server runs separately with Vite.</p>
    <ul>
      <li>Health: <a href="/api/v1/health">/api/v1/health</a></li>
      <li>Status: <a href="/api/v1/system/status">/api/v1/system/status</a></li>
    </ul>
    <p>In development, open the web app at <code>http://localhost:5173</code> (or the port shown by Vite).</p>
    </body></html>`);
  }
});

// SPA history fallback for any non-API routes when dist exists
app.get(/^(?!\/api\/).+/, (req, res, next) => {
  if (req.method !== 'GET') return next();
  // If dist index.html exists, serve it; otherwise continue (will 404 or hit other routes)
  const indexPath = path.join(distDir, 'index.html');
  try {
    return res.sendFile(indexPath);
  } catch {
    return next();
  }
});

// Personal AI Provider Manager
class PersonalAIManager {
  constructor() {
    this.providers = new Map();
    this.userPreferences = {
      defaultProvider: 'deepseek', // Cost-effective for personal use
      learningEnabled: true,
      autoExecute: false // Safety first
    };
    this.codeExecutor = new SecureCodeExecutor();
    this.filesystemManager = new PersonalFilesystemManager({
      workspaceRoot: process.cwd(),
      projectsDir: process.cwd() + '/personal-projects'
    });
    this.selfAwarenessManager = new SelfAwarenessManager({
      workspaceRoot: process.cwd()
    });
    this.github = new GitHubManager({
      defaultOwner: 'oripridan-dot',
      defaultRepo: 'TooLoo.ai'
    });
    this.selfAwarenessEnabled = true; // Enable self-awareness by default
    this.offline = process.env.OFFLINE_ONLY === 'true';
    console.log('🧠 Self-awareness enabled by default - TooLoo.ai can view and modify its own code');
    this.initializeProviders();
  }

  initializeProviders() {
    // Free tier - Hugging Face
    if (process.env.HF_API_KEY) {
      this.providers.set('huggingface', {
        name: 'Hugging Face (Free)',
        endpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        headers: { 'Authorization': `Bearer ${process.env.HF_API_KEY}` },
        cost: 0,
        enabled: true
      });
    }

    // Paid providers - only if keys exist
    const paidProviders = [
      { key: 'DEEPSEEK_API_KEY', name: 'deepseek', displayName: 'DeepSeek (Code Focus)' },
      { key: 'ANTHROPIC_API_KEY', name: 'claude', displayName: 'Claude (Reasoning)' },
      { key: 'OPENAI_API_KEY', name: 'openai', displayName: 'GPT-4 (Reliable)' },
      { key: 'GEMINI_API_KEY', name: 'gemini', displayName: 'Gemini (Creative)' },
      { key: 'XAI_API_KEY', name: 'grok', displayName: 'Grok (Experimental)' }
    ];

    paidProviders.forEach(provider => {
      if (process.env[provider.key]) {
        this.providers.set(provider.name, {
          name: provider.displayName,
          apiKey: process.env[provider.key],
          enabled: true
        });
      }
    });

    console.log(`🤖 Initialized ${this.providers.size} AI providers for personal use`);
  }

  async generateResponse(prompt, context = {}) {
    const selectedProvider = this.selectBestProvider(prompt, context);
    
    try {
      // Check if this is a filesystem command
      const fsCommand = this.parseFilesystemCommand(prompt);
      if (fsCommand) {
        return await this.handleFilesystemCommand(fsCommand, prompt);
      }

      // If offline mode is enabled, don't call external providers
      if (this.offline) {
        return {
          content: `## Offline Mode Enabled\n\nExternal AI calls are disabled to save tokens. I can still help you manage your files and scaffold projects. Try commands like:\n\n- list files\n- create project MyApp\n- write file MyApp/index.html with content ...\n- read file MyApp/index.html\n- search files for "TODO"`,
          provider: 'offline',
          cost: 0,
          tokens: { input: 0, output: 0 }
        };
      }

      // Enhance prompt with filesystem context if building an app
      const enhancedPrompt = await this.enhancePromptWithContext(prompt, context);
      
      const aiResponse = await this.callProvider(selectedProvider, enhancedPrompt, context);
      
      // Check if response contains code that should be saved as files
      await this.handleCodeFileGeneration(aiResponse, context);
      
      // Check if response contains code that should be executed
      const codeBlocks = this.extractCodeBlocks(aiResponse.content);
      if (codeBlocks.length > 0 && context.executeCode !== false) {
        const executionResults = await this.executeCodeBlocks(codeBlocks);
        aiResponse.executionResults = executionResults;
        
        // Append execution results to response if auto-execute is enabled
        if (this.userPreferences.autoExecute) {
          aiResponse.content += '\n\n## Execution Results\n\n' + 
            executionResults.map(r => `**Output:** \`${r.output}\``).join('\n');
        }
      }
      
      return aiResponse;
    } catch (error) {
      console.error(`Provider ${selectedProvider} failed:`, error.message);
      return await this.fallbackGenerate(prompt, context);
    }
  }

  parseFilesystemCommand(prompt) {
    const commands = {
      // Self-awareness commands (prioritized for immediate access)
      'show your code': 'show-code',
      'show code': 'show-code',
      'view your code': 'show-code',
      'view code': 'show-code',
      'read your code': 'show-code',
      'modify your code': 'modify-code',
      'edit your code': 'modify-code',
      'modify code': 'modify-code',
      'edit code': 'modify-code',
      'update your code': 'modify-code',
      'search your code': 'search-code',
      'search code': 'search-code',
      'find in code': 'search-code',
      'analyze your code': 'analyze-code',
      'analyze code': 'analyze-code',
      'understand code': 'analyze-code',
      'code stats': 'analyze-code',
      'code structure': 'code-structure',
      'project structure': 'code-structure',
      // Standard filesystem commands
      'list files': 'list',
      'show files': 'list',
      'ls': 'list',
      'create project': 'create-project',
      'new project': 'create-project',
      'read file': 'read',
      'open file': 'read',
      'view file': 'read',
      'show file': 'read',
      'save file': 'write',
      'write file': 'write',
      'save to': 'write',
      'write to': 'write',
      'create file': 'write',
      'append to': 'append',
      'delete file': 'delete',
      'remove file': 'delete',
      'search files': 'search',
      'find in files': 'search',
      'workspace summary': 'summary',
      'update code': 'modify-code',
      'search your code': 'search-code',
      'search code': 'search-code',
      'analyze your code': 'analyze-code',
      'analyze code': 'analyze-code',
      'how do you work': 'analyze-code',
      'show your structure': 'code-structure',
      'show code structure': 'code-structure',
      'code structure': 'code-structure'
    };

    const lowerPrompt = prompt.toLowerCase();
    for (const [trigger, command] of Object.entries(commands)) {
      if (lowerPrompt.includes(trigger)) {
        return { command, originalPrompt: prompt };
      }
    }
    return null;
  }

  async handleFilesystemCommand(fsCommand, prompt) {
    try {
      switch (fsCommand.command) {
        case 'list':
          const listing = await this.filesystemManager.listDirectory();
          return {
            content: `## 📁 Files in your workspace:\n\n${this.formatDirectoryListing(listing)}`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };

        case 'create-project':
          const projectName = this.extractProjectName(prompt);
          const project = await this.filesystemManager.createProject(projectName, 'Created by TooLoo.ai');
          return {
            content: `## 🎉 Project Created!\n\n**Project:** ${projectName}\n**Path:** \`${project.projectPath}\`\n\nReady to start building! What would you like to create in this project?`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };

        case 'summary':
          const summary = await this.filesystemManager.getWorkspaceSummary();
          return {
            content: `## 📊 Workspace Summary\n\n**Workspace:** \`${summary.workspace.path}\`\n**Projects:** ${summary.projects.count} projects, ${summary.projects.files} files\n\n**Supported file types:** ${summary.allowedExtensions.join(', ')}\n\nWhat would you like to build today?`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };

        case 'write':
          const writeInfo = this.parseWriteFileCommand(prompt);
          if (!writeInfo.filePath) {
            return {
              content: `## ❌ Invalid Write Command\n\nPlease specify file path. Examples:\n- "write file project/index.html with content <html>...</html>"\n- "save file app.js with console.log('hello');"`,
              provider: 'filesystem',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
          const fullPath = path.join(this.filesystemManager.projectsDir, writeInfo.filePath);
          await this.filesystemManager.writeFile(fullPath, writeInfo.content || '// File created by TooLoo.ai\n');
          
          return {
            content: `## ✅ File Created!\n\n**File:** \`${writeInfo.filePath}\`\n**Path:** \`${fullPath}\`\n**Size:** ${(writeInfo.content || '').length} characters\n\nFile saved successfully! What's next?`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };

        case 'read':
          const readPath = this.extractFilePath(prompt);
          if (!readPath) {
            return {
              content: `## ❌ Invalid Read Command\n\nPlease specify file path. Example: "read file project/index.html"`,
              provider: 'filesystem',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
          const fullReadPath = path.join(this.filesystemManager.projectsDir, readPath);
          const fileResult = await this.filesystemManager.readFile(fullReadPath);
          
          return {
            content: `## 📄 File Content: \`${readPath}\`\n\n\`\`\`\n${fileResult.content}\n\`\`\`\n\n**Size:** ${fileResult.size} bytes`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };

        case 'delete':
          {
            const fileToDelete = this.extractFilePath(prompt) || prompt.replace(/.*delete\s+file\s+/i, '').trim();
            if (!fileToDelete) {
              return {
                content: `## ❌ Invalid Delete Command\n\nPlease specify file path. Example: "delete file project/index.html"`,
                provider: 'filesystem',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            const fullDelPath = path.join(this.filesystemManager.projectsDir, fileToDelete);
            const delRes = await this.filesystemManager.deleteItem(fullDelPath, { recursive: false });
            return {
              content: `## 🗑️ Deleted\n\n**Path:** \`${delRes.path || fullDelPath}\``,
              provider: 'filesystem',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }

        case 'search':
          {
            // Look for quoted term or after 'search files for'
            const m = prompt.match(/search\s+files\s+(?:for\s+)?"([^"]+)"/i) || prompt.match(/search\s+files\s+(?:for\s+)?'([^']+)'/i) || prompt.match(/search\s+files\s+(?:for\s+)?(\S+)/i);
            const term = m ? m[1] || m[0].split(/\s+/).pop() : null;
            if (!term) {
              return {
                content: `## ❌ Invalid Search Command\n\nSpecify a term. Example: "search files for \"TODO\""`,
                provider: 'filesystem',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            const results = await this.filesystemManager.searchFiles(term);
            const lines = results.results.slice(0, 50).map(r => `- \`${r.file}\` (${r.matches} matches)`).join('\n') || '*No matches*';
            return {
              content: `## 🔎 Search Results for \`${term}\`\n\n${lines}\n\n_Total matches:_ ${results.totalMatches}`,
              provider: 'filesystem',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }

        case 'append':
          {
            const writeInfo = this.parseWriteFileCommand(prompt);
            if (!writeInfo.filePath) {
              return {
                content: `## ❌ Invalid Append Command\n\nPlease specify file path and content. Example: "append to app.js: console.log('more');"`,
                provider: 'filesystem',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            const fullPath = path.join(this.filesystemManager.projectsDir, writeInfo.filePath);
            let base = '';
            try {
              const existing = await this.filesystemManager.readFile(fullPath);
              base = existing.content;
              if (base && !base.endsWith('\n')) base += '\n';
            } catch (e) {
              // If file doesn't exist, we'll create it fresh
            }
            const newContent = base + (writeInfo.content || '');
            await this.filesystemManager.writeFile(fullPath, newContent);
            return {
              content: `## ➕ Content Appended\n\n**File:** \`${writeInfo.filePath}\`\n**Path:** \`${fullPath}\`\n**Added:** ${writeInfo.content.length} characters`,
              provider: 'filesystem',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
        // Self-awareness commands
        case 'show-code':
          {
            // Extract file path from prompts like "show your code simple-api-server.js"
            const codeMatch = prompt.match(/(?:show|view|read).*code\s+([^\s]+)/i);
            const filePath = codeMatch ? codeMatch[1] : 'simple-api-server.js'; // Default to main file
            
            const result = await this.selfAwarenessManager.getSourceCode(filePath);
            
            if (!result.success) {
              return {
                content: `## ❌ Error Reading Code\n\n${result.error}`,
                provider: 'self-awareness',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            
            return {
              content: `## 📄 Source Code: \`${filePath}\`\n\n\`\`\`javascript\n${result.content}\n\`\`\`\n\n**Size:** ${result.size} bytes`,
              provider: 'self-awareness',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
        case 'modify-code':
          {
            // Extract file path and code from prompt
            // Format: modify your code file.js: new content
            const modifyMatch = prompt.match(/(?:modify|edit|update).*code\s+([^\s:]+)(?:\s*:\s*|\s+with\s+)([\s\S]+)/i);
            
            if (!modifyMatch) {
              return {
                content: `## ❌ Invalid Code Modification\n\nPlease use format: "modify your code file.js: new content"`,
                provider: 'self-awareness',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            
            const filePath = modifyMatch[1];
            const newContent = modifyMatch[2].trim();
            
            // Backup original and update
            const result = await this.selfAwarenessManager.modifySourceCode(filePath, newContent, { backup: true });
            
            if (!result.success) {
              return {
                content: `## ❌ Failed to Modify Code\n\n${result.error}`,
                provider: 'self-awareness',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            
            return {
              content: `## ✅ Code Modified Successfully\n\n**File:** \`${filePath}\`\n\nA backup was created before modifications. The changes will take effect when the server is restarted.`,
              provider: 'self-awareness',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
        case 'search-code':
          {
            // Extract search term from "search your code for X"
            const searchMatch = prompt.match(/search.*code(?:\s+for)?\s+["']?([^"']+)["']?/i);
            
            if (!searchMatch) {
              return {
                content: `## ❌ Invalid Code Search\n\nPlease specify what to search for. Example: "search your code for handleFilesystemCommand"`,
                provider: 'self-awareness',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            
            const term = searchMatch[1].trim();
            const results = await this.selfAwarenessManager.searchCodebase(term);
            
            if (results.totalMatches === 0) {
              return {
                content: `## 🔍 No matches found for "${term}" in the codebase.`,
                provider: 'self-awareness',
                cost: 0,
                tokens: { input: 0, output: 0 }
              };
            }
            
            // Format results
            let formattedResults = results.results.slice(0, 5).map(file => {
              const matchSummary = file.matches.slice(0, 3).map(match => {
                return `Line ${match.line}: \`${match.text}\``;
              }).join('\n');
              
              return `**File:** \`${file.file}\` (${file.matchCount} matches)\n${matchSummary}${file.matches.length > 3 ? '\n...and more' : ''}`;
            }).join('\n\n');
            
            if (results.results.length > 5) {
              formattedResults += `\n\n...and ${results.results.length - 5} more files with matches`;
            }
            
            return {
              content: `## 🔍 Code Search Results for "${term}"\n\nFound ${results.totalMatches} matches in ${results.matchingFiles} files.\n\n${formattedResults}`,
              provider: 'self-awareness',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
        case 'analyze-code':
          {
            // Extract file path from prompt or analyze the whole codebase
            const fileMatch = prompt.match(/analyze.*code\s+([^\s]+)/i);
            const filePath = fileMatch ? fileMatch[1] : null;
            
            const analysis = await this.selfAwarenessManager.analyzeCode(filePath);
            
            let content = '';
            
            if (filePath && analysis.success) {
              // Single file analysis
              content = `## 🔍 Code Analysis: \`${filePath}\`\n\n` +
                        `**Lines:** ${analysis.stats.lines}\n` +
                        `**Size:** ${analysis.stats.size} bytes\n` +
                        `**Functions:** ${analysis.stats.functions}\n` +
                        `**Imports:** ${analysis.stats.imports.join(', ') || 'None'}\n`;
            } else if (!filePath) {
              // Whole codebase analysis
              content = `## 🔍 Codebase Analysis\n\n` +
                        `**Total Files:** ${analysis.totalFiles}\n` +
                        `**Total Lines:** ${analysis.totalLines}\n` +
                        `**Total Size:** ${(analysis.totalSize / 1024).toFixed(2)} KB\n\n` +
                        `**File Types:**\n` +
                        Object.entries(analysis.fileTypes)
                          .map(([ext, stats]) => `- ${ext || 'no extension'}: ${stats.count} files, ${stats.lines} lines`)
                          .join('\n') + 
                        `\n\n**Largest Files:**\n` +
                        analysis.largestFiles.slice(0, 5)
                          .map(f => `- ${f.path}: ${f.lines} lines, ${(f.size / 1024).toFixed(2)} KB`)
                          .join('\n');
            } else {
              content = `## ❌ Failed to analyze ${filePath}\n\n${analysis.error}`;
            }
            
            return {
              content,
              provider: 'self-awareness',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }
          
        case 'code-structure':
          {
            // Get project structure with specified depth
            const depthMatch = prompt.match(/(?:structure|hierarchy).*(?:depth|level)\s+(\d+)/i);
            const depth = depthMatch ? parseInt(depthMatch[1]) : 2;
            
            const structure = await this.selfAwarenessManager.getProjectStructure(depth);
            
            // Helper function to format structure recursively
            const formatStructure = (node, indent = '') => {
              if (!node) return '';
              
              let output = `${indent}${node.type === 'directory' ? '📁' : '📄'} **${node.name}**\n`;
              
              if (node.children && node.type === 'directory') {
                node.children
                  .sort((a, b) => (a.type === 'directory' ? 0 : 1) - (b.type === 'directory' ? 0 : 1))
                  .forEach(child => {
                    output += formatStructure(child, indent + '  ');
                  });
              }
              
              return output;
            };
            
            const formattedStructure = formatStructure(structure);
            
            return {
              content: `## 📊 TooLoo.ai Code Structure\n\n${formattedStructure}`,
              provider: 'self-awareness',
              cost: 0,
              tokens: { input: 0, output: 0 }
            };
          }

        default:
          return {
            content: `## 📁 Filesystem Commands\n\n- list files | ls — Show workspace contents\n- create project [name] — Create a new project\n- workspace summary — Show workspace overview\n- read file [path] — View a file\n- write file [path] with content ... — Create/overwrite a file\n- append to [path]: ... — Append content to a file\n- delete file [path] — Delete a file\n- search files for "term" — Find text across files\n\nExamples:\n- write file MyApp/index.html with content <html>...</html>\n- append to MyApp/app.js: console.log('Hi');\n- read file MyApp/index.html\n- search files for "TODO"\n\nWhat would you like to do?`,
            provider: 'filesystem',
            cost: 0,
            tokens: { input: 0, output: 0 }
          };
      }
    } catch (error) {
      return {
        content: `## ❌ Filesystem Error\n\n${error.message}\n\nTry a different command or ask for help with filesystem operations.`,
        provider: 'filesystem',
        cost: 0,
        tokens: { input: 0, output: 0 }
      };
    }
  }

  async enhancePromptWithContext(prompt, context) {
    // If user is asking to build something, provide filesystem context
    const buildKeywords = ['create', 'build', 'make', 'generate', 'write', 'develop'];
    const hasBuildIntent = buildKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
    
    if (hasBuildIntent) {
      try {
        const summary = await this.filesystemManager.getWorkspaceSummary();
        const contextInfo = `\n\n[SYSTEM CONTEXT: You have full filesystem access. Current workspace has ${summary.projects.count} projects. You can create files, organize projects, and build complete applications. When generating code, consider suggesting file organization and project structure.]`;
        return prompt + contextInfo;
      } catch (error) {
        return prompt;
      }
    }
    
    return prompt;
  }

  async handleCodeFileGeneration(aiResponse, context) {
    // If the AI response contains file suggestions and user wants to save them
    if (context.autoSaveFiles && aiResponse.content.includes('```')) {
      const codeBlocks = this.extractCodeBlocks(aiResponse.content);
      const savedFiles = [];

      for (const block of codeBlocks) {
        try {
          // Try to determine filename from context or generate one
          const filename = this.generateFilename(block, context);
          if (filename) {
            await this.filesystemManager.writeFile(filename, block.code);
            savedFiles.push(filename);
          }
        } catch (error) {
          console.warn('Could not auto-save file:', error.message);
        }
      }

      if (savedFiles.length > 0) {
        aiResponse.content += `\n\n## 💾 Files automatically saved:\n${savedFiles.map(f => `- \`${f}\``).join('\n')}`;
      }
    }
  }

  formatDirectoryListing(listing) {
    if (!listing.items || listing.items.length === 0) {
      return '*No files found. Ready to create your first project!*';
    }

    return listing.items
      .map(item => {
        const icon = item.isDirectory ? '📁' : '📄';
        const size = item.isFile ? ` (${Math.round(item.size / 1024)}KB)` : '';
        return `${icon} **${item.name}**${size}`;
      })
      .join('\n');
  }

  extractProjectName(prompt) {
    // Extract project name from prompts like "create project my-app" 
    const match = prompt.match(/(?:create|new)\s+project\s+([a-zA-Z0-9-_\s]+)/i);
    return match ? match[1].trim() : `project-${Date.now()}`;
  }

  parseWriteFileCommand(prompt) {
    // Accept forms:
    // - "write file path/file.js with content ..."
    // - "save file path/file.js ..."
    // - "create file path/file.js ..."
    // - "save to path/file.js: ..."
    // - "write to path/file.js: ..."
    // - with code blocks ```...
    let m = prompt.match(/(?:write|save|create)\s+file\s+([^\s:]+)(?:\s+with\s+(?:content\s+)?([\s\S]+))?$/i);
    if (!m) m = prompt.match(/(?:write|save)\s+to\s+([^\s:]+)\s*:\s*([\s\S]+)$/i);
    if (!m) {
      // Try to capture path then a fenced code block
      const pathMatch = prompt.match(/(?:file|to)\s+([^\s:]+).*?```[\s\S]*?```/i);
      if (pathMatch) {
        const codeMatch = prompt.match(/```[\w-]*\n([\s\S]*?)```/);
        return { filePath: pathMatch[1], content: codeMatch ? codeMatch[1] : '' };
      }
    }
    if (m) {
      return { filePath: m[1], content: (m[2] || '').trim() };
    }
    return { filePath: null, content: '' };
  }

  extractFilePath(prompt) {
    // Extract file path from prompts like "read file project/index.html" or "open file ..."
    const match = prompt.match(/(?:read|show|open|view)\s+file\s+([^\s]+)/i);
    return match ? match[1] : null;
  }

  generateFilename(codeBlock, context) {
    const extensions = {
      'javascript': '.js',
      'typescript': '.ts', 
      'jsx': '.jsx',
      'tsx': '.tsx',
      'python': '.py',
      'html': '.html',
      'css': '.css',
      'json': '.json'
    };

    if (context.projectName && codeBlock.language) {
      const ext = extensions[codeBlock.language] || '.txt';
      return `./personal-projects/${context.projectName}/index${ext}`;
    }
    
    return null;
  }

  extractCodeBlocks(text) {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const language = match[1] || 'javascript';
      const code = match[2].trim();
      
      // Only execute safe languages for personal use
      if (['javascript', 'js'].includes(language.toLowerCase())) {
        blocks.push({ language, code });
      }
    }

    return blocks;
  }

  async executeCodeBlocks(codeBlocks) {
    const results = [];
    
    for (const block of codeBlocks) {
      try {
        const result = await this.codeExecutor.execute(block.code, block.language);
        results.push({
          code: block.code,
          language: block.language,
          ...result
        });
      } catch (error) {
        results.push({
          code: block.code,
          language: block.language,
          success: false,
          error: error.message,
          output: ''
        });
      }
    }
    
    return results;
  }

  selectBestProvider(prompt, context) {
    // Smart routing based on prompt characteristics
    if (prompt.toLowerCase().includes('code') || prompt.toLowerCase().includes('function')) {
      return this.providers.has('deepseek') ? 'deepseek' : 'openai';
    }
    
    if (prompt.length > 2000) {
      return this.providers.has('claude') ? 'claude' : 'openai';
    }

    // Default to cost-effective option
    return this.providers.has('deepseek') ? 'deepseek' : 'huggingface';
  }

  async callProvider(providerName, prompt, context) {
    const provider = this.providers.get(providerName);
    if (!provider) throw new Error(`Provider ${providerName} not available`);

    // Simplified provider calls - expand based on your needs
    switch (providerName) {
      case 'huggingface':
        return await this.callHuggingFace(provider, prompt);
      case 'deepseek':
        return await this.callDeepSeek(provider, prompt);
      case 'openai':
        return await this.callOpenAI(provider, prompt);
      default:
        throw new Error(`Provider ${providerName} not implemented yet`);
    }
  }

  async callHuggingFace(provider, prompt) {
    // Free tier implementation
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        ...provider.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_length: 1000, temperature: 0.7 }
      })
    });

    if (!response.ok) {
      throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      content: Array.isArray(result) ? result[0]?.generated_text || 'No response' : result.generated_text || 'No response',
      provider: 'huggingface',
      cost: 0,
      tokens: { input: prompt.length, output: 100 } // Estimate
    };
  }

  async callDeepSeek(provider, prompt) {
    // DeepSeek implementation - cost-effective for personal use
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: [
          { role: 'system', content: 'You are TooLoo.ai, a personal AI development assistant. Help the user build applications by generating working code and providing clear explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      content: result.choices[0]?.message?.content || 'No response',
      provider: 'deepseek',
      cost: (result.usage?.total_tokens || 0) * 0.00014, // DeepSeek pricing
      tokens: result.usage
    };
  }

  async callOpenAI(provider, prompt) {
    // OpenAI implementation - reliable fallback
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are TooLoo.ai, a personal AI development assistant focused on helping non-coders build applications. Always provide working code with clear explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    return {
      content: result.choices[0]?.message?.content || 'No response',
      provider: 'openai',
      cost: (result.usage?.total_tokens || 0) * 0.003, // GPT-4 pricing estimate
      tokens: result.usage
    };
  }

  async fallbackGenerate(prompt, context) {
    // Try available providers in order of preference
    const fallbackOrder = ['huggingface', 'deepseek', 'openai', 'claude', 'gemini'];
    
    for (const providerName of fallbackOrder) {
      if (this.providers.has(providerName)) {
        try {
          return await this.callProvider(providerName, prompt, context);
        } catch (error) {
          console.warn(`Fallback ${providerName} also failed:`, error.message);
          continue;
        }
      }
    }

    throw new Error('All AI providers failed - check your API keys and network connection');
  }

  getSystemStatus() {
    const status = {
      healthy: true,
      offline: this.offline,
      providers: Array.from(this.providers.entries()).map(([name, config]) => ({
        name,
        displayName: config.name,
        enabled: config.enabled,
        hasKey: !!config.apiKey || name === 'huggingface'
      })),
      preferences: this.userPreferences
    };

    return status;
  }
}

// Initialize AI Manager
const aiManager = new PersonalAIManager();

// API Routes for Personal Use
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'TooLoo.ai Personal Assistant Ready',
    timestamp: new Date().toISOString(),
    system: aiManager.getSystemStatus()
  });
});

app.post('/api/v1/generate', async (req, res) => {
  try {
    const { prompt, context = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt provided',
        help: 'Send your idea or request in the "prompt" field'
      });
    }

    const startTime = Date.now();
    const result = await aiManager.generateResponse(prompt, context);
    const responseTime = Date.now() - startTime;

    res.json({
      success: true,
      content: result.content,
      metadata: {
        provider: result.provider,
        responseTime: `${responseTime}ms`,
        cost: result.cost || 0,
        tokens: result.tokens,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      help: 'Check your API keys and try again'
    });
  }
});

app.get('/api/v1/system/status', (req, res) => {
  res.json(aiManager.getSystemStatus());
});

// Filesystem API endpoints
app.get('/api/v1/files', async (req, res) => {
  try {
    const { path: dirPath } = req.query;
    const result = await aiManager.filesystemManager.listDirectory(dirPath);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/files', async (req, res) => {
  try {
    const { path: filePath, content, backup } = req.body;
    const result = await aiManager.filesystemManager.writeFile(filePath, content, { backup });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/files/read', async (req, res) => {
  try {
    const { path: filePath } = req.query;
    const result = await aiManager.filesystemManager.readFile(filePath);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/projects', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await aiManager.filesystemManager.createProject(name, description);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/v1/files', async (req, res) => {
  try {
    const { path: itemPath, recursive } = req.body;
    const result = await aiManager.filesystemManager.deleteItem(itemPath, { recursive });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/workspace/summary', async (req, res) => {
  try {
    const result = await aiManager.filesystemManager.getWorkspaceSummary();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GitHub access endpoints (public repo OK; uses token if configured)
app.get('/api/v1/github/repo', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const result = await aiManager.github.getRepo(owner, repo);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/contents', async (req, res) => {
  try {
    const { owner, repo, path: p = '', ref = 'main' } = req.query;
    const result = await aiManager.github.listContents({ owner, repo, path: p, ref });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/file', async (req, res) => {
  try {
    const { owner, repo, path: p, ref = 'main' } = req.query;
    const result = await aiManager.github.readFile({ owner, repo, path: p, ref });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Add REST API endpoints for file system operations
app.get('/api/v1/files', async (req, res) => {
  try {
    const { dirPath } = req.query;
    const result = await aiManager.filesystemManager.listDirectory(dirPath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/files/read', async (req, res) => {
  try {
    const { filePath } = req.query;
    const result = await aiManager.filesystemManager.readFile(filePath);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/files/write', async (req, res) => {
  try {
    const { filePath, content } = req.body;
    const result = await aiManager.filesystemManager.writeFile(filePath, content, { backup: true });
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/files/create-directory', async (req, res) => {
  try {
    const { dirPath } = req.body;
    await aiManager.filesystemManager.writeFile(dirPath + '/.gitkeep', '', {});
    res.json({ success: true, message: `Directory created: ${dirPath}` });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/files/delete', async (req, res) => {
  try {
    const { itemPath, recursive } = req.body;
    const result = await aiManager.filesystemManager.deleteItem(itemPath, { recursive });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// WebSocket for real-time interaction
io.on('connection', (socket) => {
  console.log(`👋 Personal session connected: ${socket.id}`);

  socket.on('generate', async (data) => {
    try {
      const { prompt, context } = data;
      socket.emit('thinking', { message: 'TooLoo.ai is working on your request...' });
      
      const result = await aiManager.generateResponse(prompt, context);
      
      socket.emit('response', {
        content: result.content,
        provider: result.provider,
        cost: result.cost,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      socket.emit('error', { 
        message: error.message,
        help: 'Check your setup and try again'
      });
    }
  });

  // File system operations
  socket.on('filesystem:listDirectory', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.listDirectory(data.dirPath);
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:readFile', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.readFile(data.filePath);
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:writeFile', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.writeFile(data.filePath, data.content, { backup: true });
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:deleteItem', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.deleteItem(data.itemPath, { recursive: data.recursive });
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:createDirectory', async (data, callback) => {
    try {
      // Use writeFile to create the directory (it will create parent directories recursively)
      await aiManager.filesystemManager.writeFile(data.dirPath + '/.gitkeep', '', {});
      callback({ success: true, message: `Directory created: ${data.dirPath}` });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:search', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.searchFiles(data.searchTerm, data.searchPath, data.options);
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('filesystem:workspace', async (data, callback) => {
    try {
      const result = await aiManager.filesystemManager.getWorkspaceSummary();
      callback(result);
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`👋 Personal session ended: ${socket.id}`);
  });
});

// Start Server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Use 0.0.0.0 to listen on all interfaces

// More detailed error handling
server.on('error', (error) => {
  console.error('Server error:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`⚠️ Port ${PORT} is already in use. Try using a different port with PORT=3005 node simple-api-server.js`);
    process.exit(1);
  }
});

// Start listening on specified port
server.listen(PORT, HOST, () => {
  console.log('\n🚀 TooLoo.ai Personal Assistant Started');
  console.log('=====================================');
  console.log(`📡 API Server: http://${HOST}:${PORT}`);
  console.log(`💬 WebSocket: ws://${HOST}:${PORT}`);
  console.log(`🎯 Health Check: http://${HOST}:${PORT}/api/v1/health`);
  if (aiManager.offline) {
    console.log('📴 Offline mode enabled: external AI calls are disabled.');
  }

  // If running in GitHub Codespaces, print the public URL for convenience
  if (process.env.CODESPACES === 'true' || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
    const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
    const name = process.env.CODESPACE_NAME || 'your-codespace';
    const publicUrl = `https://${name}-${PORT}.${domain}`;
    console.log(`🌐 Codespaces URL: ${publicUrl}`);
    console.log(`   Health: ${publicUrl}/api/v1/health`);
  }
  console.log('\n🤖 Available Providers:');
  
  aiManager.getSystemStatus().providers.forEach(provider => {
    const status = provider.hasKey ? '✅' : '❌';
    console.log(`   ${status} ${provider.displayName}`);
  });
  
  console.log('\n💡 Ready to help you build applications!');
  console.log('   Open your web interface or send requests to /api/v1/generate\n');
});

module.exports = { app, server, aiManager };