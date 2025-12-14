// @version 3.3.573
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import githubRoutes from '../../../../src/nexus/routes/github';
import * as child_process from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn()
}));

// Mock fs-extra
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
    ensureDir: vi.fn(),
    writeFile: vi.fn()
  }
}));

describe('GitHub Routes', () => {
  let app: express.Express;
  const mockExec = child_process.exec as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/github', githubRoutes);
    vi.clearAllMocks();
  });

  it('should check health', async () => {
    // Mock successful gh auth status
    mockExec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') callback = options;
      if (cmd.includes('gh --version')) {
        callback(null, { stdout: 'gh version 2.0.0', stderr: '' });
      } else if (cmd.includes('gh auth status')) {
        callback(null, { stdout: 'Logged in to github.com', stderr: '' });
      } else {
        callback(new Error('Unknown command'));
      }
    });

    const response = await request(app).get('/api/v1/github/health');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.status).toBe('connected');
  });

  it('should handle health check failure', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') callback = options;
      callback(new Error('Not logged in'));
    });

    const response = await request(app).get('/api/v1/github/health');
    expect(response.status).toBe(500);
    expect(response.body.ok).toBe(false);
    expect(response.body.status).toBe('disconnected');
  });

  it('should get repo info', async () => {
    const mockInfo = { name: 'test-repo', owner: { login: 'test-user' } };
    mockExec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') callback = options;
      callback(null, { stdout: JSON.stringify(mockInfo), stderr: '' });
    });

    const response = await request(app).get('/api/v1/github/info');
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.info).toEqual(mockInfo);
  });
});
