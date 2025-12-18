/**
 * @file In-memory knowledge provider
 * @version 1.0.0
 */

import type { KnowledgeCite, KnowledgeDocument, KnowledgeHit, KnowledgeId, KnowledgeProvider, KnowledgeQuery } from '@tooloo/types';

function normalize(text: string): string {
  return text.toLowerCase();
}

function scoreDoc(doc: KnowledgeDocument, queryText: string): number {
  const hay = normalize(`${doc.title}\n${doc.content}`);
  const needle = normalize(queryText);
  if (!needle) return 0;
  if (!hay.includes(needle)) return 0.5;
  // Simple scoring: more matches => higher score
  const parts = needle.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const p of parts) {
    if (hay.includes(p)) score += 1;
  }
  return Math.max(0.5, score);
}

function makeSnippet(content: string, needle?: string): { snippet: string; start: number; end: number } {
  const maxLen = 160;
  if (!needle) {
    const snippet = content.slice(0, maxLen);
    return { snippet, start: 0, end: snippet.length };
  }

  const idx = normalize(content).indexOf(normalize(needle));
  if (idx < 0) {
    const snippet = content.slice(0, maxLen);
    return { snippet, start: 0, end: snippet.length };
  }

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + needle.length + 40);
  const snippet = content.slice(start, end);
  return { snippet, start, end };
}

export function KnowledgeProviderInMemory(): KnowledgeProvider {
  const docs = new Map<string, KnowledgeDocument>();

  async function ingest(doc: KnowledgeDocument): Promise<void> {
    docs.set(String(doc.id), doc);
  }

  async function search(query: KnowledgeQuery): Promise<KnowledgeHit[]> {
    const hits: KnowledgeHit[] = [];
    for (const doc of docs.values()) {
      if (query.tags?.length) {
        const tags = doc.tags ?? [];
        const hasAll = query.tags.every((t) => tags.includes(t));
        if (!hasAll) continue;
      }

      const score = scoreDoc(doc, query.text);
      if (score <= 0) continue;
      hits.push({ doc, score });
    }

    hits.sort((a, b) => b.score - a.score);
    const limit = query.limit ?? 10;
    return hits.slice(0, limit);
  }

  async function cite(id: KnowledgeId, needle?: string): Promise<KnowledgeCite | null> {
    const doc = docs.get(String(id));
    if (!doc) return null;

    const { snippet, start, end } = makeSnippet(doc.content, needle);
    return { docId: doc.id, snippet, start, end };
  }

  return { ingest, search, cite };
}
