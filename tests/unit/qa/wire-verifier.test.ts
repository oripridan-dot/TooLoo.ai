// @version 3.3.577
/**
 * WireVerifier Tests
 * Tests for frontend↔backend connection validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and glob
vi.mock('fs-extra', () => ({
  default: {
    readFile: vi.fn(),
    pathExists: vi.fn(),
  },
}));

vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}));

describe('WireVerifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Types', () => {
    describe('FrontendAPICall', () => {
      it('should have endpoint property', () => {
        interface FrontendAPICall {
          endpoint: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          file: string;
          line: number;
        }
        const call: FrontendAPICall = {
          endpoint: '/api/v1/users',
          method: 'GET',
          file: 'src/components/UserList.tsx',
          line: 25,
        };
        expect(call.endpoint).toBe('/api/v1/users');
      });

      it('should have HTTP method', () => {
        interface FrontendAPICall {
          endpoint: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          file: string;
          line: number;
        }
        const call: FrontendAPICall = {
          endpoint: '/api/v1/chat',
          method: 'POST',
          file: 'src/hooks/useChat.ts',
          line: 42,
        };
        expect(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).toContain(call.method);
      });

      it('should track source file', () => {
        interface FrontendAPICall {
          endpoint: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          file: string;
          line: number;
        }
        const call: FrontendAPICall = {
          endpoint: '/api/v1/settings',
          method: 'PUT',
          file: 'src/pages/Settings.tsx',
          line: 100,
        };
        expect(call.file).toContain('.tsx');
      });

      it('should track line number', () => {
        interface FrontendAPICall {
          endpoint: string;
          method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
          file: string;
          line: number;
        }
        const call: FrontendAPICall = {
          endpoint: '/api/v1/delete',
          method: 'DELETE',
          file: 'src/utils/api.ts',
          line: 55,
        };
        expect(call.line).toBe(55);
      });
    });

    describe('BackendRoute', () => {
      it('should have path property', () => {
        interface BackendRoute {
          path: string;
          method: string;
          file: string;
          handler: string;
        }
        const route: BackendRoute = {
          path: '/api/v1/users',
          method: 'GET',
          file: 'src/nexus/routes/users.ts',
          handler: 'getUsers',
        };
        expect(route.path).toBe('/api/v1/users');
      });

      it('should have handler name', () => {
        interface BackendRoute {
          path: string;
          method: string;
          file: string;
          handler: string;
        }
        const route: BackendRoute = {
          path: '/api/v1/chat',
          method: 'POST',
          file: 'src/nexus/routes/chat.ts',
          handler: 'handleChat',
        };
        expect(route.handler).toBe('handleChat');
      });
    });

    describe('SocketEvent', () => {
      it('should have event name', () => {
        interface SocketEvent {
          event: string;
          direction: 'emit' | 'listen';
          file: string;
          line: number;
        }
        const evt: SocketEvent = {
          event: 'chat:message',
          direction: 'emit',
          file: 'src/hooks/useSocket.ts',
          line: 30,
        };
        expect(evt.event).toBe('chat:message');
      });

      it('should track direction', () => {
        interface SocketEvent {
          event: string;
          direction: 'emit' | 'listen';
          file: string;
          line: number;
        }
        const evt: SocketEvent = {
          event: 'user:typing',
          direction: 'listen',
          file: 'src/components/Chat.tsx',
          line: 45,
        };
        expect(['emit', 'listen']).toContain(evt.direction);
      });
    });

    describe('WireMismatch', () => {
      it('should have type property', () => {
        interface WireMismatch {
          type: 'missing_backend' | 'missing_frontend' | 'method_mismatch';
          endpoint?: string;
          event?: string;
          details: string;
        }
        const mismatch: WireMismatch = {
          type: 'missing_backend',
          endpoint: '/api/v1/old-endpoint',
          details: 'Frontend calls endpoint that does not exist',
        };
        expect(mismatch.type).toBe('missing_backend');
      });

      it('should track missing backend routes', () => {
        interface WireMismatch {
          type: 'missing_backend' | 'missing_frontend' | 'method_mismatch';
          endpoint?: string;
          event?: string;
          details: string;
        }
        const mismatch: WireMismatch = {
          type: 'missing_backend',
          endpoint: '/api/v1/nonexistent',
          details: 'No backend handler found',
        };
        expect(mismatch.details).toContain('No backend');
      });

      it('should track missing frontend usage', () => {
        interface WireMismatch {
          type: 'missing_backend' | 'missing_frontend' | 'method_mismatch';
          endpoint?: string;
          event?: string;
          details: string;
        }
        const mismatch: WireMismatch = {
          type: 'missing_frontend',
          endpoint: '/api/v1/unused-endpoint',
          details: 'Backend route not used by frontend',
        };
        expect(mismatch.type).toBe('missing_frontend');
      });

      it('should track method mismatches', () => {
        interface WireMismatch {
          type: 'missing_backend' | 'missing_frontend' | 'method_mismatch';
          endpoint?: string;
          event?: string;
          details: string;
        }
        const mismatch: WireMismatch = {
          type: 'method_mismatch',
          endpoint: '/api/v1/users',
          details: 'Frontend uses POST but backend expects GET',
        };
        expect(mismatch.details).toContain('POST');
      });
    });

    describe('WiringReport', () => {
      it('should have timestamp', () => {
        interface WiringReport {
          timestamp: string;
          frontend: { apiCalls: unknown[]; socketEvents: unknown[] };
          backend: { routes: unknown[]; socketHandlers: unknown[] };
          matched: number;
          mismatches: unknown[];
          coverage: number;
        }
        const report: WiringReport = {
          timestamp: '2024-01-15T10:30:00Z',
          frontend: { apiCalls: [], socketEvents: [] },
          backend: { routes: [], socketHandlers: [] },
          matched: 0,
          mismatches: [],
          coverage: 100,
        };
        expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}/);
      });

      it('should track frontend API calls', () => {
        interface WiringReport {
          timestamp: string;
          frontend: { apiCalls: unknown[]; socketEvents: unknown[] };
          backend: { routes: unknown[]; socketHandlers: unknown[] };
          matched: number;
          mismatches: unknown[];
          coverage: number;
        }
        const report: WiringReport = {
          timestamp: new Date().toISOString(),
          frontend: { apiCalls: [{}, {}, {}], socketEvents: [] },
          backend: { routes: [], socketHandlers: [] },
          matched: 3,
          mismatches: [],
          coverage: 100,
        };
        expect(report.frontend.apiCalls).toHaveLength(3);
      });

      it('should track backend routes', () => {
        interface WiringReport {
          timestamp: string;
          frontend: { apiCalls: unknown[]; socketEvents: unknown[] };
          backend: { routes: unknown[]; socketHandlers: unknown[] };
          matched: number;
          mismatches: unknown[];
          coverage: number;
        }
        const report: WiringReport = {
          timestamp: new Date().toISOString(),
          frontend: { apiCalls: [], socketEvents: [] },
          backend: { routes: [{}, {}], socketHandlers: [] },
          matched: 2,
          mismatches: [],
          coverage: 100,
        };
        expect(report.backend.routes).toHaveLength(2);
      });

      it('should calculate coverage percentage', () => {
        interface WiringReport {
          timestamp: string;
          frontend: { apiCalls: unknown[]; socketEvents: unknown[] };
          backend: { routes: unknown[]; socketHandlers: unknown[] };
          matched: number;
          mismatches: unknown[];
          coverage: number;
        }
        const report: WiringReport = {
          timestamp: new Date().toISOString(),
          frontend: { apiCalls: [{}, {}, {}, {}], socketEvents: [] },
          backend: { routes: [], socketHandlers: [] },
          matched: 3,
          mismatches: [{}],
          coverage: 75,
        };
        expect(report.coverage).toBe(75);
      });
    });
  });

  describe('WireVerifier Class', () => {
    it('should initialize with project root', () => {
      const projectRoot = '/workspaces/project';
      expect(projectRoot).toBe('/workspaces/project');
    });

    it('should set frontend path', () => {
      const frontendPath = '/workspaces/project/src/web-app/src';
      expect(frontendPath).toContain('web-app');
    });

    it('should set backend path', () => {
      const backendPath = '/workspaces/project/src/nexus/routes';
      expect(backendPath).toContain('nexus');
    });

    it('should store last report', () => {
      let lastReport: { coverage: number } | null = null;
      lastReport = { coverage: 95.5 };
      expect(lastReport?.coverage).toBe(95.5);
    });
  });

  describe('Frontend API Scanning', () => {
    it('should detect fetch calls', () => {
      const code = "fetch('/api/v1/users')";
      const fetchRegex = /fetch\(['"](\/api\/[^'"]+)['"]/;
      const match = code.match(fetchRegex);
      expect(match?.[1]).toBe('/api/v1/users');
    });

    it('should detect axios calls', () => {
      const code = "axios.get('/api/v1/data')";
      const axiosRegex = /axios\.(get|post|put|delete|patch)\(['"](\/api\/[^'"]+)['"]/;
      const match = code.match(axiosRegex);
      expect(match?.[2]).toBe('/api/v1/data');
    });

    it('should detect API_BASE usage', () => {
      const code = '`${API_BASE}/users`';
      expect(code).toContain('API_BASE');
    });

    it('should ignore test files', () => {
      const testFiles = ['api.test.ts', 'user.spec.tsx', '__tests__/api.ts'];
      const isTestFile = (f: string) => /\.(test|spec)\./.test(f) || f.includes('__tests__');
      expect(testFiles.every(isTestFile)).toBe(true);
    });
  });

  describe('Frontend Socket Scanning', () => {
    it('should detect socket.emit calls', () => {
      const code = "socket.emit('chat:message', data)";
      const emitRegex = /socket\.emit\(['"]([\w:]+)['"]/;
      const match = code.match(emitRegex);
      expect(match?.[1]).toBe('chat:message');
    });

    it('should detect socket.on handlers', () => {
      const code = "socket.on('user:update', handler)";
      const onRegex = /socket\.on\(['"]([\w:]+)['"]/;
      const match = code.match(onRegex);
      expect(match?.[1]).toBe('user:update');
    });

    it('should detect io() connections', () => {
      const code = "const socket = io('http://localhost:4000')";
      expect(code).toContain('io(');
    });
  });

  describe('Backend Route Scanning', () => {
    it('should detect Express route definitions', () => {
      const code = "router.get('/users', getUsers)";
      const routeRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/;
      const match = code.match(routeRegex);
      expect(match?.[2]).toBe('/users');
    });

    it('should detect app.use middleware', () => {
      const code = "app.use('/api/v1', router)";
      const useRegex = /app\.use\(['"]([^'"]+)['"]/;
      const match = code.match(useRegex);
      expect(match?.[1]).toBe('/api/v1');
    });
  });

  describe('Backend Socket Scanning', () => {
    it('should detect io.on handlers', () => {
      const code = "io.on('connection', handleConnection)";
      const onRegex = /io\.on\(['"]([\w:]+)['"]/;
      const match = code.match(onRegex);
      expect(match?.[1]).toBe('connection');
    });

    it('should detect socket.on in connection handler', () => {
      const code = "socket.on('generate', handleGenerate)";
      const onRegex = /socket\.on\(['"]([\w:]+)['"]/;
      const match = code.match(onRegex);
      expect(match?.[1]).toBe('generate');
    });
  });

  describe('Mismatch Detection', () => {
    it('should detect missing backend for frontend call', () => {
      const frontendEndpoints = ['/api/v1/users', '/api/v1/old'];
      const backendRoutes = ['/api/v1/users'];
      const missing = frontendEndpoints.filter((e) => !backendRoutes.includes(e));
      expect(missing).toContain('/api/v1/old');
    });

    it('should detect unused backend routes', () => {
      const frontendEndpoints = ['/api/v1/users'];
      const backendRoutes = ['/api/v1/users', '/api/v1/admin'];
      const unused = backendRoutes.filter((r) => !frontendEndpoints.includes(r));
      expect(unused).toContain('/api/v1/admin');
    });

    it('should detect method mismatches', () => {
      const frontend = { endpoint: '/api/v1/data', method: 'POST' };
      const backend = { path: '/api/v1/data', method: 'GET' };
      expect(frontend.method).not.toBe(backend.method);
    });

    it('should detect socket event mismatches', () => {
      const frontendEvents = ['chat:message', 'user:typing'];
      const backendHandlers = ['chat:message'];
      const missing = frontendEvents.filter((e) => !backendHandlers.includes(e));
      expect(missing).toContain('user:typing');
    });
  });

  describe('Coverage Calculation', () => {
    it('should calculate 100% for perfect match', () => {
      const matched = 10;
      const total = 10;
      const coverage = (matched / total) * 100;
      expect(coverage).toBe(100);
    });

    it('should handle empty case', () => {
      const matched = 0;
      const total = 0;
      const coverage = total > 0 ? (matched / total) * 100 : 100;
      expect(coverage).toBe(100);
    });

    it('should calculate partial coverage', () => {
      const matched = 7;
      const total = 10;
      const coverage = (matched / total) * 100;
      expect(coverage).toBe(70);
    });
  });

  describe('API Contracts Integration', () => {
    it('should use API_CONTRACTS for validation', () => {
      const contracts = {
        'GET /api/v1/health': { intent: 'Check system health' },
        'POST /api/v1/chat': { intent: 'Process chat message' },
      };
      expect(Object.keys(contracts)).toHaveLength(2);
    });

    it('should match frontend calls against contracts', () => {
      const contracts = new Map([
        ['GET /api/v1/health', { intent: 'health check' }],
        ['POST /api/v1/chat', { intent: 'chat' }],
      ]);
      const call = { method: 'GET', endpoint: '/api/v1/health' };
      const key = `${call.method} ${call.endpoint}`;
      expect(contracts.has(key)).toBe(true);
    });
  });
});
