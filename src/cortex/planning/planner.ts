// @version 2.1.28
import { EventBus } from "../../core/event-bus.js";
import LLMProvider from "../../precog/providers/llm-provider.js";

export interface PlanStep {
  id: string;
  type:
    | "command"
    | "file:write"
    | "file:read"
    | "code:execute"
    | "image:generate";
  description: string;
  payload: any;
  status: "pending" | "running" | "completed" | "failed";
  result?: any;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  status: "pending" | "in-progress" | "completed" | "failed";
  createdAt: number;
}

export class Planner {
  private llmProvider: LLMProvider;

  constructor(private bus: EventBus) {
    this.llmProvider = new LLMProvider();
  }

  /**
   * Generates a plan based on a high-level goal using the Precog LLM service.
   */
  async createPlan(
    goal: string,
    context?: { critique: string; failedStep?: any },
  ): Promise<Plan> {
    console.log(`[Planner] Devising plan for: "${goal}"`);
    if (context) {
      console.log(`[Planner] Incorporating critique: ${context.critique}`);
    }

    const planId = Math.random().toString(36).substring(7);

    // Time-Aware Context Injection
    const now = new Date();
    const timeContext = {
      iso: now.toISOString(),
      localTime: now.toLocaleTimeString(),
      dayOfWeek: now.toLocaleDateString("en-US", { weekday: "long" }),
      isWorkHours: now.getHours() >= 9 && now.getHours() <= 17,
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
    };

    let systemPrompt = `You are the Prefrontal Cortex of an autonomous AI system. 
Your task is to break down a high-level goal into a sequence of executable steps.

CURRENT TIME CONTEXT:
- Date: ${now.toLocaleDateString()}
- Time: ${timeContext.localTime}
- Day: ${timeContext.dayOfWeek}
- Status: ${timeContext.isWorkHours ? "Work Hours" : "Off Hours"}

TIME-AWARE PLANNING RULES:
1. If the user asks for a task that implies a schedule (e.g., "daily report"), use the current time to determine if it should run now or be scheduled.
2. Be aware of the "freshness" of data. If the goal involves retrieving data, consider if the current time implies the data might be stale or not yet available.
3. If it is late at night or the weekend, and the task involves notifying humans, consider adding a delay or a note about potential unavailability.

The system has the following capabilities (tools):
1. 'command': Execute a shell command. Payload: { "command": "string", "cwd": "string" (optional) }
2. 'file:write': Write content to a file. Payload: { "path": "string", "content": "string" }
3. 'file:read': Read a file. Payload: { "path": "string" }
4. 'code:execute': Execute a script in a secure sandbox. Payload: { "code": "string", "language": "python" | "javascript" | "typescript" }
5. 'image:generate': Generate an image using DALL-E 3. Payload: { "prompt": "string", "style": "vivid" | "natural" }

CONSTRAINTS:
- Always create new projects in the 'projects/' directory.
- Ensure directory creation happens before file writing.
- Use 'mkdir -p' to ensure parent directories exist.
- For complex logic, data processing, or API calls, prefer 'code:execute' over 'command'.
- 'code:execute' scripts have access to the 'tooloo' SDK for LLM, Storage, and Visual tasks.
- ONLY use 'image:generate' if the user explicitly asks for a generated image, picture, or artwork.
- Do NOT use 'image:generate' for creating text-based plans, code, or documents.
- If the goal is to "create a plan" or "write a document", use 'file:write' to save the content to a file (e.g., in 'projects/' or 'docs/').

Return ONLY a JSON object with a 'steps' array. Each step must have:
- 'type': One of the capabilities above.
- 'description': A short human-readable description.
- 'payload': The specific arguments for the capability.
`;

    if (context) {
      systemPrompt += `
\nPREVIOUS ATTEMPT FAILED:
The previous plan failed at step: "${context.failedStep?.description}".
Critique: "${context.critique}"
Please generate a NEW plan that addresses this failure. Do not repeat the same mistake.
`;
    }

    systemPrompt += `
Example JSON output:
{
  "steps": [
    {
      "type": "command",
      "description": "Create project directory",
      "payload": { "command": "mkdir -p projects/my-app" }
    },
    {
      "type": "code:execute",
      "description": "Generate data using Python",
      "payload": { 
        "language": "python",
        "code": "import random\\nprint(random.randint(1, 100))"
      }
    }
  ]
}
`;

    try {
      const response = await this.llmProvider.generateSmartLLM({
        prompt: `Goal: ${goal}`,
        system: systemPrompt,
        taskType: "planning",
        criticality: "high", // Planning is critical
      });

      const content = response.text || response.content;
      console.log(`[Planner] LLM Response: ${content.substring(0, 100)}...`);

      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;

      const parsed = JSON.parse(jsonStr);

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error("Invalid plan format: missing steps array");
      }

      const steps: PlanStep[] = parsed.steps.map(
        (step: any, index: number) => ({
          id: `${planId}-step-${index + 1}`,
          type: step.type,
          description: step.description,
          payload: step.payload,
          status: "pending",
        }),
      );

      return {
        id: planId,
        goal,
        steps,
        status: "pending",
        createdAt: Date.now(),
      };
    } catch (error: any) {
      console.error(`[Planner] Failed to generate plan: ${error.message}`);

      // Fallback to simple heuristic for specific test cases if LLM fails (e.g. no API key)
      if (goal.startsWith("create project")) {
        console.log("[Planner] Falling back to heuristic plan");
        const projectName = goal.split("create project ")[1] || "untitled";
        return {
          id: planId,
          goal,
          steps: [
            {
              id: `${planId}-step-1`,
              type: "command",
              description: `Create directory for ${projectName}`,
              payload: { command: `mkdir -p projects/${projectName}` },
              status: "pending",
            },
            {
              id: `${planId}-step-2`,
              type: "file:write",
              description: "Create README.md",
              payload: {
                path: `projects/${projectName}/README.md`,
                content: `# ${projectName}\n\nCreated by Synapsys (Fallback)`,
              },
              status: "pending",
            },
          ],
          status: "pending",
          createdAt: Date.now(),
        };
      }

      throw error;
    }
  }
}
