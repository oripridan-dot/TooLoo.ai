#!/usr/bin/env node
/**
 * codespace-optimize.js - Optimize codespace startup performance
 * 
 * Identifies and removes unnecessary dependencies and build artifacts
 * without touching application code.
 * 
 * Usage:
 *   node scripts/codespace-optimize.js           # Report only
 *   node scripts/codespace-optimize.js --cleanup # Actually clean
 */

import { promises as fs } from 'fs';
import path from 'path';

const ROOT = '/workspaces/TooLoo.ai';
const CLEANUP = process.argv.includes('--cleanup');

async function getSize(dir) {
  try {
    const { stdout } = await import('child_process').then(() => 
      new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        exec(`du -sb "${dir}" 2>/dev/null`, (err, stdout) => {
          if (err) reject(err);
          else resolve({ stdout });
        });
      })
    );
    const bytes = parseInt(stdout.split('\t')[0]);
    return bytes;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${size.toFixed(1)}${units[unit]}`;
}

async function analyzeDirectory(dir, depth = 0) {
  if (depth > 3) return [];
  
  const issues = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip VS Code internal and git
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'node_modules' && depth === 0) {
        // Check for duplicate node_modules at root
        const size = await getSize(fullPath);
        issues.push({
          type: 'large-directory',
          path: fullPath,
          size,
          severity: 'high',
          reason: `Main node_modules: ${formatBytes(size)}`
        });
        continue;
      }

      if (entry.isDirectory()) {
        // Look for build artifacts
        if (['dist', 'build', '.next', '.cache', 'coverage', 'bundle'].includes(entry.name)) {
          const size = await getSize(fullPath);
          issues.push({
            type: 'build-artifact',
            path: fullPath,
            size,
            severity: 'medium',
            reason: `Unused ${entry.name}: ${formatBytes(size)}`
          });
          continue;
        }

        // Recurse
        const subIssues = await analyzeDirectory(fullPath, depth + 1);
        issues.push(...subIssues);
      }
    }
  } catch (error) {
    // Permission denied, etc
  }

  return issues;
}

async function main() {
  console.log('📊 TooLoo.ai Codespace Optimization Report\n');
  console.log('Scanning directories...\n');

  const issues = await analyzeDirectory(ROOT);
  
  if (issues.length === 0) {
    console.log('✅ No optimization opportunities found\n');
    return;
  }

  // Group by type
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.type]) {
      grouped[issue.type] = [];
    }
    grouped[issue.type].push(issue);
  }

  let totalSize = 0;

  for (const [type, typeIssues] of Object.entries(grouped)) {
    console.log(`\n📂 ${type.toUpperCase()}`);
    console.log('─'.repeat(60));

    for (const issue of typeIssues) {
      totalSize += issue.size;
      const severity = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[issue.severity];
      
      console.log(`${severity} ${formatBytes(issue.size).padStart(8)} → ${path.relative(ROOT, issue.path)}`);
      console.log(`   ${issue.reason}`);
    }
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`💾 Total recoverable: ${formatBytes(totalSize)}\n`);

  if (!CLEANUP) {
    console.log('ℹ️  Run with --cleanup flag to remove these directories:\n');
    console.log('   node scripts/codespace-optimize.js --cleanup\n');
    return;
  }

  // Actually cleanup
  console.log('🧹 Cleaning up...\n');
  let cleaned = 0;

  for (const issue of issues.filter(i => i.type === 'build-artifact')) {
    try {
      await fs.rm(issue.path, { recursive: true, force: true });
      console.log(`   ✅ Removed ${path.relative(ROOT, issue.path)}`);
      cleaned++;
    } catch (error) {
      console.log(`   ❌ Failed to remove: ${error.message}`);
    }
  }

  console.log(`\n✅ Cleanup complete (${cleaned} directories removed)\n`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
