import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import designRouter from "../../../../src/nexus/routes/design";
import fs from "fs-extra";
import axios from "axios";

// Mock dependencies
vi.mock("fs-extra");
vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue({
          brand: { name: "Test Brand" },
          tokens: {
            colors: { "color-1": "#ffffff" },
            typography: { "font-1": "Arial" },
          },
        }),
        close: vi.fn().mockResolvedValue(null),
      }),
      close: vi.fn().mockResolvedValue(null),
    }),
  },
}));
vi.mock("axios");

const app = express();
app.use(express.json());
app.use("/design", designRouter);

describe("Design Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /design/system", () => {
    it("should return the design system", async () => {
      const mockSystem = { tokens: { colors: {} }, components: [] };
      vi.mocked(fs.readJson).mockResolvedValue(mockSystem);

      const res = await request(app).get("/design/system");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, system: mockSystem });
    });

    it("should handle errors", async () => {
      vi.mocked(fs.readJson).mockRejectedValue(new Error("Read error"));

      const res = await request(app).get("/design/system");

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ ok: false, error: "Read error" });
    });
  });

  describe("POST /design/system", () => {
    it("should save the design system", async () => {
      vi.mocked(fs.writeJson).mockResolvedValue(undefined);

      const res = await request(app)
        .post("/design/system")
        .send({ system: { tokens: {} } });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(fs.writeJson).toHaveBeenCalled();
    });
  });

  describe("POST /design/extract-from-website", () => {
    it("should extract data from website", async () => {
      const res = await request(app)
        .post("/design/extract-from-website")
        .send({ websiteUrl: "https://example.com" });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.brand.name).toBe("Test Brand");
    });
  });

  describe("POST /design/import-figma", () => {
    it("should import styles from Figma", async () => {
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          meta: {
            styles: [
              { style_type: "FILL", name: "Primary" },
              { style_type: "TEXT", name: "H1" },
            ],
          },
        },
      });

      const res = await request(app).post("/design/import-figma").send({
        figmaUrl: "https://www.figma.com/file/abc12345/Test-File",
        apiToken: "fake-token",
      });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.designSystem.colors).toHaveProperty("Primary");
      expect(res.body.designSystem.colors["Primary"]).toBe("#000000");
    });

    it("should return 400 if apiToken is missing", async () => {
      const res = await request(app).post("/design/import-figma").send({
        figmaUrl: "https://www.figma.com/file/abc12345/Test-File",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Figma API Token required");
    });

    it("should handle invalid Figma URL", async () => {
      const res = await request(app).post("/design/import-figma").send({
        figmaUrl: "invalid-url",
        apiToken: "fake-token",
      });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("Invalid Figma URL");
    });
  });
});
