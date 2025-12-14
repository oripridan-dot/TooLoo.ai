// @version 3.3.577
/**
 * SQLite Event Store Implementation
 * Source of Truth for all system events
 * 
 * @version 2.0.0-alpha.0
 */

import type { StoredEvent, ProjectionManager } from './projections.js';

// ============================================================================
// Event Store Interface
// ============================================================================

export interface AppendOptions {
  expectedVersion?: number;
  correlationId?: string;
  causationId?: string;
}

export interface ReadOptions {
  fromSequence?: number;
  toSequence?: number;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface StreamReadOptions extends ReadOptions {
  aggregateType: string;
  aggregateId: string;
}

/**
 * Event Store interface
 * Append-only log of domain events
 */
export interface EventStore {
  /** Append events to a stream */
  append(
    aggregateType: string,
    aggregateId: string,
    events: Array<{ type: string; payload: Record<string, unknown> }>,
    options?: AppendOptions
  ): Promise<StoredEvent[]>;
  
  /** Read events from a specific aggregate stream */
  readStream(options: StreamReadOptions): Promise<StoredEvent[]>;
  
  /** Read all events (for projections) */
  readAll(options?: ReadOptions): Promise<StoredEvent[]>;
  
  /** Subscribe to new events */
  subscribe(handler: (event: StoredEvent) => Promise<void>): () => void;
  
  /** Get current global sequence number */
  getGlobalSequence(): Promise<number>;
  
  /** Get stream version for optimistic concurrency */
  getStreamVersion(aggregateType: string, aggregateId: string): Promise<number>;
}

// ============================================================================
// SQLite Event Store
// ============================================================================

interface SQLiteDB {
  prepare(sql: string): {
    run(...params: unknown[]): { lastInsertRowid: number; changes: number };
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  };
  exec(sql: string): void;
  transaction<T>(fn: () => T): () => T;
}

export class SQLiteEventStore implements EventStore {
  private db: SQLiteDB;
  private projectionManager?: ProjectionManager;
  private subscribers: Set<(event: StoredEvent) => Promise<void>> = new Set();
  
  constructor(db: SQLiteDB, projectionManager?: ProjectionManager) {
    this.db = db;
    this.projectionManager = projectionManager;
    this.initSchema();
  }
  
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        metadata TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        version INTEGER NOT NULL,
        
        UNIQUE(aggregate_type, aggregate_id, version)
      );
      
      CREATE INDEX IF NOT EXISTS idx_events_aggregate 
        ON events(aggregate_type, aggregate_id);
      CREATE INDEX IF NOT EXISTS idx_events_type 
        ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp 
        ON events(timestamp);
    `);
  }
  
  async append(
    aggregateType: string,
    aggregateId: string,
    events: Array<{ type: string; payload: Record<string, unknown> }>,
    options: AppendOptions = {}
  ): Promise<StoredEvent[]> {
    const currentVersion = await this.getStreamVersion(aggregateType, aggregateId);
    
    if (options.expectedVersion !== undefined && options.expectedVersion !== currentVersion) {
      throw new ConcurrencyError(
        `Expected version ${options.expectedVersion} but found ${currentVersion}`
      );
    }
    
    const storedEvents: StoredEvent[] = [];
    const timestamp = Date.now();
    
    const insertStmt = this.db.prepare(`
      INSERT INTO events (id, type, aggregate_type, aggregate_id, payload, metadata, timestamp, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    this.db.transaction(() => {
      let version = currentVersion;
      
      for (const event of events) {
        version++;
        const id = crypto.randomUUID();
        const metadata = {
          sessionId: undefined,
          userId: undefined,
          correlationId: options.correlationId,
          causationId: options.causationId,
          timestamp,
          version,
        };
        
        const result = insertStmt.run(
          id,
          event.type,
          aggregateType,
          aggregateId,
          JSON.stringify(event.payload),
          JSON.stringify(metadata),
          timestamp,
          version
        );
        
        const storedEvent: StoredEvent = {
          id,
          type: event.type,
          aggregateType,
          aggregateId,
          payload: event.payload,
          metadata,
          timestamp,
          sequence: Number(result.lastInsertRowid),
        };
        
        storedEvents.push(storedEvent);
      }
    })();
    
    // Notify subscribers and projections
    for (const event of storedEvents) {
      await this.notifySubscribers(event);
    }
    
    return storedEvents;
  }
  
