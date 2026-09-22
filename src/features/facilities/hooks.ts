"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDepartments, fetchFacilities, fetchServices } from "./api";

export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: fetchFacilities,
  });
}

export function useDepartments(facilityId?: string) {
  return useQuery({
    queryKey: ["departments", facilityId ?? "all"],
    queryFn: () => fetchDepartments(facilityId),
  });
}

export function useServices(departmentId?: string) {
  return useQuery({
    queryKey: ["services", departmentId ?? "none"],
    queryFn: () => fetchServices(departmentId),
    enabled: Boolean(departmentId),
  });
}

export function useWorkspaceContext(departmentId: string | null | undefined) {
  const facilities = useFacilities();
  const departments = useDepartments();

  const department = departments.data?.find((d) => d.id === departmentId);
  const facility = facilities.data?.find((f) => f.id === department?.facilityId);

  return {
    facilityName: facility?.name ?? facilities.data?.[0]?.name,
    departmentName: department?.name,
    isLoading: facilities.isLoading || departments.isLoading,
  };
}
