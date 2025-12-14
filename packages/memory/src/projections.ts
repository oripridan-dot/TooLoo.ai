// @version 3.3.577
/**
 * Event Projection System
 * Sync SQLite events to Vector Store/Neo4j asynchronously
 * 
 * @version 2.0.0-alpha.0
 */

import { z } from 'zod';

// ============================================================================
// Event Types
// ============================================================================

export const StoredEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  aggregateId: z.string(),
  aggregateType: z.string(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.object({
    sessionId: z.string().optional(),
    userId: z.string().optional(),
    correlationId: z.string().optional(),
    causationId: z.string().optional(),
    timestamp: z.number(),
    version: z.number(),
  }),
  timestamp: z.number(),
  sequence: z.number(),
});

export type StoredEvent = z.infer<typeof StoredEventSchema>;

// ============================================================================
// Projection Interface
// ============================================================================

/**
 * Projection State - tracks processing position
 */
export interface ProjectionState {
  name: string;
  lastSequence: number;
  lastProcessedAt: number;
  status: 'running' | 'paused' | 'error' | 'rebuilding';
  error?: string;
}

/**
 * Event Projection interface
 * Transforms events from SQLite into read models (Vector/Neo4j)
 */
export interface EventProjection<TReadModel = unknown> {
  /** Unique projection name */
  readonly name: string;
  
  /** Event types this projection handles */
  readonly handledEvents: readonly string[];
  
  /** Process a single event */
  apply(event: StoredEvent): Promise<void>;
  
  /** Process multiple events in batch */
  applyBatch(events: StoredEvent[]): Promise<void>;
  
  /** Get current state */
  getState(): Promise<ProjectionState>;
  
  /** Rebuild projection from scratch */
  rebuild(fromSequence?: number): Promise<void>;
  
  /** Pause processing */
  pause(): Promise<void>;
  
  /** Resume processing */
  resume(): Promise<void>;
  
  /** Query the read model */
  query(query: unknown): Promise<TReadModel[]>;
}

// ============================================================================
// Vector Store Projection
// ============================================================================

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  namespace?: string;
}

export interface VectorStoreConfig {
  provider: 'pinecone' | 'qdrant' | 'weaviate' | 'local';
  apiKey?: string;
  endpoint?: string;
  indexName: string;
  dimensions: number;
  namespace?: string;
}

export interface VectorStoreClient {
  upsert(documents: VectorDocument[]): Promise<void>;
  delete(ids: string[]): Promise<void>;
  search(embedding: number[], options: {
    topK: number;
    filter?: Record<string, unknown>;
    namespace?: string;
  }): Promise<Array<{ id: string; score: number; metadata: Record<string, unknown> }>>;
  deleteNamespace(namespace: string): Promise<void>;
}

/**
 * Vector Store Projection
 * Syncs events to vector database for semantic search
 */
export abstract class VectorProjection implements EventProjection<VectorDocument> {
  abstract readonly name: string;
  abstract readonly handledEvents: readonly string[];
  
  protected state!: ProjectionState;
  protected client: VectorStoreClient;
  protected embeddingFn: (text: string) => Promise<number[]>;
  
  constructor(client: VectorStoreClient, embeddingFn: (text: string) => Promise<number[]>) {
    this.client = client;
    this.embeddingFn = embeddingFn;
  }
  
  /** Initialize state - must be called after construction */
  protected initState(): void {
    this.state = {
      name: this.name,
      lastSequence: 0,
      lastProcessedAt: 0,
      status: 'paused',
    };
  }
  
  /** Override to extract text content from event */
  protected abstract extractContent(event: StoredEvent): string | null;
  
  /** Override to build metadata from event */
  protected abstract buildMetadata(event: StoredEvent): Record<string, unknown>;
  
  async apply(event: StoredEvent): Promise<void> {
    if (!this.handledEvents.includes(event.type)) return;
    
    const content = this.extractContent(event);
    if (!content) return;
    
    const embedding = await this.embeddingFn(content);
    const metadata = this.buildMetadata(event);
    
    await this.client.upsert([{
      id: event.id,
      content,
      embedding,
      metadata,
    }]);
    
    this.state.lastSequence = event.sequence;
    this.state.lastProcessedAt = Date.now();
  }
  
  async applyBatch(events: StoredEvent[]): Promise<void> {
    const relevantEvents = events.filter(e => this.handledEvents.includes(e.type));
    if (relevantEvents.length === 0) return;
    
    const documents: VectorDocument[] = [];
    
    for (const event of relevantEvents) {
      const content = this.extractContent(event);
      if (!content) continue;
      
      const embedding = await this.embeddingFn(content);
      const metadata = this.buildMetadata(event);
      
      documents.push({ id: event.id, content, embedding, metadata });
    }
    
    if (documents.length > 0) {
      await this.client.upsert(documents);
    }
    
    const maxSequence = Math.max(...relevantEvents.map(e => e.sequence));
    this.state.lastSequence = maxSequence;
    this.state.lastProcessedAt = Date.now();
  }
  
  async getState(): Promise<ProjectionState> {
    return { ...this.state };
  }
  
  async rebuild(fromSequence = 0): Promise<void> {
    this.state.status = 'rebuilding';
    this.state.lastSequence = fromSequence;
    // Implementation would delete existing vectors and replay events
  }
  
