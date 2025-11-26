import http from 'http';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:4000';

function makeRequest(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const req = http.get(`${BASE_URL}${path}`, (res) => {
      res.on('data', () => {}); // Consume data
      res.on('end', () => {
        const end = performance.now();
        resolve(end - start);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

async function profileApi() {
  console.log('Profiling API Latency...');
  
  // Ensure server is up first
  try {
    await makeRequest('/health');
  } catch {
    console.error('Server is not running. Please start the server first (npm run start:synapsys).');
    process.exit(1);
  }

  const endpoints = [
    '/health',
    '/api/v1/system/status',
    // Add more endpoints as needed
  ];

  console.log(`\n| Endpoint | Latency (ms) |`);
  console.log(`|---|---|`);

  for (const endpoint of endpoints) {
    try {
      // Warmup
      await makeRequest(endpoint);
      
      // Measure
      const durations: number[] = [];
      for (let i = 0; i < 5; i++) {
        durations.push(await makeRequest(endpoint));
      }
      
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      console.log(`| ${endpoint} | ${avg.toFixed(2)} |`);
    } catch {
      console.log(`| ${endpoint} | ERROR |`);
    }
  }
}

profileApi();
