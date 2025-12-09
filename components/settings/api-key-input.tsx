import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

interface APIKeyInputProps {
  provider: string;
  displayName: string;
  value: string;
  maskedKey: string | null;
  placeholder: string;
  docsUrl: string;
  colorClass: string;
  onChange: (value: string) => void;
}

export function APIKeyInput({
  provider,
  displayName,
  value,
  maskedKey,
  placeholder,
  docsUrl,
  colorClass,
  onChange,
}: APIKeyInputProps) {
  // Use dark checkmark for light backgrounds (secondary), white for dark backgrounds (primary, accent)
  const checkmarkColor = colorClass.includes("bg-secondary") ? "text-secondary-foreground" : "text-white";

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
            {maskedKey && <CheckCircle2 className={`h-5 w-5 ${checkmarkColor}`} />}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={provider} className="text-base font-semibold">
              {displayName}
            </Label>
            {maskedKey && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                Configured
              </Badge>
            )}
          </div>
        </div>
        {maskedKey && (
          <Badge variant="secondary" className="font-mono text-xs">
            {maskedKey}
          </Badge>
        )}
      </div>
      <Input
        id={provider}
        type="password"
        placeholder={maskedKey ? "Enter new key to update" : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        Get your API key from{" "}
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener"
          className="underline"
        >
          {docsUrl.replace("https://", "")}
        </a>
      </p>
    </div>
  );
}
