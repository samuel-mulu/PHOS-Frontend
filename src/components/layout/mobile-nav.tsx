"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "./app-sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-white hover:bg-slate-800 md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
          <div className="relative h-full w-[min(100%,18rem)] shadow-xl">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 z-10 text-white hover:bg-slate-800"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
            <AppSidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
