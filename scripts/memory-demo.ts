#!/usr/bin/env tsx
/**
 * Memory Cortex Interactive Demo
 * Shows all the memory capabilities in action
 * 
 * Run with: pnpm tsx scripts/memory-demo.ts
 */

import { getMemoryCortex, resetMemoryCortex } from '@tooloo/memory';

async function runDemo() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🧠 MEMORY CORTEX - INTERACTIVE DEMONSTRATION                   ║
║                                                                  ║
║   Showcasing: Sessions, Conversations, Working Memory,           ║
║   Semantic Search, and Auto-Consolidation                        ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`);

  // Reset and create fresh cortex
  resetMemoryCortex();
  const cortex = getMemoryCortex({
    autoConsolidate: false,  // Manual for demo
    autoCleanup: false,
    embedding: { provider: 'local' },  // Use local embedder
  });

  // =========================================================================
  // 1. SESSION MANAGEMENT
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  1️⃣  SESSION MANAGEMENT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const session = cortex.createSession('user-ori');
  console.log('✅ Created new session:');
  console.log(`   • Session ID: ${session.sessionId}`);
  console.log(`   • User ID: ${session.userId}`);
  console.log(`   • Started At: ${new Date(session.startedAt).toLocaleTimeString()}`);
  console.log('');

  // =========================================================================
  // 2. CONVERSATION HISTORY
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  2️⃣  CONVERSATION HISTORY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Simulate a conversation
  const messages = [
    { role: 'user' as const, content: 'Hello TooLoo! I need help with TypeScript.' },
    { role: 'assistant' as const, content: 'Hi! I\'d love to help with TypeScript. What are you working on?', skillId: 'coding-assistant' },
    { role: 'user' as const, content: 'I need to implement a memory system with sessions.' },
    { role: 'assistant' as const, content: 'Great! I can help you design a session-based memory system. Let me show you...', skillId: 'coding-assistant' },
  ];

  console.log('📝 Adding conversation messages...\n');
  for (const msg of messages) {
    cortex.addMessage(session.sessionId, msg);
    const icon = msg.role === 'user' ? '👤' : '🤖';
    console.log(`   ${icon} [${msg.role}]: "${msg.content.substring(0, 50)}..."`);
  }

  const history = cortex.getConversationHistory(session.sessionId);
  console.log(`\n✅ Conversation has ${history.length} messages stored`);
  console.log('');

  // =========================================================================
  // 3. WORKING MEMORY (7±2 Slots)
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  3️⃣  WORKING MEMORY (7±2 Cognitive Limit)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Set working memory items
  cortex.setWorkingMemory(session.sessionId, 'current_task', { name: 'Build memory system', priority: 'high' }, 0.9);
  cortex.setWorkingMemory(session.sessionId, 'user_preference', 'TypeScript', 0.8);
  cortex.setWorkingMemory(session.sessionId, 'context', { project: 'TooLoo.ai', framework: 'Skills OS' }, 0.7);
  cortex.setWorkingMemory(session.sessionId, 'last_error', null, 0.3);
  cortex.setWorkingMemory(session.sessionId, 'active_file', 'kernel.ts', 0.6);

  console.log('🧠 Working Memory Slots (limited capacity like human cognition):');
  const workingMem = cortex.getAllWorkingMemory(session.sessionId);
  Object.entries(workingMem).forEach(([key, value]) => {
    console.log(`   • ${key}: ${JSON.stringify(value)}`);
  });
  console.log(`\n✅ ${Object.keys(workingMem).length} items in working memory`);
  console.log('');

  // =========================================================================
  // 4. LONG-TERM MEMORY STORAGE
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  4️⃣  MEMORY STORAGE (Episodic, Semantic, Procedural)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Store different types of memories
  const memories = [
    { content: 'User prefers TypeScript over JavaScript for type safety', type: 'semantic' as const, importance: 0.9 },
    { content: 'Successfully completed authentication feature yesterday', type: 'episodic' as const, importance: 0.7 },
    { content: 'For YAML skills, always include triggers.keywords array', type: 'procedural' as const, importance: 0.85 },
    { content: 'User mentioned they work on TooLoo.ai project', type: 'semantic' as const, importance: 0.8 },
    { content: 'When routing fails, check confidence threshold settings', type: 'procedural' as const, importance: 0.75 },
  ];

  console.log('💾 Storing memories to short-term store...\n');
  for (const mem of memories) {
    const stored = await cortex.store({
      content: mem.content,
      type: mem.type,
      tier: 'short-term',
      importance: mem.importance,
      sessionId: session.sessionId,
    });
    const typeIcon = mem.type === 'semantic' ? '📚' : mem.type === 'episodic' ? '📅' : '⚙️';
    console.log(`   ${typeIcon} [${mem.type}] "${mem.content.substring(0, 45)}..." (importance: ${mem.importance})`);
  }
  console.log('\n✅ 5 memories stored');
  console.log('');

  // =========================================================================
  // 5. SEMANTIC SEARCH
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  5️⃣  SEMANTIC SEARCH (Vector Similarity)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const searchQueries = [
    'TypeScript preferences',
    'YAML configuration',
    'routing problems',
  ];

  for (const query of searchQueries) {
    console.log(`🔍 Searching for: "${query}"`);
    const results = await cortex.retrieve({
      query,
      limit: 2,
      semantic: true,
    });

    if (results.length > 0) {
      results.forEach((r, i) => {
        console.log(`   ${i + 1}. Score: ${r.score.toFixed(3)} - "${r.item.content.substring(0, 50)}..."`);
      });
    } else {
      console.log('   No matches found');
    }
    console.log('');
  }

  // =========================================================================
  // 6. MEMORY STATISTICS
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  6️⃣  MEMORY STATISTICS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = cortex.getStats();
  console.log('📊 Current Memory System State:');
  console.log(`   • Total Memories: ${stats.totalMemories}`);
  console.log(`   • Active Sessions: ${stats.activeSessions}`);
  console.log(`   • Session Tier: ${stats.byTier['session']} memories`);
  console.log(`   • Short-Term Tier: ${stats.byTier['short-term']} memories`);
  console.log(`   • Long-Term Tier: ${stats.byTier['long-term']} memories`);
  console.log('');

  // =========================================================================
  // 7. CONSOLIDATION
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  7️⃣  MEMORY CONSOLIDATION (Decay, Promote, Prune)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('⏳ Running consolidation...');
  const consolidation = await cortex.consolidate();
  console.log('');
  console.log('📈 Consolidation Results:');
  console.log(`   • Promoted to long-term: ${consolidation.promoted}`);
  console.log(`   • Decayed (importance reduced): ${consolidation.decayed}`);
  console.log(`   • Pruned (removed): ${consolidation.pruned}`);
  console.log(`   • Merged (similar combined): ${consolidation.merged}`);
  console.log('');

  // =========================================================================
  // 8. SESSION SUMMARY
  // =========================================================================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  8️⃣  SESSION CONTEXT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const sessionSummary = cortex.getSessionsSummary();
  sessionSummary.forEach(s => {
    console.log(`📋 Session: ${s.sessionId.substring(0, 8)}...`);
    console.log(`   • User: ${s.userId || 'anonymous'}`);
    console.log(`   • Messages: ${s.messageCount}`);
    console.log(`   • Working Memory: ${s.workingMemoryCount} items`);
    console.log(`   • Active Skill: ${s.activeSkillId || 'none'}`);
    console.log(`   • Duration: ${Math.round((Date.now() - s.startedAt) / 1000)}s`);
  });
  console.log('');

  // Cleanup
  await cortex.shutdown();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ DEMONSTRATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('The Memory Cortex provides:');
  console.log('  • Session management (multiple users/conversations)');
  console.log('  • Conversation history (auto-stored per session)');
  console.log('  • Working memory (7±2 cognitive limit)');
  console.log('  • Short-term storage (LRU cache with TTL)');
  console.log('  • Semantic search (vector similarity)');
  console.log('  • Auto-consolidation (decay, promote, prune)');
  console.log('');
}

runDemo().catch(console.error);
