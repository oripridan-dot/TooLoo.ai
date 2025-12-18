import { describe, expect, it } from 'vitest';
import request from 'supertest';
import type { KnowledgeId } from '@tooloo/types';
import { createApp } from '../src/app.js';

const app = createApp();

const doc = {
  id: 'api-doc-1' as KnowledgeId,
  title: 'API validation flow',
  content: 'validate then simulate then execute',
  tags: ['api', 'validation'],
  source: 'docs' as const,
  createdAt: Date.now(),
};

describe('knowledge routes', () => {
  it('ingests, searches, and cites documents', async () => {
    const ingest = await request(app).post('/api/v2/knowledge/ingest').send(doc);
    expect(ingest.status).toBe(201);

    const search = await request(app)
      .post('/api/v2/knowledge/search')
      .send({ text: 'simulate execute', tags: ['validation'] });
    expect(search.status).toBe(200);
    expect(search.body.hits?.length).toBeGreaterThan(0);
    expect(search.body.hits[0].doc.id).toBe(doc.id);

    const cite = await request(app).get(`/api/v2/knowledge/cite/${doc.id}`);
    expect(cite.status).toBe(200);
    expect(cite.body.cite.snippet).toContain('simulate');
  });
});
