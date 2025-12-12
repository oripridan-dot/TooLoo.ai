/**
 * @tooloo/api - Server
 * Express + Socket.IO server setup
 * 
 * @version 2.0.0-alpha.0
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { createServer as createHttpServer, type Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import type { Orchestrator } from '@tooloo/engine';
import type { 
  ServerToClientEvents, 
  ClientToServerEvents, 
  InterServerEvents, 
  SocketData,
  APIResponse,
} from './types.js';
import { createChatRouter } from './routes/chat.js';
import { createHealthRouter } from './routes/health.js';
import { createSkillsRouter } from './routes/skills.js';
import { createProjectsRouter } from './routes/projects.js';
import { createCapabilitiesRouter } from './routes/capabilities.js';
import { createVisualsRouter } from './routes/visuals.js';
import { setupSocketHandlers } from './socket/handlers.js';

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  apiPrefix: string;
  orchestrator?: Orchestrator;
}

const DEFAULT_CONFIG: ServerConfig = {
  port: 4001,
  host: '0.0.0.0',
  corsOrigins: ['http://localhost:5173', 'http://localhost:3000'],
  apiPrefix: '/api/v2',
};

// =============================================================================
// SERVER CLASS
// =============================================================================

export class TooLooServer {
  private app: Express;
  private httpServer: HTTPServer;
  private io: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private config: ServerConfig;
  private startTime: Date;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startTime = new Date();

    // Initialize Express
    this.app = express();
    this.httpServer = createHttpServer(this.app);

    // Initialize Socket.IO
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketIO();
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      credentials: true,
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      const start = Date.now();
      req.on('end', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${duration}ms`);
      });
      next();
    });

    // Request ID injection
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      next();
    });
  }

  private setupRoutes(): void {
    const prefix = this.config.apiPrefix;

    // Health routes (no prefix for /health)
    this.app.use('/health', createHealthRouter(this));
    this.app.use(`${prefix}/health`, createHealthRouter(this));

    // Chat routes - pass orchestrator if available
    this.app.use(`${prefix}/chat`, createChatRouter({
      io: this.io,
      orchestrator: this.config.orchestrator,
    }));

    // Skills routes
    this.app.use(`${prefix}/skills`, createSkillsRouter());

    // Projects routes
    this.app.use(`${prefix}/projects`, createProjectsRouter());

    // Capabilities routes
    this.app.use(`${prefix}/capabilities`, createCapabilitiesRouter());

    // Visuals routes
    this.app.use(`${prefix}/visuals`, createVisualsRouter());

    // Root endpoint
    this.app.get('/', (_req: Request, res: Response) => {
      res.json({
        name: 'TooLoo.ai API',
        version: '2.0.0-alpha.0',
        status: 'running',
        docs: `${this.config.apiPrefix}/docs`,
      });
    });

    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
      };
      res.status(404).json(response);
    });

    // Error handler
    this.app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const response: APIResponse = {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Internal server error',
        },
      };
      res.status(500).json(response);
    });
  }

  private setupSocketIO(): void {
    setupSocketHandlers(this.io);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(this.config.port, this.config.host, () => {
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🚀 TooLoo.ai API Server v2.0.0-alpha.0                    ║
║                                                              ║
║   HTTP:   http://${this.config.host}:${this.config.port}                          ║
║   Socket: ws://${this.config.host}:${this.config.port}                            ║
║   API:    ${this.config.apiPrefix}                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
        `);
        resolve();
      });
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.io.close();
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get server uptime in seconds
   */
  getUptime(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000);
  }

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer {
    return this.io as SocketIOServer;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createServer(config?: Partial<ServerConfig>): TooLooServer {
  return new TooLooServer(config);
}
