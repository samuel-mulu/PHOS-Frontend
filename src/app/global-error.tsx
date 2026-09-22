"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-100 p-8 text-center font-sans text-slate-900">
        <h1 className="text-lg font-semibold">Application error</h1>
        <p className="max-w-md text-sm text-slate-600">
          {error.message || "The application failed to render."}
        </p>
        <button
          type="button"
          className="rounded-md bg-teal-800 px-4 py-2 text-sm text-white"
          onClick={reset}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
