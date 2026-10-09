"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Renders children on document.body so they sit above fullscreen table overlays. */
export function OverlayPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
