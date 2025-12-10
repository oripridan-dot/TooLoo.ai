// @version 3.3.509
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createNexusApp } from "../src/nexus/index.js";

// Mock the precog providers to avoid external API calls
vi.mock("../src/precog/index.js", () => ({
  precog: {
    providers: {
      generate: vi.fn().mockResolvedValue({
        content: "This is a mocked V3 response.",
        provider: "mock-provider",
        model: "mock-model",
        latency: 100,
      }),
      generateWithTransparency: vi.fn().mockResolvedValue({
        content: "This is a mocked V3 response.",
        provider: "mock-provider",
        model: "mock-model",
        latency: 100,
      }),
      getProvider: vi.fn().mockReturnValue({
        embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      }),
    },
  },
}));

describe("V3 Connectivity Matrix", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;

  beforeAll(() => {
    app = createNexusApp();
  });

  afterAll(() => {
    vi.clearAllMocks();
  });

  it("should route V3 chat requests through the Validation Loop", async () => {
    const prompt = "Hello V3 System";
    const intent = "connectivity_test";
    const reason = "verification";

    // 1. Send Request to V3 Endpoint (using 'single' mode to avoid timeout from ValidationLoop)
    const response = await request(app)
      .post("/api/v1/chat/v3/message")
      .send({
        message: prompt,
        executionMode: "single", // Use single mode which is properly mocked
        metadata: {
          intent,
          reason,
        },
      });

    // 2. Verify HTTP Response (Nexus Layer)
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);

    // 3. Verify V3 Response Structure
    const data = response.body.data;
    const meta = response.body.meta;

    console.log("V3 Response Meta:", JSON.stringify(meta, null, 2));

    expect(data.response).toBe("This is a mocked V3 response.");
    expect(data.provider).toBe("mock-provider");
    expect(data.sessionId).toBeDefined();

    // 4. Verify Metadata exists
    expect(meta).toBeDefined();
  }, 15000);

  it("should handle health checks correctly", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(200);
    // successResponse wraps data in { ok: true, data: { ... } }
    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe("ok");
  });
});