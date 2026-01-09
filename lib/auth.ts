import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import { sql } from "@vercel/postgres";
import { getPostHogClient } from "@/lib/posthog-server";

// Check if we're in a Vercel preview deployment
const isPreviewDeployment = process.env.VERCEL_ENV === "preview";

/**
 * Authentication configuration using NextAuth.js v5
 *
 * CSRF Protection Strategy:
 * -------------------------
 * NextAuth.js provides built-in CSRF protection through multiple mechanisms:
 *
 * 1. Session cookies use SameSite=Lax by default, preventing cross-origin
 *    requests from including session credentials
 *
 * 2. NextAuth.js generates and validates CSRF tokens for auth operations
 *    (sign-in, sign-out, callback handling)
 *
 * 3. API routes are additionally protected because:
 *    - They require Content-Type: application/json (browsers don't send this cross-origin)
 *    - They validate the session JWT on each request
 *    - Modern browsers enforce CORS preflight for non-simple requests
 *
 * This combination provides defense-in-depth against CSRF attacks without
 * requiring explicit CSRF tokens in the application code.
 *
 * Reference: https://next-auth.js.org/getting-started/rest-api#get-apiauthcsrf
 */
// Build providers list based on environment
const oauthProviders = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  Discord({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  }),
];

// Preview deployment credentials provider (email allowlist)
const previewCredentialsProvider = Credentials({
  id: "preview-credentials",
  name: "Preview Login",
  credentials: {
    email: { label: "Email", type: "email" },
  },
  async authorize(credentials) {
    const allowedEmails = process.env.PREVIEW_ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];
    const email = credentials?.email as string;

    if (!email || !allowedEmails.includes(email)) {
      return null;
    }

    return {
      id: `preview-${email}`,
      email,
      name: "Preview User",
    };
  },
});

// E2E test credentials provider (password-based, local dev only)
const e2eCredentialsProvider = Credentials({
  id: "credentials",
  name: "Test Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const testPassword = process.env.E2E_TEST_PASSWORD;
    if (!testPassword || credentials?.password !== testPassword) {
      return null;
    }
    return {
      id: "test-user",
      email: credentials.email as string,
      name: "Test User",
    };
  },
});

// Determine which providers to use
function getProviders() {
  // Preview deployments: only use email allowlist credentials
  if (isPreviewDeployment) {
    return [previewCredentialsProvider];
  }

  // Local development: OAuth + E2E test credentials
  if (process.env.NODE_ENV !== "production") {
    return [...oauthProviders, e2eCredentialsProvider];
  }

  // Production: OAuth only
  return oauthProviders;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: getProviders(),
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false;
      }

      // Skip database operations for test users in E2E tests
      // Only works in non-production AND when E2E_TEST_PASSWORD is set
      if (
        process.env.NODE_ENV !== "production" &&
        process.env.E2E_TEST_PASSWORD &&
        user.id === "test-user"
      ) {
        return true;
      }

      // Skip database operations for preview deployment users
      if (isPreviewDeployment && user.id?.startsWith("preview-")) {
        return true;
      }

      try {
        // Check if user exists
        const existingUser = await sql`
          SELECT id FROM users WHERE email = ${user.email}
        `;

        const isNewUser = existingUser.rows.length === 0;

        if (isNewUser) {
          // Create new user
          await sql`
            INSERT INTO users (email, name, image)
            VALUES (${user.email}, ${user.name || null}, ${user.image || null})
          `;
        } else {
          // Update user info
          await sql`
            UPDATE users
            SET name = ${user.name || null}, image = ${user.image || null}
            WHERE email = ${user.email}
          `;
        }

        // Track server-side login and identify user in PostHog
        try {
          const posthog = getPostHogClient();
          const provider = account?.provider || "unknown";

          posthog.capture({
            distinctId: user.email,
            event: "server_login",
            properties: {
              provider,
              is_new_user: isNewUser,
            },
          });

          posthog.identify({
            distinctId: user.email,
            properties: {
              email: user.email,
              name: user.name,
              provider,
              ...(isNewUser && { created_at: new Date().toISOString() }),
            },
          });
        } catch (posthogError) {
          // Don't fail login if PostHog tracking fails
          console.error("PostHog tracking error:", posthogError);
        }

        return true;
      } catch (error) {
        console.error("Error during sign in:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && token.email) {
        // Skip database operations in E2E tests (no POSTGRES_URL)
        if (
          process.env.NODE_ENV !== "production" &&
          process.env.E2E_TEST_PASSWORD &&
          !process.env.POSTGRES_URL
        ) {
          session.user.id = "test-user-id";
          return session;
        }

        // Skip database operations for preview deployment users
        if (isPreviewDeployment && token.sub?.startsWith("preview-")) {
          session.user.id = token.sub;
          return session;
        }

        try {
          // Fetch user ID from database
          let result = await sql`
            SELECT id FROM users WHERE email = ${token.email}
          `;

          // Auto-create user if they don't exist (handles DB reset scenario)
          if (result.rows.length === 0) {
            await sql`
              INSERT INTO users (email, name, image)
              VALUES (${token.email}, ${token.name || null}, ${token.picture || null})
            `;
            result = await sql`
              SELECT id FROM users WHERE email = ${token.email}
            `;
          }

          if (result.rows.length > 0) {
            session.user.id = result.rows[0].id.toString();
          }
        } catch (error) {
          console.error("Error fetching/creating user:", error);
        }
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
});

// Extend the built-in session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
