/**
 * @file Zod schemas for Knowledge
 * @version 1.0.0
 */

import { z } from 'zod';

export const KnowledgeDocumentSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  createdAt: z.number(),
});

export const KnowledgeQuerySchema = z.object({
  text: z.string().min(1),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().optional(),
  minConfidence: z.number().min(0).max(1).optional(),
});
