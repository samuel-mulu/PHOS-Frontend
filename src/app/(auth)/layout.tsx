import { HiwetSplashGate } from "@/components/auth/hiwet-splash";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <HiwetSplashGate>
      <div className="relative flex min-h-dvh flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-cyan-50"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-teal-200/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10 w-full flex justify-center">{children}</div>
      </div>
    </HiwetSplashGate>
  );
}
