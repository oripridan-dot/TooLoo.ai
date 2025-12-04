// @version 2.2.331
// scripts/load-test.ts
// Run with: npx tsx scripts/load-test.ts

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:4000';
const CONCURRENT_USERS = 50;
const DURATION_MS = 10000;

async function simulateUser(id: number) {
  const start = Date.now();
  let requests = 0;
  let errors = 0;

  while (Date.now() - start < DURATION_MS) {
    try {
      // Simulate a health check or simple query
      const res = await fetch(`${TARGET_URL}/health`);
      if (!res.ok) errors++;
      requests++;
    } catch (e) {
      errors++;
    }
    // Small delay to be realistic
    await new Promise(r => setTimeout(r, Math.random() * 100));
  }
  return { requests, errors };
}

async function runLoadTest() {
  console.log(`Starting load test: ${CONCURRENT_USERS} users, ${DURATION_MS}ms`);
  console.log(`Target: ${TARGET_URL}`);
  
  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(simulateUser(i));
  }

  const results = await Promise.all(promises);
  const totalRequests = results.reduce((sum, r) => sum + r.requests, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

  console.log('Load Test Complete');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Error Rate: ${(totalErrors / totalRequests * 100).toFixed(2)}%`);
  console.log(`RPS: ${(totalRequests / (DURATION_MS / 1000)).toFixed(2)}`);
}

runLoadTest().catch(console.error);
