"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface ThemeBridgeContextType {
  resolvedTheme: string;
}

const ThemeBridgeContext = createContext<ThemeBridgeContextType>({
  resolvedTheme: "dark",
});

export const useThemeBridge = () => useContext(ThemeBridgeContext);

export function ThemeBridgeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [themeMode, setThemeMode] = useState("dark");

  useEffect(() => {
    if (resolvedTheme) {
      setThemeMode(resolvedTheme);
    }
  }, [resolvedTheme]);

  // Synchronize CSS custom variables dynamically based on theme mode.
  // This allows commerce components to consume design tokens like bg, fg, accent etc.
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode !== "dark") {
      root.style.setProperty("--shop-bg", "var(--background)");
      root.style.setProperty("--shop-fg", "var(--foreground)");
      root.style.setProperty("--shop-card-bg", "var(--card)");
      root.style.setProperty("--shop-border", "var(--border)");
      root.style.setProperty("--shop-text-muted", "var(--muted-foreground)");
      root.style.setProperty("--shop-accent", "var(--primary)");
    } else {
      // Dark mode / future themes default to elegant dark colors
      root.style.setProperty("--shop-bg", "#000000");
      root.style.setProperty("--shop-fg", "#f4f4f5");
      root.style.setProperty("--shop-card-bg", "#0c0c0e");
      root.style.setProperty("--shop-border", "#18181b");
      root.style.setProperty("--shop-text-muted", "#a1a1aa");
      root.style.setProperty("--shop-accent", "#6366f1");
    }
  }, [themeMode]);

  return (
    <ThemeBridgeContext.Provider value={{ resolvedTheme: themeMode }}>
      <div className={`theme-bridge theme-${themeMode} text-foreground`}>
        {children}
      </div>
    </ThemeBridgeContext.Provider>
  );
}
