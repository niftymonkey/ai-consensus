"use client";

import { useEffect, useState } from "react";

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

  // Load existing keys on mount
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

      // Save each key that was provided
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

      // Clear input fields and refresh masked keys
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
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your API keys and preferences</p>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>
            <p className="text-sm text-gray-600 mb-6">
              To use AI Consensus, you need to provide API keys for each model. Your keys are encrypted and stored securely using AES-256.
            </p>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-claude rounded-full animate-spin"></div>
                <p className="text-sm text-gray-500 mt-2">Loading your keys...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Anthropic/Claude */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-claude"></div>
                    <h3 className="font-semibold">Anthropic (Claude)</h3>
                    {maskedKeys.anthropic && (
                      <span className="ml-auto text-xs text-green-600 font-medium">
                        Configured: {maskedKeys.anthropic}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={maskedKeys.anthropic ? "Enter new key to update" : "sk-ant-..."}
                    value={keys.anthropic}
                    onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-claude focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get your API key from{" "}
                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener" className="text-claude underline">
                      console.anthropic.com
                    </a>
                  </p>
                </div>

                {/* OpenAI/GPT */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gpt"></div>
                    <h3 className="font-semibold">OpenAI (GPT-4)</h3>
                    {maskedKeys.openai && (
                      <span className="ml-auto text-xs text-green-600 font-medium">
                        Configured: {maskedKeys.openai}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={maskedKeys.openai ? "Enter new key to update" : "sk-..."}
                    value={keys.openai}
                    onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gpt focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get your API key from{" "}
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-gpt underline">
                      platform.openai.com
                    </a>
                  </p>
                </div>

                {/* Google/Gemini */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full gradient-gemini"></div>
                    <h3 className="font-semibold">Google (Gemini)</h3>
                    {maskedKeys.google && (
                      <span className="ml-auto text-xs text-green-600 font-medium">
                        Configured: {maskedKeys.google}
                      </span>
                    )}
                  </div>
                  <input
                    type="password"
                    placeholder={maskedKeys.google ? "Enter new key to update" : "AIza..."}
                    value={keys.google}
                    onChange={(e) => setKeys({ ...keys, google: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gemini-start focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get your API key from{" "}
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-gemini-start underline">
                      aistudio.google.com
                    </a>
                  </p>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              onClick={saveKeys}
              disabled={saving || loading}
              className="mt-6 w-full px-4 py-2 bg-gradient-to-r from-claude to-gpt text-white rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save API Keys"}
            </button>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Security:</strong> Your API keys are encrypted using AES-256-GCM before being stored in the database. They are only decrypted when needed to make API calls on your behalf.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
