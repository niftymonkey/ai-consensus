import { Alert, AlertDescription } from "@/components/ui/alert";

export function SecurityNotice() {
  return (
    <Alert>
      <AlertDescription>
        <strong>Security:</strong> Your API keys are encrypted using AES-256-GCM
        before being stored in the database. They are only decrypted when needed
        to make API calls on your behalf.
      </AlertDescription>
    </Alert>
  );
}
