import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[80px] w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 disabled:opacity-50 dark:border-border-strong dark:hover:border-slate-500 dark:focus-visible:border-teal-500/60 dark:focus-visible:ring-teal-400/25 dark:placeholder:text-slate-400",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
