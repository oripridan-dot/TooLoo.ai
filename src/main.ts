// @version 2.1.263
import "dotenv/config";
import { bus } from "./core/event-bus.js";
import { cortex } from "./cortex/index.js";
import { precog } from "./precog/index.js";
import { startNexus } from "./nexus/index.js";
import { VersionManager } from "./nexus/engine/version-manager.js";
import { SYSTEM_VERSION, SYSTEM_ID, SYSTEM_NAME } from "./core/system-info.js";
import { registry } from "./core/module-registry.js";

async function bootstrap() {
  console.log("----------------------------------------");
  console.log(`   ${SYSTEM_NAME} V${SYSTEM_VERSION} • Synapsys Architecture    `);
  console.log(`   Session ID: ${SYSTEM_ID}`);
  console.log("----------------------------------------");

  // Global Error Handling
  process.on("uncaughtException", (err) => {
    console.error("[System] Uncaught Exception:", err);
    registry.updateStatus("system", "error", { error: err.message });
  });

  // Register System Core
  registry.register({
    name: "system",
    version: SYSTEM_VERSION,
    status: "booting",
    meta: { id: SYSTEM_ID }
  });

  // Initialize Modules
  try {
    await cortex.init();
    registry.updateStatus("cortex", "ready");

    await precog.init();
    registry.updateStatus("precog", "ready");

    startNexus(); // Not async anymore, starts the server
    registry.updateStatus("nexus", "ready");

    // Initialize Version Manager
    const versionManager = new VersionManager(bus, process.cwd());
    versionManager.start();

    bus.publish("system", "system:boot_complete", { version: SYSTEM_VERSION });
    registry.updateStatus("system", "ready");
    console.log("[System] All systems nominal.");

    // System Heartbeat (Sync Pulse)
    setInterval(() => {
        bus.publish("system", "system:heartbeat", {
            timestamp: Date.now(),
            uptime: process.uptime(),
            modules: registry.getAll()
        });
    }, 5000);

  } catch (error) {
    console.error("[System] Boot failed:", error);
    registry.updateStatus("system", "error", { error: String(error) });
    process.exit(1);
  }
}

bootstrap();
