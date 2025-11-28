// @version 2.2.82

import { TOOLOO_PERSONA } from "../src/cortex/persona.js";
import fs from "fs";
import path from "path";

async function verify() {
  console.log("Verifying System Identity...");

  // Check Persona
  if (TOOLOO_PERSONA.includes("Ori Pridan") && TOOLOO_PERSONA.includes("DeSign Studio")) {
    console.log("✅ Persona updated correctly.");
  } else {
    console.error("❌ Persona update failed.");
    console.log(TOOLOO_PERSONA);
  }

  // Check Chat Route
  const chatRoutePath = path.join(process.cwd(), "src/nexus/routes/chat.ts");
  const chatRouteContent = fs.readFileSync(chatRoutePath, "utf-8");

  if (chatRouteContent.includes("Ori Pridan") && chatRouteContent.includes("DeSign Studio") && !chatRouteContent.includes("Nano Banana Studio")) {
     console.log("✅ Chat route updated correctly.");
  } else {
     console.error("❌ Chat route update failed.");
     if (chatRouteContent.includes("Nano Banana Studio")) console.log("Found 'Nano Banana Studio'");
     if (!chatRouteContent.includes("Ori Pridan")) console.log("Missing 'Ori Pridan'");
  }

  // Check SDK
  const sdkPath = path.join(process.cwd(), "src/sdk/visual.ts");
  const sdkContent = fs.readFileSync(sdkPath, "utf-8");
  if (sdkContent.includes("DeSign Studio") && !sdkContent.includes("Nano Banana Studio")) {
    console.log("✅ SDK updated correctly.");
  } else {
    console.error("❌ SDK update failed.");
  }
  
  // Check Instructions
  const instructionsPath = path.join(process.cwd(), ".github/copilot-instructions.md");
  const instructionsContent = fs.readFileSync(instructionsPath, "utf-8");
  if (instructionsContent.includes("Ori Pridan")) {
      console.log("✅ Instructions updated correctly.");
  } else {
      console.error("❌ Instructions update failed.");
  }

}

verify().catch(console.error);
