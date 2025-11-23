import { startNexus } from "../src/nexus/index.js";
import { cortex } from "../src/cortex/index.js";
import fs from "fs/promises";
import path from "path";

// Polyfill fetch if needed (Node 18+ has it global)
const fetch = global.fetch || (await import("node-fetch")).default;

const TEST_PORT = 4005;
process.env.PORT = String(TEST_PORT);

async function runTest() {
  console.log("Starting Nexus Integration Test...");

  // Initialize Cortex
  await cortex.init();

  // Start Nexus
  startNexus(TEST_PORT);

  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const testDir = path.join(process.cwd(), "test-nexus-dir");
  const projectTestDir = path.join(process.cwd(), "projects", "test-nexus-dir");

  // Clean up previous run
  try {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(projectTestDir, { recursive: true, force: true });
  } catch {}

  const prompt = "create directory test-nexus-dir";
  console.log(`Sending chat request: "${prompt}"`);

  try {
    const response = await fetch(
      `http://localhost:${TEST_PORT}/api/v1/chat/message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      }
    );

    const data: any = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    if (
      data.response &&
      (data.response.includes("Task completed") ||
        data.response.includes("Executed"))
    ) {
      console.log("✅ Chat response indicates success.");
    } else {
      console.error("❌ Chat response does not indicate success.");
      process.exit(1);
    }

    // Verify directory creation
    try {
      await fs.access(testDir);
      console.log("✅ Directory created successfully (root).");
    } catch {
      try {
        await fs.access(projectTestDir);
        console.log("✅ Directory created successfully (projects/).");
      } catch {
        console.error("❌ Directory was NOT created.");
        process.exit(1);
      }
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
    process.exit(1);
  }

  // Test 2: Conversation
  const chatPrompt = "What is your name?";
  console.log(`Sending chat request: "${chatPrompt}"`);
  try {
    const response = await fetch(
      `http://localhost:${TEST_PORT}/api/v1/chat/message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatPrompt }),
      }
    );
    const data: any = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));
    if (data.response && data.response.length > 0) {
      console.log("✅ Chat response received.");
    } else {
      console.error("❌ No chat response.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Request failed:", error);
    process.exit(1);
  }

  console.log("Test Complete.");
  process.exit(0);
}

runTest();
