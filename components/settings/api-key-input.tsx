import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, X } from "lucide-react";
import posthog from "posthog-js";

interface APIKeyInputProps {
  provider: string;
  displayName: string;
  value: string;
  maskedKey: string | null;
  placeholder: string;
  docsUrl: string;
  colorClass: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => Promise<{ success: boolean; error?: string }>;
  onDelete?: () => Promise<{ success: boolean; error?: string }>;
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
  onSave,
  onDelete,
}: APIKeyInputProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use dark checkmark for light backgrounds (secondary), white for dark backgrounds (primary, accent)
  const checkmarkColor = colorClass.includes("bg-secondary") ? "text-secondary-foreground" : "text-white";

  async function handleBlur() {
    if (!onSave || !value.trim()) return;

    setSaving(true);
    setSaveStatus("idle");
    setErrorMessage(null);

    try {
      const result = await onSave(value.trim());
      if (result.success) {
        setSaveStatus("saved");
        onChange(""); // Clear the input after successful save
        // Track API key saved (conversion event for onboarding)
        posthog.capture("api_key_saved", {
          provider,
        });
        // Reset saved status after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
        setErrorMessage(result.error || "Failed to save");
      }
    } catch {
      setSaveStatus("error");
      setErrorMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      await handleBlur();
    }
  }

  async function handleDelete() {
    if (!onDelete || !maskedKey) return;

    setDeleting(true);
    setErrorMessage(null);

    try {
      const result = await onDelete();
      if (result.success) {
        // Track API key deleted (potential churn signal)
        posthog.capture("api_key_deleted", {
          provider,
        });
      } else {
        setErrorMessage(result.error || "Failed to delete");
      }
    } catch {
      setErrorMessage("Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  const isLoading = saving || deleting;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${colorClass}`}>
            {isLoading ? (
              <Loader2 className={`h-5 w-5 animate-spin ${checkmarkColor}`} />
            ) : maskedKey ? (
              <CheckCircle2 className={`h-5 w-5 ${checkmarkColor}`} />
            ) : null}
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
            {saveStatus === "saved" && (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                Saved
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {maskedKey && (
            <>
              <Badge variant="secondary" className="font-mono text-xs">
                {maskedKey}
              </Badge>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  title="Remove key"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      <Input
        id={provider}
        type="password"
        placeholder={maskedKey ? "Enter new key to update" : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
      />
      {saveStatus === "error" && errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
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
