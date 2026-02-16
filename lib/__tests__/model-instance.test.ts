import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI SDK providers
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ provider: "anthropic-direct", modelId }))),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(() => vi.fn((modelId: string) => ({ provider: "openai-direct", modelId }))),
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn((modelId: string) => ({ provider: "google-direct", modelId }))),
}));

vi.mock("../openrouter", () => ({
  createOpenRouterProvider: vi.fn(() => ({
    chat: vi.fn((modelId: string) => ({ provider: "openrouter", modelId })),
  })),
}));

import { getModelInstance } from "../model-instance";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouterProvider } from "../openrouter";

describe("getModelInstance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("with OpenRouter key (sk-or-*)", () => {
    const openRouterKey = "sk-or-v1-test-key-12345";

    it("routes OpenAI model through OpenRouter", () => {
      const result = getModelInstance(openRouterKey, "openai", "openai/gpt-4o-mini");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(openRouterKey, undefined);
      expect(createOpenAI).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "openrouter", modelId: "openai/gpt-4o-mini" });
    });

    it("routes Anthropic model through OpenRouter", () => {
      const result = getModelInstance(openRouterKey, "anthropic", "anthropic/claude-3.5-haiku");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(openRouterKey, undefined);
      expect(createAnthropic).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "openrouter", modelId: "anthropic/claude-3.5-haiku" });
    });

    it("routes Google model through OpenRouter", () => {
      const result = getModelInstance(openRouterKey, "google", "google/gemini-2.0-flash-001");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(openRouterKey, undefined);
      expect(createGoogleGenerativeAI).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "openrouter", modelId: "google/gemini-2.0-flash-001" });
    });

    it("routes non-direct provider models through OpenRouter", () => {
      const result = getModelInstance(openRouterKey, "meta-llama", "meta-llama/llama-3.1-8b-instruct");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(openRouterKey, undefined);
      expect(result).toEqual({ provider: "openrouter", modelId: "meta-llama/llama-3.1-8b-instruct" });
    });

    it("converts direct format model ID to OpenRouter format", () => {
      const result = getModelInstance(openRouterKey, "openai", "gpt-4o-mini");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(openRouterKey, undefined);
      expect(result).toEqual({ provider: "openrouter", modelId: "openai/gpt-4o-mini" });
    });
  });

  describe("with direct OpenAI key", () => {
    const openaiKey = "sk-proj-test-key-12345";

    it("routes OpenAI model directly", () => {
      const result = getModelInstance(openaiKey, "openai", "openai/gpt-4o-mini");

      expect(createOpenAI).toHaveBeenCalledWith({ apiKey: openaiKey });
      expect(createOpenRouterProvider).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "openai-direct", modelId: "gpt-4o-mini" });
    });

    it("extracts model ID from OpenRouter format for direct call", () => {
      const result = getModelInstance(openaiKey, "openai", "openai/gpt-4o");

      expect(createOpenAI).toHaveBeenCalledWith({ apiKey: openaiKey });
      expect(result).toEqual({ provider: "openai-direct", modelId: "gpt-4o" });
    });

    it("handles direct format model ID", () => {
      const result = getModelInstance(openaiKey, "openai", "gpt-4o-mini");

      expect(createOpenAI).toHaveBeenCalledWith({ apiKey: openaiKey });
      expect(result).toEqual({ provider: "openai-direct", modelId: "gpt-4o-mini" });
    });
  });

  describe("with direct Anthropic key", () => {
    const anthropicKey = "sk-ant-test-key-12345";

    it("routes Anthropic model directly", () => {
      const result = getModelInstance(anthropicKey, "anthropic", "anthropic/claude-3.5-haiku");

      expect(createAnthropic).toHaveBeenCalledWith({ apiKey: anthropicKey });
      expect(createOpenRouterProvider).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "anthropic-direct", modelId: "claude-3.5-haiku" });
    });

    it("handles direct format model ID", () => {
      const result = getModelInstance(anthropicKey, "anthropic", "claude-3-5-haiku-20241022");

      expect(createAnthropic).toHaveBeenCalledWith({ apiKey: anthropicKey });
      expect(result).toEqual({ provider: "anthropic-direct", modelId: "claude-3-5-haiku-20241022" });
    });
  });

  describe("with direct Google key", () => {
    const googleKey = "AIza-test-key-12345";

    it("routes Google model directly", () => {
      const result = getModelInstance(googleKey, "google", "google/gemini-2.0-flash-001");

      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: googleKey });
      expect(createOpenRouterProvider).not.toHaveBeenCalled();
      expect(result).toEqual({ provider: "google-direct", modelId: "gemini-2.0-flash-001" });
    });

    it("handles direct format model ID", () => {
      const result = getModelInstance(googleKey, "google", "gemini-2.0-flash");

      expect(createGoogleGenerativeAI).toHaveBeenCalledWith({ apiKey: googleKey });
      expect(result).toEqual({ provider: "google-direct", modelId: "gemini-2.0-flash" });
    });
  });

  describe("with non-direct provider and non-OpenRouter key", () => {
    const someKey = "some-random-key";

    it("falls back to OpenRouter for non-direct providers", () => {
      const result = getModelInstance(someKey, "meta-llama", "meta-llama/llama-3.1-8b-instruct");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(someKey, undefined);
      expect(result).toEqual({ provider: "openrouter", modelId: "meta-llama/llama-3.1-8b-instruct" });
    });

    it("falls back to OpenRouter for mistral models", () => {
      const result = getModelInstance(someKey, "mistralai", "mistralai/mistral-small-24b-instruct-2501");

      expect(createOpenRouterProvider).toHaveBeenCalledWith(someKey, undefined);
      expect(result).toEqual({ provider: "openrouter", modelId: "mistralai/mistral-small-24b-instruct-2501" });
    });
  });
});
