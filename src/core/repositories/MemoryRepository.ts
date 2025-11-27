import { db } from "../data/Database.js";

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: "action" | "observation" | "thought" | "system";
  content: any;
  tags: string[];
  transactionId?: string;
  affectedFiles?: string[];
}

export class MemoryRepository {
  private insertStmt;
  private getRecentStmt;
  private pruneStmt;
  private countStmt;

  constructor() {
    this.insertStmt = db.prepare(`
      INSERT INTO memories (id, content, type, timestamp, tags, metadata)
      VALUES (@id, @content, @type, @timestamp, @tags, @metadata)
    `);

    this.getRecentStmt = db.prepare(`
      SELECT * FROM memories ORDER BY timestamp DESC LIMIT @limit
    `);

    this.countStmt = db.prepare("SELECT COUNT(*) as count FROM memories");

    // Keep top N, delete rest
    this.pruneStmt = db.prepare(`
      DELETE FROM memories WHERE id NOT IN (
        SELECT id FROM memories ORDER BY timestamp DESC LIMIT @limit
      )
    `);
  }

  save(entry: MemoryEntry) {
    const metadata = {
      transactionId: entry.transactionId,
      affectedFiles: entry.affectedFiles,
    };

    this.insertStmt.run({
      id: entry.id,
      content: JSON.stringify(entry.content), // Store content as JSON string
      type: entry.type,
      timestamp: entry.timestamp,
      tags: JSON.stringify(entry.tags),
      metadata: JSON.stringify(metadata),
    });
  }

  getRecent(limit: number = 100): MemoryEntry[] {
    const rows = this.getRecentStmt.all({ limit });
    return rows.map((row: any) => {
      const metadata = JSON.parse(row.metadata || "{}");
      return {
        id: row.id,
        timestamp: row.timestamp,
        type: row.type as any,
        content: JSON.parse(row.content),
        tags: JSON.parse(row.tags || "[]"),
        transactionId: metadata.transactionId,
        affectedFiles: metadata.affectedFiles,
      };
    });
  }

  count(): number {
    return (this.countStmt.get() as any).count;
  }

  prune(keep: number) {
    const info = this.pruneStmt.run({ limit: keep });
    return info.changes;
  }
}

export const memoryRepository = new MemoryRepository();
