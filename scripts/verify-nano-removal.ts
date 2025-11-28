// @version 2.2.86

import CapabilitiesManager from "../src/cortex/engine/capabilities-manager.js";
import { GeminiImageProvider } from "../src/precog/providers/gemini-image.js";

async function verify() {
  console.log("Verifying Removal of Nano Banana...");

  // Check Capabilities Manager
  const capMgr = CapabilitiesManager.getInstance();
  const cap = capMgr.getCapabilityDetails("image.context.code-generation.gemini");
  
  if (cap) {
      if (cap.description.includes("DeSign Studio") && !cap.description.includes("Nano Banana")) {
          console.log("✅ Capability description updated.");
      } else {
          console.error("❌ Capability description update failed:", cap.description);
      }

      if (cap.metadata?.codeName === "DeSignStudio") {
          console.log("✅ Capability codeName updated.");
      } else {
          console.error("❌ Capability codeName update failed:", cap.metadata?.codeName);
      }
  } else {
      console.error("❌ Capability not found.");
  }

  // Check Provider Name
  const provider = new GeminiImageProvider();
  if (provider.name === "GeminiDeSign") {
      console.log("✅ Provider name updated.");
  } else {
      console.error("❌ Provider name update failed:", provider.name);
  }

}

verify().catch(console.error);
