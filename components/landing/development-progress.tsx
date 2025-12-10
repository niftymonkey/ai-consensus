import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function DevelopmentProgress() {
  return (
    <Alert>
      <AlertTitle>Key Features</AlertTitle>
      <AlertDescription className="text-left">
        <ul className="mt-2 space-y-2">
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Sign in with Google or Discord</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Support for Claude, GPT, and Gemini models</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Dynamic model selection based on your API keys</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Consensus Mode - Watch AI models collaborate and refine answers</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Simple Chat - Quick responses from multiple models at once</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">✓</Badge>
            <span>Encrypted API key storage (AES-256)</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
