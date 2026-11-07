import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** Register custom theme tokens so tailwind-merge groups them correctly. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs", "3xs"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
