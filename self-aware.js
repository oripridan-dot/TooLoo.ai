#!/usr/bin/env node
/**
 * TooLoo.ai Self-Aware Mode
 * 
 * This script launches TooLoo.ai with self-awareness capabilities enabled by default.
 * TooLoo can read, analyze, and modify its own code through natural language commands.
 */

const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configuration with defaults
const PORT = process.env.PORT || 3000;
let PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

// Check for GitHub Codespaces environment
if (process.env.CODESPACE_NAME) {
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  PUBLIC_URL = `https://${process.env.CODESPACE_NAME}-${PORT}.${domain}`;
  console.log(`🌐 Detected Codespaces environment - URL will be: ${PUBLIC_URL}`);
}

// Display banner
console.log(`
╔════════════════════════════════════════════╗
║          🧠 TOOLOO.AI SELF-AWARE           ║
╚════════════════════════════════════════════╝

📊 Starting with full self-awareness capabilities
📂 TooLoo can now analyze and modify its own code
🌐 Serving on port: ${PORT}
🔗 Public URL: ${PUBLIC_URL}
`);

// Verify self-awareness manager exists
const selfAwarenessPath = path.join(__dirname, 'self-awareness-manager.js');
if (!fs.existsSync(selfAwarenessPath)) {
  console.error('❌ Error: self-awareness-manager.js not found!');
  process.exit(1);
}

// Launch TooLoo with self-awareness enabled
const server = spawn('node', [
  'simple-api-server.js',
  '--port', PORT.toString(),
  '--public-url', PUBLIC_URL
], {
  env: {
    ...process.env,
    SELF_AWARENESS: 'true'
  },
  stdio: 'inherit'
});

// Handle process events
server.on('error', (err) => {
  console.error(`❌ Failed to start TooLoo.ai: ${err.message}`);
  process.exit(1);
});

// Display example commands
console.log(`
🧠 Self-Awareness Command Examples:
--------------------------------
1. "show code simple-api-server.js" - View server source code
2. "search your code for handleFilesystemCommand" - Find code references
3. "analyze your code" - Get codebase statistics
4. "show code structure" - View project hierarchy
5. "modify code self-awareness-manager.js: [new content]" - Edit code

📋 Note: All changes made to the code persist after restart!

Press Ctrl+C to stop the server.
`);

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down TooLoo.ai self-aware server...');
  server.kill();
  process.exit(0);
});