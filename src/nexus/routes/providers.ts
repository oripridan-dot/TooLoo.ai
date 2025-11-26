// @version 2.1.343
import { Router } from "express";
import { bus } from "../../core/event-bus.js";
import { successResponse } from "../utils.js";
import { precog } from "../../precog/index.js";

const router = Router();

// Provider Status
router.get("/status", (req, res) => {
  const available = precog.providers.getProviderStatus();

  // Determine active provider (simplified logic for now)
  const active = available.find((p) => p.status === "Ready")?.id || "none";

  res.json(
    successResponse({
      active: active,
      model: "auto-select",
      latency: available.find((p) => p.id === active)?.latency || 0,
      available: available,
    }),
  );
});

export default router;
