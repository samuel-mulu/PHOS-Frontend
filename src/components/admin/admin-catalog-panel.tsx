"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { QueryStaleBanner } from "@/components/shared/query-stale-banner";
import { LoadingBlock, ErrorState } from "@/components/shared/state-blocks";
import {
  createDepartment,
  createFacility,
  createService,
  setDepartmentActive,
  setServiceActive,
} from "@/features/facilities/api";
import {
  useDepartments,
  useFacilities,
  useServices,
} from "@/features/facilities/hooks";
import { normalizeApiError } from "@/lib/api/errors";
import { formatCents } from "@/lib/format/money";

export function AdminCatalogPanel() {
  const facilities = useFacilities();
  const [facilityId, setFacilityId] = useState("");
  const selectedFacility = facilityId || facilities.data?.[0]?.id || "";
  const departments = useDepartments(selectedFacility || undefined);
  const [departmentId, setDepartmentId] = useState("");
  const selectedDept = departmentId || departments.data?.[0]?.id || "";
  const services = useServices(selectedDept || undefined);
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["facilities"] });
    void queryClient.invalidateQueries({ queryKey: ["departments"] });
    void queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const facilityCreate = useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      invalidate();
      toast.success("Facility created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  const deptCreate = useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      invalidate();
      toast.success("Department created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  const serviceCreate = useMutation({
    mutationFn: createService,
    onSuccess: () => {
      invalidate();
      toast.success("Service created");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  const toggleDept = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setDepartmentActive(id, active),
    onSuccess: invalidate,
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  const toggleService = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setServiceActive(id, active),
    onSuccess: invalidate,
    onError: (e) => toast.error(normalizeApiError(e).message),
  });

  const [facForm, setFacForm] = useState({ code: "", name: "", address: "" });
  const [deptForm, setDeptForm] = useState({ code: "", name: "" });
  const [svcForm, setSvcForm] = useState({
    code: "",
    name: "",
    priceCents: "",
    durationMinutes: "",
  });

  if (facilities.isLoading) {
    return <LoadingBlock label="Loading facilities" />;
  }
  if (facilities.isError) {
    return (
      <ErrorState
        message="Could not load facilities."
        onRetry={() => void facilities.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <QueryStaleBanner query={facilities} />

      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-slate-900">New facility</h2>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            facilityCreate.mutate({
              code: facForm.code,
              name: facForm.name,
              address: facForm.address || undefined,
            });
          }}
        >
          <div>
            <Label htmlFor="f-code">Code</Label>
            <Input
              id="f-code"
              required
              className="mt-1"
              value={facForm.code}
              onChange={(e) => setFacForm({ ...facForm, code: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="f-name">Name</Label>
            <Input
              id="f-name"
              required
              className="mt-1"
              value={facForm.name}
              onChange={(e) => setFacForm({ ...facForm, name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="f-addr">Address</Label>
            <Input
              id="f-addr"
              className="mt-1"
              value={facForm.address}
              onChange={(e) =>
                setFacForm({ ...facForm, address: e.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={facilityCreate.isPending}>
            Add facility
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <Label htmlFor="sel-fac">Facility</Label>
          <select
            id="sel-fac"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedFacility}
            onChange={(e) => {
              setFacilityId(e.target.value);
              setDepartmentId("");
            }}
          >
            {(facilities.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </select>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {(departments.data ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2">
                <span>
                  {d.name}{" "}
                  <span className="text-xs text-slate-500">
                    {d.active ? "Active" : "Inactive"}
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleDept.mutate({ id: d.id, active: !d.active })
                  }
                >
                  {d.active ? "Deactivate" : "Activate"}
                </Button>
              </li>
            ))}
          </ul>
          {selectedFacility ? (
            <form
              className="mt-4 grid gap-2 border-t border-slate-100 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                deptCreate.mutate({
                  facilityId: selectedFacility,
                  code: deptForm.code,
                  name: deptForm.name,
                });
              }}
            >
              <p className="text-xs font-medium text-slate-600">New department</p>
              <Input
                placeholder="Code"
                required
                value={deptForm.code}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, code: e.target.value })
                }
              />
              <Input
                placeholder="Name"
                required
                value={deptForm.name}
                onChange={(e) =>
                  setDeptForm({ ...deptForm, name: e.target.value })
                }
              />
              <Button type="submit" size="sm" disabled={deptCreate.isPending}>
                Add department
              </Button>
            </form>
          ) : null}
        </Card>

        <Card className="p-4">
          <Label htmlFor="sel-dept">Department (services)</Label>
          <select
            id="sel-dept"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedDept}
            onChange={(e) => setDepartmentId(e.target.value)}
          >
            {(departments.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-slate-700">
            {(services.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>
                  {s.name} — {formatCents(s.priceCents)}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toggleService.mutate({ id: s.id, active: !s.active })
                  }
                >
                  {s.active ? "Off" : "On"}
                </Button>
              </li>
            ))}
          </ul>
          {selectedDept ? (
            <form
              className="mt-4 grid gap-2 border-t border-slate-100 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                const price = Number.parseInt(svcForm.priceCents, 10);
                serviceCreate.mutate({
                  departmentId: selectedDept,
                  code: svcForm.code,
                  name: svcForm.name,
                  priceCents: Number.isFinite(price) ? price : 0,
                  durationMinutes: svcForm.durationMinutes
                    ? Number.parseInt(svcForm.durationMinutes, 10)
                    : undefined,
                });
              }}
            >
              <p className="text-xs font-medium text-slate-600">New service</p>
              <Input
                placeholder="Code"
                required
                value={svcForm.code}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, code: e.target.value })
                }
              />
              <Input
                placeholder="Name"
                required
                value={svcForm.name}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, name: e.target.value })
                }
              />
              <Input
                placeholder="Price (cents)"
                required
                inputMode="numeric"
                value={svcForm.priceCents}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, priceCents: e.target.value })
                }
              />
              <Input
                placeholder="Duration minutes (optional)"
                inputMode="numeric"
                value={svcForm.durationMinutes}
                onChange={(e) =>
                  setSvcForm({ ...svcForm, durationMinutes: e.target.value })
                }
              />
              <Button type="submit" size="sm" disabled={serviceCreate.isPending}>
                Add service
              </Button>
            </form>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
