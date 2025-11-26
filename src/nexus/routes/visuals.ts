import { Router } from "express";
import { visualCortex } from "../../cortex/index.js";

const router = Router();

router.post("/generate", async (req, res) => {
    try {
        const { prompt, provider, model, aspectRatio, imageSize, negativePrompt, referenceImages, mode, options } = req.body;

        if (!prompt && (!referenceImages || referenceImages.length === 0)) {
            return res.status(400).json({ error: "Prompt or reference images are required." });
        }

        // Use Visual Cortex for intelligent generation
        const response = await visualCortex.imagine(prompt, {
            provider,
            model,
            aspectRatio,
            imageSize,
            negativePrompt,
            referenceImages,
            mode,
            ...options // Pass skipEnhancement and other options
        });

        res.json(response);
    } catch (error: any) {
        console.error("[Visuals API] Error generating image:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
});

export default router;
