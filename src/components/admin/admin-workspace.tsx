"use client";

import { useState } from "react";
import { AdminCatalogPanel } from "./admin-catalog-panel";
import { AdminUsersPanel } from "./admin-users-panel";

type Tab = "users" | "catalog";

export function AdminWorkspace() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Administration</h1>
        <p className="text-sm text-slate-600">
          User and facility configuration using backend RBAC (CEO, ADMIN, IT_ADMIN).
        </p>
      </div>
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "users"
              ? "bg-teal-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setTab("users")}
        >
          Users
        </button>
        <button
          type="button"
          className={`rounded-md px-3 py-1.5 text-sm ${
            tab === "catalog"
              ? "bg-teal-800 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
          onClick={() => setTab("catalog")}
        >
          Facilities & services
        </button>
      </div>
      {tab === "users" ? <AdminUsersPanel /> : <AdminCatalogPanel />}
    </div>
  );
}
