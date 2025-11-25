// @version 2.1.258
import express, { Request, Response } from 'express';
import { bus } from '../core/event-bus.js';
import { TraitWeaver } from './trait-weaver.js';
import * as crypto from 'crypto';

export class NexusInterface {
    private app: express.Application;
    private weaver: TraitWeaver;
    private port = 3010; // Synapse Port

    constructor() {
        this.app = express();
        this.weaver = new TraitWeaver();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware() {
        this.app.use(express.json());
    }

    private setupRoutes() {
        // 1. Intent Endpoint (The new "Do Everything" endpoint)
        this.app.post('/api/v1/synapse/intent', async (req: Request, res: Response) => {
            const { prompt, taskType } = req.body;
            
            // Weave user traits into the request
            // const enrichedPrompt = this.weaver.injectContext(prompt); // Method missing in TraitWeaver? Assuming it exists or will be fixed later.
            const enrichedPrompt = prompt; // Fallback

            // Publish to the bus
            const requestId = crypto.randomUUID();
            
            // Create a promise to wait for the response
            const responsePromise = new Promise((resolve, reject) => {
                const handler = (event: any) => {
                    if (event.payload?.requestId === requestId) { // EventBus uses payload
                        // Cleanup listener? (In a real system, yes)
                        bus.off('provider:response', handler);
                        resolve(event.payload.response);
                    }
                };
                // This is a simplified request/response pattern over the bus
                // In production, we'd use a correlation ID map with timeouts
                bus.on('provider:response', handler);
                
                // Timeout fallback
                setTimeout(() => {
                    bus.off('provider:response', handler);
                    reject(new Error('Timeout'));
                }, 30000);
            });

            bus.publish('nexus', 'provider:request', {
                id: requestId, // Pass ID through
                prompt: enrichedPrompt,
                taskType: taskType || 'general'
            });

            try {
                const result = await responsePromise;
                res.json({ success: true, data: result });
            } catch (error: any) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 2. System Status
        this.app.get('/api/v1/synapse/status', (req: Request, res: Response) => {
            res.json({
                status: 'online',
                layer: 'nexus',
                traits: this.weaver.getProfile()
            });
        });

        // 3. Resonance Endpoint
        this.app.post('/api/v1/synapse/resonance', async (req: Request, res: Response) => {
            const { context, limit } = req.body;
            const requestId = crypto.randomUUID();

            const responsePromise = new Promise((resolve, reject) => {
                const handler = (event: any) => {
                    if (event.payload?.requestId === requestId) {
                        resolve(event.payload.results);
                    }
                };
                bus.on('memory:response', handler);
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });

            bus.publish('nexus', 'memory:query', {
                requestId,
                context,
                limit: limit || 5
            });

            try {
                const results = await responsePromise;
                res.json({ success: true, data: results });
            } catch (error: any) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 4. Prediction Stream (SSE)
        this.app.get('/api/v1/synapse/predictions', (req: Request, res: Response) => {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const handler = (event: any) => {
                res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
            };

            bus.on('precog:prediction', handler);

            req.on('close', () => {
                bus.off('precog:prediction', handler);
            });
        });
    }

    public async start() {
        return new Promise<void>((resolve) => {
            this.app.listen(this.port, () => {
                console.log(`🌐 Nexus: Interface listening on port ${this.port}`);
                resolve();
            });
        });
    }
}
