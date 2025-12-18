/**
 * @file Knowledge routes
 * @version 1.0.0
 * @skill-os true
 */

import { Router } from 'express';
import { z } from 'zod';
import { asBrand } from '@tooloo/types';
import type { KnowledgeDocument, KnowledgeId, KnowledgeProvider } from '@tooloo/types';
import {
  KnowledgeProviderInMemory,
  KnowledgeQuerySchema,
  KnowledgeDocumentSchema,
} from '@tooloo/knowledge';

const router: import('express').Router = Router();
const provider: KnowledgeProvider = KnowledgeProviderInMemory();

const SearchRequestSchema = z.object({ body: KnowledgeQuerySchema });
const IngestRequestSchema = z.object({ body: KnowledgeDocumentSchema.partial({ createdAt: true }) });

router.post('/knowledge/ingest', async (req, res) => {
  const parse = IngestRequestSchema.safeParse({ body: req.body });
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid request', issues: parse.error.issues });
  }

  const doc: KnowledgeDocument = {
    ...(parse.data.body as Omit<KnowledgeDocument, 'id' | 'createdAt'> & { id: string; createdAt?: number }),
    id: asBrand<string, 'KnowledgeId'>(parse.data.body.id),
    createdAt: parse.data.body.createdAt ?? Date.now(),
  };
  await provider.ingest(doc);
  res.status(201).json({ ok: true });
});

router.post('/knowledge/search', async (req, res) => {
  const parse = SearchRequestSchema.safeParse({ body: req.body });
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid request', issues: parse.error.issues });
  }

  const hits = await provider.search(parse.data.body);
  res.json({ hits });
});

router.get('/knowledge/cite/:id', async (req, res) => {
  const id = asBrand<string, 'KnowledgeId'>(req.params.id) as KnowledgeId;
  const needle = typeof req.query.needle === 'string' ? req.query.needle : undefined;
  const cite = await provider.cite(id, needle);
  if (!cite) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ cite });
});

export default router;
