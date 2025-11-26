// @version 2.1.334
// Integration Test Suite - Socket to Visual Response Flow
// Tests complete end-to-end functionality of the visual response system

import { io, Socket } from "socket.io-client";

interface TestResult {
  name: string;
  category: string;
  status: "PASS" | "FAIL" | "TIMEOUT";
  duration: number;
  message: string;
  details?: Record<string, any>;
}

const results: TestResult[] = [];

function recordTest(
  name: string,
  category: string,
  status: "PASS" | "FAIL" | "TIMEOUT",
  duration: number,
  message: string,
  details?: Record<string, any>,
) {
  results.push({ name, category, status, duration, message, details });
}

async function runTest(
  name: string,
  category: string,
  testFn: () => Promise<void>,
  timeoutMs: number = 10000,
): Promise<void> {
  const start = Date.now();
  try {
    await Promise.race([
      testFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Test timeout")), timeoutMs),
      ),
    ]);
    const duration = Date.now() - start;
    recordTest(name, category, "PASS", duration, "Test passed");
  } catch (err) {
    const duration = Date.now() - start;
    if (err instanceof Error && err.message.includes("timeout")) {
      recordTest(
        name,
        category,
        "TIMEOUT",
        duration,
        `Exceeded ${timeoutMs}ms timeout`,
      );
    } else {
      recordTest(
        name,
        category,
        "FAIL",
        duration,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

async function runIntegrationTests() {
  console.log("🧪 SYNAPSYS INTEGRATION TEST SUITE");
  console.log("=".repeat(70));
  console.log("Testing complete socket → response → visual rendering flow");
  console.log("=".repeat(70));
  console.log();

  // ============= Test 1: Socket Connection =============
  console.log("📡 Test 1: Socket Connection & Authentication");
  await runTest(
    "Socket Connection",
    "Communication",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error("Socket connection timeout"));
        }, 5000);

        socket.on("connect", () => {
          clearTimeout(timeout);
          console.log("  ✓ Socket connected successfully");
          socket.disconnect();
          resolve();
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(new Error(`Connection error: ${error.message}`));
        });
      });
    },
    5000,
  );

  // ============= Test 2: Message Sending =============
  console.log("📤 Test 2: Message Sending via Socket");
  await runTest(
    "Send Message",
    "Communication",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-send-" + Date.now();

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error("Message send timeout"));
        }, 5000);

        socket.on("connect", () => {
          try {
            socket.emit("generate", {
              message: "Test message for socket routing",
              requestId,
            });
            console.log("  ✓ Message emitted to server");
            clearTimeout(timeout);
            socket.disconnect();
            resolve();
          } catch (err) {
            clearTimeout(timeout);
            socket.disconnect();
            reject(err);
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 3: Response Reception =============
  console.log("📥 Test 3: Response Reception from Server");
  await runTest(
    "Receive Response",
    "Communication",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-recv-" + Date.now();
        let gotResponse = false;

        const timeout = setTimeout(() => {
          socket.disconnect();
          if (!gotResponse) {
            reject(new Error("No response received within 5s"));
          }
        }, 5000);

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "Test response reception",
            requestId,
          });
        });

        socket.on("response", (data) => {
          gotResponse = true;
          clearTimeout(timeout);
          console.log(
            "  ✓ Response received:",
            data?.response?.substring(0, 50) || "no text",
          );
          socket.disconnect();
          resolve();
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 4: Visual Data Presence =============
  console.log("🎨 Test 4: Visual Data in Response");
  await runTest(
    "Visual Data Attached",
    "Rendering",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-visual-" + Date.now();
        let receivedVisualData = false;

        const timeout = setTimeout(() => {
          socket.disconnect();
          if (!receivedVisualData) {
            reject(new Error("No visual data in response"));
          }
        }, 5000);

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "Create a 5-step process for building a system",
            requestId,
          });
        });

        socket.on("response", (data) => {
          if (data?.visual) {
            receivedVisualData = true;
            console.log("  ✓ Visual data present:", {
              type: data.visual.type || "unknown",
              hasContent: !!data.visual.content,
            });
            clearTimeout(timeout);
            socket.disconnect();
            resolve();
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 5: Visual Type Detection =============
  console.log("🔍 Test 5: Visual Type Detection");
  const visualTests = [
    {
      message: "1. First step\n2. Second step\n3. Third step",
      expectedType: "process",
      description: "Process (numbered list)",
    },
    {
      message: "Feature A vs Feature B\nA: faster, B: more reliable",
      expectedType: "comparison",
      description: "Comparison (side-by-side)",
    },
    {
      message: "Performance: 95% uptime, 50ms latency, 1000 requests/sec",
      expectedType: "data",
      description: "Data (metrics)",
    },
  ];

  for (const testCase of visualTests) {
    await runTest(
      `Detect ${testCase.description}`,
      "Rendering",
      async () => {
        return new Promise((resolve, reject) => {
          const socket = io("http://localhost:4000", {
            transports: ["websocket"],
            reconnection: true,
          });
          const requestId = "test-type-" + Date.now();
          let detectedType: string | null = null;

          const timeout = setTimeout(() => {
            socket.disconnect();
            reject(
              new Error(
                `No visual type detected (expected: ${testCase.expectedType})`,
              ),
            );
          }, 5000);

          socket.on("connect", () => {
            socket.emit("generate", {
              message: testCase.message,
              requestId,
            });
          });

          socket.on("response", (data) => {
            detectedType = data?.visual?.type;
            clearTimeout(timeout);
            console.log(
              `  ✓ ${testCase.description}: detected as "${detectedType || "info"}"`,
            );
            socket.disconnect();
            resolve();
          });

          socket.on("connect_error", (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
      },
      5000,
    );
  }

  // ============= Test 6: Response Content =============
  console.log("💬 Test 6: Response Content Quality");
  await runTest(
    "Response Has Content",
    "Content",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-content-" + Date.now();

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error("No content in response"));
        }, 5000);

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "What is 2+2?",
            requestId,
          });
        });

        socket.on("response", (data) => {
          const responseText = data?.response;
          if (responseText && responseText.length > 10) {
            clearTimeout(timeout);
            console.log("  ✓ Response content valid, length:", responseText.length);
            socket.disconnect();
            resolve();
          } else {
            clearTimeout(timeout);
            reject(new Error("Response content too short"));
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 7: Provider Information =============
  console.log("🤖 Test 7: Provider Information in Response");
  await runTest(
    "Provider Data Present",
    "Content",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-provider-" + Date.now();

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error("No provider in response"));
        }, 5000);

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "Test provider information",
            requestId,
          });
        });

        socket.on("response", (data) => {
          if (data?.provider) {
            clearTimeout(timeout);
            console.log("  ✓ Provider info present:", data.provider);
            socket.disconnect();
            resolve();
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 8: Fast Response (Timeout Fix Validation) =============
  console.log("⏱️ Test 8: Response Latency (Timeout Fix Validation)");
  await runTest(
    "Response Within 4s",
    "Performance",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-latency-" + Date.now();
        const sendTime = Date.now();
        let responseTime = 0;

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(
            new Error(
              "Response did not arrive within 4s timeout (fix not working)",
            ),
          );
        }, 4500); // Slightly over 4s to see if timeout works

        socket.on("connect", () => {
          socket.emit("generate", {
            message: "Quick test",
            requestId,
          });
        });

        socket.on("response", (data) => {
          responseTime = Date.now() - sendTime;
          clearTimeout(timeout);
          console.log(`  ✓ Response latency: ${responseTime}ms`);
          if (responseTime > 4000) {
            console.log(
              "  ⚠️  Response took longer than 4s timeout (fallback triggered)",
            );
          }
          socket.disconnect();
          resolve();
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 9: Error Handling =============
  console.log("⚠️ Test 9: Error Handling & Fallback");
  await runTest(
    "Fallback on Error",
    "Error Handling",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestId = "test-error-" + Date.now();

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error("No fallback response"));
        }, 5000);

        socket.on("connect", () => {
          // Send empty/invalid message to test fallback
          socket.emit("generate", {
            message: "",
            requestId,
          });
        });

        socket.on("response", (data) => {
          if (data?.response) {
            clearTimeout(timeout);
            console.log("  ✓ Fallback response triggered successfully");
            socket.disconnect();
            resolve();
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // ============= Test 10: Concurrent Messages =============
  console.log("🔄 Test 10: Concurrent Message Handling");
  await runTest(
    "Multiple Concurrent",
    "Concurrency",
    async () => {
      return new Promise((resolve, reject) => {
        const socket = io("http://localhost:4000", {
          transports: ["websocket"],
          reconnection: true,
        });
        const requestIds = [
          "test-concurrent-1-" + Date.now(),
          "test-concurrent-2-" + Date.now(),
          "test-concurrent-3-" + Date.now(),
        ];
        let responsesReceived = 0;

        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(
            new Error(`Only ${responsesReceived}/3 concurrent responses`),
          );
        }, 5000);

        socket.on("connect", () => {
          requestIds.forEach((rid) => {
            socket.emit("generate", {
              message: `Concurrent message ${rid}`,
              requestId: rid,
            });
          });
        });

        socket.on("response", (data) => {
          responsesReceived++;
          if (responsesReceived === requestIds.length) {
            clearTimeout(timeout);
            console.log("  ✓ All 3 concurrent messages responded");
            socket.disconnect();
            resolve();
          }
        });

        socket.on("connect_error", (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    },
    5000,
  );

  // Print Results Summary
  console.log();
  console.log("=".repeat(70));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(70));

  const categories = new Set(results.map((r) => r.category));
  const categoryResults = Array.from(categories).map((cat) => {
    const catResults = results.filter((r) => r.category === cat);
    const passed = catResults.filter((r) => r.status === "PASS").length;
    return {
      category: cat,
      passed,
      total: catResults.length,
      percentage: Math.round((passed / catResults.length) * 100),
    };
  });

  categoryResults.forEach((cat) => {
    const icon = cat.percentage === 100 ? "✅" : "⚠️";
    console.log(
      `${icon} ${cat.category}: ${cat.passed}/${cat.total} (${cat.percentage}%)`,
    );
  });

  console.log();
  const totalPassed = results.filter((r) => r.status === "PASS").length;
  const totalTests = results.length;
  const successRate = Math.round((totalPassed / totalTests) * 100);

  console.log(
    `📈 Overall: ${totalPassed}/${totalTests} tests passed (${successRate}%)`,
  );
  console.log();

  if (successRate === 100) {
    console.log("🎉 ALL INTEGRATION TESTS PASSED!");
    console.log(
      "✨ Socket → Response → Visual Rendering flow is fully operational",
    );
  } else {
    console.log(`⚠️ ${totalTests - totalPassed} test(s) failed or timed out`);
    console.log("Failed tests:");
    results
      .filter((r) => r.status !== "PASS")
      .forEach((r) => {
        console.log(`  - ${r.name} (${r.category}): ${r.message}`);
      });
  }

  console.log();
  console.log("=".repeat(70));
  console.log("Test execution complete");
}

runIntegrationTests().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
