interface ChatHeaderProps {
  keyCount: number;
}

export function ChatHeader({ keyCount }: ChatHeaderProps) {
  return (
    <div className="text-center">
      <p className="text-muted-foreground">
        {keyCount < 3 ? (
          <>
            Get consensus across AI models - configure {3 - keyCount} more{" "}
            {keyCount === 2 ? "key" : "keys"} to unlock full potential
          </>
        ) : (
          <>Ask a question and see responses from Claude, GPT, and Gemini</>
        )}
      </p>
    </div>
  );
}
