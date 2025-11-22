// Execution Server - Sandboxed Code Runner
// Provides a secure environment for executing user-provided code snippets
// Part of the TooLoo.ai multi-service architecture

import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.IDE_PORT || 3017;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'execution-server', timestamp: new Date().toISOString() });
});

// Proxy-compatible health check
app.get('/api/v1/ide/health', (req, res) => {
  res.json({ status: 'ok', service: 'execution-server', timestamp: new Date().toISOString() });
});

// Execute code endpoint
app.post('/api/v1/ide/execute', async (req, res) => {
  const { code, language = 'javascript', timeout = 5000 } = req.body;

  if (!code) {
    return res.status(400).json({ ok: false, error: 'Code is required' });
  }

  if (language !== 'javascript' && language !== 'node') {
    return res.status(400).json({ ok: false, error: 'Only JavaScript/Node.js is currently supported' });
  }

  const timestamp = Date.now();
  const tempDir = path.join(process.cwd(), 'temp', 'execution');
  const filename = `exec-${timestamp}.js`;
  const filePath = path.join(tempDir, filename);

  try {
    // Ensure temp directory exists
    await fs.mkdir(tempDir, { recursive: true });

    // Write code to temp file
    await fs.writeFile(filePath, code);

    // Execute code in a child process
    const child = spawn('node', [filePath], {
      timeout: timeout,
      env: { ...process.env, FORCE_COLOR: 'true' } // Pass basic env, maybe restrict later
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', async (code) => {
      // Cleanup temp file
      try {
        await fs.unlink(filePath);
      } catch (e) {
        console.error('Failed to cleanup temp file:', e);
      }

      res.json({
        ok: code === 0,
        exitCode: code,
        stdout,
        stderr,
        timestamp: new Date().toISOString()
      });
    });

    child.on('error', async (err) => {
      try {
        await fs.unlink(filePath);
      } catch (e) {}
      
      res.status(500).json({
        ok: false,
        error: err.message,
        stdout,
        stderr
      });
    });

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`⚡ Execution Server running on port ${PORT}`);
});
