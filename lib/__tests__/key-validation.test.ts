/**
 * Key Validation Tests
 *
 * Tests for validating API keys by making test requests.
 * Uses mocked fetch to simulate API responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateApiKey, type ValidationResult } from "../key-validation";

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe("validateApiKey", () => {
  describe("OpenRouter key validation", () => {
    it("returns valid for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await validateApiKey("openrouter", "sk-or-valid-key");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("returns invalid for 401 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Invalid API key" }),
      });

      const result = await validateApiKey("openrouter", "sk-or-invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("returns invalid for 403 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: "Forbidden" }),
      });

      const result = await validateApiKey("openrouter", "sk-or-forbidden");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await validateApiKey("openrouter", "sk-or-test");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://openrouter.ai/api/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sk-or-test",
          }),
        })
      );
    });
  });

  describe("Anthropic key validation", () => {
    it("returns valid for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await validateApiKey("anthropic", "sk-ant-valid");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for 401 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Invalid API key" } }),
      });

      const result = await validateApiKey("anthropic", "sk-ant-invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await validateApiKey("anthropic", "sk-ant-test");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.anthropic.com/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "sk-ant-test",
          }),
        })
      );
    });
  });

  describe("OpenAI key validation", () => {
    it("returns valid for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await validateApiKey("openai", "sk-valid");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for 401 response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: "Incorrect API key" } }),
      });

      const result = await validateApiKey("openai", "sk-invalid");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("calls correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await validateApiKey("openai", "sk-test");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.openai.com/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer sk-test",
          }),
        })
      );
    });
  });

  describe("Google key validation", () => {
    it("returns valid for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: [] }),
      });

      const result = await validateApiKey("google", "AIza-valid");
      expect(result.valid).toBe(true);
    });

    it("returns invalid for 400 response (bad key)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: "API key not valid" } }),
      });

      const result = await validateApiKey("google", "invalid-key");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid API key");
    });

    it("calls correct endpoint with key in URL", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ models: [] }),
      });

      await validateApiKey("google", "AIza-test");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://generativelanguage.googleapis.com/v1beta/models?key=AIza-test",
        expect.any(Object)
      );
    });
  });

  describe("error handling", () => {
    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await validateApiKey("openai", "sk-test");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Network error - please try again");
    });

    it("handles timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("timeout"));

      const result = await validateApiKey("openai", "sk-test");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Network error - please try again");
    });

    it("handles unknown provider", async () => {
      const result = await validateApiKey("unknown-provider", "some-key");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Unknown provider");
    });

    it("handles empty key", async () => {
      const result = await validateApiKey("openai", "");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key is required");
    });

    it("handles whitespace-only key", async () => {
      const result = await validateApiKey("openai", "   ");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("API key is required");
    });
  });
});
