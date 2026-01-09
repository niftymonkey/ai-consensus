/**
 * Consensus Evaluator Tests
 *
 * Tests for JSON extraction from messy model output.
 * These test cases are derived from actual errors seen in production
 * with OpenRouter models like openai/gpt-oss-120b.
 */

import { describe, it, expect } from "vitest";
import { extractJsonFromText } from "../consensus-evaluator";

describe("extractJsonFromText", () => {
  describe("clean JSON input", () => {
    it("parses valid JSON directly", () => {
      const input = '{"score": 85, "summary": "Good consensus"}';
      const result = extractJsonFromText(input);
      expect(result).toEqual({ score: 85, summary: "Good consensus" });
    });

    it("handles JSON with whitespace", () => {
      const input = `{
        "score": 85,
        "summary": "Good consensus"
      }`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({ score: 85, summary: "Good consensus" });
    });
  });

  describe("preamble text before JSON (real production error)", () => {
    it("extracts JSON when preceded by text like 'craft.'", () => {
      // This is the actual error case from openai/gpt-oss-120b
      const input = `craft.

{
  "score": 94,
  "summary": "All three models are basically singing the same love anthem.",
  "emoji": "🎉",
  "vibe": "celebration"
}`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 94,
        summary: "All three models are basically singing the same love anthem.",
        emoji: "🎉",
        vibe: "celebration",
      });
    });

    it("extracts JSON when preceded by random text", () => {
      const input = `Here's my analysis:

{
  "score": 75,
  "summary": "Moderate agreement"
}`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 75,
        summary: "Moderate agreement",
      });
    });
  });

  describe("double opening braces (real production error)", () => {
    it("handles double opening braces like '{\\n{'", () => {
      // Another actual error case from openai/gpt-oss-120b
      const input = `{
{
  "score": 80,
  "summary": "Good agreement"
}`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 80,
        summary: "Good agreement",
      });
    });

    it("handles '{ {' pattern", () => {
      const input = `{ {
  "score": 80,
  "summary": "Good agreement"
}`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 80,
        summary: "Good agreement",
      });
    });
  });

  describe("markdown code fences", () => {
    it("extracts JSON from ```json code fence", () => {
      const input = "```json\n{\"score\": 90}\n```";
      const result = extractJsonFromText(input);
      expect(result).toEqual({ score: 90 });
    });

    it("extracts JSON from ``` code fence without language", () => {
      const input = "```\n{\"score\": 90}\n```";
      const result = extractJsonFromText(input);
      expect(result).toEqual({ score: 90 });
    });

    it("handles code fence with surrounding text", () => {
      const input = `Here's the evaluation:
\`\`\`json
{
  "score": 85,
  "summary": "Agreement reached"
}
\`\`\`
That's my analysis.`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 85,
        summary: "Agreement reached",
      });
    });
  });

  describe("complex real-world cases", () => {
    it("handles full evaluation response with preamble", () => {
      const input = `Let me analyze these responses carefully.

{
  "areasOfAgreement": [
    "All models agree on the core concept",
    "They share similar perspectives"
  ],
  "emoji": "👍",
  "isGoodEnough": true,
  "keyDifferences": [
    "Model A is more verbose",
    "Model B is more concise"
  ],
  "reasoning": "The models are well aligned.",
  "score": 88,
  "summary": "Strong agreement with minor stylistic differences.",
  "vibe": "agreement"
}`;
      const result = extractJsonFromText(input) as Record<string, unknown>;
      expect(result.score).toBe(88);
      expect(result.vibe).toBe("agreement");
      expect(result.isGoodEnough).toBe(true);
      expect((result.areasOfAgreement as string[]).length).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("returns null for completely invalid input", () => {
      const input = "This is just plain text with no JSON";
      const result = extractJsonFromText(input);
      expect(result).toBeNull();
    });

    it("returns null for empty string", () => {
      const result = extractJsonFromText("");
      expect(result).toBeNull();
    });

    it("returns null for malformed JSON", () => {
      const input = "{score: 85}"; // Missing quotes
      const result = extractJsonFromText(input);
      expect(result).toBeNull();
    });

    it("handles JSON with nested objects", () => {
      const input = `{
        "score": 75,
        "nested": {
          "key": "value"
        }
      }`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({
        score: 75,
        nested: { key: "value" },
      });
    });

    it("handles JSON with arrays", () => {
      const input = `{
        "items": ["a", "b", "c"]
      }`;
      const result = extractJsonFromText(input);
      expect(result).toEqual({ items: ["a", "b", "c"] });
    });
  });
});
