// @version 2.1.11
import express, { Request, Response } from 'express';
import { SynapseBus } from '../core/bus/event-bus';
import { TraitWeaver } from './trait-weaver';

export class NexusInterface {
    private app: express.Application;
    private bus: SynapseBus;
    private weaver: TraitWeaver;
    private port = 3010; // Synapse Port

    constructor() {
        this.app = express();
        this.bus = SynapseBus.getInstance();
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
            const enrichedPrompt = this.weaver.injectContext(prompt);

            // Publish to the bus
            const requestId = crypto.randomUUID();
            
            // Create a promise to wait for the response
            const responsePromise = new Promise((resolve, reject) => {
                const handler = (event: any) => {
                    if (event.data.requestId === requestId) {
                        // Cleanup listener? (In a real system, yes)
                        resolve(event.data.response);
                    }
                };
                // This is a simplified request/response pattern over the bus
                // In production, we'd use a correlation ID map with timeouts
                this.bus.subscribe('provider:response', handler);
                
                // Timeout fallback
                setTimeout(() => reject(new Error('Timeout')), 30000);
            });

            this.bus.publish('provider:request', {
                id: requestId, // Pass ID through
                prompt: enrichedPrompt,
                taskType: taskType || 'general'
            }, 'nexus');

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
                    if (event.data.requestId === requestId) {
                        resolve(event.data.results);
                    }
                };
                this.bus.subscribe('memory:response', handler);
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });

            this.bus.publish('memory:query', {
                requestId,
                context,
                limit: limit || 5
            }, 'nexus');

            try {
                const results = await responsePromise;
                res.json({ success: true, data: results });
            } catch (error: any) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 4. Ingest Endpoint
        this.app.post('/api/v1/synapse/memory', (req: Request, res: Response) => {
            const { content, type, tags } = req.body;
            this.bus.publish('memory:ingest', {
                content,
                type,
                tags
            }, 'nexus');
            res.json({ success: true, message: 'Memory ingested' });
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
