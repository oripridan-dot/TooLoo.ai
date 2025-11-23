// @version 2.1.44
import { Router } from "express";
import fs from "fs-extra";
import path from "path";
import { chromium } from "playwright";
import axios from "axios";

const router = Router();
const DESIGN_SYSTEM_PATH = path.join(
  process.cwd(),
  "data",
  "design-system.json"
);

// Ensure data dir exists
fs.ensureDirSync(path.dirname(DESIGN_SYSTEM_PATH));

// Initialize default design system if missing
if (!fs.existsSync(DESIGN_SYSTEM_PATH)) {
  fs.writeJsonSync(
    DESIGN_SYSTEM_PATH,
    {
      tokens: {
        colors: {
          primary: "#007bff",
          secondary: "#6c757d",
          success: "#28a745",
          danger: "#dc3545",
        },
        spacing: {
          sm: "0.5rem",
          md: "1rem",
          lg: "2rem",
        },
        typography: {
          fontFamily: "Inter, sans-serif",
          baseSize: "16px",
        },
      },
      components: [],
    },
    { spaces: 2 }
  );
}

router.get("/system", async (req, res) => {
  try {
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({ ok: true, system });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post("/system", async (req, res) => {
  try {
    const { system } = req.body;
    await fs.writeJson(DESIGN_SYSTEM_PATH, system, { spaces: 2 });
    res.json({ ok: true });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/components", async (req, res) => {
  try {
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({ ok: true, components: system.components || [] });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// List Systems (Presets)
router.get("/systems", async (req, res) => {
  try {
    // Return the default system as a list item
    const system = await fs.readJson(DESIGN_SYSTEM_PATH);
    res.json({
      ok: true,
      systems: [{ id: "default", name: "Default System", ...system }],
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Extract from Website (Real)
router.post("/extract-from-website", async (req, res) => {
  const { websiteUrl } = req.body;
  console.log(`[Design] Extracting from ${websiteUrl}...`);

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(websiteUrl, { waitUntil: "networkidle" });

    const data = await page.evaluate(() => {
      const colors = new Set<string>();
      const fonts = new Set<string>();

      // Helper to convert rgb to hex (Arrow function to avoid __name injection)
      const rgbToHex = (rgb: string) => {
        if (!rgb.startsWith("rgb")) return rgb;
        const match = rgb.match(/\d+/g);
        if (!match) return rgb;
        const [r, g, b] = match.map(Number);
        return (
          "#" +
          [r, g, b]
            .map((x) => {
              const hex = x.toString(16);
              return hex.length === 1 ? "0" + hex : hex;
            })
            .join("")
        );
      };

      // Scan all elements
      const elements = document.querySelectorAll("*");
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const style = window.getComputedStyle(el);
        if (style.color) colors.add(style.color);
        if (style.backgroundColor) colors.add(style.backgroundColor);
        if (style.fontFamily) fonts.add(style.fontFamily);
      }

      const colorArray = Array.from(colors)
        .map(rgbToHex)
        .filter((c) => c.startsWith("#") && c !== "#00000000") // Filter transparent
        .slice(0, 20); // Limit to 20

      const fontArray = Array.from(fonts)
        .map((f) => f.split(",")[0].replace(/['"]/g, ""))
        .slice(0, 10);

      return {
        brand: { name: document.title },
        tokens: {
          colors: colorArray.reduce(
            (acc, c, i) => ({ ...acc, [`color-${i + 1}`]: c }),
            {}
          ),
          typography: fontArray.reduce(
            (acc, f, i) => ({ ...acc, [`font-${i + 1}`]: f }),
            {}
          ),
        },
      };
    });

    await browser.close();
    res.json({ ok: true, ...data });
  } catch (error: any) {
    console.error(`[Design] Extraction failed: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Import Figma (Real)
router.post("/import-figma", async (req, res) => {
  const { figmaUrl, apiToken } = req.body;

  if (!apiToken) {
    return res.status(400).json({ ok: false, error: "Figma API Token required" });
  }

  try {
    // Extract File Key: https://www.figma.com/file/ByKey/...
    const fileKeyMatch = figmaUrl.match(/file\/([a-zA-Z0-9]+)/);
    if (!fileKeyMatch) {
      throw new Error("Invalid Figma URL");
    }
    const fileKey = fileKeyMatch[1];

    const response = await axios.get(
      `https://api.figma.com/v1/files/${fileKey}/styles`,
      {
        headers: { "X-Figma-Token": apiToken },
      }
    );

    const styles = response.data.meta.styles;
    const colors: any = {};
    
    // Note: To get actual color values, we'd need to fetch the nodes. 
    // For now, we'll just list the style names as a proof of connection.
    // A full implementation would require a second call to /files/:key/nodes?ids=...

    styles.forEach((s: any) => {
      if (s.style_type === "FILL") {
        colors[s.name] = "#000000"; // Placeholder as we need node data
      }
    });

    res.json({
      ok: true,
      metadata: { name: "Figma Import" },
      designSystem: {
        colors,
      },
    });
  } catch (error: any) {
    console.error(`[Design] Figma import failed: ${error.message}`);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Stream Tokens (Mock SSE)
router.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: any) => {
    res.write(`event: token\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let count = 0;
  const interval = setInterval(() => {
    send({
      key: `token-${count}`,
      value: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    });
    count++;
    if (count > 5) {
      clearInterval(interval);
      res.write("event: done\ndata: {}\n\n");
      res.end();
    }
  }, 1000);

  req.on("close", () => clearInterval(interval));
});

export default router;
