# AI Consensus

An innovative web application where Claude, GPT-4, and Gemini collaborate to reach consensus on user questions through iterative deliberation.

## Features

- 🤖 **Multi-Model Collaboration**: Watch three leading AI models work together
- 🔄 **Iterative Consensus**: Models refine their responses until they align
- 📊 **Real-time Visualization**: See each model's thinking process
- 🔐 **Secure Authentication**: NextAuth.js with Google and Discord OAuth
- 🔑 **Encrypted API Keys**: Your keys are securely encrypted and stored
- ⚡ **Streaming Responses**: Real-time updates as models think

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI SDK**: Vercel AI SDK v5
- **Models**: Anthropic Claude, OpenAI GPT-4, Google Gemini
- **Auth**: NextAuth.js v5
- **Database**: Vercel Postgres
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- API keys for Claude, GPT-4, and Gemini
- Google and/or Discord OAuth credentials (for auth)
- Vercel Postgres database (or compatible PostgreSQL)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd ai-consensus
```

2. Install dependencies:
```bash
pnpm install
```

3. Copy the example environment file:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables in `.env.local`:
   - Generate `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   - Generate `ENCRYPTION_KEY`: `openssl rand -base64 32`
   - Add your OAuth credentials
   - Add your database connection string
   - Optionally add default API keys

5. Set up the database:
```bash
pnpm db:setup
```

6. Run the development server:
```bash
pnpm dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
ai-consensus/
├── app/
│   ├── (auth)/          # Auth-related pages
│   │   ├── login/       # Login page
│   │   └── settings/    # API key settings
│   ├── api/
│   │   ├── auth/        # NextAuth endpoints
│   │   └── chat/        # Consensus workflow API
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── auth/            # Auth components
│   ├── chat/            # Chat UI components
│   └── settings/        # Settings components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── consensus-workflow.ts  # Core consensus logic
│   ├── db.ts            # Database utilities
│   ├── encryption.ts    # Encryption utilities
│   └── types.ts         # TypeScript types
└── schema.sql           # Database schema
```

## How It Works

1. **User Question**: You ask a question through the chat interface
2. **Initial Responses**: All three models (Claude, GPT, Gemini) respond simultaneously
3. **Consensus Check**: An evaluator analyzes the responses for alignment
4. **Refinement**: If consensus isn't reached, models see each other's responses and refine
5. **Final Response**: Once aligned (or after max rounds), a unified response is presented

## Environment Variables

See `.env.example` for all required environment variables.

## Deployment

Deploy to Vercel:

```bash
vercel
```

Make sure to:
1. Create a Neon Postgres database in Vercel Storage
2. Add all environment variables in Vercel dashboard
3. Run `pnpm db:setup` locally (it uses POSTGRES_URL from your .env.local)
4. Configure OAuth redirect URIs for your production domain

## Development Status

🚧 **In Active Development**

Current phase: Consensus workflow
- ✅ Project structure created
- ✅ Dependencies installed
- ✅ Placeholder pages created
- ✅ Authentication (NextAuth.js with Google OAuth)
- ✅ Database setup with Vercel Postgres
- ✅ User session management
- ✅ API key management with AES-256 encryption
- ✅ Chat interface with parallel streaming
- ✅ Theme system with 7 customizable themes
- ⏳ Consensus workflow - Next up

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.
