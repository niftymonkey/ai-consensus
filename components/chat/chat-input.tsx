import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PromptSuggestions } from "@/components/consensus/prompt-suggestions";

interface ChatInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSubmitWithPrompt?: (prompt: string) => void;
  onCancel?: () => void;
  showSuggestions?: boolean;
}

export function ChatInput({ prompt, setPrompt, isLoading, onSubmit, onSubmitWithPrompt, onCancel, showSuggestions = false }: ChatInputProps) {

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSubmit(e as any);
      }
    }
  }

  function handleButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    // When loading, button type is "button" (not "submit"), so we handle the click
    // When not loading, button type is "submit", so form submission happens naturally
    if (isLoading && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setPrompt(suggestion);
    if (onSubmitWithPrompt) {
      onSubmitWithPrompt(suggestion);
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
              disabled={isLoading}
            />
          </div>
          {showSuggestions && (
            <PromptSuggestions
              onSelect={handleSuggestionSelect}
              disabled={isLoading}
              show={!prompt.trim()}
            />
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
            <Button
              type={isLoading ? "button" : "submit"}
              disabled={isLoading ? false : !prompt.trim()}
              onClick={handleButtonClick}
              variant={isLoading ? "destructive" : "default"}
            >
              {isLoading ? "Cancel" : "Ask"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
