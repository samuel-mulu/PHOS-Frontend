"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/shared/data-table";
import {
  EmptyState,
  ErrorState,
  LoadingBlock,
} from "@/components/shared/state-blocks";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import { ExpandablePanel } from "@/components/shared/table-layout";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import {
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useUsersList,
} from "@/features/users/hooks";
import { useDepartments } from "@/features/facilities/hooks";
import { Role } from "@/types/role";
import type { AdminUser, UserStatus } from "@/types/user-admin";

const ROLES = Object.values(Role);
const STATUSES: UserStatus[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export function AdminUsersPanel() {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);
  const query = useUsersList(debounced || undefined);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const updateStatus = useUpdateUserStatus();
  const departments = useDepartments();

  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: Role.RECEPTIONIST as Role,
    departmentId: "",
  });

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editDraft, setEditDraft] = useState({
    firstName: "",
    lastName: "",
    role: Role.RECEPTIONIST as Role,
    departmentId: "",
  });

  function openEdit(user: AdminUser) {
    setEditing(user);
    setEditDraft({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId ?? "",
    });
  }

  const searchBar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-md flex-1">
        <Label htmlFor="user-search">Search users</Label>
        <Input
          id="user-search"
          className="mt-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name or email"
        />
      </div>
      <Button type="button" onClick={() => setShowCreate((v) => !v)}>
        {showCreate ? "Cancel" : "New user"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {showCreate ? (
        <form
          className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            createUser.mutate(
              {
                ...draft,
                departmentId: draft.departmentId || undefined,
              },
              {
                onSuccess: () => {
                  setShowCreate(false);
                  setDraft({
                    email: "",
                    password: "",
                    firstName: "",
                    lastName: "",
                    role: Role.RECEPTIONIST,
                    departmentId: "",
                  });
                },
              },
            );
          }}
        >
          <div>
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              required
              className="mt-1"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cu-password">Password</Label>
            <Input
              id="cu-password"
              type="password"
              required
              minLength={8}
              className="mt-1"
              value={draft.password}
              onChange={(e) => setDraft({ ...draft, password: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cu-fn">First name</Label>
            <Input
              id="cu-fn"
              required
              className="mt-1"
              value={draft.firstName}
              onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cu-ln">Last name</Label>
            <Input
              id="cu-ln"
              required
              className="mt-1"
              value={draft.lastName}
              onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="cu-role">Role</Label>
            <select
              id="cu-role"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={draft.role}
              onChange={(e) =>
                setDraft({ ...draft, role: e.target.value as Role })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="cu-dept">Department</Label>
            <select
              id="cu-dept"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={draft.departmentId}
              onChange={(e) =>
                setDraft({ ...draft, departmentId: e.target.value })
              }
            >
              <option value="">—</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createUser.isPending}>
              Create user
            </Button>
          </div>
        </form>
      ) : null}

      {editing ? (
        <form
          className="grid gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            updateUser.mutate(
              {
                id: editing.id,
                input: {
                  firstName: editDraft.firstName,
                  lastName: editDraft.lastName,
                  role: editDraft.role,
                  departmentId: editDraft.departmentId || undefined,
                },
              },
              { onSuccess: () => setEditing(null) },
            );
          }}
        >
          <p className="sm:col-span-2 text-sm font-medium text-slate-900">
            Edit {editing.email}
          </p>
          <div>
            <Label htmlFor="eu-fn">First name</Label>
            <Input
              id="eu-fn"
              required
              className="mt-1"
              value={editDraft.firstName}
              onChange={(e) =>
                setEditDraft({ ...editDraft, firstName: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="eu-ln">Last name</Label>
            <Input
              id="eu-ln"
              required
              className="mt-1"
              value={editDraft.lastName}
              onChange={(e) =>
                setEditDraft({ ...editDraft, lastName: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="eu-role">Role</Label>
            <select
              id="eu-role"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={editDraft.role}
              onChange={(e) =>
                setEditDraft({ ...editDraft, role: e.target.value as Role })
              }
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="eu-dept">Department</Label>
            <select
              id="eu-dept"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              value={editDraft.departmentId}
              onChange={(e) =>
                setEditDraft({ ...editDraft, departmentId: e.target.value })
              }
            >
              <option value="">—</option>
              {(departments.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={updateUser.isPending}>
              Save
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <ExpandablePanel title="Users" toolbar={searchBar}>
        <QueryStaleBanner query={query} />

        {query.isLoading ? <LoadingBlock label="Loading users" /> : null}
        {query.isError ? (
          <ErrorState
            message="Could not load users."
            onRetry={() => void query.refetch()}
          />
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <EmptyState
            title="No users"
            description="Create a user to get started."
          />
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <DataTable>
            <DataTableHead>
              <DataTableRow>
                <DataTableHeaderCell>Name</DataTableHeaderCell>
                <DataTableHeaderCell>Email</DataTableHeaderCell>
                <DataTableHeaderCell>Role</DataTableHeaderCell>
                <DataTableHeaderCell>Status</DataTableHeaderCell>
                <DataTableHeaderCell stickyRight className="text-right">
                  Actions
                </DataTableHeaderCell>
              </DataTableRow>
            </DataTableHead>
            <DataTableBody>
              {query.data.map((user) => (
                <DataTableRow key={user.id}>
                  <DataTableCell>
                    {user.firstName} {user.lastName}
                  </DataTableCell>
                  <DataTableCell>{user.email}</DataTableCell>
                  <DataTableCell>
                    {user.role.replaceAll("_", " ")}
                  </DataTableCell>
                  <DataTableCell>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={user.status}
                      disabled={updateStatus.isPending}
                      onChange={(e) =>
                        updateStatus.mutate({
                          id: user.id,
                          status: e.target.value as UserStatus,
                        })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </DataTableCell>
                  <DataTableCell stickyRight className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(user)}
                    >
                      Edit
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        ) : null}
      </ExpandablePanel>
    </div>
  );
}
