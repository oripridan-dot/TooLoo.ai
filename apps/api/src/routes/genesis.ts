/**
 * @file Genesis API Routes
 * @description Routes for communicating with TooLoo Genesis
 * @version 1.2.0
 * @created 2025-12-16
 *
 * Genesis runs as a separate process (pnpm genesis:start).
 * These routes proxy to the Genesis kernel on port 4003.
 *
 * Endpoints:
 * - POST /genesis/command - Send a command to TooLoo
 * - POST /genesis/approve - Approve a permission request
 * - POST /genesis/deny - Deny a permission request
 * - GET /genesis/state - Get current Genesis state
 * - GET /genesis/soul - Get the soul definition
 * - GET /genesis/history - Get goal execution history
 * - POST /genesis/start - Start the Genesis life loop
 * - POST /genesis/stop - Stop the Genesis life loop
 */

import { Router, Request, Response } from 'express';
import type { Server as SocketIOServer } from 'socket.io';

// Genesis communicates via HTTP to its own process
const GENESIS_PORT = process.env['GENESIS_PORT'] || '4003';
const GENESIS_URL = `http://localhost:${GENESIS_PORT}`;

// In-memory mock state for demo mode
let mockState = {
  running: false,
  mode: 'observe',
  pursuits: {
    quality: { current: 0.85, target: 0.95 },
    performance: { current: 0.78, target: 0.9 },
    efficiency: { current: 0.92, target: 0.95 },
  },
  metrics: {
    goalsCompleted: 0,
    thoughtCycles: 0,
    permissionsRequested: 0,
  },
  history: [] as any[],
  queue: [] as any[],
};

/**
 * Try to reach the Genesis process, fall back to mock state
 */
