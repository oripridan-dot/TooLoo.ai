#!/usr/bin/env node

/**
 * TooLoo.ai — Figma Integration Starter Guide
 * 
 * This file helps you navigate all the Figma integration capabilities.
 * Choose your starting point below.
 */

const options = {
  '🎨 Design Studio UI (Recommended First)': {
    description: 'Real-time browser interface for design generation',
    command: 'Open: http://127.0.0.1:3000/design-studio.html',
    file: 'web-app/design-studio.html',
    time: '2 min setup'
  },
  '📺 Full Demo Script': {
    description: 'See all 6 workflow phases in terminal with colored output',
    command: 'node scripts/demo-figma-integration.js <figma-url> [api-token]',
    file: 'scripts/demo-figma-integration.js',
    time: '3 min setup'
  },
  '📖 Complete Workflow Guide': {
    description: 'Technical reference for all API endpoints and patterns',
    command: 'cat FIGMA-TOOLOO-WORKFLOW-COMPLETE.md',
    file: 'FIGMA-TOOLOO-WORKFLOW-COMPLETE.md',
    time: '30 min read'
  },
  '⚡ Quick Reference': {
    description: 'TL;DR version with quick access paths',
    command: 'cat FIGMA-INTEGRATION-QUICK-REFERENCE.md',
    file: 'FIGMA-INTEGRATION-QUICK-REFERENCE.md',
    time: '5 min read'
  },
  '✅ Delivery Summary': {
    description: 'What was built, architecture, file structure',
    command: 'cat FIGMA-INTEGRATION-DELIVERY-SUMMARY.md',
    file: 'FIGMA-INTEGRATION-DELIVERY-SUMMARY.md',
    time: '10 min read'
  }
};

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🎨 TooLoo.ai — Figma Integration Starter Guide             ║
║                                                               ║
║   Real-Time Design Generation & Sharing                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Choose your starting point:

`);

Object.entries(options).forEach(([key, val], idx) => {
  console.log(`${idx + 1}. ${key}`);
  console.log(`   ${val.description}`);
  console.log(`   Command: ${val.command}`);
  console.log(`   File: ${val.file}`);
  console.log(`   Time: ${val.time}\n`);
});

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUICK START (Recommended):

1. Start TooLoo:
   $ npm run dev

2. Open Design Studio:
   → http://127.0.0.1:3000/design-studio.html

3. Paste your Figma file URL and click "Generate from Figma"

4. Watch tokens stream in real-time 🚀

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEED FIGMA API TOKEN?

Get one here: https://figma.com/developers
Then set: export FIGMA_API_TOKEN="your-token"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S INCLUDED:

✓ Design Studio UI (design-studio.html)
  → Real-time browser interface for design generation

✓ Demo Script (scripts/demo-figma-integration.js)
  → Full 6-phase workflow demonstration

✓ Complete Documentation (FIGMA-TOOLOO-WORKFLOW-COMPLETE.md)
  → Technical reference with all endpoints

✓ Quick Reference (FIGMA-INTEGRATION-QUICK-REFERENCE.md)
  → Fast access guide with code examples

✓ Delivery Summary (FIGMA-INTEGRATION-DELIVERY-SUMMARY.md)
  → Architecture overview and file structure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

API ENDPOINTS (7 Total):

POST /api/v1/design/import-figma        Import tokens from Figma
POST /api/v1/design/generate-css        Create CSS variables
POST /api/v1/design/apply-tokens        Inject CSS into UI
POST /api/v1/design/export              Download design system
POST /api/v1/design/webhook/register    Set up real-time sync
POST /api/v1/design/webhook/figma       Receive Figma changes
GET  /api/v1/design/system              Get current system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CHAT VS DESIGN (Both Use Same Streaming):

Chat Generation:          Design Generation:
Prompt → Tokens → UI      Figma → Tokens → UI
Real-time streaming       Real-time streaming
Copy/paste output         Download design system

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to start? Open Design Studio:
http://127.0.0.1:3000/design-studio.html

Questions? Read the docs or check code comments.

Happy designing! 🎨

`);
