// @version 2.1.28
import { bus } from "./core/event-bus.js";
import { cortex } from "./cortex/index.js";
import { precog } from "./precog/index.js";
import { startNexus } from "./nexus/index.js";
import { VersionManager } from "./nexus/engine/version-manager.js";
import * as fs from "fs";
import * as path from "path";

async function bootstrap() {
  // Read version from package.json
  let version = "Unknown";
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"));
    version = pkg.version;
  } catch (e) {
    console.warn("[System] Could not read version from package.json");
  }

  console.log("----------------------------------------");
  console.log(`   TooLoo.ai V${version} • Synapsys Architecture    `);
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
