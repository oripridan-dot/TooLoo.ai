import fs from "fs-extra";
import * as path from "path";

export interface ArenaEvent {
  id: string;
  eventType: string;
  query?: string;
  providers: string[];
  source: string;
  metadata?: any;
  timestamp: string;
}

export class ArenaStore {
  private filePath: string;
  private events: ArenaEvent[] = [];
  private isInitialized: boolean = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(private rootDir: string) {
    this.filePath = path.join(rootDir, "data/training/arena-events.json");
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await fs.ensureDir(path.dirname(this.filePath));
      if (await fs.pathExists(this.filePath)) {
        const content = await fs.readFile(this.filePath, "utf-8");
        if (content.trim()) {
          this.events = JSON.parse(content);
        }
      } else {
        // Create empty file if it doesn't exist
        await this.save();
      }
    } catch (error) {
      console.warn(
        "[ArenaStore] Could not load existing events, starting fresh.",
        error,
      );
      this.events = [];
    }

    this.isInitialized = true;
    console.log(`[ArenaStore] Initialized with ${this.events.length} events.`);
  }

  async addEvent(event: ArenaEvent) {
    if (!this.isInitialized) await this.initialize();

    this.events.unshift(event); // Add to beginning (newest first)

    // Keep size manageable (e.g., last 1000 events)
    if (this.events.length > 1000) {
      this.events = this.events.slice(0, 1000);
    }

    this.scheduleSave();
  }

  async getEvents(limit: number = 50, source?: string): Promise<ArenaEvent[]> {
    if (!this.isInitialized) await this.initialize();

    let filtered = this.events;
    if (source) {
      filtered = filtered.filter((e) => e.source === source);
    }

    return filtered.slice(0, limit);
  }

  async getHistory(): Promise<ArenaEvent[]> {
    if (!this.isInitialized) await this.initialize();
    // Filter for query events only
    return this.events.filter((e) => e.eventType === "query");
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.save();
    }, 1000); // Debounce for 1 second
  }

  private async save() {
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.events, null, 2));
    } catch (err) {
      console.error(`[ArenaStore] Save failed: ${err}`);
    }
  }
}

// Singleton instance
export const arenaStore = new ArenaStore(process.cwd());
