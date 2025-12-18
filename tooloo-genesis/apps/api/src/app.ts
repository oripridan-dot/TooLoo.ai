/**
 * @file Express app (no listen) for testing and composition
 * @version 1.0.0
 * @skill-os true
 */

import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import knowledgeRouter from './routes/knowledge.js';

export const createApp = (): Express => {
  const app = express();
  app.use(express.json());

  app.get('/', (_req, res) => {
    res
      .status(200)
      .type('text/plain')
      .send('TooLoo Genesis API is running. Try GET /health or /api/v2/knowledge/search');
  });

  app.use('/api/v2', knowledgeRouter);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api', version: '1.0.0' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('API error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
