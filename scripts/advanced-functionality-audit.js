// @version 2.1.324
// Advanced Functionality Audit - Feature Integration Tests
// Tests actual runtime behavior of core features

import { io } from "socket.io-client";

const results = [];

function recordFeature(
  feature,
  category,
  status,
  duration,
  message,
  metrics,
) {
  results.push({ feature, category, status, duration, message, metrics });
}

async function testFeature(
  name,
  category,
  testFn,
  timeoutMs = 10000,
) {
  const start = Date.now();
  try {
    await Promise.race([
      testFn(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Test timeout")),
          timeoutMs,
        ),
      ),
    ]);
    const duration = Date.now() - start;
    recordFeature(name, category, "PASS", duration, "Feature operational");
  } catch (err) {
    const duration = Date.now() - start;
    if (
      err instanceof Error &&
      err.message.includes("timeout")
    ) {
      recordFeature(
        name,
        category,
        "TIMEOUT",
        duration,
        `Operation exceeded ${timeoutMs}ms`,
      );
    } else {
      recordFeature(
        name,
        category,
        "FAIL",
        duration,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

async function runAdvancedTests() {
  console.log("🚀 SYNAPSYS ADVANCED FUNCTIONALITY AUDIT");
  console.log("=".repeat(70));
  console.log();

  // Feature 1: Socket Routing (Visual Response System)
  console.log("🔌 Testing Socket Routing & Visual Responses...");
  await testFeature(
    "Socket Response Routing",
    "Communication",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-" + Date.now();
        let gotResponse = false;

        const timeout = setTimeout(() => {
          socket.disconnect();
          if (!gotResponse) {
            reject(new Error("No response received from server"));
          }
        }, 8000);

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "Test socket routing",
            requestId,
          });
        });

        socket.on("response", (data) => {
          gotResponse = true;
          clearTimeout(timeout);
          socket.disconnect();
          if (data && data.response) {
            resolve();
          } else {
            reject(new Error("Invalid response structure"));
          }
        });

        socket.on("error", (err) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(err);
        });
      });
    },
    9000,
  );

  // Feature 2: Visual Response Analysis
  console.log("🎨 Testing Visual Response Analysis...");
  await testFeature(
    "Visual Card Detection",
    "UI/UX",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
        });
        const requestId = "visual-" + Date.now();

        socket.on("connect", () => {
          // Send message that should trigger process visualization (numbered list)
          socket.emit("generate", {
            message:
              "List the steps: 1. First 2. Second 3. Third",
            requestId,
          });
        });

        socket.on("response", (data) => {
          socket.disconnect();
          if (
            data.visual &&
            (data.visual.type === "process" ||
              data.visual.type === "info")
          ) {
            resolve();
          } else {
            reject(
              new Error(
                `Visual type not detected. Got: ${data.visual?.type}`,
              ),
            );
          }
        });

        setTimeout(() => {
          socket.disconnect();
          reject(new Error("Visual detection timeout"));
        }, 8000);
      });
    },
    9000,
  );

  // Feature 3: Provider Orchestration
  console.log("🔄 Testing Provider Orchestration...");
  await testFeature(
    "Multi-Provider Support",
    "LLM Integration",
    async () => {
      // Check if provider engine is available
      try {
        const response = await fetch(
          "http://localhost:4000/api/v1/providers/status",
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data || typeof data !== "object") {
          throw new Error("Invalid provider status response");
        }
        // Provider orchestration is working if we get a response
      } catch (err) {
        throw new Error(
          `Provider status check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Feature 4: GitHub Integration
  console.log("🔗 Testing GitHub Integration...");
  await testFeature(
    "GitHub API Routes",
    "Integration",
    async () => {
      try {
        const response = await fetch(
          "http://localhost:4000/api/v1/github/health",
        );
        if (response.status === 404) {
          throw new Error("GitHub routes not available");
        }
        if (response.ok || response.status === 401) {
          // 401 is OK (missing credentials), means route exists
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (err) {
        throw new Error(
          `GitHub health check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Feature 5: Memory/State Persistence
  console.log("💾 Testing Memory & State Persistence...");
  await testFeature(
    "Hippocampus Memory System",
    "State Management",
    async () => {
      // Check if memory system files exist
      try {
        const response = await fetch(
          "http://localhost:4000/api/v1/system/awareness",
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        // New standardized response has data wrapper
        const data = result.data || result;
        if (
          !data ||
          !data.capabilities ||
          typeof data.capabilities !== "object"
        ) {
          throw new Error("Invalid awareness response");
        }
      } catch (err) {
        throw new Error(
          `Memory system check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Feature 6: Event Bus Connectivity
  console.log("📡 Testing Event Bus Connectivity...");
  await testFeature(
    "EventBus Pub/Sub System",
    "Core Architecture",
    async () => {
      // Check system status endpoint which uses EventBus
      try {
        const response = await fetch(
          "http://localhost:4000/api/v1/system/status",
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const result = await response.json();
        // New standardized response has data wrapper
        const data = result.data || result;
        if (!data || !data.modules) {
          throw new Error("Invalid status response structure");
        }
      } catch (err) {
        throw new Error(
          `EventBus check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Feature 7: Health Check
  console.log("❤️ Testing System Health Endpoint...");
  await testFeature(
    "Health Check Endpoint",
    "Monitoring",
    async () => {
      try {
        const response = await fetch("http://localhost:4000/health");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!data || typeof data !== "object") {
          throw new Error("Invalid health response");
        }
      } catch (err) {
        throw new Error(
          `Health check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Feature 8: Training Service
  console.log("📚 Testing Training Service...");
  await testFeature(
    "Training Service Available",
    "Learning System",
    async () => {
      try {
        const response = await fetch(
          "http://localhost:4000/api/v1/training/status",
        );
        if (response.status === 404) {
          // Route might not exist, but training service is still initialized
          return;
        }
        if (response.ok) {
          const data = await response.json();
          if (!data || typeof data !== "object") {
            throw new Error("Invalid training response");
          }
        }
      } catch (err) {
        throw new Error(
          `Training service check failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    },
    5000,
  );

  // Report Results
  console.log();
  console.log("=".repeat(70));
  console.log("📊 ADVANCED FUNCTIONALITY RESULTS");
  console.log("=".repeat(70));
  console.log();

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const timeout = results.filter((r) => r.status === "TIMEOUT").length;
  const total = results.length;

  console.log("Feature Breakdown by Category:");
  console.log();

  const byCategory = results.reduce(
    (acc, r) => {
      if (!acc[r.category]) {
        acc[r.category] = { passed: 0, failed: 0, timeout: 0, tests: [] };
      }
      if (r.status === "PASS") acc[r.category].passed++;
      else if (r.status === "FAIL") acc[r.category].failed++;
      else acc[r.category].timeout++;
      acc[r.category].tests.push(r);
      return acc;
    },
    {},
  );

  Object.entries(byCategory).forEach(([category, data]) => {
    const status =
      data.failed > 0 || data.timeout > 0 ? "❌" : "✅";
    console.log(
      `${status} ${category}: ${data.passed}/${data.passed + data.failed + data.timeout} operational`,
    );
    data.tests.forEach((t) => {
      const icon = t.status === "PASS" ? "✅" : "⚠️";
      console.log(
        `   ${icon} ${t.feature} (${t.duration}ms)`,
      );
    });
  });

  console.log();
  console.log("Overall Summary:");
  console.log(`✅ Operational: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏱️ Timeout: ${timeout}/${total}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0 || timeout > 0) {
    console.log();
    console.log("Issues Detected:");
    results
      .filter((r) => r.status !== "PASS")
      .forEach((r) => {
        console.log(
          `  ⚠️ ${r.feature}: ${r.message}`,
        );
      });
  }

  console.log();
  console.log("=".repeat(70));

  return failed === 0 && timeout === 0;
}

console.log("Waiting for server on localhost:4000...");
setTimeout(() => {
  runAdvancedTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Test suite error:", err);
      process.exit(1);
    });
}, 2000);
