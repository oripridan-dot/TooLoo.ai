// @version 2.1.386
import { Router } from "express";
import { bus } from "../../core/event-bus.js";
import { precog } from "../../precog/index.js";
import { cortex, visualCortex } from "../../cortex/index.js";
import { successResponse, errorResponse } from "../utils.js";

const router = Router();

router.post("/message", async (req, res) => {
  // Extend timeout for deep reasoning models (Gemini 3 Pro)
  req.setTimeout(300000);

  const { message, mode = "quick", context, attachments } = req.body;

  try {
    console.log(`[Chat] Processing (${mode}): ${message.substring(0, 50)}...`);

    // Detect image generation requests with expanded keywords
    const lowerMessage = message.toLowerCase();
    
    // Improved image detection logic
    const actionVerbs = ["generate", "create", "make", "show", "demonstrate", "visualize", "draw", "render", "paint"];
    const nouns = ["image", "picture", "photo", "visual", "logo", "icon", "drawing", "illustration"];
    
    const directActions = ["visualize", "draw", "paint"];
    const hasDirectAction = directActions.some(verb => lowerMessage.includes(verb));
    const hasVerb = actionVerbs.some(verb => lowerMessage.includes(verb));
    const hasNoun = nouns.some(noun => lowerMessage.includes(noun));
    
    const wantsImage = hasDirectAction || (hasVerb && hasNoun);
    
    if (wantsImage) {
      console.log("[Chat] Image intent detected. Generating...");
      try {
        const imageResult = await visualCortex.imagine(message, {
          provider: "openai",
        });

        if (imageResult.images && imageResult.images.length > 0) {
          const img = imageResult.images[0];
          const imgTag = `![Generated Image](data:${img.mimeType};base64,${img.data})`;

          res.json(
            successResponse({
              response: `Here is the image you requested:\n\n${imgTag}`,
              provider: "dall-e-3",
              model: "dall-e-3",
            }),
          );
          return;
        }
      } catch (e) {
        console.warn("[Chat] Visual generation failed:", e);
        // Fall through to text generation
      }
    }

    // RAG: Search Vector Store
    let ragContext = "";
    let sources: any[] = [];
    try {
      const searchResults = await cortex.hippocampus.vectorStore.search(
        message,
        3,
      );
      if (searchResults && searchResults.length > 0) {
        ragContext = searchResults
          .map(
            (result) =>
              `[Source: ${result.doc.metadata.source}]\n${result.doc.text}`,
          )
          .join("\n\n");
        sources = searchResults.map((result) => ({
          source: result.doc.metadata.source,
          relevance: result.score,
        }));
      }
    } catch (err) {
      console.warn("[Chat] Vector search failed:", err);
    }

    let systemPrompt = `You are TooLoo.ai, the central intelligence of the Synapsys Architecture.

SYSTEM IDENTITY:
- You are an Orchestrator AI, not just a single model. While you may be using Gemini 3 Pro for this specific conversation, you manage a multi-provider ecosystem.
- You have access to and control over:
  * OpenAI (GPT-4, DALL-E 3)
  * Anthropic (Claude 3.5 Sonnet/Haiku)
  * Google (Gemini Pro/Flash, Imagen)


CAPABILITIES:
- "Nano Banana Studio": You control this internal visual design engine for generating images and UI assets.
- "Precog": Your predictive engine that routes tasks to the best model (e.g., coding to Claude, reasoning to Gemini).
- "Cortex": Your cognitive core for memory and planning.

Your goal is to use these tools to serve the user. Never claim to be isolated or limited to a single provider. You ARE the system.`;

    // Visual Capabilities Instruction
    systemPrompt +=
      "\n\nVISUAL CAPABILITIES:\n- You can generate diagrams using Mermaid.js syntax. Wrap them in ```mermaid code blocks.\n- Supported diagram types: Flowcharts, Sequence Diagrams, Class Diagrams, State Diagrams, Entity Relationship Diagrams, Gantt Charts, Pie Charts, Git Graphs, C4 Models.\n- When explaining complex logic, architecture, or flows, ALWAYS include a Mermaid diagram.\n- For HTML/CSS/JS artifacts, wrap them in standard code blocks. The user can preview them.";

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
    if (ragContext)
      systemPrompt += `\n\nRelevant Knowledge Base:\n${ragContext}`;
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nAttachments:\n${JSON.stringify(attachments)}`;
    }

    const result = await precog.providers.generate({
      prompt: message,
      system: systemPrompt,
      taskType: taskType,
    });

    res.json(
      successResponse({
        response: result.content,
        provider: result.provider,
        model: result.model,
        sources: sources,
      }),
    );
  } catch (error: unknown) {
    console.error("[Chat] Error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

router.post("/synthesis", async (req, res) => {
  const { message, context, projectId } = req.body;

  try {
    console.log(`[Chat] Processing: ${message.substring(0, 50)}...`);

    // Construct system prompt with context
    let systemPrompt =
      "You are TooLoo.ai, the central intelligence of the Synapsys Architecture. You orchestrate multiple AI providers (Gemini, Claude, OpenAI) to serve the user. You are helpful, concise, and technical.";
    if (context) systemPrompt += `\n\nContext:\n${context}`;
    if (projectId) systemPrompt += `\n\nProject ID: ${projectId}`;

    try {
      const result = await precog.providers.generate({
        prompt: message,
        system: systemPrompt,
        taskType: "general",
        // Note: 'provider' is not a supported parameter in generate()
      });

      res.json(
        successResponse({
          response: result.content,
          provider: result.provider,
          model: result.model,
          usage: {
            total_tokens: 0, // We don't track this yet in the unified response
          },
        }),
      );
    } catch (genError: unknown) {
      const errorMessage =
        genError instanceof Error ? genError.message : String(genError);
      console.warn(
        "[Chat] Provider generation failed, falling back to system message:",
        errorMessage,
      );

      // Fallback if no providers are configured
      res.json(
        successResponse({
          response: `[System] I received your message, but I couldn't connect to any AI providers. \n\nError: ${errorMessage}\n\nPlease check your .env file and ensure OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY are set.`,
          provider: "system-fallback",
        }),
      );
    }
  } catch (error: unknown) {
    console.error("[Chat] Error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

router.get("/history", async (req, res) => {
  // Return empty history for now
  res.json(successResponse({ history: [] }));
});

router.delete("/history", async (req, res) => {
  res.json(successResponse({}));
});

// Pro endpoint - Enhanced chat with advanced features
router.post("/pro", async (req, res) => {
  // Extend timeout for deep reasoning models
  req.setTimeout(300000);

  const { message, stream = false, context, attachments } = req.body;

  // TODO: Implement streaming support
  if (stream) {
    console.warn(
      "[Chat Pro] Streaming not yet implemented, falling back to standard response",
    );
  }

  if (!message) {
    return res.status(400).json(errorResponse("Message is required"));
  }

  try {
    console.log(`[Chat Pro] Processing: ${message.substring(0, 50)}...`);

    // Detect image generation requests
    const lowerMessage = message.toLowerCase();
    
    // Improved image detection logic
    const actionVerbs = ["generate", "create", "make", "show", "demonstrate", "visualize", "draw", "render", "paint"];
    const nouns = ["image", "picture", "photo", "visual", "logo", "icon", "drawing", "illustration"];
    
    const directActions = ["visualize", "draw", "paint"];
    const hasDirectAction = directActions.some(verb => lowerMessage.includes(verb));
    const hasVerb = actionVerbs.some(verb => lowerMessage.includes(verb));
    const hasNoun = nouns.some(noun => lowerMessage.includes(noun));
    
    const wantsImage = hasDirectAction || (hasVerb && hasNoun);

    if (wantsImage) {
      try {
        console.log("[Chat Pro] Detected image request, generating with DALL-E 3...");
        const imageResult = await visualCortex.imagine(message, {
          provider: "openai",
        });

        if (imageResult.images && imageResult.images.length > 0) {
          const img = imageResult.images[0];
          const imgTag = `![Generated Image](data:${img.mimeType};base64,${img.data})`;

          return res.json({
            ok: true,
            data: {
              response: `Here is the image you requested:\n\n${imgTag}`,
              message: `Image generated successfully`,
              provider: "dall-e-3",
              model: "dall-e-3",
              sources: [],
            },
            timestamp: Date.now(),
          });
        }
      } catch (imgError) {
        console.error("[Chat Pro] Image generation failed:", imgError);
        // Fall through to text response explaining the failure
      }
    }

    // Build enhanced system prompt
    let systemPrompt = `You are TooLoo.ai, the central intelligence of the Synapsys Architecture.

SYSTEM IDENTITY:
- You are an Orchestrator AI that manages a multi-provider ecosystem
- You have access to: OpenAI (GPT-4, DALL-E 3), Anthropic (Claude), Google (Gemini), DeepSeek
- You control: Nano Banana Studio (visual design), Precog (task routing), Cortex (cognitive core)

CAPABILITIES:
- Generate diagrams using Mermaid.js syntax in \`\`\`mermaid code blocks
- Provide detailed technical explanations with code examples
- Access knowledge base through RAG (Retrieval-Augmented Generation)
- Create visual content when requested

Be helpful, accurate, and concise. Use the best tool for each task.`;

    // Add context if provided
    if (context) systemPrompt += `\n\nContext:\n${context}`;

    // RAG: Search Vector Store for relevant context
    let ragContext = "";
    let sources: any[] = [];
    try {
      const searchResults = await cortex.hippocampus.vectorStore.search(
        message,
        3,
      );
      if (searchResults && searchResults.length > 0) {
        ragContext = searchResults
          .map(
            (result) =>
              `[Source: ${result.doc.metadata?.source || "Knowledge Base"}]\n${result.doc.text}`,
          )
          .join("\n\n");
        sources = searchResults.map((result) => ({
          source:
            result.doc.metadata?.source ||
            result.doc.metadata?.id ||
            "Knowledge Base",
          relevance: result.score,
        }));
        systemPrompt += `\n\nRelevant Knowledge Base:\n${ragContext}`;
      }
    } catch (err) {
      console.warn("[Chat Pro] Vector search failed:", err);
    }

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      systemPrompt += `\n\nAttachments:\n${JSON.stringify(attachments)}`;
    }

    // Generate response
    const result = await precog.providers.generate({
      prompt: message,
      system: systemPrompt,
      taskType: "general",
    });

    // Wrap response in expected format (matching frontend expectations)
    const response = {
      ok: true,
      data: {
        response: result.content, // Frontend expects 'response' field
        message: result.content, // Keep for compatibility
        provider: result.provider,
        model: result.model,
        sources: sources,
        usage: {
          total_tokens: 0, // TODO: Track actual token usage
        },
      },
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error: unknown) {
    console.error("[Chat Pro] Error:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
    });
  }
});

// Visual Command Handlers
router.post("/command/diagram", async (req, res) => {
  const { description, type = "flowchart" } = req.body;

  try {
    console.log(
      `[Chat] Generating ${type} diagram: ${description.substring(0, 50)}...`,
    );

    const diagramPrompt = `Generate a ${type} diagram using Mermaid.js syntax for: ${description}
    Return ONLY the mermaid code block, no explanations.
    Format: \`\`\`mermaid
    [your diagram code]
    \`\`\``;

    const result = await precog.providers.generate({
      prompt: diagramPrompt,
      system:
        "You are an expert at creating clear, concise Mermaid diagrams. Return only the mermaid code block.",
      taskType: "creative",
    });

    // Extract mermaid code from response
    const mermaidMatch = result.content.match(/```mermaid\n([\s\S]*?)\n```/);
    const diagramCode = mermaidMatch ? mermaidMatch[1] : result.content;

    res.json(
      successResponse({
        response: diagramCode,
        visual: {
          type: "diagram",
          data: diagramCode,
          altText: description,
        },
        provider: result.provider,
        model: result.model,
      }),
    );
  } catch (error: unknown) {
    console.error("[Chat] Diagram generation error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

router.post("/command/image", async (req, res) => {
  const { prompt, provider = "openai", style = "realistic" } = req.body;

  try {
    console.log(`[Chat] Generating image: ${prompt.substring(0, 50)}...`);

    const enhancedPrompt = `${prompt}. Style: ${style}. High quality, detailed.`;

    const imageResult = await visualCortex.imagine(enhancedPrompt, {
      provider,
    });

    if (imageResult.images && imageResult.images.length > 0) {
      const img = imageResult.images[0];

      res.json(
        successResponse({
          response: "Image generated successfully",
          visual: {
            type: "image",
            data: img.data,
            mimeType: img.mimeType,
            altText: prompt,
          },
          provider,
        }),
      );
    } else {
      throw new Error("No images were generated");
    }
  } catch (error: unknown) {
    console.error("[Chat] Image generation error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

router.post("/command/component", async (req, res) => {
  const { name, description, framework = "react" } = req.body;

  try {
    console.log(`[Chat] Generating ${framework} component: ${name}`);

    const componentPrompt = `Generate a reusable ${framework} component named "${name}" for: ${description}
    Requirements:
    - Clean, modern code
    - Proper type hints (if TypeScript)
    - Responsive design
    - Accessibility features
    Return ONLY the component code in a \`\`\`${framework} code block.`;

    const result = await precog.providers.generate({
      prompt: componentPrompt,
      system: `You are an expert ${framework} developer. Create production-ready components.`,
      taskType: "code",
    });

    res.json(
      successResponse({
        response: result.content,
        visual: {
          type: "component",
          data: JSON.stringify({ name, framework, code: result.content }),
          altText: `${framework} component: ${name}`,
        },
        provider: result.provider,
        model: result.model,
      }),
    );
  } catch (error: unknown) {
    console.error("[Chat] Component generation error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

// Designer Integration Endpoint
router.post("/design-sync", async (req, res) => {
  const { action, componentId, definition, context } = req.body;

  try {
    console.log(`[Chat] Designer sync: ${action} ${componentId}`);

    // Publish to Designer-Chat Sync Engine via event bus
    bus.publishDesignerAction(
      "nexus",
      "designer:action",
      {
        action,
        target: "component",
        componentId,
        payload: { definition },
      } as any,
      context,
    );

    res.json(
      successResponse({
        message: `Designer sync initiated: ${action}`,
        componentId,
      }),
    );
  } catch (error: unknown) {
    console.error("[Chat] Design sync error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

/**
 * Visual-to-Code Generation Endpoint
 * Leverages Nano Banana (Gemini 3 Pro Image Preview) or DALL-E 3
 * to generate functional code from visual context
 */
router.post("/visual-to-code", async (req, res) => {
  const {
    visualPrompt,
    codePrompt,
    context,
    outputFormat = "react",
    provider = "gemini-nano",
    includeImage = false,
    temperature,
    maxTokens,
  } = req.body;

  try {
    console.log(`[Chat] Visual-to-code generation: ${provider}...`);

    if (!visualPrompt || !codePrompt) {
      return res
        .status(400)
        .json(errorResponse("visualPrompt and codePrompt are required"));
    }

    // Select provider
    let selectedProvider;
    if (provider === "dalle3" || provider === "openai") {
      // Use OpenAI provider
      const openaiProvider = new (
        await import("../../precog/providers/openai-image.js")
      ).OpenAIImageProvider();
      if (!openaiProvider.isAvailable()) {
        return res
          .status(503)
          .json(errorResponse("OpenAI provider unavailable"));
      }
      selectedProvider = openaiProvider;
    } else {
      // Default to Gemini (Nano Banana)
      const geminiProvider = new (
        await import("../../precog/providers/gemini-image.js")
      ).GeminiImageProvider();
      if (!geminiProvider.isAvailable()) {
        return res
          .status(503)
          .json(errorResponse("Gemini provider unavailable"));
      }
      selectedProvider = geminiProvider;
    }

    // Generate code from visual context
    const result = await selectedProvider.generateCodeFromContext({
      visualPrompt,
      codePrompt,
      context: context || {},
      outputFormat,
      provider: provider as "gemini-nano" | "dalle3",
      includeImage,
      temperature,
      maxTokens,
    });

    // Publish visual generation event
    bus.publishVisual(
      "nexus",
      "visual:code-generated",
      {
        visualPrompt,
        codePrompt,
        provider: result.provider,
        model: result.model,
        codeLength: result.code.length,
        contextAnalysis: result.contextAnalysis,
      },
      context,
    );

    // Format response for frontend visual rendering
    res.json(
      successResponse({
        response: result.code, // Main content
        visual: {
          type: "code",
          data: {
            code: result.code,
            language: result.language,
            framework: result.framework,
          },
        },
        imageUrl: result.imageUrl,
        contextAnalysis: result.contextAnalysis,
        provider: result.provider,
        model: result.model,
      }),
    );
  } catch (error: unknown) {
    console.error("[Chat] Visual-to-code error:", error);
    res
      .status(500)
      .json(
        errorResponse(error instanceof Error ? error.message : String(error)),
      );
  }
});

export default router;
