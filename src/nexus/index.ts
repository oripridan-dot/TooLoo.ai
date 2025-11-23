// @version 2.1.34
import express from "express";
import path from "path";
import { bus } from "../core/event-bus.js";
import apiRoutes from "./routes/api.js";
import systemRoutes from "./routes/system.js";
import providersRoutes from "./routes/providers.js";
import orchestratorRoutes from "./routes/orchestrator.js";
import capabilitiesRoutes from "./routes/capabilities.js";
import githubRoutes from "./routes/github.js";
import projectsRoutes from "./routes/projects.js";
import chatRoutes from "./routes/chat.js";
import designRoutes from "./routes/design.js";
import { trainingRoutes } from "./routes/training.js";

export function startNexus(port?: number) {
  const PORT = port || Number(process.env.PORT) || 4000;
  const app = express();

  app.use(express.json());

  // System Routes
  app.use("/api/v1/system", systemRoutes);
  app.use("/api/v1/providers", providersRoutes);
  app.use("/api/v1/orchestrator", orchestratorRoutes);
  app.use("/api/v1/capabilities", capabilitiesRoutes);
  app.use("/api/v1/github", githubRoutes);
  app.use("/api/v1/projects", projectsRoutes);
  app.use("/api/v1/chat", chatRoutes);
  app.use("/api/v1/design", designRoutes);

  // Training & Sources Routes (Precog)
  app.use("/api/v1", trainingRoutes);

  // API Routes
  app.use("/api/v1", apiRoutes);
  // Legacy alias
  app.use("/api", apiRoutes);

  // Legacy System Control
  app.post("/system/start", (req, res) => {
    bus.publish("nexus", "system:start_request", {});
    res.json({ ok: true, message: "System start initiated" });
  });

  app.post("/system/stop", (req, res) => {
    bus.publish("nexus", "system:stop_request", {});
    res.json({ ok: true, message: "System stop initiated" });
  });

  // Static Files (Web App)
  const webAppPath = path.join(process.cwd(), "src", "web-app");
  app.use(express.static(webAppPath));
  console.log(`[Nexus] Serving static files from: ${webAppPath}`);

  // Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus] Web Server running on port ${PORT}`);
    bus.publish("nexus", "nexus:started", { port: PORT });
  });
}
