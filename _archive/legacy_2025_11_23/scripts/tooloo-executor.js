#!/usr/bin/env node

/**
 * TooLoo Auto-Executor
 * Executes TooLoo's self-suggestions automatically via the self-patch API
 * Usage: npm run tooloo:auto-execute [suggestion-id]
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.dirname(__dirname);

const API_BASE = process.env.TOOLOO_API_URL || 'http://127.0.0.1:3000';
const SUGGESTIONS_FILE = path.join(ROOT_DIR, '.tooloo-suggestions.json');
const LOG_FILE = path.join(ROOT_DIR, 'logs', 'tooloo-execution.log');

// Ensure logs directory exists
const logsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Logging utility
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (_e) {
    // Silent fail if logging not available
  }
}

/**
 * Load suggestions from JSON file or stdin
 */
async function loadSuggestions(input) {
  try {
    if (!input) {
      // Try to load from file
      if (fs.existsSync(SUGGESTIONS_FILE)) {
        const content = fs.readFileSync(SUGGESTIONS_FILE, 'utf-8');
        return JSON.parse(content);
      }
      return [];
    }

    // Try parsing as JSON
    try {
      return [JSON.parse(input)];
    } catch (_e) {
      // Try loading from file path
      if (fs.existsSync(input)) {
        const content = fs.readFileSync(input, 'utf-8');
        return JSON.parse(content);
      }
      throw new Error(`Invalid input: ${input}`);
    }
  } catch (error) {
    log(`Failed to load suggestions: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * Execute a single suggestion via the self-patch API
 */
async function executeSuggestion(suggestion) {
  log(`Executing suggestion: ${suggestion.id || suggestion.title}`, 'INFO');
  
  try {
    // Build the self-patch payload
    const payload = {
      action: suggestion.action || 'create',
      file: suggestion.file || suggestion.path,
      content: suggestion.content || suggestion.code,
      message: suggestion.message || `Auto-execute: ${suggestion.title}`,
      branch: suggestion.branch || 'main',
      createPr: suggestion.createPr !== undefined ? suggestion.createPr : true
    };

    if (!payload.file || !payload.content) {
      throw new Error('Missing required fields: file and content');
    }

    // Call the self-patch API
    const response = await fetch(`${API_BASE}/api/v1/system/self-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      timeout: 30000
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`API error: ${data.error || response.statusText}`);
    }

    log(`✅ Suggestion executed: ${suggestion.id}`, 'SUCCESS');
    return {
      id: suggestion.id,
      success: true,
      result: data,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    log(`❌ Suggestion failed: ${suggestion.id} - ${error.message}`, 'ERROR');
    return {
      id: suggestion.id,
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Batch execute multiple suggestions
 */
async function executeBatch(suggestions, options = {}) {
  const results = [];
  const { sequential = false, stopOnError = false } = options;

  log(`Starting batch execution of ${suggestions.length} suggestion(s)`, 'INFO');

  if (sequential) {
    // Sequential execution
    for (const suggestion of suggestions) {
      const result = await executeSuggestion(suggestion);
      results.push(result);

      if (stopOnError && !result.success) {
        log('Stopping batch due to error (stopOnError=true)', 'WARN');
        break;
      }
    }
  } else {
    // Parallel execution
    const executions = suggestions.map(s => executeSuggestion(s));
    results.push(...await Promise.all(executions));
  }

  return results;
}

/**
 * Save execution results
 */
function saveResults(results) {
  const resultsFile = path.join(ROOT_DIR, 'logs', `tooloo-results-${Date.now()}.json`);
  try {
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    log(`Results saved to: ${resultsFile}`, 'INFO');
    return resultsFile;
  } catch (error) {
    log(`Failed to save results: ${error.message}`, 'ERROR');
    return null;
  }
}

/**
 * Print execution summary
 */
function printSummary(results) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(60));
  console.log('EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(60) + '\n');

  if (failed > 0) {
    console.log('Failed suggestions:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.id}: ${r.error}`);
    });
  }
}

/**
 * Main executor function
 */
async function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  const options = {
    sequential: args.includes('--sequential'),
    stopOnError: args.includes('--stop-on-error'),
    saveResults: args.includes('--save-results') || true
  };

  log('TooLoo Auto-Executor started', 'INFO');

  // Check if API is available
  try {
    await fetch(`${API_BASE}/api/v1/system/health`, { timeout: 5000 });
    log(`Connected to TooLoo API at ${API_BASE}`, 'INFO');
  } catch (error) {
    log(`Cannot connect to API at ${API_BASE}. Is the server running?`, 'ERROR');
    log('Start with: npm run dev', 'INFO');
    process.exit(1);
  }

  // Load suggestions
  const suggestions = await loadSuggestions(input);

  if (suggestions.length === 0) {
    log('No suggestions to execute', 'WARN');
    process.exit(0);
  }

  // Execute suggestions
  const results = await executeBatch(suggestions, options);

  // Save and print results
  if (options.saveResults) {
    saveResults(results);
  }
  printSummary(results);

  // Exit with appropriate code
  const failed = results.filter(r => !r.success).length;
  process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

export { executeSuggestion, executeBatch, loadSuggestions, saveResults };
