import { test as setup, expect } from "@playwright/test";

const authFile = "playwright/.auth/user.json";

/**
 * Authenticate once and save browser state for all tests.
 * Uses the test-only Credentials provider (only available in non-production).
 *
 * NextAuth v5 credentials flow:
 * 1. Navigate to establish a browser context
 * 2. Get CSRF token from /api/auth/csrf
 * 3. POST credentials to /api/auth/callback/credentials
 * 4. Save resulting session cookie via storageState
 */
setup("authenticate", async ({ page }) => {
  const testPassword = process.env.E2E_TEST_PASSWORD || "";

  if (!testPassword) {
    throw new Error(
      "E2E_TEST_PASSWORD is not set. Add it to .env.local for E2E testing."
    );
  }

  // First navigate to establish cookies context
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Use page.evaluate to sign in via the credentials provider
  const signInResult = await page.evaluate(async (password) => {
    try {
      // Get CSRF token
      const csrfResponse = await fetch("/api/auth/csrf");
      if (!csrfResponse.ok) {
        return {
          ok: false,
          status: csrfResponse.status,
          error: "Failed to get CSRF token",
        };
      }
      const { csrfToken } = await csrfResponse.json();

      // Sign in with credentials - follow redirects to allow cookie setting
      const response = await fetch("/api/auth/callback/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          csrfToken,
          email: "test@example.com",
          password: password,
        }),
        credentials: "include",
      });

      return {
        ok: response.ok || response.redirected,
        status: response.status,
        redirected: response.redirected,
        url: response.url,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: String(error),
      };
    }
  }, testPassword);

  // Check if sign-in request was successful
  if (!signInResult.ok) {
    throw new Error(
      `Sign-in request failed: ${JSON.stringify(signInResult)}. Check E2E_TEST_PASSWORD matches the value in .env.local on the server.`
    );
  }

  // Reload to pick up the session cookie
  await page.reload();
  await page.waitForLoadState("networkidle");

  // Verify we're authenticated by accessing a protected page
  await page.goto("/consensus");
  await page.waitForLoadState("networkidle");

  // If redirected to signin, authentication failed
  if (page.url().includes("/signin")) {
    throw new Error(
      "Authentication failed - redirected to signin after successful request. Session cookie may not have been set."
    );
  }

  // Save browser state (cookies, localStorage) for reuse
  await page.context().storageState({ path: authFile });
});
