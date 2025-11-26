// @version 2.1.309
import express from "express";
import { createServer } from "http";
import path from "path";
import { bus } from "../core/event-bus.js";
import { SocketServer } from "./socket.js";
import apiRoutes from "./routes/api.js";
import systemRoutes from "./routes/system.js";
import providersRoutes from "./routes/providers.js";
import orchestratorRoutes from "./routes/orchestrator.js";
import capabilitiesRoutes from "./routes/capabilities.js";
import githubRoutes from "./routes/github.js";
import projectsRoutes from "./routes/projects.js";
import chatRoutes from "./routes/chat.js";
import designRoutes from "./routes/design.js";
import visualsRoutes from "./routes/visuals.js";
import workflowsRoutes from "./routes/workflows.js";
import observabilityRoutes from "./routes/observability.js";
import contextRoutes from "./routes/context.js";
import learningRoutes from "./routes/learning.js";
import assetsRoutes from "./routes/assets.js";
import { trainingRoutes } from "./routes/training.js";
import { registry } from "../core/module-registry.js";
import { SYSTEM_VERSION } from "../core/system-info.js";
import { autoArchitect } from "./auto-architect.js";
import { NexusInterface } from "./interface.js";

export function createNexusApp() {
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
  app.use("/api/v1/visuals", visualsRoutes);
  app.use("/api/v1/workflows", workflowsRoutes);
  app.use("/api/v1/observability", observabilityRoutes);
  app.use("/api/v1/context", contextRoutes);
  app.use("/api/v1/learning", learningRoutes);
  app.use("/api/v1/assets", assetsRoutes);

  // Training & Sources Routes (Precog)
  app.use("/api/v1", trainingRoutes);

  // API Routes
  app.use("/api/v1", apiRoutes);
  // Legacy alias
  app.use("/api", apiRoutes);

  // Redirect /visuals.html to /app/visuals.html
  app.get("/visuals.html", (req, res) => {
    res.redirect("/app/visuals.html");
  });

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

  // Serve React App Build
  const distPath = path.join(process.cwd(), "src", "web-app", "dist");
  app.use("/app", express.static(distPath));
  console.log(`[Nexus] Serving React app from: ${distPath}`);

  // Health Check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
}

export function startNexus(port?: number) {
  const PORT = port || Number(process.env.PORT) || 4000;

  // Initialize Auto-Architect
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  autoArchitect;
  // Initialize Nexus Interface (Synapse)
  new NexusInterface();

  registry.register({
    name: "nexus",
    version: SYSTEM_VERSION,
    status: "booting",
    meta: { port: PORT },
  });

  const app = createNexusApp();
  const httpServer = createServer(app);

  // Initialize Socket Server
  new SocketServer(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nexus] Web Server running on port ${PORT}`);
    bus.publish("nexus", "nexus:started", { port: PORT });
  });
}
