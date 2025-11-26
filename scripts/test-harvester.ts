import { precog } from "../src/precog/index.js";

async function main() {
  console.log("--- Starting Harvester Test ---");

  try {
    console.log("\n1. Testing Static Harvest (example.com)...");
    const staticResult = await precog.harvester.harvest({
      url: "https://example.com",
      type: "static",
    });
    console.log("Static Result:", JSON.stringify(staticResult, null, 2));

    if (staticResult.verification) {
      console.log(
        "Verification Score:",
        staticResult.verification.confidenceScore,
      );
    }
  } catch (error) {
    console.error("Static Harvest Failed:", error);
  }

  // Wait for memory events to propagate
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log("\n--- Test Complete ---");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
