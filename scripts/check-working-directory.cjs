#!/usr/bin/env node
/**
 * Mandatory working directory check for npm scripts
 * Ensures commands are run from the correct directory
 */

const path = require('path');
const fs = require('fs');

const cwd = process.cwd();
const scriptType = process.env.npm_lifecycle_event;

// Check if we're in the project root
const isProjectRoot = () => {
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!fs.existsSync(packageJsonPath)) return false;
  
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return pkg.name === 'tooloo-ai' && fs.existsSync(path.join(cwd, 'src', 'main.ts'));
};

// Check if we're in the web-app directory
const isWebAppDir = () => {
  return cwd.endsWith('src/web-app') || cwd.endsWith('src\\web-app');
};

// Scripts that must run from project root
const rootOnlyScripts = [
  'start', 'dev', 'dev:all', 'dev:ensure', 
  'test', 'test:watch', 'test:coverage',
  'build:frontend', 'typecheck'
];

// Scripts that can run from web-app
const webAppScripts = ['dev', 'build', 'preview', 'storybook'];

function main() {
  // Skip check for some npm lifecycle events
  if (!scriptType || scriptType.startsWith('pre') || scriptType.startsWith('post')) {
    return;
  }

  const currentDir = path.basename(cwd);
  const parentDir = path.basename(path.dirname(cwd));

  // If we're in web-app and running a web-app specific script, that's OK
  if (isWebAppDir() && webAppScripts.includes(scriptType)) {
    console.log('✓ Running from web-app directory');
    return;
  }

  // For root scripts, ensure we're in project root
  if (rootOnlyScripts.includes(scriptType)) {
    if (!isProjectRoot()) {
      console.error('\n❌ ERROR: Command must be run from project root directory');
      console.error(`   Current: ${cwd}`);
      console.error(`   Expected: TooLoo.ai-V3-Synapsys/`);
      console.error('\n   Fix: cd /workspaces/TooLoo.ai-V3-Synapsys');
      console.error(`   Then: npm run ${scriptType}\n`);
      process.exit(1);
    }
    console.log('✓ Running from project root');
  }
}

main();
