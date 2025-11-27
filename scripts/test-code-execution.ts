// @version 2.2.5
import { EventBus } from "../src/core/event-bus.js";
import { Planner } from "../src/cortex/planning/planner.js";
import { Reflector } from "../src/cortex/planning/reflector.js";
import { ArtifactLedger } from "../src/nexus/engine/artifact-ledger.js";
import { ExecutionEngine } from "../src/nexus/engine/execution-engine.js";

async function main() {
  console.log("Starting Code Execution Test...");

  const bus = new EventBus();
  const planner = new Planner(bus);
  const reflector = new Reflector(bus);
  const ledger = new ArtifactLedger();
  const engine = new ExecutionEngine(ledger, reflector);

  const goal = "Calculate the 10th Fibonacci number using Python and print the result.";
  
  console.log(`\n1. Generating Plan for: "${goal}"`);
  const plan = await planner.createPlan(goal);
  
  console.log("\n2. Plan Generated:");
  console.log(JSON.stringify(plan, null, 2));

  console.log("\n3. Executing Plan...");
  await engine.executePlan(plan);

  console.log("\n4. Verifying Artifacts...");
  const artifacts = ledger.searchArtifacts({ type: "data" });
  console.log("Artifacts found:", artifacts);

  if (artifacts.length > 0) {
    const latest = ledger.getArtifact(artifacts[artifacts.length - 1].artifactId);
    console.log("\nLatest Artifact Content:");
    console.log(latest?.currentVersion.content);
  }
}

main().catch(console.error);
