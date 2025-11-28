// @version 2.2.106
import { z } from "zod";
import OpenAI from "openai";

/**
 * Schema for a single step in the reasoning process.
 * Represents a node in the "Tree of Thoughts".
 */
export const ReasoningStepSchema = z.object({
  thought: z.string().describe("The reasoning thought process"),
  evidence: z.string().describe("Evidence or context supporting this thought"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score for this reasoning path"),
  next_action: z.string().describe("The proposed next action or conclusion"),
});

export type ReasoningStep = z.infer<typeof ReasoningStepSchema>;

/**
 * ReasoningChain
 * Implements a "Tree of Thoughts" approach for complex problem solving.
 * Generates multiple potential reasoning paths before selecting the best one.
 */
export class ReasoningChain {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI client
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("OPENAI_API_KEY is not set. ReasoningChain will fail.");
    }
    this.openai = new OpenAI({
      apiKey: apiKey || "dummy-key", // Prevent crash on init, fail on call
    });
  }

  /**
   * Generates multiple potential reasoning steps (thoughts) for a given input.
   * @param input The problem or query to reason about.
   * @param branchCount Number of alternative thoughts to generate.
   */
  async generateThoughts(
    input: string,
    branchCount: number = 3,
  ): Promise<ReasoningStep[]> {
    if (!process.env.OPENAI_API_KEY) {
      console.error("Cannot generate thoughts: OPENAI_API_KEY is missing.");
      return [];
    }

    console.log(`Generating ${branchCount} reasoning branches for: ${input}`);

    try {
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o", // Use configured model or default
        messages: [
          {
            role: "system",
            content: `You are a high-level reasoning engine. 
            Analyze the user's input and generate a structured reasoning step.
            You must return a valid JSON object matching this schema:
            {
              "thought": "Your detailed reasoning process",
              "evidence": "Facts or context supporting this thought",
              "confidence": 0.0 to 1.0,
              "next_action": "What should be done next?"
            }
            Do not include markdown formatting like \`\`\`json. Just the raw JSON object.`,
          },
          {
            role: "user",
            content: input,
          },
        ],
        n: branchCount, // Generate multiple independent thoughts
        temperature: 0.7, // Allow for some diversity in reasoning
      });

      const steps: ReasoningStep[] = [];

      for (const choice of response.choices) {
        try {
          const content = choice.message.content;
          if (!content) continue;

          // Clean up potential markdown code blocks if the model ignores instructions
          const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();

          const parsed = JSON.parse(cleanContent);
          const step = ReasoningStepSchema.parse(parsed);
          steps.push(step);
        } catch (err) {
          console.warn("Failed to parse reasoning step:", err);
        }
      }

      return steps;
    } catch (error) {
      console.error("Error generating thoughts with OpenAI:", error);
      return [];
    }
  }

  /**
   * Evaluates a list of reasoning steps and selects the best one based on confidence and logic.
   * @param steps The list of generated reasoning steps.
   */
  async selectBestPath(steps: ReasoningStep[]): Promise<ReasoningStep | null> {
    if (steps.length === 0) return null;

    // Sort by confidence descending
    const sortedSteps = [...steps].sort((a, b) => b.confidence - a.confidence);

    // Return the highest confidence step
    return sortedSteps[0];
  }

  /**
   * Executes the full reasoning chain.
   * @param input The user input.
   */
  async execute(input: string): Promise<ReasoningStep | null> {
    const thoughts = await this.generateThoughts(input);
    const bestPath = await this.selectBestPath(thoughts);

    if (bestPath && bestPath.confidence < 0.8) {
      console.warn(
        "Low confidence detected. Triggering regeneration or reflection loop.",
      );
      // TODO: Implement regeneration loop
    }

    return bestPath;
  }
}
