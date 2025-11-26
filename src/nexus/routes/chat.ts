// @version 2.1.332
import { Router } from "express";
import { precog } from "../../precog/index.js";
import { successResponse, errorResponse } from "../utils.js";

const router = Router();

router.post("/message", async (req, res) => {
  // Extend timeout for deep reasoning models (Gemini 3 Pro)
  req.setTimeout(300000); 
  
  const { message, mode = "quick", context, attachments } = req.body;

  try {
    console.log(`[Chat] Processing (${mode}): ${message.substring(0, 50)}...`);

    let systemPrompt =
      "You are TooLoo.ai, an advanced AI development platform assistant. You are powered by Google's Gemini 3 Pro (Preview) model, which is fully integrated into the Synapsys architecture. You have deep reasoning capabilities and access to the entire workspace.";
    let taskType = "general";

    // Mode Logic
    switch (mode) {
      case "quick":
        systemPrompt += " Be concise, direct, and fast. Avoid fluff.";
        break;
      case "technical":
        systemPrompt +=
          " You are an expert software architect. Provide detailed technical explanations, code snippets, and implementation strategies. Focus on correctness and best practices.";
        taskType = "code";
        break;
      case "creative":
        systemPrompt +=
          " You are a creative partner. Brainstorm ideas, explore possibilities, and think outside the box. Use metaphors and vivid language.";
        taskType = "creative";
        break;
      case "structured":
        systemPrompt +=
          " Output your response in a structured format (JSON, Markdown tables, or lists). Be strictly organized.";
        break;
    }

    if (context) systemPrompt += `\n\nContext:\n${context}`;
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nAttachments:\n${JSON.stringify(attachments)}`;
    }

    const result = await precog.providers.generate({
      prompt: message,
      system: systemPrompt,
      taskType: taskType,
    });

    res.json(successResponse({
      response: result.content,
      provider: result.provider,
      model: result.model,
    }));
  } catch (error: unknown) {
    console.error("[Chat] Error:", error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

router.post("/synthesis", async (req, res) => {
  const { message, context, model, projectId } = req.body;

  try {
    console.log(`[Chat] Processing: ${message.substring(0, 50)}...`);

    // Construct system prompt with context
    let systemPrompt =
      "You are TooLoo.ai, an advanced AI development platform assistant. You are helpful, concise, and technical.";
    if (context) systemPrompt += `\n\nContext:\n${context}`;
    if (projectId) systemPrompt += `\n\nProject ID: ${projectId}`;

    try {
      const result = await precog.providers.generate({
        prompt: message,
        system: systemPrompt,
        taskType: "general",
        // Note: 'provider' is not a supported parameter in generate()
      });

      res.json(successResponse({
        response: result.content,
        provider: result.provider,
        model: result.model,
        usage: {
          total_tokens: 0, // We don't track this yet in the unified response
        },
      }));
    } catch (genError: unknown) {
      const errorMessage = genError instanceof Error ? genError.message : String(genError);
      console.warn(
        "[Chat] Provider generation failed, falling back to system message:",
        errorMessage,
      );

      // Fallback if no providers are configured
      res.json(successResponse({
        response: `[System] I received your message, but I couldn't connect to any AI providers. \n\nError: ${errorMessage}\n\nPlease check your .env file and ensure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY are set.`,
        provider: "system-fallback",
      }));
    }
  } catch (error: unknown) {
    console.error("[Chat] Error:", error);
    res.status(500).json(errorResponse(error instanceof Error ? error.message : String(error)));
  }
});

router.get("/history", async (req, res) => {
  // Return empty history for now
  res.json(successResponse({ history: [] }));
});

router.delete("/history", async (req, res) => {
  res.json(successResponse({}));
});

export default router;
