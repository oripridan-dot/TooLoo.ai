/**
 * @file Knowledge domain types
 * @version 1.0.0
 */

import type { Brand } from './brand.js';

export type KnowledgeId = Brand<string, 'KnowledgeId'>;

export type KnowledgeSource = 'docs' | 'user' | 'import' | (string & {});

export interface KnowledgeDocument {
  id: KnowledgeId;
  title: string;
  content: string;
  tags?: string[];
  source?: KnowledgeSource;
  createdAt: number;
}

export interface KnowledgeQuery {
  text: string;
  tags?: string[];
  limit?: number;
  minConfidence?: number;
}

export interface KnowledgeHit {
  doc: KnowledgeDocument;
  score: number;
}

export interface KnowledgeCite {
  docId: KnowledgeId;
  snippet: string;
  start: number;
  end: number;
}

export interface KnowledgeProvider {
  ingest(doc: KnowledgeDocument): Promise<void>;
  search(query: KnowledgeQuery): Promise<KnowledgeHit[]>;
  cite(id: KnowledgeId, needle?: string): Promise<KnowledgeCite | null>;
}
