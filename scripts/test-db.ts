import { memoryRepository } from "../src/core/repositories/MemoryRepository.js";

async function testDB() {
  console.log("🧪 Testing SQLite Data Layer...");

  const id = Math.random().toString(36).substring(7);
  const entry = {
    id,
    timestamp: Date.now(),
    type: "thought" as const,
    content: { text: "Testing SQLite persistence" },
    tags: ["test", "sqlite"],
    transactionId: "tx-123",
  };

  console.log("1. Saving memory...");
  memoryRepository.save(entry);

  console.log("2. Retrieving recent memories...");
  const recent = memoryRepository.getRecent(10);
  const saved = recent.find((m) => m.id === id);

  if (saved) {
    console.log("✅ Memory found in DB!");
    console.log("   Content:", saved.content);
    console.log("   Tags:", saved.tags);
  } else {
    console.error("❌ Memory NOT found in DB.");
  }

  console.log("3. Checking count...");
  const count = memoryRepository.count();
  console.log(`   Total memories: ${count}`);

  process.exit(0);
}

testDB();
