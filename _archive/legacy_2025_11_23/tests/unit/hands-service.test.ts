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
  port: 3006,
  setupMiddleware: vi.fn(),
  registerHealthEndpoint: vi.fn(),
  registerStatusEndpoint: vi.fn(),
  start: vi.fn()
};

vi.mock('../src/lib/service-foundation.js', () => ({
  ServiceFoundation: vi.fn(() => mockServiceFoundation)
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{}'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    copyFile: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('../src/engine/environment-hub.js', () => ({
  default: {
    registerComponent: vi.fn()
  }
}));

// Mock other dependencies to avoid side effects
vi.mock('../src/engine/product-analysis-engine.js', () => ({ default: class {} }));
vi.mock('../src/lib/adapters/figma-adapter.js', () => ({ FigmaAdapter: class {} }));
vi.mock('../src/lib/design-system-analytics.js', () => ({ default: class {} }));
vi.mock('../src/lib/design-auto-remediation.js', () => ({ default: class {} }));
vi.mock('../src/lib/design-industry-registry.js', () => ({ IndustryRegistry: class {} }));
vi.mock('../src/lib/design-ml-clustering.js', () => ({ default: class {} }));
vi.mock('../src/lib/design-governance.js', () => ({ default: class {} }));

describe('Product Development Server (Hands)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to ensure fresh execution
    vi.resetModules();
  });

  it('should initialize and start the server', async () => {
    const { ProductDevelopmentServer } = await import('../../src/servers/product-development-server.ts');
    
    // Since ServiceFoundation mock might be bypassed in some environments,
    // we check if the app was initialized and started via express mock
    expect(mockApp.use).toHaveBeenCalled();
    expect(mockApp.listen).toHaveBeenCalled();
  });

  it('should register workflow routes', async () => {
    await import('../../src/servers/product-development-server.ts');
    
    expect(mockApp.post).toHaveBeenCalledWith('/api/v1/workflows/start', expect.any(Function));
    expect(mockApp.post).toHaveBeenCalledWith('/api/v1/workflows/execute-step', expect.any(Function));
  });

  it('should register artifact routes', async () => {
    await import('../../src/servers/product-development-server.ts');
    
    expect(mockApp.get).toHaveBeenCalledWith('/api/v1/artifacts/templates', expect.any(Function));
    expect(mockApp.post).toHaveBeenCalledWith('/api/v1/artifacts/generate', expect.any(Function));
  });
});
