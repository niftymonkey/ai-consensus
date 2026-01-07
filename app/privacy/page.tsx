import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - AI Consensus",
  description: "Privacy policy for AI Consensus",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Introduction</h2>
          <p className="text-muted-foreground">
            AI Consensus (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our service at aiconsensus.io.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>

          <h3 className="text-lg font-medium mt-4 mb-2">Account Information</h3>
          <p className="text-muted-foreground">
            When you sign in using Google or Discord, we receive and store:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Email address</li>
            <li>Display name</li>
            <li>Profile picture URL</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">API Keys</h3>
          <p className="text-muted-foreground">
            If you choose to store your AI provider API keys (OpenRouter, Anthropic, OpenAI, Google, etc.), we encrypt them before storing in our database. These keys are used solely to make API calls to your chosen AI providers on your behalf.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">Usage Preferences</h3>
          <p className="text-muted-foreground">
            Settings like theme preferences and model selections are stored locally in your browser (localStorage) and are not transmitted to our servers.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">What We Do NOT Collect</h3>
          <p className="text-muted-foreground">
            We do not store your prompts, questions, or the AI-generated responses. Conversations are processed in real-time and are not retained on our servers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>To authenticate you and provide access to the service</li>
            <li>To make API calls to AI providers using your stored API keys</li>
            <li>To improve and maintain the service</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
          <p className="text-muted-foreground mb-4">
            We use the following third-party services:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            <li>
              <strong>Google and Discord</strong> - For authentication. Their privacy policies apply to data they collect during sign-in.
            </li>
            <li>
              <strong>AI Providers</strong> (OpenRouter, Anthropic, OpenAI, Google AI) - Your prompts are sent directly to these providers using your API keys. Their privacy policies govern how they handle your data.
            </li>
            <li>
              <strong>Vercel</strong> - For hosting and database services.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Security</h2>
          <p className="text-muted-foreground">
            We implement industry-standard security measures including:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Encryption of API keys at rest</li>
            <li>HTTPS for all data transmission</li>
            <li>Secure authentication via OAuth 2.0</li>
            <li>Rate limiting and security headers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Your Rights</h2>
          <p className="text-muted-foreground">
            You can:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Delete your stored API keys at any time from the Settings page</li>
            <li>Request deletion of your account and all associated data by contacting us</li>
            <li>Access the source code (this project is open source under AGPL-3.0)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
          <p className="text-muted-foreground">
            We retain your account information and encrypted API keys until you delete them or request account deletion. We do not retain conversation data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Children&apos;s Privacy</h2>
          <p className="text-muted-foreground">
            AI Consensus is not intended for children under 13. We do not knowingly collect information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
          <p className="text-muted-foreground">
            If you have questions about this Privacy Policy, please open an issue on our{" "}
            <a
              href="https://github.com/niftymonkey/ai-consensus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              GitHub repository
            </a>
            .
          </p>
        </section>

        <div className="pt-8 border-t">
          <Link href="/" className="text-primary underline">
            Return to AI Consensus
          </Link>
        </div>
      </div>
    </div>
  );
}
