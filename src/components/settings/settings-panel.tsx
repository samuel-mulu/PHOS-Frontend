"use client";

import { Bell, Type, Volume2 } from "lucide-react";
import { Moon } from "lucide-react";
import {
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
  type FontSizePreference,
  type ThemePreference,
} from "@/lib/appearance";
import { usePreferencesStore } from "@/stores/preferences-store";
import { cn } from "@/lib/utils";

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
  icon: Icon,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon: typeof Bell;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted-bg text-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-foreground">
            {title}
          </label>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-teal-700" : "bg-slate-300 dark:bg-slate-600",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform dark:bg-slate-100",
            checked && "translate-x-5",
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

function SelectRow({
  id,
  title,
  description,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  id: string;
  title: string;
  description: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
  icon: typeof Moon;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted-bg text-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-foreground">
            {title}
          </label>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 shrink-0 cursor-pointer rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPanel() {
  const voiceCallEnabled = usePreferencesStore((s) => s.voiceCallEnabled);
  const notificationAlertsEnabled = usePreferencesStore(
    (s) => s.notificationAlertsEnabled,
  );
  const theme = usePreferencesStore((s) => s.theme);
  const fontSize = usePreferencesStore((s) => s.fontSize);
  const setVoiceCallEnabled = usePreferencesStore((s) => s.setVoiceCallEnabled);
  const setNotificationAlertsEnabled = usePreferencesStore(
    (s) => s.setNotificationAlertsEnabled,
  );
  const setTheme = usePreferencesStore((s) => s.setTheme);
  const setFontSize = usePreferencesStore((s) => s.setFontSize);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Appearance and sound preferences for this workstation. Saved in this
          browser.
        </p>
      </div>

      <SelectRow
        id="pref-theme"
        icon={Moon}
        title="Theme"
        description="Light, dark, or match your system setting."
        value={theme}
        options={THEME_OPTIONS}
        onChange={(v) => setTheme(v as ThemePreference)}
      />

      <SelectRow
        id="pref-font-size"
        icon={Type}
        title="Text size"
        description="Makes letters and numbers bigger or smaller. Screen layout, buttons and spacing stay the same."
        value={fontSize}
        options={FONT_SIZE_OPTIONS.map(({ value, label }) => ({ value, label }))}
        onChange={(v) => setFontSize(v as FontSizePreference)}
      />

      <ToggleRow
        id="pref-voice-call"
        icon={Volume2}
        title="Patient Call voice"
        description="Speak the patient name in Amharic when you press Call. Default is off."
        checked={voiceCallEnabled}
        onChange={setVoiceCallEnabled}
      />

      <ToggleRow
        id="pref-notification-alerts"
        icon={Bell}
        title="Notification alerts"
        description="Play a sound and show a toast when a new notification arrives. The red badge still updates. Default is on."
        checked={notificationAlertsEnabled}
        onChange={setNotificationAlertsEnabled}
      />
    </div>
  );
}
