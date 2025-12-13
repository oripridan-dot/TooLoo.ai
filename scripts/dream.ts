// @version 2.0.NaN
#!/usr/bin/env npx tsx
/**
 * Dream Script - Memory Consolidation
 * 
 * This script runs periodically (via cron) to:
 * 1. Fetch the last 24h of events from the event store
 * 2. Use the AI provider to summarize and consolidate memories
 * 3. Store consolidated memories as new events
 * 
 * Usage:
 *   npx tsx scripts/dream.ts
 *   
 * Cron example (run at 3am daily):
 *   0 3 * * * cd /path/to/project && npx tsx scripts/dream.ts >> /var/log/tooloo-dream.log 2>&1
 * 
 * @version 1.0.0
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// =============================================================================
// CONFIGURATION
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'memory', 'events.db');

// Consolidation window (24 hours in milliseconds)
const CONSOLIDATION_WINDOW_MS = 24 * 60 * 60 * 1000;

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3:8b';

// =============================================================================
// TYPES
// =============================================================================

interface StoredEvent {
  sequence: number;
  id: string;
  type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: string;
  metadata: string;
  timestamp: number;
  version: number;
}

interface ConsolidatedMemory {
  period: string;
  summary: string;
  keyInsights: string[];
  patterns: string[];
  eventCount: number;
  aggregateTypes: string[];
}

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

function initializeDatabase(): Database.Database {
  const db = new Database(DB_PATH);
  
  // Ensure events table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      metadata TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      version INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
  `);
  
  return db;
}

function fetchRecentEvents(db: Database.Database, windowMs: number): StoredEvent[] {
  const cutoffTime = Date.now() - windowMs;
  
  const stmt = db.prepare(`
    SELECT * FROM events 
    WHERE timestamp >= ? 
    ORDER BY timestamp ASC
  `);
  
  return stmt.all(cutoffTime) as StoredEvent[];
}

function storeConsolidatedMemory(
  db: Database.Database, 
  memory: ConsolidatedMemory
): void {
  const stmt = db.prepare(`
    INSERT INTO events (id, type, aggregate_type, aggregate_id, payload, metadata, timestamp, version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const id = crypto.randomUUID();
  const timestamp = Date.now();
  
  stmt.run(
    id,
    'memory:consolidated',
    'memory',
    'dream-consolidation',
    JSON.stringify(memory),
    JSON.stringify({
      source: 'dream-script',
      model: OLLAMA_MODEL,
      timestamp,
    }),
    timestamp,
    1
  );
}

// =============================================================================
// AI CONSOLIDATION
// =============================================================================

async function callOllama(prompt: string): Promise<string> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for factual consolidation
        num_predict: 2048,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Ollama request failed: ${response.status}`);
  }
  
  const data = await response.json() as { response: string };
  return data.response;
}

async function consolidateEvents(events: StoredEvent[]): Promise<ConsolidatedMemory> {
  // Group events by type
  const eventsByType = new Map<string, StoredEvent[]>();
  const aggregateTypes = new Set<string>();
  
  for (const event of events) {
    const existing = eventsByType.get(event.type) || [];
    existing.push(event);
    eventsByType.set(event.type, existing);
    aggregateTypes.add(event.aggregate_type);
  }
  
  // Build summary of events
  const eventSummaries: string[] = [];
  for (const [type, typeEvents] of eventsByType) {
    eventSummaries.push(`- ${type}: ${typeEvents.length} events`);
    
    // Sample some payloads for context
    const samples = typeEvents.slice(0, 3).map(e => {
      try {
        const payload = JSON.parse(e.payload);
        return JSON.stringify(payload, null, 2).slice(0, 200);
      } catch {
        return e.payload.slice(0, 200);
      }
    });
    
    if (samples.length > 0) {
      eventSummaries.push(`  Samples: ${samples.join(', ')}`);
    }
  }
  
  // Build consolidation prompt
  const prompt = `You are a memory consolidation system for an AI assistant. Your task is to analyze the following events from the last 24 hours and create a consolidated memory summary.

## Events (${events.length} total)
${eventSummaries.join('\n')}

## Time Period
From: ${new Date(events[0]?.timestamp ?? Date.now()).toISOString()}
To: ${new Date(events[events.length - 1]?.timestamp ?? Date.now()).toISOString()}

## Task
Please provide a JSON response with the following structure:
{
  "summary": "A 2-3 sentence overview of what happened",
  "keyInsights": ["insight 1", "insight 2", ...],
  "patterns": ["pattern 1", "pattern 2", ...]
}

Focus on:
1. What tasks were completed
2. What skills were used most
3. Any errors or issues that occurred
4. Patterns in user behavior or system performance

Respond ONLY with valid JSON, no markdown or explanations.`;

  // Call Ollama for consolidation
  const response = await callOllama(prompt);
  
  // Parse response
  let parsed: { summary: string; keyInsights: string[]; patterns: string[] };
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch {
    // Fallback if parsing fails
    parsed = {
      summary: `Processed ${events.length} events across ${aggregateTypes.size} aggregate types.`,
      keyInsights: [`Total events: ${events.length}`],
      patterns: Array.from(eventsByType.keys()).slice(0, 5),
    };
  }
  
  // Get time period
  const startTime = events[0]?.timestamp ?? Date.now();
  const endTime = events[events.length - 1]?.timestamp ?? Date.now();
  const period = `${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`;
  
  return {
    period,
    summary: parsed.summary,
    keyInsights: parsed.keyInsights,
    patterns: parsed.patterns,
    eventCount: events.length,
    aggregateTypes: Array.from(aggregateTypes),
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('🌙 Starting Dream Consolidation...');
  console.log(`   Database: ${DB_PATH}`);
  console.log(`   Model: ${OLLAMA_MODEL}`);
  console.log(`   Window: ${CONSOLIDATION_WINDOW_MS / 1000 / 60 / 60} hours`);
  
  // Check if Ollama is available
  try {
    const healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!healthCheck.ok) {
      throw new Error('Ollama not responding');
    }
    console.log('   Ollama: ✓ Connected');
  } catch (error) {
    console.error('❌ Ollama is not available. Please start Ollama first.');
    console.error(`   Tried: ${OLLAMA_BASE_URL}`);
    process.exit(1);
  }
  
  // Initialize database
  let db: Database.Database;
  try {
    db = initializeDatabase();
    console.log('   Database: ✓ Connected');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
  
  try {
    // Fetch recent events
    const events = fetchRecentEvents(db, CONSOLIDATION_WINDOW_MS);
    console.log(`\n📊 Found ${events.length} events in the last 24 hours`);
    
    if (events.length === 0) {
      console.log('   No events to consolidate. Exiting.');
      db.close();
      return;
    }
    
    // Consolidate
    console.log('\n🧠 Consolidating memories...');
    const memory = await consolidateEvents(events);
    
    console.log('\n📝 Consolidated Memory:');
    console.log(`   Period: ${memory.period}`);
    console.log(`   Events: ${memory.eventCount}`);
    console.log(`   Summary: ${memory.summary}`);
    console.log(`   Key Insights: ${memory.keyInsights.join(', ')}`);
    console.log(`   Patterns: ${memory.patterns.join(', ')}`);
    
    // Store consolidated memory
    storeConsolidatedMemory(db, memory);
    console.log('\n✅ Memory consolidated and stored!');
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run
main().catch(console.error);
