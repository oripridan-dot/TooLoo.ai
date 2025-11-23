#!/usr/bin/env node
/**
 * Performance validation helper for TooLoo.ai.
 *
 * The script starts the API server (falling back to the backup entry point when
 * necessary), probes the health endpoint multiple times, and asserts that
 * latency stays within the configured p95 budget.
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const { performance } = require('perf_hooks');

const PORT = parseInt(process.env.PERF_PORT, 10) || 3200;
const ITERATIONS = parseInt(process.env.PERF_REQUESTS, 10) || 15;
const P95_THRESHOLD = parseFloat(process.env.PERF_P95_THRESHOLD_MS || '250');
const ENTRY_CANDIDATES = (process.env.PERF_SERVER_ENTRIES
  ? process.env.PERF_SERVER_ENTRIES.split(',')
  : ['simple-api-server.js', 'simple-api-server.js.bak'])
  .map((entry) => entry.trim())
  .filter(Boolean);

if (ENTRY_CANDIDATES.length === 0) {
  console.error('No server entry points defined. Set PERF_SERVER_ENTRIES.');
  process.exit(1);
}

const serverEnv = {
  ...process.env,
  PORT: String(PORT),
  NODE_ENV: process.env.NODE_ENV || 'test'
};

function startServer(entry) {
  const child = spawn('node', [entry], {
    env: serverEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';

  const prefix = (stream) => (chunk) => {
    const text = chunk.toString();
    logs += text;
    const label = stream === 'stdout' ? '\u001b[90mstdout\u001b[0m' : '\u001b[91mstderr\u001b[0m';
    process[stream === 'stdout' ? 'stdout' : 'stderr'].write(`[${entry} ${label}] ${text}`);
  };

  const handleStdout = prefix('stdout');
  const handleStderr = prefix('stderr');

  child.stdout.on('data', handleStdout);
  child.stderr.on('data', handleStderr);

  const stop = () => new Promise((resolve) => {
    child.stdout.off('data', handleStdout);
    child.stderr.off('data', handleStderr);

    if (child.killed || child.exitCode !== null) {
      resolve();
      return;
    }

    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed && child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 5000);
  });

  const getLogs = () => logs;

  return { child, stop, getLogs };
}

function waitForHealth(child) {
  const timeoutMs = parseInt(process.env.PERF_READY_TIMEOUT_MS, 10) || 20000;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const onExit = (code, signal) => {
      cleanup();
      reject(new Error(`Server exited before readiness (code=${code}, signal=${signal}).`));
    };

    const cleanup = () => {
      child.off('exit', onExit);
    };

    child.once('exit', onExit);

    const attempt = () => {
      if (Date.now() > deadline) {
        cleanup();
        reject(new Error('Timed out waiting for API health endpoint.'));
        return;
      }

      const req = http.get({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/api/v1/health',
        timeout: 2000
      }, (res) => {
        res.resume();
        if (res.statusCode === 200) {
          cleanup();
          resolve();
        } else {
          setTimeout(attempt, 400);
        }
      });

      req.on('error', () => {
        setTimeout(attempt, 400);
      });

      req.on('timeout', () => {
        req.destroy();
      });
    };

    attempt();
  });
}

function performRequest() {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get({
      hostname: '127.0.0.1',
      port: PORT,
      path: '/api/v1/health',
      timeout: 5000
    }, (res) => {
      res.resume();
      res.on('end', () => {
        resolve(performance.now() - start);
      });
    });

    req.on('error', (error) => reject(error));
    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
  });
}

async function collectSamples() {
  const samples = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    const duration = await performRequest();
    samples.push(duration);
  }
  return samples;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function summarise(samples) {
  if (samples.length === 0) {
    return { min: 0, max: 0, avg: 0, p95: 0 };
  }
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const avg = samples.reduce((acc, value) => acc + value, 0) / samples.length;
  const p95 = percentile(samples, 95);
  return { min, max, avg, p95 };
}

async function runForEntry(entry) {
  if (!fs.existsSync(entry)) {
    throw new Error(`Entry point ${entry} not found.`);
  }

  console.log(`\n🚀 Starting ${entry} on port ${PORT} for performance validation...`);
  const server = startServer(entry);

  try {
    await waitForHealth(server.child);
    console.log('✅ API server is ready. Collecting latency samples...');
    const samples = await collectSamples();
    const stats = summarise(samples);

    console.log('\n📊 Latency statistics (ms):');
    console.table([
      {
        entry,
        samples: samples.length,
        min: stats.min.toFixed(2),
        avg: stats.avg.toFixed(2),
        p95: stats.p95.toFixed(2),
        max: stats.max.toFixed(2)
      }
    ]);

    if (stats.p95 > P95_THRESHOLD) {
      throw new Error(`p95 latency ${stats.p95.toFixed(2)}ms exceeds threshold of ${P95_THRESHOLD}ms.`);
    }

    console.log(`\n✅ Performance validation passed for ${entry} (p95 <= ${P95_THRESHOLD}ms).`);
  } catch (error) {
    error.serverLogs = server.getLogs();
    throw error;
  } finally {
    await server.stop();
  }
}

async function main() {
  const errors = [];

  for (const entry of ENTRY_CANDIDATES) {
    try {
      await runForEntry(entry);
      return;
    } catch (error) {
      errors.push({ entry, error });
      console.error(`\n⚠️ Validation failed for ${entry}: ${error.message}`);
      if (error.serverLogs) {
        console.error(`--- Logs for ${entry} ---\n${error.serverLogs}\n--- end logs ---`);
      }
    }
  }

  console.error('\n❌ Performance validation failed for all entry points.');
  errors.forEach(({ entry, error }) => {
    console.error(`- ${entry}: ${error.message}`);
    if (error.serverLogs) {
      console.error(`  logs:\n${error.serverLogs}`);
    }
  });
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('Unexpected error during performance validation:', error);
  process.exit(1);
});
