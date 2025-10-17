#!/usr/bin/env node

// Launcher script to run both TooLoo.ai servers
import { spawn } from 'child_process';
import fs from 'fs';

console.log('🚀 Starting TooLoo.ai dual server setup...');

// Create screenshots directory
const screenshotDir = './auto-screenshots';
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
  console.log('📁 Created screenshots directory');
}

// Start main API server (port 3001)
console.log('🌐 Starting main API server on port 3001...');
const apiServer = spawn('node', ['simple-api-server.js'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

apiServer.stdout.on('data', (data) => {
  console.log(`[API] ${data.toString().trim()}`);
});

apiServer.stderr.on('data', (data) => {
  console.error(`[API ERROR] ${data.toString().trim()}`);
});

// Start Control Room server (port 3000)
console.log('🎛️  Starting Control Room server on port 3000...');
const controlServer = spawn('node', ['control-room-server.js'], {
  stdio: ['inherit', 'pipe', 'pipe']
});

controlServer.stdout.on('data', (data) => {
  console.log(`[CONTROL] ${data.toString().trim()}`);
});

controlServer.stderr.on('data', (data) => {
  console.error(`[CONTROL ERROR] ${data.toString().trim()}`);
});

// Handle cleanup
const cleanup = () => {
  console.log('\n🛑 Shutting down servers...');
  apiServer.kill();
  controlServer.kill();
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Wait for servers to start
setTimeout(() => {
  console.log('\n✅ Both servers should be running now:');
  console.log('🌐 Main API: http://localhost:3001');
  console.log('🎛️  Control Room: http://localhost:3000/control-room');
  console.log('📸 Screenshot API: POST http://localhost:3000/api/screenshot');
  console.log('\n💡 Open http://localhost:3000/control-room in the Simple Browser');
}, 2000);