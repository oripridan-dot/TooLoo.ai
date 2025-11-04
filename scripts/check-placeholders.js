#!/usr/bin/env node

/**
 * Placeholder Token Validation Script
 * 
 * This script checks for literal placeholder tokens in documentation and .env files
 * to prevent accidental commits of example/placeholder values.
 * 
 * Exit codes:
 * 0 - No issues found
 * 1 - Placeholder tokens detected
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Patterns that should NOT appear in tracked files
const FORBIDDEN_PATTERNS = [
  /ghp_placeholder/i,           // GitHub token placeholder
  /your_[a-z_]+_here/i,         // Pattern like "your_key_here"
  /your_[a-z_]+_key_here/i,     // Pattern like "your_api_key_here"
  /your_[a-z_]+_token_here/i,   // Pattern like "your_token_here"
  /your_[a-z_]+_secret/i,       // Pattern like "your_secret"
  /your_[a-z_]+_id/i,           // Pattern like "your_client_id"
];

// Additional checks: Lines that contain BOTH "placeholder" AND look like env var assignments
function isPlaceholderAssignment(line) {
  // Check if line looks like an environment variable assignment with placeholder
  const hasPlaceholder = /\bplaceholder\b/i.test(line);
  const looksLikeEnvVar = /^[A-Z_]+=.+placeholder/i.test(line.trim()) || 
                          /[A-Z_]+=.*your_/i.test(line.trim());
  return hasPlaceholder && looksLikeEnvVar;
}

// File patterns to check
const FILE_EXTENSIONS = ['.md', '.env.example', '.env.template'];

// Directories to exclude from scanning
const EXCLUDED_DIRS = ['node_modules', '.git', '.github/agents', 'dist', 'build'];

/**
 * Recursively find all files matching the target extensions
 */
function findFiles(dir, fileList = []) {
  const files = readdirSync(dir);

  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      const relativePath = relative(rootDir, filePath);
      // Skip excluded directories
      if (!EXCLUDED_DIRS.some(excluded => relativePath.includes(excluded))) {
        findFiles(filePath, fileList);
      }
    } else {
      // Check if file matches our target extensions
      if (FILE_EXTENSIONS.some(ext => file.endsWith(ext))) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Check a file for forbidden patterns
 */
function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    // Check main forbidden patterns
    FORBIDDEN_PATTERNS.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          line: index + 1,
          content: line.trim(),
          pattern: pattern.source
        });
      }
    });

    // Check for placeholder in env var assignments
    if (isPlaceholderAssignment(line)) {
      issues.push({
        line: index + 1,
        content: line.trim(),
        pattern: 'placeholder in environment variable assignment'
      });
    }
  });

  return issues;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Checking for placeholder tokens in documentation and config files...\n');

  const files = findFiles(rootDir);
  let hasErrors = false;

  console.log(`Scanning ${files.length} files...\n`);

  files.forEach(filePath => {
    const relativePath = relative(rootDir, filePath);
    const issues = checkFile(filePath);

    if (issues.length > 0) {
      hasErrors = true;
      console.error(`❌ ${relativePath}:`);
      issues.forEach(issue => {
        console.error(`   Line ${issue.line}: ${issue.content}`);
        console.error(`   Pattern matched: ${issue.pattern}\n`);
      });
    }
  });

  if (hasErrors) {
    console.error('❌ FAILED: Placeholder tokens detected!');
    console.error('\n💡 Fix by replacing with REPLACE_ME or removing the placeholder pattern.\n');
    process.exit(1);
  } else {
    console.log('✅ PASSED: No placeholder tokens found.\n');
    process.exit(0);
  }
}

main();
