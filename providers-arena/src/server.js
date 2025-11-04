import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import arenaRoutes from './routes/arena.routes.js';
import { logger } from './utils/logger.js';
import config from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/arena', arenaRoutes);

// Basic informational routes for browser access
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback for unmatched routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling
// eslint-disable-next-line no-unused-vars
app.use(function errorHandler(err, req, res, next) {
  logger.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start server
app.listen(config.PORT, () => {
  logger.info(`Providers Arena server is running on port ${config.PORT}`);
});