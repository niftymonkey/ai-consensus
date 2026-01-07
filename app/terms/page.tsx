import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - AI Consensus",
  description: "Terms of service for AI Consensus",
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl py-12">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Agreement to Terms</h2>
          <p className="text-muted-foreground">
            By accessing or using AI Consensus (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Description of Service</h2>
          <p className="text-muted-foreground">
            AI Consensus is a tool that enables multiple AI models to collaborate and reach consensus on questions you provide. The Service facilitates communication between you and third-party AI providers using API keys you supply.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Open Source License</h2>
          <p className="text-muted-foreground">
            AI Consensus is open source software licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). You can view, modify, and distribute the source code in accordance with that license. The source code is available at{" "}
            <a
              href="https://github.com/niftymonkey/ai-consensus"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              github.com/niftymonkey/ai-consensus
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">User Responsibilities</h2>

          <h3 className="text-lg font-medium mt-4 mb-2">API Keys</h3>
          <p className="text-muted-foreground">
            You are responsible for:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Obtaining and maintaining valid API keys from AI providers</li>
            <li>All costs incurred from API usage through the Service</li>
            <li>Complying with the terms of service of your AI providers</li>
            <li>Keeping your API keys secure</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">Acceptable Use</h3>
          <p className="text-muted-foreground">
            You agree not to use the Service to:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>Violate any laws or regulations</li>
            <li>Generate harmful, illegal, or misleading content</li>
            <li>Attempt to circumvent security measures</li>
            <li>Interfere with the Service&apos;s operation</li>
            <li>Violate the terms of service of underlying AI providers</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Intellectual Property</h2>
          <p className="text-muted-foreground">
            The AI Consensus software is licensed under AGPL-3.0. Content you generate through the Service belongs to you, subject to the terms of the AI providers whose models generate the responses.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Third-Party Services</h2>
          <p className="text-muted-foreground">
            The Service integrates with third-party AI providers (OpenRouter, Anthropic, OpenAI, Google, etc.). Your use of these providers is governed by their respective terms of service and privacy policies. We are not responsible for the content, accuracy, or availability of responses from these providers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-muted-foreground mt-2">
            We do not warrant that:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1">
            <li>The Service will be uninterrupted or error-free</li>
            <li>AI-generated responses will be accurate, complete, or reliable</li>
            <li>The Service will meet your specific requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL AI CONSENSUS, ITS OWNER, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p className="text-muted-foreground mt-2">
            You acknowledge that AI-generated content may contain errors or inaccuracies. You are solely responsible for verifying any information before relying on it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Indemnification</h2>
          <p className="text-muted-foreground">
            You agree to indemnify and hold harmless AI Consensus and its owner from any claims, damages, or expenses arising from your use of the Service, your violation of these Terms, or your violation of any third-party rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Termination</h2>
          <p className="text-muted-foreground">
            We reserve the right to suspend or terminate your access to the Service at any time, for any reason, without notice. You may stop using the Service at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
          <p className="text-muted-foreground">
            We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms. We encourage you to review these Terms periodically.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Governing Law</h2>
          <p className="text-muted-foreground">
            These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Contact</h2>
          <p className="text-muted-foreground">
            For questions about these Terms, please open an issue on our{" "}
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
          {" | "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
