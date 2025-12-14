import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ChatInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
}

export function ChatInput({ prompt, setPrompt, isLoading, onSubmit, onCancel }: ChatInputProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading) {
        onSubmit(e as any);
      }
    }
  }

  function handleButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (isLoading && onCancel) {
      e.preventDefault();
      onCancel();
    }
  }

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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Press Enter to send, Shift+Enter for new line
            </p>
            <Button
              type={isLoading ? "button" : "submit"}
              disabled={!isLoading && !prompt.trim()}
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
