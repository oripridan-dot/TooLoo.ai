#!/usr/bin/env node

/**
 * Phase 7 Memory System - Implementation Verification
 * 
 * Checks that in-session memory is properly integrated
 */

import fs from 'fs/promises';
import path from 'path';

const checks = [
  {
    name: 'ConversationMemoryEngine exists',
    path: 'engine/conversation-memory-engine.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('class ConversationMemoryEngine');
    }
  },
  {
    name: 'ContextInjectionEngine exists',
    path: 'engine/context-injection-engine.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('class ContextInjectionEngine');
    }
  },
  {
    name: 'SessionMemoryManager imports new engines',
    path: 'services/session-memory-manager.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('ConversationMemoryEngine') &&
             content.includes('ContextInjectionEngine');
    }
  },
  {
    name: 'SessionMemoryManager has getIntelligentHistory method',
    path: 'services/session-memory-manager.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('getIntelligentHistory');
    }
  },
  {
    name: 'SessionMemoryManager has recordInteractionOutcome method',
    path: 'services/session-memory-manager.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('recordInteractionOutcome');
    }
  },
  {
    name: 'SessionMemoryManager has searchConversation method',
    path: 'services/session-memory-manager.js',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('searchConversation');
    }
  },
  {
    name: 'Memory documentation exists',
    path: 'PHASE-7-IN-SESSION-MEMORY.md',
    check: async (filepath) => {
      const content = await fs.readFile(filepath, 'utf8');
      return content.includes('TooLoo.ai In-Session Memory Upgrade');
    }
  }
];

async function runChecks() {
  console.log('🧠 Phase 7 In-Session Memory - Implementation Check\n');

  const cwd = process.cwd();
  let passed = 0;
  let failed = 0;

  for (const test of checks) {
    const filepath = path.join(cwd, test.path);
    try {
      const result = await test.check(filepath);
      if (result) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - Check failed`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✨ All checks passed! Memory system is ready.\n');
    console.log('Next steps:');
    console.log('1. Integrate getIntelligentHistory() into chat endpoints');
    console.log('2. Add recordInteractionOutcome() calls after responses');
    console.log('3. Test with conversations >100 messages');
    console.log('4. Monitor memory stats via getMemoryStatistics()');
    return 0;
  } else {
    console.log(`⚠️  ${failed} check(s) failed. Review implementation.\n`);
    return 1;
  }
}

process.exit(await runChecks());
