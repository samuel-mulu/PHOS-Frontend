"use client";

import { Bell, Volume2 } from "lucide-react";
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
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="text-sm font-semibold text-slate-900">
            {title}
          </label>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
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
          checked ? "bg-teal-700" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5",
          )}
        />
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const voiceCallEnabled = usePreferencesStore((s) => s.voiceCallEnabled);
  const notificationAlertsEnabled = usePreferencesStore(
    (s) => s.notificationAlertsEnabled,
  );
  const setVoiceCallEnabled = usePreferencesStore((s) => s.setVoiceCallEnabled);
  const setNotificationAlertsEnabled = usePreferencesStore(
    (s) => s.setNotificationAlertsEnabled,
  );

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sound preferences for this workstation. Saved in this browser for your
          account session.
        </p>
      </div>

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
