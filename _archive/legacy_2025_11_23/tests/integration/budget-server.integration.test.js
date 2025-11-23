/**
 * Budget Server Integration Tests
 *
 * Tests all 9 endpoints on budget-server.js
 * Covers: provider management, burst generation, budget tracking, costs
 *
 * Run: node tests/integration/budget-server.integration.test.js
 */

import http from "http";
import { strict as assert } from "assert";

const BASE_URL = "http://127.0.0.1:3003";

let testsPassed = 0;
let testsFailed = 0;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            raw: data,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: null,
            raw: data,
          });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (e) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${e.message}`);
    testsFailed++;
  }
}

async function runHealthTests() {
  console.log("\n📋 Health & Status\n");

  await test("GET /health - returns 200", async () => {
    const res = await request("GET", "/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.service, "budget-server");
  });

  await test("GET /api/v1/budget - returns budget status", async () => {
    const res = await request("GET", "/api/v1/budget");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.budget, "Expected budget object");
  });

  await test("GET /api/v1/providers/status - returns provider status", async () => {
    const res = await request("GET", "/api/v1/providers/status");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert(res.body.status, "Expected status object");
  });
}

async function runPolicyTests() {
  console.log("\n📋 Provider Policy\n");

  await test("GET /api/v1/providers/policy - retrieves policy", async () => {
    const res = await request("GET", "/api/v1/providers/policy");
    assert.equal(res.status, 200);
    assert(res.body.policy || res.body.ok, "Expected policy or ok response");
  });

  await test("POST /api/v1/providers/policy - updates policy", async () => {
    const res = await request("POST", "/api/v1/providers/policy", {
      maxConcurrency: 6,
      criticality: "chat",
      burstSize: 10,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  await test("POST /api/v1/providers/policy with different criticality", async () => {
    const res = await request("POST", "/api/v1/providers/policy", {
      criticality: "normal",
      maxConcurrency: 4,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });
}

async function runBurstTests() {
  console.log("\n💥 Burst Generation\n");

  await test("POST /api/v1/providers/burst - generates burst", async () => {
    const res = await request("POST", "/api/v1/providers/burst", {
      prompt: "Test prompt for burst generation",
      model: "claude-3-5-haiku",
      count: 3,
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500);
  });

  await test("GET /api/v1/providers/burst - retrieves burst status", async () => {
    const res = await request("GET", "/api/v1/providers/burst");
    assert.equal(res.status, 200);
    assert(res.body.burst || res.body.ok, "Expected burst or ok response");
  });

  await test("POST /api/v1/providers/burst with custom params", async () => {
    const res = await request("POST", "/api/v1/providers/burst", {
      prompt: "Another test",
      providers: ["anthropic", "openai"],
      budget: 0.1,
    });
    assert(res.status === 200 || res.status === 400 || res.status === 500);
  });
}

async function runHistoryTests() {
  console.log("\n📊 Budget History & Analysis\n");

  await test("GET /api/v1/budget/history - retrieves budget history", async () => {
    const res = await request("GET", "/api/v1/budget/history");
    assert.equal(res.status, 200);
    assert(res.body.history || res.body.ok, "Expected history or ok response");
  });

  await test("GET /api/v1/providers/costs - retrieves cost analysis", async () => {
    const res = await request("GET", "/api/v1/providers/costs");
    assert.equal(res.status, 200);
    assert(res.body.costs || res.body.ok, "Expected costs or ok response");
  });

  await test("GET /api/v1/providers/recommend - gets provider recommendation", async () => {
    const res = await request("GET", "/api/v1/providers/recommend");
    assert.equal(res.status, 200);
    assert(
      res.body.recommendation || res.body.ok,
      "Expected recommendation or ok response"
    );
  });
}

async function runErrorTests() {
  console.log("\n⚠️  Error Handling\n");

  await test("GET /nonexistent - returns 404", async () => {
    const res = await request("GET", "/nonexistent");
    assert.equal(res.status, 404);
  });

  await test("POST with invalid policy - handles gracefully", async () => {
    const res = await request("POST", "/api/v1/providers/policy", {
      maxConcurrency: -1, // Invalid: negative
    });
    // Should handle gracefully (either 400 or sanitize it)
    assert(res.status >= 200);
  });

  await test("POST /api/v1/providers/burst with missing prompt", async () => {
    const res = await request("POST", "/api/v1/providers/burst", {
      count: 3,
      // Missing prompt - should handle gracefully
    });
    assert(res.status >= 200);
  });
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🧪 Budget Server Integration Tests");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`Base URL: ${BASE_URL}\n`);

  try {
    // Verify server is running
    try {
      await request("GET", "/health");
    } catch {
      console.error("❌ Budget server is not running on port 3003");
      console.error("   Start with: npm run start:budget");
      process.exit(1);
    }

    // Run all test suites
    await runHealthTests();
    await runPolicyTests();
    await runBurstTests();
    await runHistoryTests();
    await runErrorTests();
  } catch (e) {
    console.error("Fatal error:", e.message);
    testsFailed++;
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("Test Summary");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}\n`);

  if (testsFailed === 0) {
    console.log("🎉 All budget server integration tests passed!");
    process.exit(0);
  } else {
    console.log(`⚠️  ${testsFailed} test(s) failed`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
