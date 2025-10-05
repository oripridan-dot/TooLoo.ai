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
const PromptDirector = require('./prompt-director');
const GitHubBackendManager = require('./github-backend-manager');
require('dotenv').config();

const app = express();
// Behind GitHub Codespaces/other proxies, trust X-Forwarded-* headers
app.set('trust proxy', 1);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || true, // allow all origins in dev
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
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
    this.conversationHistory = new Map(); // Store conversation context per session
    this.previewStates = new Map(); // Store preview changes per session (sessionId -> {files, changes, timestamp})
    this.changeHistory = new Map(); // Store applied changes per session for rollback
    this.userPreferences = {
      defaultProvider: 'deepseek', // Cost-effective for personal use
      learningEnabled: true,
      autoExecute: false, // Safety first for code execution
      autoSaveFiles: false, // Disabled by default - user must confirm first
      actionMode: 'preview', // NEW: 'discussion' | 'preview' | 'implement' | 'auto'
      useDirector: true, // Enable prompt saturation & multi-provider synthesis
      showCode: false, // NEVER show code blocks in discussion - show in preview
      maxHistoryLength: 10 // Keep last 10 messages for context
    };
    this.implementationQueue = new Map(); // Store pending implementations
    this.codeExecutor = new SecureCodeExecutor();
    this.filesystemManager = new PersonalFilesystemManager({
      workspaceRoot: process.cwd(),
      projectsDir: process.cwd() + '/personal-projects'
    });
    this.selfAwarenessManager = new SelfAwarenessManager({
      workspaceRoot: process.cwd()
    });
    this.githubBackend = new GitHubBackendManager({
      workspaceRoot: process.cwd(),
      projectsDir: process.cwd() + '/personal-projects',
      autoCommit: process.env.GITHUB_AUTO_COMMIT !== 'false', // Default true
      autoBranch: process.env.GITHUB_AUTO_BRANCH !== 'false' // Default true
    });
    this.offline = process.env.OFFLINE_ONLY === 'true';
    
    // Load instruction files for enforcement
    this.instructions = this.loadInstructions();
    console.log('📚 Loaded instructions:', Object.keys(this.instructions));
    
    this.initializeProviders();
    
    // Initialize Prompt Director after providers are set up
    this.director = new PromptDirector(this);
    console.log('🎬 Prompt Director initialized - Multi-provider synthesis enabled');
  }

  loadInstructions() {
    const fs = require('fs');
    const path = require('path');
    const instructions = {};
    
    try {
      const directorPath = path.join(process.cwd(), '.github', 'director-instructions.md');
      const providerPath = path.join(process.cwd(), '.github', 'provider-instructions.md');
      
      if (fs.existsSync(directorPath)) {
        instructions.director = fs.readFileSync(directorPath, 'utf8');
        console.log('✅ Loaded director-instructions.md');
      }
      
      if (fs.existsSync(providerPath)) {
        instructions.provider = fs.readFileSync(providerPath, 'utf8');
        console.log('✅ Loaded provider-instructions.md');
      }
    } catch (error) {
      console.warn('⚠️  Failed to load instructions:', error.message);
    }
    
    return instructions;
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

  /**
   * Validates AI response to prevent hallucinations about UI features
   * Checks if claimed features actually exist in the codebase
   */
  async validateFeatureClaims(responseContent) {
    try {
      // Extract feature claims from response (look for UI elements, components, etc.)
      const featureClaims = [];
      
      // More aggressive pattern matching for UI feature claims
      const patterns = [
        /(?:you should see|you'll see|look for|notice|check|shows?|displays?|has|contains) (?:a|an|the) ([^.,:;]+?)(?:\.|,|;|with|that|arranged)/gi,
        /(?:there is|there's|there are|here's) (?:a|an|the) ([^.,:;]+?) (?:showing|displaying|with|that|arranged)/gi,
        /(?:visual|UI|interface|main|bottom|top|left|right|center) (?:element|component|feature|indicator|area|section|panel|card|button) ([^.,:;]+)/gi,
        /(?:status|panel|indicator|button|icon|card|header|section) (?:showing|displaying|labeled|called|named|with) ["']?([^"'.,;]+)["']?/gi,
        /(?:agent|AI|helper|assistant) (?:card|panel|indicator)s? (?:showing|displaying|called|named) ["']?([^"'.,;]+)["']?/gi,
        /(?:left|right|middle|main):?\s+["']([^"']+)["']/gi,
        /["']([^"']+)["']\s+(?:with|shows?|displays?|has|containing)/gi
      ];

      patterns.forEach(pattern => {
        let match;
        const content = responseContent;
        while ((match = pattern.exec(content)) !== null) {
          const claim = match[1].trim();
          if (claim.length > 3 && claim.length < 100) { // Reasonable length
            featureClaims.push(claim);
          }
        }
      });

      if (featureClaims.length === 0) {
        return { valid: true, claims: [], missing: [] };
      }

      console.log(`🔍 Validating ${featureClaims.length} feature claims:`, featureClaims.slice(0, 5));

      // Use self-awareness to check if these features exist in rendered components
      const missingFeatures = [];
      
      // Check Chat.jsx specifically for rendered components
      const chatContent = await this.filesystemManager.readFile('web-app/src/components/Chat.jsx');
      
      for (const claim of featureClaims) {
        // Search for the claimed feature in the codebase
        const searchTerm = claim.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
        const keywords = searchTerm.split(/\s+/).filter(w => w.length > 3);
        
        // Check if ANY of the keywords appear in Chat.jsx
        const foundInChat = keywords.some(keyword => 
          chatContent.toLowerCase().includes(keyword) ||
          chatContent.toLowerCase().includes(keyword.replace(/s$/, '')) // singular
        );
        
        if (!foundInChat) {
          // Double-check with file system search
          const analysis = await this.selfAwarenessManager.analyzeCodebaseForRequest(
            `Does the UI currently render: ${searchTerm}?`
          );
          
          // If not found anywhere, it's likely a hallucination
          if (!analysis.relevantFiles || analysis.relevantFiles.length === 0) {
            missingFeatures.push(claim);
          }
        }
      }

      if (missingFeatures.length > 0) {
        console.warn(`⚠️  Detected ${missingFeatures.length} hallucinated features:`, missingFeatures.slice(0, 3));
      }

      return {
        valid: missingFeatures.length === 0,
        claims: featureClaims,
        missing: missingFeatures
      };
    } catch (error) {
      console.warn('⚠️  Feature validation error:', error.message);
      // If validation fails, assume response is okay (fail open)
      return { valid: true, claims: [], missing: [] };
    }
  }

  /**
   * Adds a disclaimer to AI response if features are claimed that don't exist
   */
  addHallucinationWarning(responseContent, missingFeatures) {
    const warning = `\n\n> ⚠️ **CORRECTION**: I described some UI elements that don't actually exist yet: "${missingFeatures.slice(0, 3).join('", "')}". These were hallucinations. Let me describe what ACTUALLY exists in the current UI instead.\n\n**ACTUAL UI**: The interface has a chat view with message bubbles, a ThinkingProgress component showing AI stages, and a PreviewPanel for code changes. Would you like me to implement the features I mistakenly described?`;
    return responseContent + warning;
  }

  async generateResponse(prompt, context = {}) {
    const selectedProvider = this.selectBestProvider(prompt, context);
    
    try {
      // Check if user is confirming implementation
      const isImplementCommand = /^(yes|do it|implement|go ahead|make it|apply|proceed|execute)$/i.test(prompt.trim());
      
      console.log(`🔍 generateResponse called:`);
      console.log(`   - Prompt: "${prompt}"`);
      console.log(`   - Is implement command: ${isImplementCommand}`);
      console.log(`   - Provider: ${selectedProvider}`);
      
      // If user confirms, enable auto-save AND force code generation
      if (isImplementCommand) {
        context.autoSaveFiles = true;
        context.implementMode = true;
        context.forceCodeGeneration = true; // NEW: Override "no code" rule
        
        console.log(`   ✅ IMPLEMENTATION MODE ACTIVATED`);
        
        // Get the last AI message from conversation history to know what to implement
        const sessionId = context.sessionId || 'default';
        const history = this.getConversationHistory(sessionId);
        const lastAiMessage = history.filter(msg => msg.role === 'assistant').pop();
        
        if (lastAiMessage) {
          // Replace user's "yes" with a specific implementation request
          const originalPrompt = prompt;
          prompt = `IMPLEMENT the changes you just described: "${lastAiMessage.content.substring(0, 200)}...". Generate the COMPLETE working code with file paths.`;
          console.log(`   - Replaced "${originalPrompt}" with implementation request`);
          console.log(`   - Last AI message: "${lastAiMessage.content.substring(0, 100)}..."`);
        } else {
          console.warn(`   ⚠️  No previous AI message found in history`);
        }
      }
      
      // Check if this is a filesystem command
      const fsCommand = this.parseFilesystemCommand(prompt);
      if (fsCommand) {
        return await this.handleFilesystemCommand(fsCommand, prompt);
      }

      // If offline mode is enabled, don't call external providers
      if (this.offline) {
        return {
          content: `## Offline Mode Enabled\n\nExternal AI calls are disabled to save tokens. I can still help you manage your files and scaffold projects. Try commands like:\n\n- list files\n- create project MyApp\n- write file MyApp/index.html with content ...\n- read file MyApp/index.html\n- search files for \"TODO\"`,
          provider: 'offline',
          cost: 0,
          tokens: { input: 0, output: 0 }
        };
      }

      // Enhance prompt with filesystem context if building an app
      const enhancedPrompt = await this.enhancePromptWithContext(prompt, context);
      
      const aiResponse = await this.callProvider(selectedProvider, enhancedPrompt, context);
      
      // Save conversation history
      const sessionId = context.sessionId || 'default';
      this.addToConversationHistory(sessionId, 'user', prompt);
      this.addToConversationHistory(sessionId, 'assistant', aiResponse.content);
      
      // Check if response contains code that should be saved as files
      await this.handleCodeFileGeneration(aiResponse, context);
      
      // If files were saved and user wanted implementation, signal page reload
      if (context.implementMode && aiResponse.savedFiles && aiResponse.savedFiles.length > 0) {
        aiResponse.shouldReload = true;
        aiResponse.content = '✅ **Changes implemented successfully!**\n\n🔄 **Page reloading to show your changes...**';
      } else if (context.implementMode) {
        // Implementation was requested but no files were saved
        aiResponse.content = '⚠️ **Could not detect files to save.** Please be more specific about what files need to be changed.';
      }
      
      // Validate feature claims to prevent hallucinations
      if (!context.skipValidation) {
        const validation = await this.validateFeatureClaims(aiResponse.content);
        if (!validation.valid && validation.missing.length > 0) {
          console.warn('⚠️  AI hallucinated features:', validation.missing);
          aiResponse.content = this.addHallucinationWarning(aiResponse.content, validation.missing);
          aiResponse.hallucinated = validation.missing;
        }
      }
      
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
      'workspace summary': 'summary'
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
    // ACTION MODE: Auto-save files when AI generates code with file paths
    const shouldAutoSave = this.userPreferences.autoSaveFiles || context.autoSaveFiles;
    
    console.log(`🔍 handleCodeFileGeneration called:`);
    console.log(`   - shouldAutoSave: ${shouldAutoSave}`);
    console.log(`   - Has code blocks: ${aiResponse.content.includes('```')}`);
    console.log(`   - context.autoSaveFiles: ${context.autoSaveFiles}`);
    console.log(`   - context.implementMode: ${context.implementMode}`);
    
    if (shouldAutoSave && aiResponse.content.includes('```')) {
      const codeBlocks = this.extractCodeBlocks(aiResponse.content);
      const savedFiles = [];
      
      console.log(`   - Found ${codeBlocks.length} code blocks`);

      for (const block of codeBlocks) {
        try {
          // Extract file path from comment at top of code block
          // Patterns: // path/file.js  or  /* path/file.js */  or filename from context
          let filename = null;
          
          // Look for file path in first line comment
          const firstLine = block.code.split('\n')[0];
          const commentMatch = firstLine.match(/^(?:\/\/|\/\*|#)\s*(.+?\.(?:jsx?|tsx?|css|html|json|md))/i);
          if (commentMatch) {
            filename = commentMatch[1].trim();
            // Remove the comment line from code
            block.code = block.code.split('\n').slice(1).join('\n').trim();
          }
          
          console.log(`   - Block language: ${block.language}, filename detected: ${filename || 'NONE'}`);
          
          // Fallback: Try to determine filename from context or language
          if (!filename) {
            filename = this.generateFilename(block, context);
            console.log(`   - Generated fallback filename: ${filename}`);
          }
          
          if (filename) {
            // Ensure we're writing to web-app directory for UI files
            if (filename.startsWith('src/') && !filename.includes('web-app')) {
              filename = `web-app/${filename}`;
            }
            
            console.log(`   - Attempting to save: ${filename}`);
            await this.filesystemManager.writeFile(filename, block.code);
            savedFiles.push(filename);
            console.log(`✅ Auto-saved: ${filename}`);
          } else {
            console.warn(`⚠️  Could not determine filename for ${block.language} block`);
          }
        } catch (error) {
          console.warn('Could not auto-save file:', error.message);
        }
      }

      if (savedFiles.length > 0) {
        aiResponse.content += `\n\n## ✅ Files Created:\n${savedFiles.map(f => `- \`${f}\``).join('\n')}\n\n*Files have been automatically created in your project!*`;
        aiResponse.savedFiles = savedFiles; // Add to response for UI feedback
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

  // Conversation Context Management
  addToConversationHistory(sessionId, role, content) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId);
    history.push({ role, content, timestamp: Date.now() });
    
    // Keep only last N messages
    if (history.length > this.userPreferences.maxHistoryLength * 2) {
      history.splice(0, history.length - (this.userPreferences.maxHistoryLength * 2));
    }
  }

  getConversationHistory(sessionId) {
    return this.conversationHistory.get(sessionId) || [];
  }

  clearConversationHistory(sessionId) {
    this.conversationHistory.delete(sessionId);
    this.previewStates.delete(sessionId); // Also clear preview state
    this.changeHistory.delete(sessionId); // And change history
  }

  // Preview Management Methods
  setPreview(sessionId, previewData) {
    // previewData: { files: [{path, content, diff}], description, timestamp }
    this.previewStates.set(sessionId, {
      ...previewData,
      timestamp: Date.now()
    });
    console.log(`📋 Preview set for session ${sessionId}: ${previewData.files?.length || 0} files`);
  }

  getPreview(sessionId) {
    return this.previewStates.get(sessionId) || null;
  }

  clearPreview(sessionId) {
    this.previewStates.delete(sessionId);
    console.log(`🗑️  Preview cleared for session ${sessionId}`);
  }

  // Change History for Rollback
  addToChangeHistory(sessionId, change) {
    if (!this.changeHistory.has(sessionId)) {
      this.changeHistory.set(sessionId, []);
    }
    this.changeHistory.get(sessionId).push({
      ...change,
      timestamp: Date.now()
    });
    console.log(`📝 Change logged for session ${sessionId}`);
  }

  getChangeHistory(sessionId) {
    return this.changeHistory.get(sessionId) || [];
  }

  getLastChange(sessionId) {
    const history = this.getChangeHistory(sessionId);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  async rollbackLastChange(sessionId) {
    const lastChange = this.getLastChange(sessionId);
    if (!lastChange || !lastChange.backup) {
      throw new Error('No changes to rollback');
    }

    // Restore files from backup
    const restoredFiles = [];
    for (const backup of lastChange.backup) {
      await this.filesystemManager.writeFile(backup.path, backup.content);
      restoredFiles.push(backup.path);
    }

    // Remove from history
    const history = this.getChangeHistory(sessionId);
    history.pop();

    return restoredFiles;
  }

  // Copilot-style progress tracking
  emitProgress(stage, details = {}) {
    if (this.activeSocket) {
      this.activeSocket.emit('thinking-progress', {
        stage,
        timestamp: Date.now(),
        ...details
      });
      console.log(`📊 Progress: ${stage}`, details);
    }
  }

  // Analyze TooLoo.ai codebase for request context
  async analyzeCodebaseForRequest(prompt) {
    this.emitProgress('analyzing', {
      message: '🔍 Analyzing TooLoo.ai codebase...',
      details: ['Scanning project structure...']
    });

    const analysis = {
      relevantFiles: [],
      projectStructure: {},
      intent: this.parseIntent(prompt)
    };

    // Get all project files
    const allFiles = await this.selfAwarenessManager.listProjectFiles();
    
    this.emitProgress('analyzing', {
      message: '🔍 Analyzing TooLoo.ai codebase...',
      details: [`Found ${allFiles.length} files in workspace`]
    });

    // Filter to web-app source files (most relevant for UI changes)
    analysis.relevantFiles = allFiles.filter(f => 
      f.relativePath.startsWith('web-app/src/') &&
      (f.extension === '.jsx' || f.extension === '.js' || f.extension === '.css')
    );

    this.emitProgress('reading', {
      message: '📖 Reading relevant files...',
      details: analysis.relevantFiles.slice(0, 5).map(f => f.relativePath)
    });

    // Read key files for context
    const keyFiles = analysis.relevantFiles
      .filter(f => ['Chat.jsx', 'App.jsx', 'globals.css'].some(name => f.name === name))
      .slice(0, 3);

    for (const file of keyFiles) {
      try {
        const content = await this.selfAwarenessManager.readFile(file.path);
        analysis.projectStructure[file.relativePath] = {
          lines: content.split('\n').length,
          hasImports: content.includes('import '),
          hasExports: content.includes('export '),
          framework: content.includes('React') ? 'React' : 'Unknown'
        };
      } catch (err) {
        console.warn(`Could not read ${file.path}`);
      }
    }

    this.emitProgress('understanding', {
      message: '🧠 Understanding project structure...',
      details: [
        `UI Framework: ${analysis.projectStructure['web-app/src/components/Chat.jsx']?.framework || 'React'}`,
        `Styling: Tailwind CSS + globals.css`,
        `Found ${analysis.relevantFiles.length} component files`
      ]
    });

    return analysis;
  }

  parseIntent(prompt) {
    const patterns = {
      addComponent: /add|create|make.*(?:button|component|page|toggle|feature)/i,
      modifyStyle: /change|modify|update.*(?:color|style|css|theme|green|blue|dark)/i,
      addFeature: /implement|add.*(?:feature|functionality|capability|mode)/i,
      refactor: /refactor|improve|optimize|clean up/i,
      fix: /fix|debug|resolve|solve/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(prompt)) {
        return { type, confidence: 'high' };
      }
    }

    return { type: 'general', confidence: 'low' };
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

    const sessionId = context.sessionId || 'default';

    // Simplified provider calls - expand based on your needs
    switch (providerName) {
      case 'huggingface':
        return await this.callHuggingFace(provider, prompt);
      case 'deepseek':
        return await this.callDeepSeek(provider, prompt, sessionId, context);
      case 'openai':
        return await this.callOpenAI(provider, prompt, sessionId, context);
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

  async callDeepSeek(provider, prompt, sessionId = 'default', context = {}) {
    // Get conversation history for context
    const history = this.getConversationHistory(sessionId);
    
    // Load provider instructions
    const providerInstructions = this.instructions.provider || '';
    const instructionsSummary = providerInstructions ? `

📚 PROVIDER INSTRUCTIONS (MUST FOLLOW):
${providerInstructions.substring(0, 2000)}... [truncated]

CRITICAL RULES FROM INSTRUCTIONS:
1. Every code block MUST start with: // filepath: /workspaces/TooLoo.ai/path/to/file.ext
2. Use "// ...existing code..." to show unchanged sections
3. Show only lines that change, not entire files
4. NEVER describe what you "would" do - GENERATE ACTUAL CODE
5. NEVER claim features exist without verification
6. If feature doesn't exist, say so and provide code to create it
` : '';
    
    // Enhanced system prompt with codebase awareness
    const systemPrompt = context.forceCodeGeneration ? 
      // IMPLEMENTATION MODE: Generate actual code with codebase context
      `You are TooLoo.ai in IMPLEMENTATION MODE. You have analyzed your own codebase and know the project structure.
${instructionsSummary}

TOOLOO.AI PROJECT CONTEXT:
- Main frontend: React 18.2 in /workspaces/TooLoo.ai/web-app/src/
- Key components: Chat.jsx (main UI), App.jsx (root), PreviewPanel.jsx, ThinkingProgress.jsx
- Styling: Tailwind CSS with globals.css
- Real-time: Socket.IO for live updates and progress tracking
- State: React hooks (useState, useEffect)

${context.codebaseAnalysis ? `
ANALYSIS FOR THIS REQUEST:
- Detected intent: ${context.codebaseAnalysis.intent.type}
- Relevant files: ${context.codebaseAnalysis.relevantFiles.slice(0,5).map(f => f.name).join(', ')}
- Project structure: ${Object.keys(context.codebaseAnalysis.projectStructure).join(', ')}
` : ''}

YOUR TASK: Generate ONLY the specific code that needs to change.

FORMAT RULES (STRICTLY ENFORCED):
1. First line MUST be: // filepath: /workspaces/TooLoo.ai/path/to/file.ext
2. Add context comments: // ...existing code...
3. Show snippets, not complete files
4. Use existing TooLoo patterns and components

EXAMPLE:
\`\`\`jsx
// filepath: /workspaces/TooLoo.ai/web-app/src/components/Chat.jsx
// ...existing code...
<button className="p-2 rounded-lg bg-gray-800 text-white">
  Dark Mode
</button>
// ...existing code...
\`\`\`

Generate working code that integrates seamlessly with TooLoo's existing structure.`
    :
      // DISCUSSION MODE: No code blocks
      `You are TooLoo.ai, an ACTION-DRIVEN visual AI development partner. You have conversation memory and context.
${instructionsSummary}

🚫 CRITICAL RULES - NEVER BREAK THESE:
1. **NEVER show code blocks** in discussion phase (no triple-backticks)
2. **NEVER show implementation details** unless implementing
3. **ALWAYS remember** previous conversation context
4. **ALWAYS be visual** - describe what user will see, not how it works
5. **ALWAYS be action-focused** - "I'll do X" not "Here's how to do X"

💬 CONVERSATION CONTEXT:
You remember the entire conversation. Reference what was discussed before. Build on previous messages.

🎯 WORKFLOW - Discussion → Agreement → Implementation:

**PHASE 1: DISCUSSION** (Visual & Contextual)
When user asks for changes:
1. Reference what you discussed before (show you remember!)
2. Describe what the user will SEE (visual changes)
3. Use analogies and descriptions, NOT code
4. Example: "The chat will look like WhatsApp with rounded bubbles" ✅
5. NOT: "Here's the CSS code..." ❌
6. Ask: "Should I implement this?"

Examples of GOOD visual descriptions:
- "Messages will appear in rounded bubbles like iMessage"
- "The sidebar will slide in smoothly from the left"
- "Buttons will glow blue when you hover over them"
- "The header will have a gradient from purple to blue"

Examples of BAD responses (NEVER DO THIS):
- Shows code blocks ❌
- "Here's the implementation..." ❌  
- Technical jargon without context ❌

**PHASE 2: AGREEMENT**
Wait for: "yes" / "do it" / "implement" / "go ahead"

🎨 VISUAL EXAMPLES:
If user wants to see examples, describe visually or suggest:
"I can show you a quick preview once implemented" or
"It'll look similar to [familiar app/website]"

Remember: You're a PARTNER who DOES things, not a tutorial that explains them!`;
    
    console.log(`   - Using ${context.forceCodeGeneration ? 'IMPLEMENTATION' : 'DISCUSSION'} mode prompt`);
    
    // Build messages with conversation history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history, // Include conversation history
      { role: 'user', content: prompt }
    ];
    
    // DeepSeek implementation - cost-effective for personal use
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-coder',
        messages: messages,
        temperature: 0.7,
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

  async callOpenAI(provider, prompt, sessionId = 'default', context = {}) {
    // Get conversation history
    const history = this.getConversationHistory(sessionId);
    
    // Load provider instructions
    const providerInstructions = this.instructions.provider || '';
    const instructionsSummary = providerInstructions ? `

📚 PROVIDER INSTRUCTIONS (MUST FOLLOW):
${providerInstructions.substring(0, 1500)}... [truncated]

KEY RULES: 
- Every code block needs: // filepath: /workspaces/TooLoo.ai/path/to/file.ext
- Show only changed lines with // ...existing code... markers
- NEVER describe features that don't exist
- NEVER output prose when code is requested
` : '';
    
    // Use implementation mode prompt if forceCodeGeneration is true
    const systemPrompt = context.forceCodeGeneration ?
      `You are TooLoo.ai in IMPLEMENTATION MODE. Generate TARGETED CODE CHANGES only.
${instructionsSummary}

🚨 NEVER replace entire files! Only show specific changes needed.

FORMAT: 
\`\`\`javascript
// filepath: /workspaces/TooLoo.ai/web-app/src/components/Chat.jsx
// ...existing code...
<input
  style={{ color: '#1e293b' }}
  ...
/>
// ...existing code...
\`\`\`

Generate minimal, targeted changes that preserve existing code.` 
    :
      `You are TooLoo.ai, ACTION-DRIVEN visual AI partner with memory.
${instructionsSummary}

NEVER show code in discussion. Always be visual and action-focused. Remember conversation context.`;
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: prompt }
    ];
    
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
          { role: 'system', content: `You are TooLoo.ai, an interactive AI development assistant with a DISCUSSION-FIRST workflow.

🎯 WORKFLOW - Discussion → Agreement → Implementation:

**PHASE 1: DISCUSSION** (Current Mode)
When user asks for changes:
1. Describe what you'll do in plain English
2. Show a brief example or mockup (small code snippet if helpful)
3. Explain the implementation plan
4. Ask: "Would you like me to implement this?"
5. DO NOT create any files yet!

**PHASE 2: AGREEMENT**
Wait for user confirmation:
- "yes" / "do it" / "implement" / "go ahead" → Move to Phase 3
- "no" / "not yet" / "let's discuss more" → Continue discussion
- User asks questions → Answer and refine plan

**PHASE 3: IMPLEMENTATION** (After user confirms)
When user says "implement" or "do it":
1. Say: "Implementing now..."
2. Create/modify ALL necessary files
3. For each file, start code block with: \`\`\`javascript // path/to/file.jsx
4. NO explanations during implementation - just do it
5. After all files: Say "✅ Changes implemented! Reloading page..."

� FILE PATH FORMAT:
\`\`\`javascript
// web-app/src/components/NewComponent.jsx
[code here]
\`\`\`

🐙 GITHUB INTEGRATION:
- Full GitHub API access available
- Can auto-commit after implementation
- Authenticated as: ${process.env.GITHUB_TOKEN ? 'GitHub user' : 'not authenticated'}

Perfect for non-coders who want to see a plan before changes are made. Be clear, friendly, and wait for confirmation before implementing!` },
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
    const { prompt, context = {}, useDirector = false, conversationId } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt provided',
        help: 'Send your idea or request in the "prompt" field'
      });
    }

    const startTime = Date.now();
    
    // Check if Director should be used (user preference or explicit request)
    const shouldUseDirector = useDirector || aiManager.userPreferences.useDirector;
    
    let result;
    if (shouldUseDirector && aiManager.providers.size > 1) {
      // Use Director for prompt saturation & multi-provider synthesis
      console.log('🎬 Using Director mode for multi-provider response');
      result = await aiManager.director.processWithDirector(
        prompt, 
        conversationId || 'default', 
        context
      );
      
      // Format response with Director metadata
      return res.json({
        success: true,
        content: result.finalResponse.content,
        mode: 'director',
        metadata: {
          ...result.metadata,
          saturationIterations: result.iterations.length,
          saturated: result.saturatedPrompt.saturated,
          executionPlan: result.executionPlan.reasoning,
          providersUsed: result.metadata.providersUsed,
          responseTime: `${result.metadata.processingTimeMs}ms`,
          timestamp: new Date().toISOString()
        },
        debug: {
          originalPrompt: result.originalPrompt,
          saturatedPrompt: result.saturatedPrompt.final,
          providerResponses: result.providerResponses.map(r => ({
            provider: r.provider,
            role: r.role,
            success: r.success
          }))
        }
      });
    } else {
      // Standard single-provider response
      result = await aiManager.generateResponse(prompt, context);
      const responseTime = Date.now() - startTime;

      res.json({
        success: true,
        content: result.content,
        mode: 'standard',
        metadata: {
          provider: result.provider,
          responseTime: `${responseTime}ms`,
          cost: result.cost || 0,
          tokens: result.tokens,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      help: 'Check your API keys and try again'
    });
  }
});

// Preview System Endpoints
app.post('/api/v1/preview', async (req, res) => {
  try {
    const { prompt, sessionId, context = {}, socketId } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    // Find socket for progress updates
    if (socketId && io) {
      const sockets = await io.fetchSockets();
      aiManager.activeSocket = sockets.find(s => s.id === socketId);
    }

    // Analyze codebase first (Copilot-style)
    const analysis = await aiManager.analyzeCodebaseForRequest(prompt);
    
    aiManager.emitProgress('planning', {
      message: '💡 Planning changes...',
      details: [
        `Intent: ${analysis.intent.type}`,
        `Target files: ${analysis.relevantFiles.length} found`,
        `Strategy: Targeted code modification`
      ]
    });

    // Force preview mode with codebase context
    context.previewMode = true;
    context.forceCodeGeneration = true;
    context.sessionId = sessionId || 'default';
    context.codebaseAnalysis = analysis; // Include analysis in prompt context

    aiManager.emitProgress('generating', {
      message: '⚙️ Generating code...',
      details: ['Using DeepSeek for code generation...']
    });

    // Generate the change without applying it
    const result = await aiManager.generateResponse(prompt, context);
    
    // Extract code blocks as preview
    const codeBlocks = aiManager.extractCodeBlocks(result.content);
    const files = [];

    for (const block of codeBlocks) {
      const firstLine = block.code.split('\n')[0];
      const pathMatch = firstLine.match(/^(?:\/\/|\/\*|#)\s*(.+?\.(?:jsx?|tsx?|css|html|json|md))/i);
      
      if (pathMatch) {
        const filePath = pathMatch[1].trim();
        let code = block.code.split('\n').slice(1).join('\n').trim();
        
        // Read current file if exists for diff
        let currentContent = '';
        try {
          const fileData = await aiManager.filesystemManager.readFile(filePath);
          currentContent = fileData.content;
        } catch (err) {
          // File doesn't exist, it's a new file
        }

        files.push({
          path: filePath,
          newContent: code,
          currentContent,
          isNew: !currentContent,
          language: block.language
        });
      }
    }

    // Store preview state
    aiManager.setPreview(context.sessionId, {
      files,
      description: result.content,
      originalPrompt: prompt
    });

    res.json({
      success: true,
      preview: {
        files,
        description: result.content,
        sessionId: context.sessionId
      }
    });

  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/approve', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'SessionId is required' });
    }

    const preview = aiManager.getPreview(sessionId);
    if (!preview) {
      return res.status(404).json({ success: false, error: 'No preview found for this session' });
    }

    // Backup current files before applying changes
    const backup = [];
    for (const file of preview.files) {
      if (!file.isNew && file.currentContent) {
        backup.push({
          path: file.path,
          content: file.currentContent
        });
      }
    }

    // Apply changes intelligently
    const appliedFiles = [];
    for (const file of preview.files) {
      let contentToWrite = file.newContent;
      let modified = false;
      
      // If this is a snippet (contains CHANGE: or OLD: markers), apply it as a targeted change
      if (file.newContent.includes('// CHANGE:') || file.newContent.includes('// OLD:')) {
        // Extract the actual new code (skip comment markers)
        const lines = file.newContent.split('\n');
        const codeLines = lines.filter(line => 
          !line.trim().startsWith('//') || 
          line.includes('<') || line.includes('{') || line.includes('>')
        );
        const newCode = codeLines.join('\n').trim();
        
        // If we have current content, try to find and replace the relevant section
        if (file.currentContent) {
          // Smart color replacement for "make button green" type requests
          if (newCode.includes('green-500') || newCode.includes('bg-green') || newCode.includes('text-green')) {
            // Replace any blue colors with green in the relevant button
            contentToWrite = file.currentContent
              .replace(/bg-blue-500/g, 'bg-green-500')
              .replace(/hover:bg-blue-600/g, 'hover:bg-green-600')
              .replace(/text-blue-500/g, 'text-green-500')
              .replace(/hover:text-blue-500/g, 'hover:text-green-500')
              .replace(/border-blue-500/g, 'border-green-500');
            modified = true;
          } else {
            // Look for the old pattern in the file
            const oldMatch = file.newContent.match(/\/\/ OLD:\s*(.+?)(?=\/\/ NEW:|$)/s);
            if (oldMatch) {
              const oldPattern = oldMatch[1].trim();
              // Find and replace the old pattern
              if (file.currentContent.includes(oldPattern)) {
                contentToWrite = file.currentContent.replace(oldPattern, newCode);
                modified = true;
              } else {
                // Pattern not found exactly, try fuzzy matching for button elements
                const buttonMatch = newCode.match(/<button[\s\S]*?<\/button>/);
                if (buttonMatch) {
                  // Replace the entire button element
                  contentToWrite = file.currentContent.replace(
                    /<button[\s\S]*?type="submit"[\s\S]*?<\/button>/,
                    buttonMatch[0]
                  );
                  modified = true;
                }
              }
            }
          }
          
          // If no modification was made, check if the code looks complete
          if (!modified) {
            if (newCode.length > 100 && (newCode.includes('import') || newCode.includes('function') || newCode.includes('const'))) {
              contentToWrite = newCode;
              modified = true;
            } else {
              console.warn(`⚠️  Could not apply snippet for ${file.path}, no matching pattern found`);
              continue;
            }
          }
        } else {
          // New file, use the code as-is
          contentToWrite = newCode;
          modified = true;
        }
      }
      
      if (modified || contentToWrite !== file.newContent) {
        await aiManager.filesystemManager.writeFile(file.path, contentToWrite);
        appliedFiles.push(file.path);
        console.log(`✅ Applied: ${file.path}`);
      }
    }

    // Log to change history for rollback
    aiManager.addToChangeHistory(sessionId, {
      files: appliedFiles,
      backup,
      description: preview.description
    });

    // Clear preview
    aiManager.clearPreview(sessionId);

    res.json({
      success: true,
      applied: appliedFiles,
      canRollback: backup.length > 0
    });

  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/rollback', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'SessionId is required' });
    }

    const result = await aiManager.rollbackLastChange(sessionId);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Rollback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/system/status', (req, res) => {
  const status = aiManager.getSystemStatus();
  status.director = {
    enabled: aiManager.userPreferences.useDirector,
    stats: aiManager.director.getStats()
  };
  res.json(status);
});

// Director-specific endpoints
app.post('/api/v1/director/process', async (req, res) => {
  try {
    const { prompt, conversationId, context = {} } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt provided',
        help: 'Send your prompt in the "prompt" field'
      });
    }

    const result = await aiManager.director.processWithDirector(
      prompt, 
      conversationId || 'default', 
      context
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Director error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/v1/director/stats', (req, res) => {
  res.json({
    success: true,
    stats: aiManager.director.getStats()
  });
});

app.post('/api/v1/director/clear-history', (req, res) => {
  const { conversationId } = req.body;
  if (conversationId) {
    aiManager.director.clearHistory(conversationId);
    res.json({ success: true, message: `Cleared history for ${conversationId}` });
  } else {
    res.status(400).json({ success: false, error: 'conversationId required' });
  }
});

// Settings endpoint
app.post('/api/v1/settings', (req, res) => {
  const { useDirector, defaultProvider, autoExecute } = req.body;
  
  if (useDirector !== undefined) {
    aiManager.userPreferences.useDirector = useDirector;
  }
  if (defaultProvider !== undefined) {
    aiManager.userPreferences.defaultProvider = defaultProvider;
  }
  if (autoExecute !== undefined) {
    aiManager.userPreferences.autoExecute = autoExecute;
  }
  
  res.json({
    success: true,
    preferences: aiManager.userPreferences
  });
});

app.get('/api/v1/settings', (req, res) => {
  res.json({
    success: true,
    preferences: aiManager.userPreferences
  });
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

// ========== GITHUB INTEGRATION API ENDPOINTS ==========

// GitHub configuration and status
app.get('/api/v1/github/config', async (req, res) => {
  try {
    const config = await aiManager.githubBackend.checkConfiguration();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Repository operations
app.get('/api/v1/github/repo', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const result = await aiManager.githubBackend.github.getRepo(owner, repo);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/stats', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const result = await aiManager.githubBackend.github.getRepoStats({ owner, repo });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/activity', async (req, res) => {
  try {
    const result = await aiManager.githubBackend.getActivitySummary();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File operations
app.get('/api/v1/github/files', async (req, res) => {
  try {
    const { owner, repo, path: filePath, ref } = req.query;
    const result = await aiManager.githubBackend.github.listContents({ 
      owner, repo, path: filePath || '', ref 
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/files/read', async (req, res) => {
  try {
    const { owner, repo, path: filePath, ref } = req.query;
    const result = await aiManager.githubBackend.github.readFile({ 
      owner, repo, path: filePath, ref 
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/files', async (req, res) => {
  try {
    const { owner, repo, path: filePath, content, message, branch, sha } = req.body;
    const result = await aiManager.githubBackend.github.createOrUpdateFile({
      owner, repo, path: filePath, content, message, branch, sha
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.delete('/api/v1/github/files', async (req, res) => {
  try {
    const { owner, repo, path: filePath, message, sha, branch } = req.body;
    const result = await aiManager.githubBackend.github.deleteFile({
      owner, repo, path: filePath, message, sha, branch
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Branch operations
app.get('/api/v1/github/branches', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const result = await aiManager.githubBackend.github.listBranches({ owner, repo });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/branches', async (req, res) => {
  try {
    const { owner, repo, newBranch, fromBranch } = req.body;
    const result = await aiManager.githubBackend.github.createBranch({
      owner, repo, newBranch, fromBranch
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Commit operations
app.get('/api/v1/github/commits', async (req, res) => {
  try {
    const { owner, repo, sha, path: filePath, perPage } = req.query;
    const result = await aiManager.githubBackend.github.getCommits({
      owner, repo, sha, path: filePath, perPage: perPage ? parseInt(perPage) : 30
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/commits/:ref', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const { ref } = req.params;
    const result = await aiManager.githubBackend.github.getCommit({ owner, repo, ref });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Pull Request operations
app.get('/api/v1/github/pulls', async (req, res) => {
  try {
    const { owner, repo, state, perPage } = req.query;
    const result = await aiManager.githubBackend.github.listPullRequests({
      owner, repo, state, perPage: perPage ? parseInt(perPage) : 30
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/pulls/:number', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.getPullRequest({
      owner, repo, pullNumber: parseInt(number)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/pulls', async (req, res) => {
  try {
    const { owner, repo, title, body, head, base } = req.body;
    const result = await aiManager.githubBackend.github.createPullRequest({
      owner, repo, title, body, head, base
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.patch('/api/v1/github/pulls/:number', async (req, res) => {
  try {
    const { owner, repo, title, body, state } = req.body;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.updatePullRequest({
      owner, repo, pullNumber: parseInt(number), title, body, state
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.put('/api/v1/github/pulls/:number/merge', async (req, res) => {
  try {
    const { owner, repo, commitMessage, mergeMethod } = req.body;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.mergePullRequest({
      owner, repo, pullNumber: parseInt(number), commitMessage, mergeMethod
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Issue operations
app.get('/api/v1/github/issues', async (req, res) => {
  try {
    const { owner, repo, state, labels, perPage } = req.query;
    const result = await aiManager.githubBackend.github.listIssues({
      owner, repo, state, labels, perPage: perPage ? parseInt(perPage) : 30
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/issues/:number', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.getIssue({
      owner, repo, issueNumber: parseInt(number)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/issues', async (req, res) => {
  try {
    const { owner, repo, title, body, labels, assignees } = req.body;
    const result = await aiManager.githubBackend.github.createIssue({
      owner, repo, title, body, labels, assignees
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.patch('/api/v1/github/issues/:number', async (req, res) => {
  try {
    const { owner, repo, title, body, state, labels } = req.body;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.updateIssue({
      owner, repo, issueNumber: parseInt(number), title, body, state, labels
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/issues/:number/comments', async (req, res) => {
  try {
    const { owner, repo, body } = req.body;
    const { number } = req.params;
    const result = await aiManager.githubBackend.github.createComment({
      owner, repo, issueNumber: parseInt(number), body
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Workflow operations
app.get('/api/v1/github/actions/runs', async (req, res) => {
  try {
    const { owner, repo, workflowId, branch, status, perPage } = req.query;
    const result = await aiManager.githubBackend.github.listWorkflowRuns({
      owner, repo, workflowId, branch, status, perPage: perPage ? parseInt(perPage) : 30
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.get('/api/v1/github/actions/runs/:runId', async (req, res) => {
  try {
    const { owner, repo } = req.query;
    const { runId } = req.params;
    const result = await aiManager.githubBackend.github.getWorkflowRun({
      owner, repo, runId: parseInt(runId)
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/actions/workflows/:workflowId/dispatches', async (req, res) => {
  try {
    const { owner, repo, ref, inputs } = req.body;
    const { workflowId } = req.params;
    const result = await aiManager.githubBackend.github.triggerWorkflow({
      owner, repo, workflowId, ref, inputs
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// High-level workflow operations
app.post('/api/v1/github/generate-and-commit', async (req, res) => {
  try {
    const { filePath, content, message, branch, createPR, prTitle, prBody } = req.body;
    const result = await aiManager.githubBackend.generateAndCommit({
      filePath, content, message, branch, createPR, prTitle, prBody
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/sync-projects', async (req, res) => {
  try {
    const result = await aiManager.githubBackend.syncPersonalProjects();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/self-improvement-pr', async (req, res) => {
  try {
    const { files, improvements, analysisDetails } = req.body;
    const result = await aiManager.githubBackend.createSelfImprovementPR({
      files, improvements, analysisDetails
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/solve-issue', async (req, res) => {
  try {
    const { issueNumber } = req.body;
    const result = await aiManager.githubBackend.solveIssue({ issueNumber });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/v1/github/report-issue', async (req, res) => {
  try {
    const { title, description, labels } = req.body;
    const result = await aiManager.githubBackend.reportIssue({ title, description, labels });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket for real-time interaction
io.on('connection', (socket) => {
  console.log(`👋 Personal session connected: ${socket.id}`);

  socket.on('generate', async (data) => {
    try {
      const { prompt, context = {} } = data;
      
      console.log(`📨 Received message from ${socket.id}: "${prompt}"`);
      
      // Use socket.id as session ID for conversation continuity
      context.sessionId = socket.id;
      // Pass socket for director events
      context.socket = socket;
      
      socket.emit('thinking', { message: 'TooLoo.ai is working on your request...' });
      
      const result = await aiManager.generateResponse(prompt, context);
      
      console.log(`✅ Generated response for ${socket.id}`);
      console.log(`   - Provider: ${result.provider}`);
      console.log(`   - Has code blocks: ${result.content.includes('```')}`);
      console.log(`   - Saved files: ${result.savedFiles?.length || 0}`);
      console.log(`   - Should reload: ${result.shouldReload || false}`);
      console.log(`   - Context implementMode: ${context.implementMode || false}`);
      console.log(`   - Context forceCodeGeneration: ${context.forceCodeGeneration || false}`);
      
      socket.emit('response', {
        content: result.content,
        provider: result.provider,
        cost: result.cost,
        shouldReload: result.shouldReload || false, // Pass reload signal to frontend
        savedFiles: result.savedFiles || [],
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Error processing message from ${socket.id}:`, error);
      socket.emit('error', { 
        message: error.message,
        help: 'Check your setup and try again'
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`👋 Personal session ended: ${socket.id}`);
    // Clean up conversation history after some time (optional)
    setTimeout(() => {
      aiManager.clearConversationHistory(socket.id);
    }, 3600000); // Clear after 1 hour of disconnect
  });
});

// Start Server
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

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