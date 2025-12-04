import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export class ToolooDB {
  private static instance: ToolooDB;
  public db: Database.Database;

  private constructor() {
    const dbPath = path.join(process.cwd(), "data", "tooloo.db");
    const dataDir = path.dirname(dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log(`[ToolooDB] Opening database at ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL"); // Better concurrency
    this.initializeSchema();
  }

  public static getInstance(): ToolooDB {
    if (!ToolooDB.instance) {
      ToolooDB.instance = new ToolooDB();
    }
    return ToolooDB.instance;
  }

  private initializeSchema() {
    // Memories Table (Episodic)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        tags TEXT, -- JSON array
        embedding BLOB, -- For future use or reference
        metadata TEXT -- JSON object
      );
      CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
      CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp);
    `);

    // Metrics Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        tags TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_metrics_name ON metrics(name);
    `);

    console.log("[ToolooDB] Schema initialized.");
  }
}

export const db = ToolooDB.getInstance().db;
