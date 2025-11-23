import http from 'http';
import { performance } from 'perf_hooks';

// Configuration for performance tests
const SERVICES = [
  { name: 'Web Server', port: 3000, path: '/health' },
  { name: 'Training', port: 3001, path: '/health' },
  { name: 'Meta', port: 3002, path: '/health' },
  { name: 'Budget', port: 3003, path: '/health' },
  { name: 'Coach', port: 3004, path: '/health' },
  { name: 'Cup', port: 3005, path: '/health' },
  { name: 'Product Dev', port: 3006, path: '/health' },
  { name: 'Segmentation', port: 3007, path: '/health' },
  { name: 'Reports', port: 3008, path: '/health' },
  { name: 'Capabilities', port: 3009, path: '/health' },
];

// Reusable HTTP request utility with timing
function makeRequest(hostname, port, path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const options = {
      hostname,
      port,
      path,
      method,
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        resolve({
          status: res.statusCode,
          duration,
          size: data.length,
          timestamp: new Date().toISOString(),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Performance test suite
async function runPerformanceTests() {
  console.log('\n╭─────────────────────────────────────────────────────╮');
  console.log('│ PERFORMANCE BASELINE TESTS                          │');
  console.log('╰─────────────────────────────────────────────────────╯\n');

  const baselines = {};

  // Test 1: Baseline Response Times (Sequential)
  console.log('Test 1: Baseline Response Times (Single Requests)');
  console.log('─────────────────────────────────────────────────\n');

  const responseTimes = {};
  for (const service of SERVICES) {
    try {
      const result = await makeRequest('127.0.0.1', service.port, service.path);
      const duration = result.duration.toFixed(2);
      responseTimes[service.name] = parseFloat(duration);
      console.log(`  ${service.name.padEnd(20)} ${duration}ms ✓`);
    } catch (err) {
      console.log(`  ${service.name.padEnd(20)} ERROR (${err.message})`);
      responseTimes[service.name] = -1;
    }
  }

  const avgResponseTime =
    Object.values(responseTimes)
      .filter((t) => t > 0)
      .reduce((a, b) => a + b, 0) / Object.values(responseTimes).filter((t) => t > 0).length;

  baselines.avgResponseTime = parseFloat(avgResponseTime.toFixed(2));
  console.log(`\n  Average Response Time: ${baselines.avgResponseTime.toFixed(2)}ms\n`);

  // Test 2: Concurrency Test (10 simultaneous requests per service)
  console.log('Test 2: Concurrency Test (10 Simultaneous Requests)\n');

  const concurrencyResults = {};
  for (const service of SERVICES) {
    try {
      const startTime = performance.now();
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(makeRequest('127.0.0.1', service.port, service.path));
      }
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

      concurrencyResults[service.name] = {
        totalTime: parseFloat(totalDuration.toFixed(2)),
        avgTime: parseFloat(avgDuration.toFixed(2)),
        throughput: parseFloat((10000 / totalDuration).toFixed(2)),
      };

      console.log(
        `  ${service.name.padEnd(20)} Total: ${concurrencyResults[service.name].totalTime}ms, Avg: ${concurrencyResults[service.name].avgTime}ms, TP: ${concurrencyResults[service.name].throughput} req/s`
      );
    } catch (err) {
      console.log(`  ${service.name.padEnd(20)} ERROR (${err.message})`);
      concurrencyResults[service.name] = { totalTime: -1, avgTime: -1, throughput: 0 };
    }
  }

  baselines.concurrency = concurrencyResults;
  console.log();

  // Test 3: Memory Usage Analysis (Simulated)
  console.log('Test 3: Memory Usage Estimation\n');

  const memoryEstimates = {};
  const baseMemory = process.memoryUsage();
  console.log(`  Base Process Memory:     ${(baseMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Total Heap Size:         ${(baseMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  RSS (Resident Set):      ${(baseMemory.rss / 1024 / 1024).toFixed(2)}MB\n`);

  baselines.memory = {
    heapUsed: parseFloat((baseMemory.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotal: parseFloat((baseMemory.heapTotal / 1024 / 1024).toFixed(2)),
    rss: parseFloat((baseMemory.rss / 1024 / 1024).toFixed(2)),
  };

  // Test 4: Throughput Under Load (20 rapid requests)
  console.log('Test 4: Throughput Under Load (20 Rapid Requests per Service)\n');

  const throughputResults = {};
  for (const service of SERVICES) {
    try {
      const startTime = performance.now();
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(makeRequest('127.0.0.1', service.port, service.path));
      }
      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;
      const successCount = results.filter((r) => r.status === 200).length;
      const avgSize = results.reduce((sum, r) => sum + r.size, 0) / results.length;

      throughputResults[service.name] = {
        requestsPerSecond: parseFloat((20000 / totalDuration).toFixed(2)),
        successRate: parseFloat(((successCount / 20) * 100).toFixed(2)),
        avgPayloadSize: parseFloat(avgSize.toFixed(2)),
      };

      console.log(
        `  ${service.name.padEnd(20)} ${throughputResults[service.name].requestsPerSecond} req/s, Success: ${throughputResults[service.name].successRate}%, Payload: ${throughputResults[service.name].avgPayloadSize}B`
      );
    } catch (err) {
      console.log(`  ${service.name.padEnd(20)} ERROR (${err.message})`);
      throughputResults[service.name] = {
        requestsPerSecond: 0,
        successRate: 0,
        avgPayloadSize: 0,
      };
    }
  }

  baselines.throughput = throughputResults;
  console.log();

  // Test 5: P95 Latency (20 requests, measure 95th percentile)
  console.log('Test 5: P95 Latency Analysis (20 Requests per Service)\n');

  const latencyPercentiles = {};
  for (const service of SERVICES) {
    try {
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(makeRequest('127.0.0.1', service.port, service.path));
      }
      const results = await Promise.all(promises);
      const durations = results.map((r) => r.duration).sort((a, b) => a - b);

      const p50 = durations[Math.floor(durations.length * 0.5)];
      const p95 = durations[Math.floor(durations.length * 0.95)];
      const p99 = durations[Math.floor(durations.length * 0.99)];

      latencyPercentiles[service.name] = {
        p50: parseFloat(p50.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
      };

      console.log(
        `  ${service.name.padEnd(20)} P50: ${latencyPercentiles[service.name].p50}ms, P95: ${latencyPercentiles[service.name].p95}ms, P99: ${latencyPercentiles[service.name].p99}ms`
      );
    } catch (err) {
      console.log(`  ${service.name.padEnd(20)} ERROR (${err.message})`);
      latencyPercentiles[service.name] = { p50: -1, p95: -1, p99: -1 };
    }
  }

  baselines.latencyPercentiles = latencyPercentiles;
  console.log();

  // Test 6: Service Stability (Burst requests, monitor for errors)
  console.log('Test 6: Service Stability (Burst Test - 50 Rapid Requests)\n');

  const stabilityResults = {};
  for (const service of SERVICES) {
    try {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          makeRequest('127.0.0.1', service.port, service.path).catch((e) => ({
            status: 0,
            error: true,
          }))
        );
      }
      const results = await Promise.all(promises);
      const errorCount = results.filter((r) => r.error).length;
      const successCount = results.filter((r) => r.status === 200).length;

      stabilityResults[service.name] = {
        successCount,
        errorCount,
        stabilityRating: parseFloat(((successCount / 50) * 100).toFixed(2)),
      };

      console.log(
        `  ${service.name.padEnd(20)} Success: ${stabilityResults[service.name].successCount}/50, Errors: ${stabilityResults[service.name].errorCount}, Stability: ${stabilityResults[service.name].stabilityRating}%`
      );
    } catch (err) {
      console.log(`  ${service.name.padEnd(20)} ERROR (${err.message})`);
      stabilityResults[service.name] = { successCount: 0, errorCount: 50, stabilityRating: 0 };
    }
  }

  baselines.stability = stabilityResults;
  console.log();

  // Summary report
  console.log('╭─────────────────────────────────────────────────────╮');
  console.log('│ PERFORMANCE BASELINE SUMMARY                        │');
  console.log('╰─────────────────────────────────────────────────────╯\n');

  const stableServices = Object.entries(stabilityResults)
    .filter(([_, data]) => data.stabilityRating >= 90)
    .map(([name]) => name).length;

  const fastServices = Object.entries(responseTimes)
    .filter(([_, time]) => time > 0 && time < 100)
    .map(([name]) => name).length;

  console.log(`  Baseline Response Time: ${baselines.avgResponseTime}ms`);
  console.log(`  Stable Services (≥90%): ${stableServices}/${SERVICES.length}`);
  console.log(`  Fast Services (<100ms): ${fastServices}/${SERVICES.length}`);
  console.log(`  Memory Usage: ${baselines.memory.heapUsed}MB / ${baselines.memory.heapTotal}MB\n`);

  // Save baselines to file
  const baselinesSummary = {
    timestamp: new Date().toISOString(),
    avgResponseTime: baselines.avgResponseTime,
    services: SERVICES.length,
    stableServices,
    fastServices,
    baselines,
  };

  console.log('✓ Performance baselines established. Ready for regression testing.\n');

  return baselinesSummary;
}

// Run tests
runPerformanceTests()
  .then((results) => {
    console.log('Performance baseline test completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Performance test error:', err);
    process.exit(1);
  });
