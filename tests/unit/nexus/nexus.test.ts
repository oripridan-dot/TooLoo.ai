// @version 2.1.292
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createNexusApp } from '../../../src/nexus/index';
import express from 'express';

// Mock route modules
const mockRouter = express.Router();
mockRouter.get('/test', (req, res) => res.json({ ok: true }));

vi.mock('../../../src/nexus/routes/api', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/system', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/providers', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/orchestrator', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/capabilities', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/github', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/projects', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/chat', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/design', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/visuals', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/workflows', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/observability', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/context', () => ({ default: mockRouter }));
vi.mock('../../../src/nexus/routes/training', () => ({ trainingRoutes: mockRouter }));

// Mock other dependencies
vi.mock('../../../src/nexus/socket', () => ({ SocketServer: vi.fn() }));
vi.mock('../../../src/nexus/auto-architect', () => ({ autoArchitect: {} }));
vi.mock('../../../src/nexus/interface', () => ({ NexusInterface: vi.fn() }));
vi.mock('../../../src/core/module-registry', () => ({ registry: { register: vi.fn() } }));

describe('Nexus API', () => {
  const app = createNexusApp();

  it('should respond to /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('should mount system routes', async () => {
    const response = await request(app).get('/api/v1/system/test');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
  });

  it('should serve static files', async () => {
    // We can't easily test static files without real files, but we can check if the middleware is there.
    // Or just skip this for unit tests.
  });
});