  async pause(): Promise<void> {
    this.state.status = 'paused';
  }
  
  async resume(): Promise<void> {
    this.state.status = 'running';
  }
  
  async query(_query: unknown): Promise<VectorDocument[]> {
    // Implementation depends on specific use case
    return [];
  }
}

// ============================================================================
// Knowledge Graph Projection
// ============================================================================

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, unknown>;
}

export interface GraphStoreConfig {
  provider: 'neo4j' | 'memgraph' | 'local';
  uri?: string;
  username?: string;
  password?: string;
  database?: string;
}

export interface GraphStoreClient {
  createNode(node: Omit<GraphNode, 'id'>): Promise<GraphNode>;
  updateNode(id: string, properties: Record<string, unknown>): Promise<void>;
  deleteNode(id: string): Promise<void>;
  createRelationship(rel: Omit<GraphRelationship, 'id'>): Promise<GraphRelationship>;
  deleteRelationship(id: string): Promise<void>;
  query(cypher: string, params?: Record<string, unknown>): Promise<unknown[]>;
  clear(): Promise<void>;
}

/**
 * Knowledge Graph Projection
 * Syncs events to graph database for entity relationships
 */
export abstract class GraphProjection implements EventProjection<GraphNode> {
  abstract readonly name: string;
  abstract readonly handledEvents: readonly string[];
  
  protected state!: ProjectionState;
  protected client: GraphStoreClient;
  protected entityExtractor: (text: string) => Promise<Array<{
    name: string;
    type: string;
    properties?: Record<string, unknown>;
  }>>;
  
  constructor(
    client: GraphStoreClient,
    entityExtractor: (text: string) => Promise<Array<{ name: string; type: string; properties?: Record<string, unknown> }>>
  ) {
    this.client = client;
    this.entityExtractor = entityExtractor;
  }
  
  /** Initialize state - must be called after construction */
  protected initState(): void {
    this.state = {
      name: this.name,
      lastSequence: 0,
      lastProcessedAt: 0,
      status: 'paused',
    };
  }
  
  /** Override to extract text for entity extraction */
  protected abstract extractContent(event: StoredEvent): string | null;
  
  /** Override to determine relationship type */
  protected abstract getRelationshipType(event: StoredEvent): string;
  
  async apply(event: StoredEvent): Promise<void> {
    if (!this.handledEvents.includes(event.type)) return;
    
    const content = this.extractContent(event);
    if (!content) return;
    
    const entities = await this.entityExtractor(content);
    const relationshipType = this.getRelationshipType(event);
    
    // Create nodes for each entity
    const nodeIds: string[] = [];
    for (const entity of entities) {
      const node = await this.client.createNode({
        labels: [entity.type],
        properties: {
          name: entity.name,
          ...entity.properties,
          sourceEvent: event.id,
          timestamp: event.timestamp,
        },
      });
      nodeIds.push(node.id);
    }
    
    // Create relationships between sequential entities
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const startNodeId = nodeIds[i];
      const endNodeId = nodeIds[i + 1];
      if (startNodeId && endNodeId) {
        await this.client.createRelationship({
          type: relationshipType,
          startNodeId,
          endNodeId,
          properties: { sourceEvent: event.id },
        });
      }
    }
    
    this.state.lastSequence = event.sequence;
    this.state.lastProcessedAt = Date.now();
  }
  
  async applyBatch(events: StoredEvent[]): Promise<void> {
    for (const event of events) {
      await this.apply(event);
    }
  }
  
  async getState(): Promise<ProjectionState> {
    return { ...this.state };
  }
  
  async rebuild(fromSequence = 0): Promise<void> {
    this.state.status = 'rebuilding';
    await this.client.clear();
    this.state.lastSequence = fromSequence;
  }
  
  async pause(): Promise<void> {
    this.state.status = 'paused';
  }
  
  async resume(): Promise<void> {
    this.state.status = 'running';
  }
  
  async query(_query: unknown): Promise<GraphNode[]> {
    // Implementation depends on specific cypher query
    return [];
  }
}

// ============================================================================
// Projection Manager
// ============================================================================

export interface ProjectionManagerConfig {
  /** Batch size for processing events */
  batchSize: number;
  /** Interval between processing batches (ms) */
  pollIntervalMs: number;
  /** Max retries on error */
  maxRetries: number;
  /** Backoff multiplier for retries */
  backoffMultiplier: number;
}

/**
 * Manages multiple projections
 * Coordinates event replay and error handling
 */
export interface ProjectionManager {
  /** Register a projection */
  register(projection: EventProjection): void;
  
  /** Start all projections */
  start(): Promise<void>;
  
  /** Stop all projections */
  stop(): Promise<void>;
  
  /** Get projection by name */
  getProjection(name: string): EventProjection | undefined;
  
  /** Get all projection states */
  getStates(): Promise<ProjectionState[]>;
  
  /** Rebuild a specific projection */
  rebuild(name: string): Promise<void>;
  
  /** Rebuild all projections */
  rebuildAll(): Promise<void>;
  
  /** Handle new event (called by event store) */
  onEvent(event: StoredEvent): Promise<void>;
}

export const defaultProjectionConfig: ProjectionManagerConfig = {
  batchSize: 100,
  pollIntervalMs: 1000,
  maxRetries: 3,
  backoffMultiplier: 2,
};
