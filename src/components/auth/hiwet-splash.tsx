"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HIWET_BRAND } from "@/lib/print/hiwet-brand";
import { cn } from "@/lib/utils";

const SPLASH_KEY = "hiwet-splash-seen";

export function HiwetSplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_KEY) !== "1") {
      setShowSplash(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(SPLASH_KEY, "1");
    setShowSplash(false);
  }

  return (
    <>
      {children}
      {showSplash ? <HiwetSplash onContinue={dismiss} /> : null}
    </>
  );
}

function HiwetSplash({ onContinue }: { onContinue: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-cyan-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hiwet-splash-title"
    >
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/5 blur-2xl"
        aria-hidden
      />

      <button
        type="button"
        className="relative mx-auto flex max-w-lg flex-col items-center px-8 py-10 text-center outline-none transition-transform active:scale-[0.99]"
        onClick={onContinue}
      >
        <div className="relative mb-8">
          <div
            className="absolute inset-0 animate-ping rounded-full bg-teal-300/25"
            style={{ animationDuration: "2.4s" }}
            aria-hidden
          />
          <div className="relative rounded-full bg-white/95 p-2 shadow-2xl ring-4 ring-white/20">
            <Image
              src={HIWET_BRAND.logoPath}
              alt=""
              width={120}
              height={120}
              className="h-28 w-28 rounded-full object-cover"
              priority
            />
          </div>
        </div>

        <p
          id="hiwet-splash-title"
          className="text-2xl font-bold tracking-tight text-white sm:text-3xl"
        >
          {HIWET_BRAND.nameEn}
        </p>
        <p className="mt-2 text-xl font-semibold text-teal-100/95">
          {HIWET_BRAND.nameAm}
        </p>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-teal-50/85">
          {HIWET_BRAND.tagline}
        </p>
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em] text-teal-200/70">
          PHOS · clinic workstation
        </p>

        <span
          className={cn(
            "mt-10 inline-flex items-center gap-2 rounded-full border border-white/25",
            "bg-white/10 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm",
            "animate-pulse",
          )}
        >
          Tap to continue
        </span>
        <span className="mt-3 text-[11px] text-teal-100/60">
          Staff sign-in · {HIWET_BRAND.locationEn}
        </span>
      </button>
    </div>
  );
}
