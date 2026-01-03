import { sql } from "@vercel/postgres";
import { encrypt, decrypt } from "./encryption";

export type Provider = "anthropic" | "openai" | "google" | "tavily" | "openrouter";

export interface ApiKey {
  id: number;
  userId: number;
  provider: Provider;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyWithDecryptedKey extends ApiKey {
  apiKey: string;
}

/**
 * Save or update an API key for a user
 */
export async function upsertApiKey(
  userId: string,
  provider: Provider,
  apiKey: string
): Promise<void> {
  const encryptedKey = encrypt(apiKey);

  await sql`
    INSERT INTO api_keys (user_id, provider, encrypted_key, updated_at)
    VALUES (${userId}, ${provider}, ${encryptedKey}, NOW())
    ON CONFLICT (user_id, provider)
    DO UPDATE SET
      encrypted_key = ${encryptedKey},
      updated_at = NOW()
  `;
}

/**
 * Get all API keys for a user (with decrypted keys)
 */
export async function getApiKeys(
  userId: string
): Promise<Record<Provider, string | null>> {
  const result = await sql<{ provider: Provider; encrypted_key: string }>`
    SELECT provider, encrypted_key
    FROM api_keys
    WHERE user_id = ${userId}
  `;

  const keys: Record<Provider, string | null> = {
    anthropic: null,
    openai: null,
    google: null,
    tavily: null,
    openrouter: null,
  };

  for (const row of result.rows) {
    try {
      keys[row.provider] = decrypt(row.encrypted_key);
    } catch (error) {
      // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
      console.error(`Failed to decrypt ${row.provider} key for user ${userId}:`, error);
      // Keep as null if decryption fails
    }
  }

  return keys;
}

/**
 * Get a single API key for a user (decrypted)
 */
export async function getApiKey(
  userId: string,
  provider: Provider
): Promise<string | null> {
  const result = await sql<{ encrypted_key: string }>`
    SELECT encrypted_key
    FROM api_keys
    WHERE user_id = ${userId} AND provider = ${provider}
  `;

  if (result.rows.length === 0) {
    return null;
  }

  try {
    return decrypt(result.rows[0].encrypted_key);
  } catch (error) {
    // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
    console.error(`Failed to decrypt ${provider} key for user ${userId}:`, error);
    return null;
  }
}

/**
 * Delete an API key for a user
 */
export async function deleteApiKey(
  userId: string,
  provider: Provider
): Promise<void> {
  await sql`
    DELETE FROM api_keys
    WHERE user_id = ${userId} AND provider = ${provider}
  `;
}

/**
 * Check which API keys a user has configured (without returning the actual keys)
 */
export async function hasApiKeys(
  userId: string
): Promise<Record<Provider, boolean>> {
  const result = await sql<{ provider: Provider }>`
    SELECT provider
    FROM api_keys
    WHERE user_id = ${userId}
  `;

  const has: Record<Provider, boolean> = {
    anthropic: false,
    openai: false,
    google: false,
    tavily: false,
    openrouter: false,
  };

  for (const row of result.rows) {
    has[row.provider] = true;
  }

  return has;
}
