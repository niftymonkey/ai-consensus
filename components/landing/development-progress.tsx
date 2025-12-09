import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function DevelopmentProgress() {
  return (
    <Alert>
      <AlertTitle>Development Progress</AlertTitle>
      <AlertDescription className="text-left">
        <ul className="mt-2 space-y-2">
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">Done</Badge>
            <span>Project initialized with Next.js 16 and Tailwind CSS</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">Done</Badge>
            <span>NextAuth.js authentication with Google OAuth</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">Done</Badge>
            <span>Secure API key management with AES-256 encryption</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">Done</Badge>
            <span>Chat interface with parallel AI streaming</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-green-600 py-1 leading-none hover:bg-green-600">Done</Badge>
            <span>Model selection for Claude, GPT, and Gemini</span>
          </li>
          <li className="flex items-center gap-2">
            <Badge className="inline-flex items-center justify-center bg-amber-500 py-1 leading-none hover:bg-amber-500">In Progress</Badge>
            <span>Consensus workflow with iterative refinement</span>
          </li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
