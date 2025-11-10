#!/usr/bin/env node

/**
 * OAuth Credentials Updater for TooLoo.ai
 * 
 * Usage:
 *   node update-oauth-credentials.js <github-id> <github-secret> <slack-id> <slack-secret> <slack-bot-token>
 * 
 * Example:
 *   node update-oauth-credentials.js "Ov23li..." "5a3f0e..." "9847874996609..." "ee270f03..." "xoxb-..."
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');

const args = process.argv.slice(2);

if (args.length < 5) {
  console.error('\n❌ Not enough arguments!\n');
  console.error('Usage: node update-oauth-credentials.js <github-id> <github-secret> <slack-id> <slack-secret> <slack-bot-token>\n');
  console.error('Example:');
  console.error('  node update-oauth-credentials.js "Ov23li1234567890" "5a3f0e7890abcdef" "9847874996609.9863318830272" "ee270f0348979898" "xoxb-98478-98287-abc123"\n');
  process.exit(1);
}

const [githubId, githubSecret, slackId, slackSecret, slackBotToken] = args;

// Validate format
if (!githubId.startsWith('Ov23')) {
  console.error('⚠️  GitHub Client ID should start with "Ov23"');
}
if (githubSecret.length < 30) {
  console.error('⚠️  GitHub Client Secret seems too short (expected ~40 chars)');
}
if (!slackId.includes('.')) {
  console.error('⚠️  Slack Client ID should contain a dot (e.g., "9847874996609.9863318830272")');
}
if (slackSecret.length < 20) {
  console.error('⚠️  Slack Client Secret seems too short (expected ~30+ chars)');
}
if (!slackBotToken.startsWith('xoxb-')) {
  console.error('⚠️  Slack Bot Token should start with "xoxb-"');
}

// Read current .env
let envContent = fs.readFileSync(envPath, 'utf8');

// Update credentials
envContent = envContent.replace(/GITHUB_CLIENT_ID=.+/, `GITHUB_CLIENT_ID=${githubId}`);
envContent = envContent.replace(/GITHUB_CLIENT_SECRET=.+/, `GITHUB_CLIENT_SECRET=${githubSecret}`);
envContent = envContent.replace(/SLACK_CLIENT_ID=.+/, `SLACK_CLIENT_ID=${slackId}`);
envContent = envContent.replace(/SLACK_CLIENT_SECRET=.+/, `SLACK_CLIENT_SECRET=${slackSecret}`);
envContent = envContent.replace(/SLACK_BOT_TOKEN=.+/, `SLACK_BOT_TOKEN=${slackBotToken}`);

// Write back
fs.writeFileSync(envPath, envContent, 'utf8');

console.log('\n✅ OAuth Credentials Updated!\n');
console.log('Updated:');
console.log(`  ✓ GITHUB_CLIENT_ID = ${githubId.slice(0, 10)}...`);
console.log(`  ✓ GITHUB_CLIENT_SECRET = ${githubSecret.slice(0, 10)}...`);
console.log(`  ✓ SLACK_CLIENT_ID = ${slackId.slice(0, 20)}...`);
console.log(`  ✓ SLACK_CLIENT_SECRET = ${slackSecret.slice(0, 10)}...`);
console.log(`  ✓ SLACK_BOT_TOKEN = ${slackBotToken.slice(0, 20)}...`);
console.log('\nNow restart the system:');
console.log('  npm run stop:all && npm run dev\n');
