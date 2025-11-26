// @version 2.1.328
import { Router } from "express";
import { bus } from "../../core/event-bus.js";
import { successResponse } from "../utils.js";

const router = Router();

// Provider Status
router.get("/status", (req, res) => {
  // Mock response for now, eventually this comes from Cortex/Budget
  res.json(successResponse({
    active: "Gemini",
    model: "gemini-3-pro-preview",
    latency: 120,
    available: [
      { id: "gemini", name: "Gemini 3 Pro", status: "Ready" },
      { id: "anthropic", name: "Claude 3.5 Sonnet", status: "Ready" },
      { id: "openai", name: "GPT-4o", status: "Standby" },
    ],
  }));
});

export default router;
