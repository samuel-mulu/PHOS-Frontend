"use client";

import { Moon, Type } from "lucide-react";
import {
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
  type FontSizePreference,
  type ThemePreference,
} from "@/lib/appearance";
import { usePreferencesStore } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "h-8 max-w-[7.25rem] cursor-pointer appearance-auto rounded-md border px-2 text-xs font-medium shadow-sm",
  "border-slate-300 bg-white text-slate-900",
  "dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/40",
);

export function AppearanceControls({ className }: { className?: string }) {
  const theme = usePreferencesStore((s) => s.theme);
  const fontSize = usePreferencesStore((s) => s.fontSize);
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setFontSize = usePreferencesStore((s) => s.setFontSize);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label className="sr-only" htmlFor="appearance-theme">
        Theme
      </label>
      <Moon
        className="hidden h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-300 sm:block"
        aria-hidden
      />
      <select
        id="appearance-theme"
        className={selectClass}
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemePreference)}
        aria-label="Color theme"
        title="Theme"
      >
        {THEME_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <label className="sr-only" htmlFor="appearance-font">
        Text size
      </label>
      <Type
        className="hidden h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-300 sm:block"
        aria-hidden
      />
      <select
        id="appearance-font"
        className={selectClass}
        value={fontSize}
        onChange={(e) => setFontSize(e.target.value as FontSizePreference)}
        aria-label="Text size"
        title="Text size"
      >
        {FONT_SIZE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
