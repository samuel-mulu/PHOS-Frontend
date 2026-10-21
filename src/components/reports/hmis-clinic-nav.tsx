"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/doctor", label: "Doctor", view: null },
  { href: "/reports?view=full", label: "HMIS-Full", view: "full" },
  { href: "/reports", label: "HMIS", view: "live" },
  { href: "/reports?view=payments", label: "Collections", view: "payments" },
  { href: "/reports?view=expenses", label: "Expenses", view: "expenses" },
  { href: "/doctor", label: "HIS", view: "his" },
  { href: "/reports?view=hfr", label: "HFR", view: "hfr" },
] as const;

export function HmisClinicNav() {
  const pathname = usePathname();
  const search = useSearchParams();
  const view = search.get("view");
  const onReports = pathname.startsWith("/reports");
  const onDoctor = pathname.startsWith("/doctor");

  return (
    <nav
      className="flex flex-wrap gap-1.5"
      aria-label="HMIS clinic reports"
    >
      {LINKS.map((item) => {
        let active = false;
        if (item.label === "Doctor") active = onDoctor;
        else if (item.label === "HIS") active = false;
        else if (item.view === "full") active = onReports && view === "full";
        else if (item.view === "hfr") active = onReports && view === "hfr";
        else if (item.view === "payments") active = onReports && view === "payments";
        else if (item.view === "expenses") active = onReports && view === "expenses";
        else if (item.view === "live") {
          active =
            onReports &&
            view !== "full" &&
            view !== "hfr" &&
            view !== "payments" &&
            view !== "expenses";
        }
        return (
          <Link
            key={`${item.label}:${item.href}`}
            href={item.href}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
              active
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 hover:bg-teal-50",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
