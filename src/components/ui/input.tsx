import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-strong dark:hover:border-slate-500 dark:focus-visible:border-teal-500/60 dark:focus-visible:ring-teal-400/25 dark:placeholder:text-slate-400",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
