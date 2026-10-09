"use client";

import { useState } from "react";
import { AdminCatalogPanel } from "./admin-catalog-panel";
import { AdminLabTestsPanel } from "./admin-lab-tests-panel";
import { AdminUsersPanel } from "./admin-users-panel";

type Tab = "users" | "catalog" | "lab";

export function AdminWorkspace() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "users", label: "Users" },
    { id: "catalog", label: "Facilities & services" },
    { id: "lab", label: "Lab tests" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Administration</h1>
        <p className="text-sm text-slate-600">
          User and facility configuration using backend RBAC (CEO, ADMIN,
          IT_ADMIN).
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-teal-800 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" ? <AdminUsersPanel /> : null}
      {tab === "catalog" ? <AdminCatalogPanel /> : null}
      {tab === "lab" ? <AdminLabTestsPanel /> : null}
    </div>
  );
}
