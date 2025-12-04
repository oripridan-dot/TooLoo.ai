// @version 2.1.294
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createNexusApp } from '../../../src/nexus/index';

// Mock middleware function
const mocks = vi.hoisted(() => {
  return {
    middleware: (req: any, res: any, next: any) => {
      if (req.path === '/test') {
        res.json({ ok: true });
      } else {
        next();
      }
    }
  };
});

vi.mock('../../../src/nexus/routes/api', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/system', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/providers', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/orchestrator', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/capabilities', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/github', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/projects', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/chat', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/design', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/visuals', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/workflows', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/observability', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/context', () => ({ default: mocks.middleware }));
vi.mock('../../../src/nexus/routes/training', () => ({ trainingRoutes: mocks.middleware }));

// Mock other dependencies
vi.mock('../../../src/nexus/socket', () => ({ SocketServer: vi.fn() }));
vi.mock('../../../src/nexus/auto-architect', () => ({ autoArchitect: {} }));
vi.mock('../../../src/nexus/interface', () => ({ NexusInterface: vi.fn() }));
vi.mock('../../../src/core/module-registry', () => ({ 
  registry: { 
    register: vi.fn(),
    on: vi.fn(),
    updateStatus: vi.fn()
  } 
}));

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
