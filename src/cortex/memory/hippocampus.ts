// @version 2.1.232
import { EventBus, SynapsysEvent } from "../../core/event-bus.js";
import * as fs from "fs/promises";
import * as path from "path";
import { VectorStore } from "./vector-store.js";
import { smartFS } from "../../core/fs-manager.js";

interface MemoryEntry {
  id: string;
  timestamp: number;
  type: "action" | "observation" | "thought" | "system";
  content: any;
  tags: string[];
  transactionId?: string;
  affectedFiles?: string[];
}

export class Hippocampus {
  private shortTermMemory: MemoryEntry[] = [];
  private readonly STM_LIMIT = 100;
  private memoryPath: string;
  private isReady: boolean = false;
  private vectorStore: VectorStore;

  constructor(
    private bus: EventBus,
    private workspaceRoot: string,
  ) {
    this.memoryPath = path.join(
      workspaceRoot,
      "data",
      "memory",
      "episodic.json",
    );
    this.vectorStore = new VectorStore(workspaceRoot);
  }

  async initialize() {
    console.log("[Hippocampus] Initializing Memory Systems...");

    await this.ensureStorage();
    await this.loadLongTermMemory(); // For now, just load recent history or ensure file exists
    await this.vectorStore.initialize();

    this.setupListeners();

    this.isReady = true;
    this.bus.publish("cortex", "system:component_ready", {
      component: "hippocampus",
    });
    console.log("[Hippocampus] Online - Recording enabled.");
  }

  private async ensureStorage() {
    const dir = path.dirname(this.memoryPath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (e) {
      // Ignore if exists
    }
  }

  private async loadLongTermMemory() {
    // In a real system, we wouldn't load everything.
    // For this phase, we'll just ensure we can read the file.
    try {
      await fs.access(this.memoryPath);
    } catch {
      await fs.writeFile(this.memoryPath, JSON.stringify([], null, 2));
    }
  }

  private setupListeners() {
    // Record Actions
    this.bus.on("motor:execute", (event) =>
      this.record("action", event.payload, ["motor", "exec"]),
    );
    this.bus.on("motor:file:write", (event) =>
      this.record("action", event.payload, ["motor", "fs", "write"]),
    );

    // Record Outcomes
    this.bus.on("motor:result", (event) =>
      this.record("observation", event.payload, ["motor", "result"]),
    );

    // Record Sensory Inputs
    this.bus.on("sensory:file:change", (event) => {
      const filePath = event.payload.path;
      if (
        filePath &&
        (filePath.includes("data/") ||
          filePath.includes("logs/") ||
          filePath.includes("temp/"))
      ) {
        return;
      }
      this.record("observation", event.payload, ["sensory", "fs"]);
    });

    // Explicit Memory Storage
    this.bus.on("memory:store", async (event: any) => {
      const { content, type, tags, metadata } = event.payload;
      await this.vectorStore.add(content, metadata);
      this.record(type || "thought", { content, metadata }, tags || []);
    });

    // Allow explicit memory storage
    this.bus.on("memory:store", (event) =>
      this.record("thought", event.payload, ["explicit"]),
    );

    // Query requests
    this.bus.on("memory:query", async (event) => {
      const results = this.query(event.payload);
      this.bus.publish("cortex", "memory:query:result", {
        requestId: event.payload.id,
        results,
      });
    });

    // Semantic Search
    this.bus.on("memory:semantic_search", async (event) => {
      const { query, k, requestId } = event.payload;
      const results = await this.vectorStore.search(query, k);
      this.bus.publish("cortex", "memory:semantic_search:result", {
        requestId,
        results,
      });
    });
  }

  private record(
    type: MemoryEntry["type"],
    content: any,
    tags: string[],
    transactionId?: string,
    affectedFiles?: string[],
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
      console.error(`[Hippocampus] Failed to persist memory: ${err.message}`),
    );

    // Add to Vector Store if applicable
    if (typeof content === "string" || (content && content.description)) {
      const text =
        typeof content === "string"
          ? content
          : content.description || JSON.stringify(content);
      this.vectorStore.add(text, { type, tags, id: entry.id });
    }
  }

  private async persist(entry: MemoryEntry) {
    // Simple append-only JSON log for now.
    // In production, this would be a database insert.
    try {
      // Read current (inefficient but safe for v1)
      const data = await fs.readFile(this.memoryPath, "utf-8");
      let history: MemoryEntry[] = [];
      try {
        history = JSON.parse(data);
      } catch {
        history = [];
      }

      history.push(entry);

      // Write back using SmartFS for safety
      await smartFS.writeSafe(
        this.memoryPath,
        JSON.stringify(history, null, 2),
      );
    } catch (err) {
      console.error("[Hippocampus] Persistence error", err);
    }
  }

  public query(criteria: {
    type?: string;
    tags?: string[];
    limit?: number;
  }): MemoryEntry[] {
    let results = [...this.shortTermMemory];

    if (criteria.type) {
      results = results.filter((m) => m.type === criteria.type);
    }

    if (criteria.tags) {
      results = results.filter((m) =>
        criteria.tags!.some((t) => m.tags.includes(t)),
      );
    }

    // Sort by newest first
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }
}
