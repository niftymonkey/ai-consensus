"use client";

import { useEffect, useState } from "react";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState("claude");

  // Load and apply theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("color-theme") || "claude";
    setColorThemeState(stored);
    applyColorTheme(stored);
  }, []);

  function applyColorTheme(theme: string) {
    if (theme === "claude") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }

  function setColorTheme(theme: string) {
    setColorThemeState(theme);
    localStorage.setItem("color-theme", theme);
    applyColorTheme(theme);
  }

  return { colorTheme, setColorTheme };
}
