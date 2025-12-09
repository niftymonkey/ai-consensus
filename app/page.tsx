import { auth } from "@/lib/auth";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-5xl font-bold">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent">
              AI Consensus
            </span>
          </h2>
          <p className="text-xl text-gray-600">
            Ask a question and watch three leading AI models collaborate to reach consensus
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 py-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-claude/10 flex items-center justify-center mb-4 mx-auto">
              <div className="w-6 h-6 rounded-full bg-claude"></div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Claude</h3>
            <p className="text-sm text-gray-600">
              Anthropic&apos;s powerful AI model known for thoughtful, nuanced responses
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gpt/10 flex items-center justify-center mb-4 mx-auto">
              <div className="w-6 h-6 rounded-full bg-gpt"></div>
            </div>
            <h3 className="font-semibold text-lg mb-2">GPT-4</h3>
            <p className="text-sm text-gray-600">
              OpenAI&apos;s flagship model with broad knowledge and strong reasoning
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 rounded-full gradient-gemini/10 flex items-center justify-center mb-4 mx-auto">
              <div className="w-6 h-6 rounded-full gradient-gemini"></div>
            </div>
            <h3 className="font-semibold text-lg mb-2">Gemini</h3>
            <p className="text-sm text-gray-600">
              Google&apos;s advanced AI with multimodal capabilities and fast responses
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left">
            <h3 className="font-semibold text-lg mb-2">Development Progress</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>✅ Project initialized with Next.js 16 and Tailwind CSS</li>
              <li>✅ NextAuth.js authentication with Google OAuth</li>
              <li>✅ Secure API key management with AES-256 encryption</li>
              <li>✅ Chat interface with parallel AI streaming</li>
              <li>✅ Model selection for Claude, GPT, and Gemini</li>
              <li>⏳ Consensus workflow with iterative refinement</li>
            </ul>
          </div>

          {session && (
            <div className="flex gap-4 justify-center">
              <Link
                href="/chat"
                className="px-6 py-3 bg-gradient-to-r from-claude to-gpt text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                Start Chatting
              </Link>
              <Link
                href="/settings"
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg font-semibold hover:shadow-md transition-shadow"
              >
                Settings
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
