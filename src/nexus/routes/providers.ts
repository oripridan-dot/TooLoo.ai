// @version 2.1.362
import { Router } from "express";
import { precog } from "../../precog/index.js";

const router = Router();

// Provider Status - Returns array of providers directly
router.get("/status", (req, res) => {
  const providers = precog.providers.getProviderStatus();

  // Return simple, clean structure that frontend expects
  res.json({
    ok: true,
    data: {
      providers: providers,
      active: providers.find((p) => p.status === "Ready")?.id || "none",
      timestamp: Date.now(),
    },
  });
});

export default router;
