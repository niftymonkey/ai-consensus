# AI Consensus

A web application that enables multiple AI models to collaborate and reach consensus on your questions through iterative deliberation.

**Live Demo:** [ai-consensus.niftymonkey.dev](https://ai-consensus.niftymonkey.dev)

## What It Does

AI Consensus takes your question and sends it to multiple AI models simultaneously. The models then see each other's responses and refine their answers through multiple rounds until they reach agreement. An evaluator model analyzes the responses and determines when consensus is achieved.

This approach helps surface more reliable, well-reasoned answers by leveraging the diverse strengths of different AI models.

## Features

- **Multi-Model Collaboration** - Claude, GPT, Gemini, and 200+ models via OpenRouter
- **Iterative Consensus** - Models refine responses over multiple rounds until aligned
- **Configurable Evaluator** - Choose which model evaluates consensus
- **Real-time Streaming** - Watch responses stream in as models think
- **OpenRouter Integration** - One API key gives access to all major models
- **Secure Key Storage** - API keys encrypted with AES-256 at rest
- **7 Visual Themes** - Customize the interface to your preference
- **Self-Hostable** - Run your own instance with full control

## How It Works

1. **Ask a Question** - Enter your question in the chat interface
2. **Initial Responses** - Selected models respond simultaneously
3. **Evaluation** - An evaluator model analyzes responses for alignment
4. **Refinement** - If consensus isn't reached, models see each other's responses and refine
5. **Consensus** - Once aligned (or after max rounds), a unified response is presented

## Quick Start (Using the Hosted Version)

1. Visit [ai-consensus.niftymonkey.dev](https://ai-consensus.niftymonkey.dev)
2. Sign in with Google or Discord
3. Add your OpenRouter API key in Settings (get one at [openrouter.ai/keys](https://openrouter.ai/keys))
4. Start asking questions

## Self-Hosting

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database (Vercel Postgres, Neon, Supabase, or local)
- OAuth credentials (Google and/or Discord)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/niftymonkey/ai-consensus.git
cd ai-consensus
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Configure environment variables in `.env.local`:

```bash
# Required - Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-secret-here
ENCRYPTION_KEY=your-encryption-key-here

# Required - OAuth (at least one)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Required - PostgreSQL connection string
POSTGRES_URL=postgresql://user:password@host:5432/database

# Optional - Default API keys for testing
OPENROUTER_API_KEY=
```

5. Set up the database:
```bash
pnpm db:setup
```

6. Start the development server:
```bash
pnpm dev
```

7. Open [http://localhost:3000](http://localhost:3000)

### Deploying to Vercel

1. Push your fork to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Configure OAuth redirect URIs for your production domain
5. Deploy

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **AI Integration:** Vercel AI SDK v5
- **Models:** OpenRouter, Anthropic, OpenAI, Google
- **Auth:** NextAuth.js v5
- **Database:** PostgreSQL (Vercel Postgres)
- **Styling:** Tailwind CSS, Radix UI
- **Language:** TypeScript

## API Keys

Users provide their own API keys, which are encrypted and stored securely. The recommended approach is using OpenRouter, which provides access to 200+ models with a single API key.

Supported providers:
- **OpenRouter** (recommended) - Access to Claude, GPT, Gemini, Llama, Mistral, and more
- **Anthropic** - Claude models directly
- **OpenAI** - GPT models directly
- **Google** - Gemini models directly

## License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).

This means:
- You can use, modify, and distribute this software
- If you run a modified version as a network service, you must make your source code available
- Any derivative work must also be licensed under AGPL-3.0

For commercial licensing inquiries, please open an issue.

## Contributing

Built this for myself, decided to share it with everyone. Keeping development solo for now, but issues are open for bugs and ideas!

## Support

- **Issues:** [GitHub Issues](https://github.com/niftymonkey/ai-consensus/issues)
- **Source:** [GitHub Repository](https://github.com/niftymonkey/ai-consensus)
