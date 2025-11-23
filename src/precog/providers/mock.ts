// @version 2.1.46
export class MockProvider {
  async generateSmartLLM(request: any) {
    const { prompt, system } = request;
    console.log("[MockProvider] Generating response for:", prompt);

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return a valid plan if it looks like a planning request
    if (system && system.includes("steps")) {
      return {
        text: JSON.stringify({
          steps: [
            {
              type: "command",
              description: "[MOCK] Create project directory",
              payload: { command: "mkdir -p projects/mock-project" }
            },
            {
              type: "file:write",
              description: "[MOCK] Create README",
              payload: { path: "projects/mock-project/README.md", content: "# Mock Project" }
            }
          ]
        }),
        providerUsed: "mock",
        taskTypeDetected: "planning",
        providerBadge: { provider: "mock", percent: 100 },
        criticalityLevel: "test"
      };
    }

    return {
      text: "This is a mock response from the Sandbox environment.",
      providerUsed: "mock",
      taskTypeDetected: "general",
      providerBadge: { provider: "mock", percent: 100 },
      criticalityLevel: "test"
    };
  }
}
