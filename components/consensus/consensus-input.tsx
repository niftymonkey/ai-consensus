import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PromptSuggestions } from "@/components/consensus/prompt-suggestions";
import type { PresetId } from "@/lib/presets";

interface ConsensusInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSubmitWithPrompt?: (prompt: string) => void;
  onPresetSelect?: (presetId: PresetId) => void;
  onSubmitWithPreset?: (prompt: string, presetId: PresetId) => void;
  showSuggestions?: boolean;
  isPreviewMode?: boolean;
  isPreviewExhausted?: boolean;
}

export function ConsensusInput({ prompt, setPrompt, isLoading, onSubmit, onSubmitWithPrompt, onPresetSelect, onSubmitWithPreset, showSuggestions = false, isPreviewMode = false, isPreviewExhausted = false }: ConsensusInputProps) {

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  }

  const handleSuggestionSelect = (suggestion: string, preset: PresetId) => {
    setPrompt(suggestion);
    // In preview mode, just submit with current settings (don't try to apply preset)
    if (isPreviewMode) {
      if (onSubmitWithPrompt) {
        onSubmitWithPrompt(suggestion);
      }
      return;
    }
    // Use the combined callback if available (handles preset + submit atomically)
    if (onSubmitWithPreset) {
      onSubmitWithPreset(suggestion, preset);
    } else {
      // Fallback to separate calls (may have race condition)
      if (onPresetSelect) {
        onPresetSelect(preset);
      }
      if (onSubmitWithPrompt) {
        onSubmitWithPrompt(suggestion);
      }
    }
  };

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="prompt">Your Question</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What would you like to ask?"
              rows={4}
              disabled={isLoading || isPreviewExhausted}
            />
          </div>
          {showSuggestions && (
            <PromptSuggestions
              onSelect={handleSuggestionSelect}
              disabled={isLoading}
              show={!prompt.trim()}
              isPreviewMode={isPreviewMode}
            />
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
            <Button
              type="submit"
              disabled={isLoading || isPreviewExhausted || !prompt.trim()}
            >
              {isLoading && !isPreviewExhausted ? "Asking..." : "Ask"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
