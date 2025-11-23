// @version 2.1.11
import { Router } from "express";
import { bus } from "../../core/event-bus.js";

const router = Router();

// Provider Status
router.get("/status", (req, res) => {
  // Mock response for now, eventually this comes from Cortex/Budget
  res.json({
    ok: true,
    active: "Gemini",
    model: "gemini-2.0-pro-exp-02-05",
    latency: 120,
    available: [
      { id: "gemini", name: "Gemini 3 Pro", status: "Ready" },
      { id: "anthropic", name: "Claude 3.5 Sonnet", status: "Ready" },
      { id: "openai", name: "GPT-4o", status: "Standby" },
    ],
  });
});

export default router;
