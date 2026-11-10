"use client";

import { useState } from "react";
import { AdminCatalogPanel } from "./admin-catalog-panel";
import { AdminLabTestsPanel } from "./admin-lab-tests-panel";
import { AdminPatientsPanel } from "./admin-patients-panel";
import { AdminUsersPanel } from "./admin-users-panel";

type Tab = "users" | "patients" | "catalog" | "lab";

export function AdminWorkspace() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "users", label: "Users" },
    { id: "patients", label: "Patients" },
    { id: "catalog", label: "Facilities & services" },
    { id: "lab", label: "Lab tests" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Administration</h1>
        <p className="text-sm text-muted">
          User and facility configuration using backend RBAC (CEO, ADMIN,
          IT_ADMIN).
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.id
                ? "bg-teal-800 text-white"
                : "text-muted hover:bg-muted-bg"
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "users" ? <AdminUsersPanel /> : null}
      {tab === "patients" ? <AdminPatientsPanel /> : null}
      {tab === "catalog" ? <AdminCatalogPanel /> : null}
      {tab === "lab" ? <AdminLabTestsPanel /> : null}
    </div>
  );
}
