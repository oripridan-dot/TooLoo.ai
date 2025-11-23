// @version 2.1.38
import { Router } from "express";
import { precog } from "../../precog/index.js";

const router = Router();

router.post("/synthesis", async (req, res) => {
  const { message, context, model, projectId } = req.body;

  try {
    console.log(`[Chat] Processing: ${message.substring(0, 50)}...`);

    // Construct system prompt with context
    let systemPrompt = "You are TooLoo.ai, an advanced AI development platform assistant. You are helpful, concise, and technical.";
    if (context) systemPrompt += `\n\nContext:\n${context}`;
    if (projectId) systemPrompt += `\n\nProject ID: ${projectId}`;

    try {
        const result = await precog.providers.generate({
            prompt: message,
            system: systemPrompt,
            taskType: 'general',
            provider: model // Optional: allow user to select model
        });

        res.json({
            ok: true,
            response: result.content,
            provider: result.provider,
            model: result.model,
            usage: {
                total_tokens: 0 // We don't track this yet in the unified response
            }
        });
    } catch (genError: any) {
        console.warn("[Chat] Provider generation failed, falling back to system message:", genError.message);
        
        // Fallback if no providers are configured
        res.json({
            ok: true,
            response: `[System] I received your message, but I couldn't connect to any AI providers. \n\nError: ${genError.message}\n\nPlease check your .env file and ensure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY are set.`,
            provider: 'system-fallback'
        });
    }

  } catch (error: any) {
    console.error("[Chat] Error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.get("/history", async (req, res) => {
  // Return empty history for now
  res.json({ ok: true, history: [] });
});

router.delete("/history", async (req, res) => {
  res.json({ ok: true });
});

export default router;
