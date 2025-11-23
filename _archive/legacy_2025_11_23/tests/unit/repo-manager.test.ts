import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockApp = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  all: vi.fn(),
  use: vi.fn(),
  listen: vi.fn()
};

vi.mock('express', () => {
  const mockExpress: any = vi.fn(() => mockApp);
  mockExpress.json = vi.fn(() => (_req: any, _res: any, next: any) => next());
  mockExpress.urlencoded = vi.fn(() => (_req: any, _res: any, next: any) => next());
  mockExpress.static = vi.fn(() => (_req: any, _res: any, next: any) => next());
  return { default: mockExpress };
});

const mockServiceFoundation = {
  app: mockApp,
  setupMiddleware: vi.fn(),
  registerHealthEndpoint: vi.fn(),
  registerStatusEndpoint: vi.fn(),
  start: vi.fn()
};

vi.mock('../src/lib/service-foundation.js', () => ({
  ServiceFoundation: vi.fn(() => mockServiceFoundation)
}));

vi.mock('../src/engine/github-provider.js', () => ({
  default: {
    listBranches: vi.fn().mockResolvedValue([
      { name: 'main', commit: { sha: '123' } },
      { name: 'feature/old', commit: { sha: '456' } }
    ]),
    listPullRequests: vi.fn().mockResolvedValue([
      { number: 1, title: 'feat: new thing' },
      { number: 2, title: 'fix: bug' }
    ]),
    deleteBranches: vi.fn(),
    addLabels: vi.fn()
  }
}));

describe('Repo Manager Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should initialize the service', async () => {
    await import('../../src/servers/repo-manager.ts');
    
    // Check if app was initialized and started
    expect(mockApp.use).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalled();
  });

  it('should register cleanup endpoints', async () => {
    await import('../../src/servers/repo-manager.ts');
    
    expect(mockApp.post).toHaveBeenCalledWith('/api/v1/repo/cleanup-branches', expect.any(Function));
    expect(mockApp.post).toHaveBeenCalledWith('/api/v1/repo/triage-prs', expect.any(Function));
  });
});
