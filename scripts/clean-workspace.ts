import { smartFS } from "../src/core/fs-manager.js";

async function main() {
  console.log("🧹 Starting Deep Clean...");
  const count = await smartFS.cleanRecovery(5);
  console.log(`✅ Cleanup complete. Removed ${count} files.`);
}

main().catch(console.error);
