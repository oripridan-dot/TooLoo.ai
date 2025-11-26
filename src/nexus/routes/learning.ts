// @version 2.1.342
import { Router } from "express";
import fs from "fs-extra";
import path from "path";

const router = Router();
const METRICS_PATH = path.join(process.cwd(), "data", "learning-metrics.json");

// Ensure data dir exists
fs.ensureDirSync(path.dirname(METRICS_PATH));

// Initialize default metrics if missing
if (!fs.existsSync(METRICS_PATH)) {
  fs.writeJsonSync(
    METRICS_PATH,
    {
      improvements: {
        firstTrySuccess: {
          current: 0.75,
          target: 0.9,
          baseline: 0.6,
          achieved: false,
        },
        repeatProblems: {
          current: 0.15,
          target: 0.05,
          baseline: 0.25,
          achieved: false,
        },
        codeQuality: 85,
        performance: 92,
        security: 78,
      },
      recentLearnings: [
        "Optimized React rendering patterns",
        "Improved error handling in API routes",
        "Enhanced visual generation prompts",
      ],
    },
    { spaces: 2 },
  );
}

router.get("/report", async (req, res) => {
  try {
    const data = await fs.readJson(METRICS_PATH);
    res.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to update metrics (for internal system use)
router.post("/report", async (req, res) => {
  try {
    const currentData = await fs.readJson(METRICS_PATH);
    const newData = { ...currentData, ...req.body };
    await fs.writeJson(METRICS_PATH, newData, { spaces: 2 });
    res.json({ success: true, data: newData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
