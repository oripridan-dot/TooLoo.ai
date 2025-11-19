#!/usr/bin/env node

/**
 * Demo: Figma Integration with TooLoo
 * Shows real-time token streaming, CSS generation, and design system export
 * 
 * Usage:
 *   node scripts/demo-figma-integration.js <figmaFileUrl> [apiToken]
 * 
 * Examples:
 *   node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/MyDesignSystem"
 *   FIGMA_API_TOKEN=your-token node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/MyDesignSystem"
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const WEB_SERVER_PORT = process.env.WEB_PORT || 3000;
const API_BASE = `http://127.0.0.1:${WEB_SERVER_PORT}/api/v1`;

// Colors for console output
const log = {
  title: (text) => console.log(chalk.bold.cyan(`\n🎨 ${text}\n`)),
  step: (num, text) => console.log(chalk.bold.yellow(`   Step ${num}: ${text}`)),
  success: (text) => console.log(chalk.green(`   ✓ ${text}`)),
  info: (text) => console.log(chalk.blue(`   ℹ ${text}`)),
  error: (text) => console.log(chalk.red(`   ✗ ${text}`)),
  data: (key, value) => console.log(chalk.gray(`     ${key}: ${value}`))
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkServer() {
  try {
    const res = await fetch(`${API_BASE.replace('/api/v1', '')}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function importFigmaDesignSystem(figmaUrl, apiToken) {
  log.title('STEP 1: Import Design System from Figma');
  log.step(1, 'Sending Figma file URL to TooLoo');
  log.data('Figma URL', figmaUrl);

  try {
    const response = await fetch(`${API_BASE}/design/import-figma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaUrl,
        apiToken: apiToken || undefined
      })
    });

    const data = await response.json();

    if (!data.ok) {
      log.error(`Import failed: ${data.error}`);
      if (data.hint) log.info(data.hint);
      return null;
    }

    log.success(`Design system imported from Figma`);
    log.data('File', data.metadata.name);
    log.data('Version', data.metadata.lastModified);
    log.data('Tokens imported', data.tokensImported);
    log.data('Colors', data.designSystemUpdated.colors);
    log.data('Typography', data.designSystemUpdated.typography);
    log.data('Components', data.designSystemUpdated.components);

    return data;
  } catch (err) {
    log.error(`Network error: ${err.message}`);
    return null;
  }
}

async function generateCssVariables() {
  log.title('STEP 2: Generate CSS Variables from Tokens');
  log.step(2, 'Converting design tokens to CSS custom properties');

  try {
    const response = await fetch(`${API_BASE}/design/generate-css`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();

    if (!data.ok) {
      log.error(`CSS generation failed: ${data.error}`);
      return null;
    }

    log.success(`CSS variables generated`);
    log.data('CSS file', data.cssFile);
    log.data('Variables count', data.variablesCount);
    
    // Show sample CSS
    if (data.cssContent) {
      console.log(chalk.gray('\n   Sample CSS (first 500 chars):'));
      console.log(chalk.gray(`   ${data.cssContent.substring(0, 500)}...`));
    }

    return data;
  } catch (err) {
    log.error(`Network error: ${err.message}`);
    return null;
  }
}

async function applyTokensToUI() {
  log.title('STEP 3: Apply Tokens to UI in Real-Time');
  log.step(3, 'Injecting design system into active UI');

  try {
    const response = await fetch(`${API_BASE}/design/apply-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetElements: '[data-design-system]'
      })
    });

    const data = await response.json();

    if (!data.ok) {
      log.error(`Token application failed: ${data.error}`);
      return null;
    }

    log.success(`Design tokens applied to UI`);
    log.data('Elements updated', data.elementsUpdated);
    log.data('CSS injected', data.cssInjected ? 'Yes' : 'No');

    return data;
  } catch (err) {
    log.error(`Network error: ${err.message}`);
    return null;
  }
}

async function exportDesignSystem() {
  log.title('STEP 4: Export Design System for Download');
  log.step(4, 'Packaging design system as portable artifact');

  try {
    const response = await fetch(`${API_BASE}/design/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: 'json',
        includePresets: true
      })
    });

    const data = await response.json();

    if (!data.ok) {
      log.error(`Export failed: ${data.error}`);
      return null;
    }

    log.success(`Design system exported`);
    log.data('Export file', data.exportFile);
    log.data('File size', data.fileSize);
    log.data('Ready to download', data.downloadUrl ? 'Yes' : 'No');

    return data;
  } catch (err) {
    log.error(`Network error: ${err.message}`);
    return null;
  }
}

async function showWebhookSetup() {
  log.title('STEP 5: Set Up Real-Time Figma Webhook');
  log.step(5, 'Configuring webhook for auto-sync on Figma changes');

  try {
    const response = await fetch(`${API_BASE}/design/webhook/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        figmaFileId: 'YOUR_FILE_ID',
        webhookUrl: `${API_BASE.replace('/api/v1', '')}/api/v1/design/webhook/figma`
      })
    });

    const data = await response.json();

    if (!data.ok) {
      log.info(`Webhook registration: ${data.message || 'Check Figma API settings'}`);
      return null;
    }

    log.success(`Webhook registered`);
    log.data('Webhook ID', data.webhookId);
    log.data('Status', data.status);
    log.info('Now, edits in Figma will auto-sync to TooLoo in real-time');

    return data;
  } catch (err) {
    log.info(`Webhook setup skipped: ${err.message}`);
    return null;
  }
}

async function showWorkflowSummary() {
  log.title('WORKFLOW SUMMARY');
  
  console.log(chalk.bold.cyan('\n📊 Real-Time Design Generation Pipeline:\n'));
  
  console.log(chalk.gray('  1. Figma File'));
  console.log(chalk.gray('     └─→ Design tokens, colors, typography, components\n'));
  
  console.log(chalk.yellow('  2. TooLoo Import (POST /api/v1/design/import-figma)'));
  console.log(chalk.gray('     └─→ Extract & structure tokens into design system\n'));
  
  console.log(chalk.yellow('  3. CSS Generation (POST /api/v1/design/generate-css)'));
  console.log(chalk.gray('     └─→ Convert tokens to CSS custom properties\n'));
  
  console.log(chalk.yellow('  4. UI Application (POST /api/v1/design/apply-tokens)'));
  console.log(chalk.gray('     └─→ Inject CSS into active browser UI\n'));
  
  console.log(chalk.yellow('  5. Export & Share (POST /api/v1/design/export)'));
  console.log(chalk.gray('     └─→ Download design system as JSON/CSS bundle\n'));
  
  console.log(chalk.yellow('  6. Real-Time Sync (Figma Webhooks)'));
  console.log(chalk.gray('     └─→ Auto-update when Figma file changes\n'));
  
  console.log(chalk.cyan.bold('\n💡 Comparison to Chat:\n'));
  console.log(chalk.gray('  Chat Generation:             Design Generation:\n'));
  console.log(chalk.gray('  Prompt ─→ Tokens ─→ UI       Figma ─→ Tokens ─→ UI'));
  console.log(chalk.gray('  Real-time streaming          Real-time streaming'));
  console.log(chalk.gray('  Copy/paste output            Download design system'));
  console.log(chalk.gray('  Per-message sync             Per-file-change sync\n'));
}

async function main() {
  const args = process.argv.slice(2);
  const figmaUrl = args[0];
  const apiToken = args[1];

  console.log(chalk.bold.cyan('\n🎨 TooLoo.ai — Figma Integration Demo'));
  console.log(chalk.gray('Real-Time Design Generation & Sharing\n'));

  // Validate arguments
  if (!figmaUrl) {
    log.error('Missing Figma URL');
    console.log(chalk.gray(`
  Usage:
    node scripts/demo-figma-integration.js <figmaFileUrl> [apiToken]

  Examples:
    node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/MyDesignSystem"
    FIGMA_API_TOKEN=token node scripts/demo-figma-integration.js "https://www.figma.com/file/ABC123/MyDesignSystem"
    `));
    process.exit(1);
  }

  // Check if server is running
  log.step(0, 'Checking TooLoo server health...');
  const serverOk = await checkServer();
  if (!serverOk) {
    log.error('TooLoo server not responding');
    log.info(`Start it with: npm run dev`);
    process.exit(1);
  }
  log.success('Server is healthy');

  // Add slight delay for visual flow
  await sleep(800);

  // Run the full demo
  const importResult = await importFigmaDesignSystem(figmaUrl, apiToken);
  if (!importResult) process.exit(1);

  await sleep(800);
  const cssResult = await generateCssVariables();
  if (!cssResult) process.exit(1);

  await sleep(800);
  const applyResult = await applyTokensToUI();

  await sleep(800);
  const exportResult = await exportDesignSystem();

  await sleep(800);
  await showWebhookSetup();

  await sleep(800);
  await showWorkflowSummary();

  console.log(chalk.bold.cyan('\n✨ Demo Complete!\n'));
  console.log(chalk.gray(`Next steps:
  1. Open the Design Studio UI:  http://127.0.0.1:${WEB_SERVER_PORT}/design-studio.html
  2. View design system:        http://127.0.0.1:${WEB_SERVER_PORT}/api/v1/design/system
  3. Test real-time updates:    Make changes in Figma, see them live in TooLoo
  4. Export & integrate:        Download design system and use in your projects\n`));
}

main().catch(err => {
  log.error(`Unhandled error: ${err.message}`);
  process.exit(1);
});
