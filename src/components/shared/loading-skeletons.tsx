import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingBlock({
  label = "Loading…",
  variant = "form",
}: {
  label?: string;
  variant?: "form" | "inline" | "card" | "list";
}) {
  return (
    <div
      className="w-full space-y-3"
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>
      {variant === "form" ? <FormSkeleton /> : null}
      {variant === "inline" ? <InlineSkeleton /> : null}
      {variant === "card" ? <CardSkeleton /> : null}
      {variant === "list" ? <ListSkeleton /> : null}
    </div>
  );
}

function FormSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="mt-2 h-11 w-full rounded-md" />
    </>
  );
}

function InlineSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  );
}

export function LoginFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading sign in">
      <FormSkeleton />
    </div>
  );
}

export function AppShellSkeleton({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div
      className="flex h-dvh overflow-hidden bg-slate-100"
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <aside className="hidden h-full w-64 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-16" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className={cn("h-9 w-full", i === 0 && "bg-teal-100/80")} />
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </header>
        <main className="flex-1 space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
        </main>
      </div>
    </div>
  );
}

export function WorkspacePageSkeleton({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4"
      aria-busy="true"
      aria-label={label}
      role="status"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-9 w-56" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

export function AuthSessionSkeleton({ label = "Loading session" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <FormSkeleton />
        <p className="sr-only">{label}</p>
      </div>
    </div>
  );
}
