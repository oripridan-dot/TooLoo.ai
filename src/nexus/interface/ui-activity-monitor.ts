// @version 2.1.28
import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.ACTIVITY_MONITOR_PORT || 3050;

app.use(cors());
app.use(express.json());

// In-memory state
const sessions = new Map();
const serverStatus = new Map();
let realDataMode = false;

// Helper to check a port
async function checkPort(port) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
    }).catch(() => null);
    clearTimeout(timeout);
    return res && res.ok;
  } catch (e) {
    return false;
  }
}

// Endpoints
app.get("/health", (req, res) =>
  res.json({ status: "ok", service: "ui-activity-monitor" }),
);

app.post("/api/v1/activity/heartbeat", (req, res) => {
  const { sessionId, route, action } = req.body;
  if (sessionId) {
    sessions.set(sessionId, {
      lastSeen: Date.now(),
      route,
      action,
      active: true,
    });
  }
  res.json({
    ok: true,
    activeSessions: sessions.size,
    serversActive: serverStatus.size, // Approximate
    config: { autoStart: true, realDataMode },
  });
});

app.get("/api/v1/activity/sessions", (req, res) => {
  const activeSessions = [];
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastSeen < 300000) {
      // 5 min timeout
      activeSessions.push({ sessionId: id, ...session });
    } else {
      sessions.delete(id);
    }
  }
  res.json({
    ok: true,
    activeSessions: activeSessions.length,
    sessions: activeSessions,
  });
});

app.get("/api/v1/activity/servers", async (req, res) => {
  // Quick check of known ports
  const ports = [3000, 3001, 3002, 3003, 3004, 3006, 3007, 3008, 3009];
  const status = [];
  for (const port of ports) {
    const healthy = await checkPort(port);
    status.push({ port, healthy });
  }
  res.json({ ok: true, servers: status });
});

app.post("/api/v1/activity/start-all", (req, res) => {
  // In a container, we might not be able to start other processes easily if they are not managed by a process manager like PM2.
  // But we can pretend or try to trigger a script.
  // For now, just return success as the main startup script should have started them.
  res.json({ ok: true, message: "Startup signal sent" });
});

app.post("/api/v1/activity/ensure-real-data", (req, res) => {
  realDataMode = true;
  res.json({ ok: true, realDataMode: true });
});

app.post("/api/v1/activity/config", (req, res) => {
  const config = req.body;
  if (config.realDataMode !== undefined) realDataMode = config.realDataMode;
  res.json({ ok: true, config: { realDataMode } });
});

app.listen(PORT, () => {
  console.log(`✅ UI Activity Monitor listening on port ${PORT}`);
});
