import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const STARTUP_TIMEOUT = 30000; // 30 seconds timeout

async function profileStartup() {
  console.log('Starting Synapsys Architecture for profiling...');
  const start = performance.now();

  const child = spawn('npm', ['run', 'start:synapsys'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  let booted = false;

  const cleanup = () => {
    if (!child.killed) {
      child.kill();
    }
  };

  const timeout = setTimeout(() => {
    console.error('Startup timed out!');
    cleanup();
    process.exit(1);
  }, STARTUP_TIMEOUT);

  child.stdout.on('data', (data) => {
    const output = data.toString();
    // console.log(output); // Uncomment to see output
    if (output.includes('[System] All systems nominal.')) {
      const end = performance.now();
      const duration = end - start;
      console.log(`\n✨ Startup Complete!`);
      console.log(`⏱️  Time to Ready: ${duration.toFixed(2)}ms`);
      booted = true;
      clearTimeout(timeout);
      cleanup();
      process.exit(0);
    }
  });

  child.stderr.on('data', (data) => {
    console.error(`[Stderr]: ${data}`);
  });

  child.on('close', (code) => {
    if (!booted) {
      console.error(`Process exited with code ${code} before ready state.`);
      process.exit(1);
    }
  });
}

profileStartup();
