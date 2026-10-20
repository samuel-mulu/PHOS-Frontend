"use client";

import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { LoginFormSkeleton } from "@/components/shared/loading-skeletons";
import { HIWET_BRAND } from "@/lib/print/hiwet-brand";

export function LoginPanel() {
  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-2xl shadow-teal-900/10 backdrop-blur-md lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-teal-800 via-teal-900 to-teal-950 p-8 text-white lg:flex">
        <div
          className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <div className="flex items-center gap-4">
            <Image
              src={HIWET_BRAND.logoPath}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover ring-2 ring-white/30"
              priority
            />
            <div>
              <p className="text-lg font-bold leading-tight">
                {HIWET_BRAND.nameEn}
              </p>
              <p className="text-sm text-teal-100">{HIWET_BRAND.nameAm}</p>
            </div>
          </div>
          <p className="mt-8 text-sm leading-relaxed text-teal-50/90">
            Secure staff sign-in for reception, clinical, laboratory, pharmacy,
            and cashier workflows — one clinic, one queue.
          </p>
          <ul className="mt-6 space-y-2 text-xs text-teal-100/85">
            {HIWET_BRAND.sidebarServices.slice(0, 4).map((item) => (
              <li key={item} className="flex gap-2">
                <span className="text-teal-300" aria-hidden>
                  ✦
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-teal-200/70">
          {HIWET_BRAND.phones} · {HIWET_BRAND.locationEn}
        </p>
      </aside>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
          <Image
            src={HIWET_BRAND.logoPath}
            alt=""
            width={56}
            height={56}
            className="mb-4 h-14 w-14 rounded-full object-cover ring-2 ring-teal-100 lg:hidden"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in to <span className="font-medium text-teal-800">PHOS</span>{" "}
            at {HIWET_BRAND.nameEn}
          </p>
        </div>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-500 lg:text-left">
          Authorized personnel only. Contact your clinic administrator if you
          need access or a password reset.
        </p>
      </div>
    </div>
  );
}
