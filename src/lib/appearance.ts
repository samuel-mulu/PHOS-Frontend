export type ThemePreference = "light" | "dark" | "system";
export type FontSizePreference = "sm" | "md" | "lg" | "xl";

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * Text size scales letters and numbers only. Layout (padding, widths, button
 * and input heights) stays fixed, so screens never "zoom".
 */
export const FONT_SIZE_OPTIONS: {
  value: FontSizePreference;
  label: string;
  scale: number;
}[] = [
  { value: "sm", label: "Small", scale: 0.9375 },
  { value: "md", label: "Medium", scale: 1 },
  { value: "lg", label: "Large", scale: 1.125 },
  { value: "xl", label: "Extra Large", scale: 1.25 },
];

export const TEXT_SCALE: Record<FontSizePreference, number> = {
  sm: 0.9375,
  md: 1,
  lg: 1.125,
  xl: 1.25,
};

export const PREFERENCES_STORAGE_KEY = "phos-preferences";

/** Theme colors live in globals.css (`:root` and `.dark`) — one source of truth. */
const LEGACY_INLINE_VARS = [
  "--background",
  "--foreground",
  "--surface",
  "--card",
  "--border",
  "--muted",
  "--muted-bg",
  "--accent",
  "--nav",
  "--app-font-size",
];

export function resolveIsDark(theme: ThemePreference): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyAppearance(
  theme: ThemePreference,
  fontSize: FontSizePreference,
) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = resolveIsDark(theme);
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  root.dataset.fontSize = fontSize;
  for (const key of LEGACY_INLINE_VARS) root.style.removeProperty(key);
  root.style.setProperty(
    "--text-scale",
    String(TEXT_SCALE[fontSize] ?? TEXT_SCALE.md),
  );
}

/** Inline boot script — keeps first paint aligned with localStorage prefs. */
export const APPEARANCE_BOOT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(PREFERENCES_STORAGE_KEY)});if(!raw)return;var parsed=JSON.parse(raw);var s=parsed&&parsed.state?parsed.state:parsed;var theme=s&&s.theme?s.theme:"system";var font=s&&s.fontSize?s.fontSize:"md";var dark=theme==="dark"||(theme==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var map=${JSON.stringify(TEXT_SCALE)};var root=document.documentElement;root.classList.toggle("dark",dark);root.dataset.theme=dark?"dark":"light";root.dataset.fontSize=font;root.style.setProperty("--text-scale",String(map[font]||1));}catch(e){}})();`;
