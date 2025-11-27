// @version 2.1.386
import "dotenv/config";
import * as readline from "readline";
import { bus } from "./core/event-bus.js";
import "./core/quality/Critic.js"; // Initialize The Critic (Synapsys V3)
import { cortex } from "./cortex/index.js";
import { precog } from "./precog/index.js";
import { startNexus } from "./nexus/index.js";
import { VersionManager } from "./nexus/engine/version-manager.js";
import { SYSTEM_VERSION, SYSTEM_ID, SYSTEM_NAME } from "./core/system-info.js";
import { registry } from "./core/module-registry.js";
import { smartFS } from "./core/fs-manager.js";

let heartbeatInterval: NodeJS.Timeout | null = null;

function gracefulShutdown(reason: string = "user request") {
  console.log(`\n[System] Shutting down... (${reason})`);
  registry.updateStatus("system", "degraded", { shutdownReason: reason });

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  bus.publish("system", "system:shutdown", { reason, timestamp: Date.now() });

  console.log("[System] Goodbye! 👋");
  process.exit(0);
}

async function bootstrap() {
  console.log("----------------------------------------");
  console.log(
    `   ${SYSTEM_NAME} V${SYSTEM_VERSION} • Synapsys Architecture    `,
  );
  console.log(`   Session ID: ${SYSTEM_ID}`);
  console.log("----------------------------------------");

  // Global Error Handling
  process.on("uncaughtException", (err) => {
    console.error("[System] Uncaught Exception:", err);
    registry.updateStatus("system", "error", { error: err.message });
  });

  // Graceful shutdown handlers
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

  // Register System Core
  registry.register({
    name: "system",
    version: SYSTEM_VERSION,
    status: "booting",
    meta: { id: SYSTEM_ID },
  });

  // Initialize Modules
  try {
    // Cleanup temp files on startup to prevent memory bloat
    await smartFS.cleanRecovery(5);
    console.log("[System] Startup cleanup complete.");

    await cortex.init();
    registry.updateStatus("cortex", "ready");

    await precog.init();
    registry.updateStatus("precog", "ready");

    await startNexus(); // Not async anymore, starts the server
    registry.updateStatus("nexus", "ready");

    // Initialize Version Manager
    const versionManager = new VersionManager(bus, process.cwd());
    versionManager.start();

    bus.publish("system", "system:boot_complete", { version: SYSTEM_VERSION });
    registry.updateStatus("system", "ready");
    console.log("[System] All systems nominal.");
    console.log("----------------------------------------");
    console.log("   Press 'q' + Enter or Ctrl+C to exit");
    console.log("----------------------------------------");

    // System Heartbeat (Sync Pulse)
    heartbeatInterval = setInterval(() => {
      bus.publish("system", "system:heartbeat", {
        timestamp: Date.now(),
        uptime: process.uptime(),
        modules: registry.getAll(),
      });
    }, 5000);

    // Interactive exit listener
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.on("line", (input) => {
        const cmd = input.trim().toLowerCase();
        if (cmd === "q" || cmd === "quit" || cmd === "exit") {
          rl.close();
          gracefulShutdown("user typed quit");
        } else if (cmd === "status") {
          console.log(
            "[System] Modules:",
            JSON.stringify(registry.getAll(), null, 2),
          );
        } else if (cmd === "help") {
          console.log("Commands: q/quit/exit, status, help");
        }
      });

      // Removed auto-shutdown on close to prevent background process termination
      // rl.on("close", () => {
      //   gracefulShutdown("input closed");
      // });
    }
  } catch (error) {
    console.error("[System] Boot failed:", error);
    registry.updateStatus("system", "error", { error: String(error) });
    process.exit(1);
  }
}

bootstrap();
