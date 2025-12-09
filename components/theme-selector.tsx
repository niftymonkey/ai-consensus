"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useColorTheme } from "@/hooks/use-color-theme";

const lightDarkModes = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const colorThemes = [
  { value: "claude", label: "Claude (Default)" },
  { value: "clean-slate", label: "Clean Slate" },
  { value: "doom-64", label: "Doom 64" },
  { value: "midnight-bloom", label: "Midnight Bloom" },
  { value: "neo-brutalism", label: "Neo Brutalism" },
  { value: "t3-chat", label: "T3 Chat" },
  { value: "tangerine", label: "Tangerine" },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Color Scheme</DropdownMenuLabel>
        {colorThemes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setColorTheme(t.value)}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                colorTheme === t.value ? "opacity-100" : "opacity-0"
              )}
            />
            {t.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        {lightDarkModes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => setTheme(t.value)}
          >
            <Check
              className={cn(
                "mr-2 h-4 w-4",
                theme === t.value ? "opacity-100" : "opacity-0"
              )}
            />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
