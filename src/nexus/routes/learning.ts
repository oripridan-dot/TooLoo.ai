// @version 2.2.50
import { Router } from "express";
import fs from "fs-extra";
import path from "path";

const router = Router();
const METRICS_PATH = path.join(process.cwd(), "data", "learning-metrics.json");
const PATTERNS_PATH = path.join(process.cwd(), "data", "patterns.json");
const DECISIONS_PATH = path.join(process.cwd(), "data", "decisions.json");

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

// Initialize default patterns if missing
if (!fs.existsSync(PATTERNS_PATH)) {
  fs.writeJsonSync(PATTERNS_PATH, { patterns: [] }, { spaces: 2 });
}

// Initialize default decisions if missing
if (!fs.existsSync(DECISIONS_PATH)) {
  fs.writeJsonSync(
    DECISIONS_PATH,
    { totalDecisions: 0, decisionsWithOutcomes: 0, recentDecisions: [] },
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

router.get("/patterns", async (req, res) => {
  try {
    const data = await fs.readJson(PATTERNS_PATH);
    res.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/decisions", async (req, res) => {
  try {
    const data = await fs.readJson(DECISIONS_PATH);
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
