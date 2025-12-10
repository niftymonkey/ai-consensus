"use client";

import { useEffect, useState } from "react";
import { SettingsHeader } from "@/components/settings/settings-header";
import { APIKeyInput } from "@/components/settings/api-key-input";
import { SecurityNotice } from "@/components/settings/security-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const [keys, setKeys] = useState({
    anthropic: "",
    openai: "",
    google: "",
  });
  const [maskedKeys, setMaskedKeys] = useState({
    anthropic: null as string | null,
    openai: null as string | null,
    google: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  async function fetchKeys() {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const data = await response.json();
        setMaskedKeys(data.keys);
      }
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveKeys() {
    setSaving(true);
    setMessage(null);

    try {
      const keysToSave = Object.entries(keys).filter(([_, value]) => value.trim());

      if (keysToSave.length === 0) {
        setMessage({ type: "error", text: "Please enter at least one API key" });
        setSaving(false);
        return;
      }

      for (const [provider, apiKey] of keysToSave) {
        const response = await fetch("/api/keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${provider} key`);
        }
      }

      setMessage({ type: "success", text: "API keys saved successfully!" });
      setKeys({ anthropic: "", openai: "", google: "" });
      await fetchKeys();
    } catch (error) {
      console.error("Error saving keys:", error);
      setMessage({ type: "error", text: "Failed to save API keys. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-12">
      <div className="space-y-6">
        <SettingsHeader />

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              To use AI Consensus, you need to provide API keys for each model.
              Your keys are encrypted and stored securely using AES-256.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <APIKeyInput
                  provider="anthropic"
                  displayName="Anthropic (Claude)"
                  value={keys.anthropic}
                  maskedKey={maskedKeys.anthropic}
                  placeholder="sk-ant-..."
                  docsUrl="https://console.anthropic.com/"
                  colorClass="bg-primary"
                  onChange={(value) => setKeys({ ...keys, anthropic: value })}
                />

                <APIKeyInput
                  provider="openai"
                  displayName="OpenAI (GPT)"
                  value={keys.openai}
                  maskedKey={maskedKeys.openai}
                  placeholder="sk-..."
                  docsUrl="https://platform.openai.com/api-keys"
                  colorClass="bg-secondary"
                  onChange={(value) => setKeys({ ...keys, openai: value })}
                />

                <APIKeyInput
                  provider="google"
                  displayName="Google (Gemini)"
                  value={keys.google}
                  maskedKey={maskedKeys.google}
                  placeholder="AIza..."
                  docsUrl="https://aistudio.google.com/app/apikey"
                  colorClass="bg-accent"
                  onChange={(value) => setKeys({ ...keys, google: value })}
                />
              </>
            )}

            {message && (
              <Alert variant={message.type === "error" ? "destructive" : "default"}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={saveKeys}
              disabled={saving || loading}
              className="w-full"
              size="lg"
            >
              {saving ? "Saving..." : "Save API Keys"}
            </Button>
          </CardContent>
        </Card>

        <SecurityNotice />
      </div>
    </div>
  );
}
