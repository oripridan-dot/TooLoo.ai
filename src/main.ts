// @version 2.1.11
import { bus } from "./core/event-bus.js";
import { cortex } from "./cortex/index.js";
import { precog } from "./precog/index.js";
import { startNexus } from "./nexus/index.js";
import { VersionManager } from "./nexus/engine/version-manager.js";

async function bootstrap() {
  console.log("----------------------------------------");
  console.log("   TooLoo.ai V2.1 • Synapsys Architecture    ");
  console.log("----------------------------------------");

  // Global Error Handling
  process.on("uncaughtException", (err) => {
    console.error("[System] Uncaught Exception:", err);
  });

  // Initialize Modules
  try {
    await cortex.init();
    await precog.init();
    startNexus(); // Not async anymore, starts the server

    // Initialize Version Manager
    const versionManager = new VersionManager(bus, process.cwd());
    versionManager.start();

    bus.publish("system", "system:boot_complete", {});
    console.log("[System] All systems nominal.");

    // Keep-alive to prevent process exit if event loop empties (unlikely with Express, but safe)
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (error) {
    console.error("[System] Boot failed:", error);
    process.exit(1);
  }
}

bootstrap();
