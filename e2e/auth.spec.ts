import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Sign In Page", () => {
    test("displays sign in page with OAuth providers", async ({ page }) => {
      await page.goto("/signin");
      await page.waitForLoadState("networkidle");

      // Check page title and description
      await expect(page.getByText("Sign In").first()).toBeVisible();
      await expect(
        page.getByText("Choose a provider to sign in to AI Consensus")
      ).toBeVisible();

      // Check OAuth buttons are present
      await expect(
        page.getByRole("button", { name: /Continue with Google/i })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Continue with Discord/i })
      ).toBeVisible();
    });

    test("displays terms of service and privacy policy links", async ({
      page,
    }) => {
      await page.goto("/signin");
      await page.waitForLoadState("networkidle");

      const termsLink = page.getByRole("link", { name: /Terms of Service/i });
      const privacyLink = page.getByRole("link", { name: /Privacy Policy/i });

      await expect(termsLink).toBeVisible();
      await expect(privacyLink).toBeVisible();

      // Verify links point to correct pages
      await expect(termsLink).toHaveAttribute("href", "/terms");
      await expect(privacyLink).toHaveAttribute("href", "/privacy");
    });

    test("Google sign-in button initiates OAuth flow", async ({ page }) => {
      await page.goto("/signin");
      await page.waitForLoadState("networkidle");

      const googleButton = page.getByRole("button", {
        name: /Continue with Google/i,
      });

      // Wait for both: the request to fire AND the button click
      const [request] = await Promise.all([
        page.waitForRequest((req) =>
          req.url().includes("/api/auth/signin/google")
        ),
        googleButton.click(),
      ]);

      expect(request.url()).toContain("/api/auth/signin/google");
    });

    test("Discord sign-in button initiates OAuth flow", async ({ page }) => {
      await page.goto("/signin");
      await page.waitForLoadState("networkidle");

      const discordButton = page.getByRole("button", {
        name: /Continue with Discord/i,
      });

      const [request] = await Promise.all([
        page.waitForRequest((req) =>
          req.url().includes("/api/auth/signin/discord")
        ),
        discordButton.click(),
      ]);

      expect(request.url()).toContain("/api/auth/signin/discord");
    });

    test("preserves callback URL in sign-in page URL", async ({ page }) => {
      await page.goto("/signin?callbackUrl=%2Fconsensus");
      await page.waitForLoadState("networkidle");

      // Verify the page URL contains the callback URL
      expect(page.url()).toContain("callbackUrl");

      // Sign in buttons should still be present
      await expect(
        page.getByRole("button", { name: /Continue with Google/i })
      ).toBeVisible();
    });
  });

  test.describe("Unauthenticated Access", () => {
    test("landing page is accessible without authentication", async ({
      page,
    }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL("/");
    });

    test("consensus page redirects unauthenticated users", async ({ page }) => {
      await page.goto("/consensus");
      // Wait for redirect to complete
      await page.waitForURL(/\/signin/);
      await expect(page).toHaveURL(/\/signin/);
    });

    test("settings page redirects unauthenticated users", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForURL(/\/signin/);
      await expect(page).toHaveURL(/\/signin/);
    });
  });

  test.describe("Public Pages", () => {
    test("terms of service page loads correctly", async ({ page }) => {
      await page.goto("/terms");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/Terms of Service/i).first()).toBeVisible();
    });

    test("privacy policy page loads correctly", async ({ page }) => {
      await page.goto("/privacy");
      await page.waitForLoadState("networkidle");
      await expect(page.getByText(/Privacy Policy/i).first()).toBeVisible();
    });
  });
});
