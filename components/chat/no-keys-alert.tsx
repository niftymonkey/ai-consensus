import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export function NoKeysAlert() {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>No API Keys Configured</AlertTitle>
      <AlertDescription>
        To start using AI Consensus, you need to configure at least one API key.
        Add your API keys for Claude, GPT, or Gemini in the settings page.
      </AlertDescription>
      <Button className="mt-4" asChild>
        <Link href="/settings">Configure API Keys</Link>
      </Button>
    </Alert>
  );
}
