"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SettingsHeader } from "@/components/settings/settings-header";
import { APIKeyInput } from "@/components/settings/api-key-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const router = useRouter();
  const [keys, setKeys] = useState({
    openrouter: "",
    anthropic: "",
    openai: "",
    google: "",
    tavily: "",
  });
  const [maskedKeys, setMaskedKeys] = useState({
    openrouter: null as string | null,
    anthropic: null as string | null,
    openai: null as string | null,
    google: null as string | null,
    tavily: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [hideFreeModels, setHideFreeModels] = useState(false);

  // Determine which tab to show by default based on configured keys
  const hasOpenRouter = maskedKeys.openrouter !== null;
  const hasDirectKeys = maskedKeys.anthropic !== null || maskedKeys.openai !== null || maskedKeys.google !== null;
  const defaultTab = hasDirectKeys && !hasOpenRouter ? "direct" : "openrouter";

  useEffect(() => {
    fetchKeys();
    // Load model preferences
    const savedHideFree = localStorage.getItem("hideFreeModels");
    if (savedHideFree !== null) {
      setHideFreeModels(savedHideFree === "true");
    }
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

  const saveKey = useCallback(async (provider: string, apiKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.error || `Failed to save ${provider} key` };
      }

      // Refresh keys to get updated masked value
      await fetchKeys();

      // Set a flag in localStorage to trigger refetch on other pages
      localStorage.setItem("apiKeysUpdated", Date.now().toString());

      // Trigger a router refresh to invalidate cached data
      router.refresh();

      return { success: true };
    } catch (error) {
      console.error("Error saving key:", error);
      return { success: false, error: "Failed to save key" };
    }
  }, [router]);

  const deleteKey = useCallback(async (provider: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/keys?provider=${provider}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        return { success: false, error: `Failed to delete ${provider} key` };
      }

      // Refresh keys to get updated state
      await fetchKeys();

      // Set a flag in localStorage to trigger refetch on other pages
      localStorage.setItem("apiKeysUpdated", Date.now().toString());

      // Trigger a router refresh to invalidate cached data
      router.refresh();

      return { success: true };
    } catch (error) {
      console.error("Error deleting key:", error);
      return { success: false, error: "Failed to delete key" };
    }
  }, [router]);

  const handleHideFreeModelsChange = (checked: boolean) => {
    setHideFreeModels(checked);
    localStorage.setItem("hideFreeModels", checked.toString());
    // Trigger model list refresh on other pages
    localStorage.setItem("apiKeysUpdated", Date.now().toString());
  };

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl space-y-3">
        <SettingsHeader />

        {/* Model Provider Keys */}
        <Card>
          <CardHeader>
            <CardTitle>Model Provider</CardTitle>
            <CardDescription>
              Choose how to connect to AI models. Keys are encrypted with AES-256.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Tabs defaultValue={defaultTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="openrouter">OpenRouter (Recommended)</TabsTrigger>
                  <TabsTrigger value="direct">Direct Provider Keys</TabsTrigger>
                </TabsList>
                <TabsContent value="openrouter" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    One API key for access to Claude, GPT, Gemini, and more.
                  </p>
                  <APIKeyInput
                    provider="openrouter"
                    displayName="OpenRouter"
                    value={keys.openrouter}
                    maskedKey={maskedKeys.openrouter}
                    placeholder="sk-or-..."
                    docsUrl="https://openrouter.ai/keys"
                    colorClass="bg-purple-500"
                    onChange={(value) => setKeys({ ...keys, openrouter: value })}
                    onSave={(value) => saveKey("openrouter", value)}
                    onDelete={() => deleteKey("openrouter")}
                  />
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label htmlFor="hide-free-models">Hide Free Models</Label>
                      <p className="text-xs text-muted-foreground">
                        Hide models with ":free" suffix. Free models have shared rate limits and may be slower or unavailable.
                      </p>
                    </div>
                    <Switch
                      id="hide-free-models"
                      checked={hideFreeModels}
                      onCheckedChange={handleHideFreeModelsChange}
                      disabled={!maskedKeys.openrouter}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="direct" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Use your own API keys from each provider directly.
                  </p>
                  <APIKeyInput
                    provider="anthropic"
                    displayName="Anthropic (Claude)"
                    value={keys.anthropic}
                    maskedKey={maskedKeys.anthropic}
                    placeholder="sk-ant-..."
                    docsUrl="https://console.anthropic.com/"
                    colorClass="bg-primary"
                    onChange={(value) => setKeys({ ...keys, anthropic: value })}
                    onSave={(value) => saveKey("anthropic", value)}
                    onDelete={() => deleteKey("anthropic")}
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
                    onSave={(value) => saveKey("openai", value)}
                    onDelete={() => deleteKey("openai")}
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
                    onSave={(value) => saveKey("google", value)}
                    onDelete={() => deleteKey("google")}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Web Search */}
        <Card>
          <CardHeader>
            <CardTitle>Web Search</CardTitle>
            <CardDescription>
              Enable AI models to search the web for current information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <APIKeyInput
                provider="tavily"
                displayName="Tavily"
                value={keys.tavily}
                maskedKey={maskedKeys.tavily}
                placeholder="tvly-..."
                docsUrl="https://tavily.com"
                colorClass="bg-blue-500"
                onChange={(value) => setKeys({ ...keys, tavily: value })}
                onSave={(value) => saveKey("tavily", value)}
                onDelete={() => deleteKey("tavily")}
              />
            )}
          </CardContent>
        </Card>

        {/* Legal Links */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
