// @version 2.1.387
import { EventBus, SynapsysEvent } from '../../core/event-bus.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VectorStore } from './vector-store.js';
import { smartFS } from '../../core/fs-manager.js';
import { memoryRepository, MemoryEntry } from '../../core/repositories/MemoryRepository.js';
import KnowledgeGraphEngine from './knowledge-graph-engine.js';

// Memory limits to prevent disk bloat
const MAX_EPISODIC_ENTRIES = 5000; // Max entries before pruning
const PRUNE_TARGET = 3000; // Keep this many after pruning
const MAX_FILE_SIZE_MB = 100; // Max file size in MB

export class Hippocampus {
  private shortTermMemory: MemoryEntry[] = [];
  private readonly STM_LIMIT = 100;
  private isReady: boolean = false;
  private episodicHistory: MemoryEntry[] = [];
  public vectorStore: VectorStore;
  public knowledgeGraph: KnowledgeGraphEngine;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string
  ) {
    this.vectorStore = new VectorStore(workspaceRoot);
    this.knowledgeGraph = new KnowledgeGraphEngine();
  }

  async initialize() {
    console.log('[Hippocampus] Initializing Memory Systems...');

    await this.loadLongTermMemory();
    await this.vectorStore.initialize();

    this.setupListeners();

    this.isReady = true;
    this.bus.publish('cortex', 'system:component_ready', {
      component: 'hippocampus',
    });
    console.log('[Hippocampus] Online - Recording enabled.');
  }

  private async loadLongTermMemory() {
    try {
      this.episodicHistory = memoryRepository.getRecent(PRUNE_TARGET);
      console.log(
        `[Hippocampus] Loaded ${this.episodicHistory.length} episodic memories from SQLite.`
      );
    } catch (e) {
      console.error('[Hippocampus] Failed to load memories:', e);
      this.episodicHistory = [];
    }
  }

  private async pruneEpisodicMemory() {
    const removed = memoryRepository.prune(PRUNE_TARGET);
    console.log(`[Hippocampus] Pruned ${removed} old memories.`);
    // Refresh local cache
    this.episodicHistory = memoryRepository.getRecent(PRUNE_TARGET);
  }

  private setupListeners() {
    // Record Actions
    this.bus.on('motor:execute', (event) =>
      this.record('action', event.payload, ['motor', 'exec'])
    );
    this.bus.on('motor:file:write', (event) =>
      this.record('action', event.payload, ['motor', 'fs', 'write'])
    );

    // Record Outcomes
    this.bus.on('motor:result', (event) =>
      this.record('observation', event.payload, ['motor', 'result'])
    );

    // Record Sensory Inputs
    this.bus.on('sensory:file:change', (event) => {
      const filePath = event.payload.path;
      if (
        filePath &&
        (filePath.includes('data/') || filePath.includes('logs/') || filePath.includes('temp/'))
      ) {
        return;
      }
      this.record('observation', event.payload, ['sensory', 'fs']);
    });

    // Explicit Memory Storage
    this.bus.on('memory:store', async (event: any) => {
      const { content, type, tags, metadata } = event.payload;
      await this.vectorStore.add(content, metadata);
      this.record(type || 'thought', { content, metadata }, tags || []);
    });

    // Allow explicit memory storage
    this.bus.on('memory:store', (event) => this.record('thought', event.payload, ['explicit']));

    // Query requests
    this.bus.on('memory:query', async (event) => {
      const results = this.query(event.payload);
      this.bus.publish('cortex', 'memory:query:result', {
        requestId: event.payload.id,
        results,
      });
    });

    // Semantic Search
    this.bus.on('memory:semantic_search', async (event) => {
      const { query, k, requestId } = event.payload;
      const results = await this.vectorStore.search(query, k);
      this.bus.publish('cortex', 'memory:semantic_search:result', {
        requestId,
        results,
      });
    });

    // Record Response & Update KG
    this.bus.on('cortex:response', (event) => {
      const { requestId, data } = event.payload;
      if (data && data.provider) {
        this.knowledgeGraph.recordTaskPerformance({
          taskId: requestId || Date.now().toString(),
          goal: 'interaction',
          provider: data.provider.toLowerCase().replace(/\s+/g, '-'),
          success: true,
          responseTime: 1000, // Placeholder
          quality: 0.8,
          context: { meta: data.meta },
        });
      }
    });
  }

  private record(
    type: MemoryEntry['type'],
    content: any,
    tags: string[],
    transactionId?: string,
    affectedFiles?: string[]
  ) {
    const entry: MemoryEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      type,
      content,
      tags,
      transactionId,
      affectedFiles,
    };

    // Add to Short Term Memory
    this.shortTermMemory.push(entry);
    if (this.shortTermMemory.length > this.STM_LIMIT) {
      this.shortTermMemory.shift(); // Forget oldest
    }

    // Persist to Long Term Memory (Async fire-and-forget for now)
    this.persist(entry).catch((err) =>
      console.error(`[Hippocampus] Failed to persist memory: ${err.message}`)
    );

    // Add to Vector Store if applicable
    if (typeof content === 'string' || (content && content.description)) {
      const text =
        typeof content === 'string' ? content : content.description || JSON.stringify(content);
      this.vectorStore.add(text, { type, tags, id: entry.id });
    }
  }

  private async persist(entry: MemoryEntry) {
    // Append to in-memory cache and save
    try {
      this.episodicHistory.push(entry);

      // Save to SQLite
      memoryRepository.save(entry);

      // Auto-prune if exceeded
      if (this.episodicHistory.length > MAX_EPISODIC_ENTRIES) {
        await this.pruneEpisodicMemory();
      }
    } catch (err) {
      console.error('[Hippocampus] Persistence error', err);
    }
  }

  public query(criteria: { type?: string; tags?: string[]; limit?: number }): MemoryEntry[] {
    let results = [...this.shortTermMemory];

    if (criteria.type) {
      results = results.filter((m) => m.type === criteria.type);
    }

    if (criteria.tags) {
      results = results.filter((m) => criteria.tags!.some((t) => m.tags.includes(t)));
    }

    // Sort by newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }
}
