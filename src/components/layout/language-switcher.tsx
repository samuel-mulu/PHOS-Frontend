"use client";

import { useTranslation, type Locale } from "@/i18n/context";

const LOCALES: Locale[] = ["en", "am", "ti"];

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale, t } = useTranslation();

  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-400">
      {!compact ? <span className="sr-only">Language</span> : null}
      <select
        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label="Language"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(`lang.${code}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
