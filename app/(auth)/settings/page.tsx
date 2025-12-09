export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your API keys and preferences</p>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">API Keys</h2>
            <p className="text-sm text-gray-600 mb-6">
              To use AI Consensus, you need to provide API keys for each model. Your keys are encrypted and stored securely.
            </p>

            <div className="space-y-6">
              {/* Anthropic/Claude */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-claude"></div>
                  <h3 className="font-semibold">Anthropic (Claude)</h3>
                </div>
                <input
                  type="password"
                  placeholder="sk-ant-..."
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                </div>
                <input
                  type="password"
                  placeholder="sk-..."
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:cursor-not-allowed"
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
                </div>
                <input
                  type="password"
                  placeholder="AIza..."
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Get your API key from{" "}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" className="text-gemini-start underline">
                    aistudio.google.com
                  </a>
                </p>
              </div>
            </div>

            <button
              disabled
              className="mt-6 w-full px-4 py-2 bg-gradient-to-r from-claude to-gpt text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save API Keys (Coming Soon)
            </button>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> API key management will be fully implemented in the next phase.
                Your keys will be encrypted using AES-256 and stored securely in the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