async function fetchGenesis(path: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(`${GENESIS_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`Genesis returned ${res.status}`);
    }
    return await res.json();
  } catch (_err) {
    // Genesis not running - use mock state
    return null;
  }
}

export interface GenesisRouterDeps {
  io: SocketIOServer;
}

export function createGenesisRouter(deps?: GenesisRouterDeps): Router {
  const router = Router();
  const io = deps?.io;

  // =========================================================================
  // POST /genesis/event - Receive and relay Genesis events via Socket.IO
  // =========================================================================
  router.post('/event', (req: Request, res: Response) => {
    const { event, data } = req.body;
    
    if (!event) {
      return res.status(400).json({ success: false, error: 'Missing event name' });
    }
    
    // Relay to all connected Socket.IO clients
    if (io) {
      io.emit(event, data);
      io.emit('genesis:event', { type: event, data, timestamp: Date.now() });
    }
    
    res.json({ success: true, relayed: !!io });
  });

  // =========================================================================
  // GET /genesis/state - Get current state
  // =========================================================================
  router.get('/state', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/state');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }
      // Mock state
      res.json({
        success: true,
        data: mockState,
        source: 'mock',
        note: 'Genesis process not running. Start with: pnpm genesis:start',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // GET /genesis/soul - Get soul definition
  // =========================================================================
  router.get('/soul', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/soul');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }
      // Return soul file directly
      const fs = await import('fs/promises');
      const yaml = await import('yaml');
      const path = await import('path');
      const soulPath = path.join(process.cwd(), '../../soul/destiny.yaml');
      try {
        const content = await fs.readFile(soulPath, 'utf-8');
        const soul = yaml.parse(content);
        res.json({ success: true, data: soul, source: 'file' });
      } catch {
        res.json({
          success: true,
          data: {
            name: 'TooLoo',
            version: '1.0.0',
            pursuits: ['quality', 'performance', 'efficiency'],
          },
          source: 'default',
        });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // GET /genesis/history - Get goal execution history
  // =========================================================================
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/history');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }
      const limit = parseInt(req.query['limit'] as string) || 20;
      res.json({
        success: true,
        data: mockState.history.slice(-limit),
        total: mockState.history.length,
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // GET /genesis/metrics - Get all metrics
  // =========================================================================
  router.get('/metrics', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/metrics');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }
      res.json({
        success: true,
        data: {
          pursuits: mockState.pursuits,
          stats: mockState.metrics,
        },
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/command - Send a command to TooLoo
  // =========================================================================
  router.post('/command', async (req: Request, res: Response) => {
    try {
      const { text, message } = req.body;
      const command = text || message;

      if (!command) {
        return res.status(400).json({
          success: false,
          error: 'Missing "text" or "message" in request body',
        });
      }

      const remote = await fetchGenesis('/command', {
        method: 'POST',
        body: JSON.stringify({ text: command }),
      });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      // Mock: add to history
      mockState.history.push({
        id: Date.now().toString(),
        command,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });
      mockState.metrics.thoughtCycles++;

      res.json({
        success: true,
        message: 'Command queued (mock mode)',
        data: { command, timestamp: new Date().toISOString() },
        source: 'mock',
        note: 'Genesis process not running. Start with: pnpm genesis:start',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/approve - Approve a permission request
  // =========================================================================
  router.post('/approve', async (req: Request, res: Response) => {
    try {
      const { permissionId } = req.body;
      if (!permissionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing "permissionId" in request body',
        });
      }

      const remote = await fetchGenesis('/approve', {
        method: 'POST',
        body: JSON.stringify({ permissionId }),
      });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        message: 'Permission approved (mock)',
        data: { permissionId },
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/deny - Deny a permission request
  // =========================================================================
  router.post('/deny', async (req: Request, res: Response) => {
    try {
      const { permissionId } = req.body;
      if (!permissionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing "permissionId" in request body',
        });
      }

      const remote = await fetchGenesis('/deny', {
        method: 'POST',
        body: JSON.stringify({ permissionId }),
      });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        message: 'Permission denied (mock)',
        data: { permissionId },
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/approve-all - Approve all pending permissions
  // =========================================================================
  router.post('/approve-all', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/approve-all', { method: 'POST' });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        message: 'All permissions approved (mock)',
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/command - Send a command to Genesis
  // =========================================================================
  router.post('/command', async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Missing "text" in request body',
        });
      }

      const remote = await fetchGenesis('/command', {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        message: `Command received: ${text}`,
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/autonomy - Change autonomy mode
  // =========================================================================
  router.post('/autonomy', async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      if (!mode || !['observe', 'guided', 'collaborative', 'autonomous'].includes(mode)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mode. Must be: observe, guided, collaborative, or autonomous',
        });
      }

      const remote = await fetchGenesis('/autonomy', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      mockState.mode = mode;
      res.json({
        success: true,
        message: `Autonomy mode changed to: ${mode}`,
        data: { mode },
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/skip - Skip the current step
  // =========================================================================
  router.post('/skip', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/skip', { method: 'POST' });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        message: 'Step skipped (mock)',
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/start - Start the Genesis life loop
  // =========================================================================
  router.post('/start', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/start', { method: 'POST' });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      // Mock mode
      mockState.running = true;
      res.json({
        success: true,
        message: 'Genesis started (mock mode)',
        data: mockState,
        source: 'mock',
        note: 'For full functionality, run: pnpm genesis:start',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // POST /genesis/stop - Stop the Genesis life loop
  // =========================================================================
  router.post('/stop', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/stop', { method: 'POST' });
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      mockState.running = false;
      res.json({
        success: true,
        message: 'Genesis stopped (mock mode)',
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // GET /genesis/skills - Get loaded skills
  // =========================================================================
  router.get('/skills', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/skills');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      // Return from kernel registry as fallback
      res.json({
        success: true,
        data: [],
        count: 0,
        source: 'mock',
        note: 'Use /api/v2/skills for full skill list',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // =========================================================================
  // GET /genesis/queue - Get goal queue
  // =========================================================================
  router.get('/queue', async (_req: Request, res: Response) => {
    try {
      const remote = await fetchGenesis('/queue');
      if (remote) {
        return res.json({ success: true, data: remote, source: 'genesis' });
      }

      res.json({
        success: true,
        data: mockState.queue,
        count: mockState.queue.length,
        source: 'mock',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

export default createGenesisRouter;