  async readStream(options: StreamReadOptions): Promise<StoredEvent[]> {
    const { aggregateType, aggregateId, fromSequence = 0, limit = 1000, direction = 'forward' } = options;
    
    const stmt = this.db.prepare(`
      SELECT sequence, id, type, aggregate_type, aggregate_id, payload, metadata, timestamp
      FROM events
      WHERE aggregate_type = ? AND aggregate_id = ? AND sequence >= ?
      ORDER BY sequence ${direction === 'forward' ? 'ASC' : 'DESC'}
      LIMIT ?
    `);
    
    const rows = stmt.all(aggregateType, aggregateId, fromSequence, limit) as Array<{
      sequence: number;
      id: string;
      type: string;
      aggregate_type: string;
      aggregate_id: string;
      payload: string;
      metadata: string;
      timestamp: number;
    }>;
    
    return rows.map(row => ({
      sequence: row.sequence,
      id: row.id,
      type: row.type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      metadata: JSON.parse(row.metadata) as StoredEvent['metadata'],
      timestamp: row.timestamp,
    }));
  }
  
  async readAll(options: ReadOptions = {}): Promise<StoredEvent[]> {
    const { fromSequence = 0, toSequence, limit = 1000, direction = 'forward' } = options;
    
    let sql = `
      SELECT sequence, id, type, aggregate_type, aggregate_id, payload, metadata, timestamp
      FROM events
      WHERE sequence >= ?
    `;
    const params: unknown[] = [fromSequence];
    
    if (toSequence !== undefined) {
      sql += ` AND sequence <= ?`;
      params.push(toSequence);
    }
    
    sql += ` ORDER BY sequence ${direction === 'forward' ? 'ASC' : 'DESC'} LIMIT ?`;
    params.push(limit);
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as Array<{
      sequence: number;
      id: string;
      type: string;
      aggregate_type: string;
      aggregate_id: string;
      payload: string;
      metadata: string;
      timestamp: number;
    }>;
    
    return rows.map(row => ({
      sequence: row.sequence,
      id: row.id,
      type: row.type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      payload: JSON.parse(row.payload) as Record<string, unknown>,
      metadata: JSON.parse(row.metadata) as StoredEvent['metadata'],
      timestamp: row.timestamp,
    }));
  }
  
  subscribe(handler: (event: StoredEvent) => Promise<void>): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }
  
  async getGlobalSequence(): Promise<number> {
    const stmt = this.db.prepare('SELECT MAX(sequence) as maxSeq FROM events');
    const row = stmt.get() as { maxSeq: number | null };
    return row?.maxSeq ?? 0;
  }
  
  async getStreamVersion(aggregateType: string, aggregateId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT MAX(version) as maxVersion 
      FROM events 
      WHERE aggregate_type = ? AND aggregate_id = ?
    `);
    const row = stmt.get(aggregateType, aggregateId) as { maxVersion: number | null };
    return row?.maxVersion ?? 0;
  }
  
  private async notifySubscribers(event: StoredEvent): Promise<void> {
    // Notify projection manager first
    if (this.projectionManager) {
      await this.projectionManager.onEvent(event);
    }
    
    // Then notify other subscribers
    for (const handler of this.subscribers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event subscriber error:', error);
      }
    }
  }
}

// ============================================================================
// Errors
// ============================================================================

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

export class EventStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventStoreError';
  }
}
