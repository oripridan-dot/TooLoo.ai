import { bus, SynapsysEvent } from "../event-bus.js";

export class Critic {
  private static instance: Critic;
  private enabled: boolean = true;

  private constructor() {
    console.log("[Critic] Initializing Quality Control System...");
    this.registerInterceptor();
  }

  public static getInstance(): Critic {
    if (!Critic.instance) {
      Critic.instance = new Critic();
    }
    return Critic.instance;
  }

  private registerInterceptor() {
    bus.addInterceptor(async (event: SynapsysEvent) => {
      if (!this.enabled) return true;

      // Intercept Cortex Responses
      if (event.type === "cortex:response") {
        return this.validateResponse(event);
      }

      // Intercept Visual Generation Requests (Pre-validation)
      if (event.type === "visual:generate:request") {
        return this.validateVisualRequest(event);
      }

      return true; // Allow all other events
    });
  }

  private async validateResponse(event: SynapsysEvent): Promise<boolean> {
    const payload = event.payload;

    // Basic Sanity Check: Empty Response
    if (
      !payload ||
      !payload.data ||
      (typeof payload.data === "string" && payload.data.trim().length === 0)
    ) {
      console.warn("[Critic] 🛑 Blocked empty response from Cortex");

      // Emit a refinement request (Self-Correction)
      bus.publish("system", "cortex:refining", {
        originalRequestId: payload.requestId,
        reason: "Response was empty",
        feedback:
          "The generated response was empty. Please generate a valid response.",
      });

      return false; // Block the event
    }

    // Future: Zod Schema Validation & LLM Quality Check
    // console.log("[Critic] ✅ Response passed quality check");

    return true;
  }

  private async validateVisualRequest(event: SynapsysEvent): Promise<boolean> {
    // Ensure prompt is safe and detailed enough
    const payload = event.payload;
    if (!payload.prompt || payload.prompt.length < 5) {
      console.warn("[Critic] 🛑 Blocked vague visual request");
      return false;
    }
    return true;
  }
}

export const critic = Critic.getInstance();
