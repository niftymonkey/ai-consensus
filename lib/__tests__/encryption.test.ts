/**
 * Encryption Tests
 *
 * Tests for API key encryption/decryption using AES-256-GCM.
 * These tests verify that the encryption module correctly
 * encrypts and decrypts sensitive data.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to mock the environment variable before importing the module
const MOCK_ENCRYPTION_KEY = Buffer.from(
  "0123456789abcdef0123456789abcdef" // 32 bytes for AES-256
).toString("base64");

describe("encryption", () => {
  beforeEach(() => {
    vi.stubEnv("ENCRYPTION_KEY", MOCK_ENCRYPTION_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("encrypt and decrypt", () => {
    it("encrypts and decrypts a simple string correctly", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key-12345";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("encrypts to different ciphertext each time (due to random IV)", async () => {
      const { encrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key-12345";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // Same plaintext should produce different ciphertext due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("decrypts both ciphertexts to same plaintext", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key-12345";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("handles empty string", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles long strings", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-".padEnd(1000, "x");
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles unicode characters", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "api-key-with-unicode-🔐-symbols-中文";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles special characters", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-ant-api03-!@#$%^&*()_+-=[]{}|;':\",./<>?";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("produces base64 encoded output", async () => {
      const { encrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key";
      const encrypted = encrypt(plaintext);

      // Check that output is valid base64
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      expect(encrypted).toMatch(base64Regex);
    });
  });

  describe("error handling", () => {
    it("throws error when ENCRYPTION_KEY is not set", async () => {
      vi.stubEnv("ENCRYPTION_KEY", "");

      // Clear the module cache to force re-import
      vi.resetModules();

      const { encrypt } = await import("../encryption");

      expect(() => encrypt("test")).toThrow(
        "ENCRYPTION_KEY environment variable is not set"
      );
    });

    it("throws error when decrypting invalid ciphertext", async () => {
      const { decrypt } = await import("../encryption");

      // Invalid base64 that won't decode properly
      expect(() => decrypt("invalid-not-base64!!!")).toThrow();
    });

    it("throws error when decrypting tampered ciphertext", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key";
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext (change a character)
      const tampered =
        encrypted.slice(0, 10) +
        (encrypted[10] === "A" ? "B" : "A") +
        encrypted.slice(11);

      expect(() => decrypt(tampered)).toThrow();
    });

    it("throws error when decrypting with wrong key", async () => {
      const { encrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key";
      const encrypted = encrypt(plaintext);

      // Change the encryption key
      const differentKey = Buffer.from(
        "fedcba9876543210fedcba9876543210"
      ).toString("base64");
      vi.stubEnv("ENCRYPTION_KEY", differentKey);

      // Clear module cache to use new key
      vi.resetModules();

      const { decrypt } = await import("../encryption");

      expect(() => decrypt(encrypted)).toThrow();
    });
  });

  describe("real-world API key formats", () => {
    const apiKeyFormats = [
      { name: "OpenRouter", key: "sk-or-v1-abc123def456ghi789jkl012mno345pqr678stu901vwx234" },
      { name: "Anthropic", key: "sk-ant-api03-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890" },
      { name: "OpenAI", key: "sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def123" },
      { name: "Google", key: "AIzaSyAbc123def456ghi789jkl012mno345pqr678" },
      { name: "Tavily", key: "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" },
    ];

    for (const { name, key } of apiKeyFormats) {
      it(`correctly encrypts and decrypts ${name} API key format`, async () => {
        const { encrypt, decrypt } = await import("../encryption");

        const encrypted = encrypt(key);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(key);
      });
    }
  });

  describe("security properties", () => {
    it("ciphertext is longer than plaintext (includes IV and auth tag)", async () => {
      const { encrypt } = await import("../encryption");

      const plaintext = "sk-test";
      const encrypted = encrypt(plaintext);

      // Encrypted output should be longer than plaintext due to IV (16) and auth tag (16)
      const encryptedBuffer = Buffer.from(encrypted, "base64");
      expect(encryptedBuffer.length).toBeGreaterThan(plaintext.length);
    });

    it("uses authenticated encryption (GCM mode)", async () => {
      const { encrypt, decrypt } = await import("../encryption");

      const plaintext = "sk-test-api-key";
      const encrypted = encrypt(plaintext);

      // Tamper with just the encrypted data portion (after IV, before auth tag)
      const buffer = Buffer.from(encrypted, "base64");
      // IV is 16 bytes, auth tag is last 16 bytes
      // Modify byte in the middle (encrypted data portion)
      const middleIndex = 20;
      buffer[middleIndex] = buffer[middleIndex] ^ 0xff;
      const tampered = buffer.toString("base64");

      // GCM should detect tampering and throw
      expect(() => decrypt(tampered)).toThrow();
    });
  });
});
