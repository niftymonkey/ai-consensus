# Google OAuth Setup Guide

## Step-by-Step Instructions

### 1. Create a Google OAuth App

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a new project** (or select an existing one):
   - Click the project dropdown at the top left
   - Click "New Project"
   - Name it "AI Consensus" (or your preference)
   - Click "Create"
   - Wait for project creation, then select it

3. **Enable Google+ API** (required for OAuth):
   - Use the search bar at the top
   - Type "Google+ API" or "Google Identity"
   - Click on it and click "Enable"

4. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" → "OAuth consent screen" (left sidebar)
   - Choose "External" user type (unless you have Google Workspace)
   - Click "Create"

   **Fill in the form:**
   - **App name**: AI Consensus
   - **User support email**: your email address
   - **Developer contact information**: your email address
   - Click "Save and Continue"

   **Scopes** (next screen):
   - Skip this, just click "Save and Continue"

   **Test users** (next screen):
   - Click "Add Users"
   - Add your email address (so you can test sign-in)
   - Click "Save and Continue"

   **Summary** (final screen):
   - Review and click "Back to Dashboard"

5. **Create OAuth Credentials**:
   - Go to "APIs & Services" → "Credentials" (left sidebar)
   - Click "Create Credentials" (top) → "OAuth client ID"

   **Configure the OAuth client:**
   - **Application type**: Web application
   - **Name**: AI Consensus Web

   **Authorized redirect URIs** (IMPORTANT!):
   - Click "Add URI"
   - Enter: `http://localhost:3000/api/auth/callback/google`
   - (For production later, add: `https://yourdomain.com/api/auth/callback/google`)

   - Click "Create"

6. **Copy Your Credentials**:
   - A popup appears with your credentials
   - **Client ID**: looks like `123456789-abc...apps.googleusercontent.com`
   - **Client secret**: looks like `GOCSPX-abc123...`
   - **IMPORTANT**: Copy both of these!

### 2. Add Credentials to .env.local

Open the file `/home/mlo/dev/ai-consensus/.env.local` and update these lines:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from step 6.

### 3. Restart the Dev Server

```bash
# Stop the current server (Ctrl+C if running)
cd /home/mlo/dev/ai-consensus
pnpm dev
```

### 4. Test Sign-In

1. Open http://localhost:3000
2. Click "Sign In" in the header
3. You'll be redirected to `/api/auth/signin`
4. Click "Sign in with Google"
5. Choose your Google account
6. Grant permissions
7. You should be redirected back to the app, signed in!

## Troubleshooting

### "Redirect URI mismatch" error
- Make sure the redirect URI in Google Cloud Console exactly matches:
  ```
  http://localhost:3000/api/auth/callback/google
  ```
- No trailing slash!
- Check for typos

### "Access blocked: This app's request is invalid"
- Make sure you added yourself as a test user in the OAuth consent screen
- Go back to "OAuth consent screen" → "Test users" → Add your email

### Database errors when signing in
- This is expected if you haven't set up Vercel Postgres yet
- The sign-in will fail because it can't save the user to the database
- This is the next step after OAuth works

## What Happens After Sign-In Works

Once Google OAuth is working, you'll see:
1. You can click "Sign in with Google"
2. Google login flow happens
3. **Database error** when trying to save the user (expected - database not set up yet)

**Next steps:**
1. Set up Vercel Postgres database
2. Add `POSTGRES_URL` to `.env.local`
3. Run the `schema.sql` script
4. Test sign-in again - should work completely!

## Optional: Set Up Discord OAuth

If you want Discord sign-in as well:

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "AI Consensus"
4. Go to "OAuth2" → "General"
5. Copy the **Client ID** and **Client Secret**
6. Add a redirect: `http://localhost:3000/api/auth/callback/discord`
7. Add credentials to `.env.local`:
   ```bash
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   ```
8. Restart dev server

## Security Notes

- **Never commit `.env.local` to git** (it's in `.gitignore`)
- Keep your Client Secret confidential
- Rotate secrets if they're ever exposed
- For production, use Vercel's environment variables UI
