"use client";

import { useState, useEffect } from "react";

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  show?: boolean;
}

const SUGGESTIONS = [
  "Implement debounce in TypeScript",
  "What is the meaning of life?",
  "How should we regulate AI?",
];

const STORAGE_KEY = "usedPromptSuggestions";

export function PromptSuggestions({ onSelect, disabled, show = true }: PromptSuggestionsProps) {
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());

  // Load used suggestions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUsedSuggestions(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Failed to load used suggestions:", error);
    }
  }, []);

  const handleSelect = (suggestion: string) => {
    // Mark as used and persist
    const newUsed = new Set(usedSuggestions);
    newUsed.add(suggestion);
    setUsedSuggestions(newUsed);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newUsed]));
    } catch (error) {
      console.error("Failed to save used suggestions:", error);
    }

    onSelect(suggestion);
  };

  // Filter out used suggestions
  const availableSuggestions = SUGGESTIONS.filter(s => !usedSuggestions.has(s));

  if (!show || availableSuggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableSuggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => handleSelect(suggestion)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
