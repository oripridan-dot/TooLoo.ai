import { ArenaStore } from "../src/precog/training/arena-store";
import path from "path";
import fs from "fs-extra";

async function testArenaStore() {
  console.log("🧪 Testing ArenaStore...");

  const testDir = path.join(process.cwd(), "temp_test_arena");
  await fs.ensureDir(testDir);

  const store = new ArenaStore(testDir); // Use temp dir to avoid messing with real data

  console.log("1. Initializing...");
  await store.initialize();

  console.log("2. Adding event...");
  const event = {
    id: "test_1",
    eventType: "query",
    query: "Test Query",
    providers: ["anthropic"],
    source: "test",
    timestamp: new Date().toISOString(),
  };
  await store.addEvent(event);

  console.log("3. Retrieving events...");
  const events = await store.getEvents();
  console.log(`   Retrieved ${events.length} events.`);

  if (events.length !== 1 || events[0].id !== "test_1") {
    throw new Error("Event retrieval failed!");
  }

  console.log("4. Verifying persistence...");
  // Wait for debounce save
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const filePath = path.join(testDir, "data/training/arena-events.json");
  if (!(await fs.pathExists(filePath))) {
    throw new Error("File not saved to disk!");
  }

  const fileContent = await fs.readJson(filePath);
  if (fileContent.length !== 1) {
    throw new Error("File content incorrect!");
  }

  console.log("✅ ArenaStore Test Passed!");

  // Cleanup
  await fs.remove(testDir);
}

testArenaStore().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
