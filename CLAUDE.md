# Claude Instructions for AI Consensus Project

## Development Workflow

### Before Committing
**ALWAYS test that changes work before committing!**
- Have the user confirm functionality works
- Run the dev server and verify features
- Only commit after user confirms "it works"

### Branching Strategy
- Create feature branches for all new work
- Use conventional commit format: `feat:`, `fix:`, `docs:`, etc.
- Keep commits focused and single-purpose

### Testing Authentication
To test the authentication system:
1. Start dev server: `pnpm dev`
2. Visit http://localhost:3000
3. Click "Sign In" to test NextAuth's built-in OAuth flow
4. Verify user menu appears after sign-in
5. Test protected routes redirect properly

### Environment Setup Required
Before authentication will work:
- Set up OAuth apps (Google and/or Discord)
- Add credentials to `.env.local`
- Set up Vercel Postgres database
- Run `schema.sql` to create tables

## Project Conventions
- Use TypeScript
- Use pnpm for package management
- Prefer single-line commits
- No emojis unless requested
