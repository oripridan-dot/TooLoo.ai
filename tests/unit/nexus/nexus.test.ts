// @version 2.1.293
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createNexusApp } from '../../../src/nexus/index';

// Mock middleware function
const mockMiddleware = (req: any, res: any, next: any) => {
  if (req.path === '/test') {
    res.json({ ok: true });
  } else {
    next();
  }
};

vi.mock('../../../src/nexus/routes/api', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/system', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/providers', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/orchestrator', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/capabilities', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/github', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/projects', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/chat', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/design', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/visuals', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/workflows', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/observability', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/context', () => ({ default: mockMiddleware }));
vi.mock('../../../src/nexus/routes/training', () => ({ trainingRoutes: mockMiddleware }));

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
});
