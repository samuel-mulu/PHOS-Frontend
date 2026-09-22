import { api } from "@/lib/api/client";

export type Facility = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  active: boolean;
};

export type Department = {
  id: string;
  facilityId: string;
  code: string;
  name: string;
  active: boolean;
};

export type Service = {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  priceCents: number;
  durationMinutes: number | null;
  active: boolean;
};

export async function fetchFacilities() {
  const { data } = await api.get<Facility[]>("/facilities");
  return data;
}

export async function fetchDepartments(facilityId?: string) {
  const { data } = await api.get<Department[]>("/departments", {
    params: facilityId ? { facilityId } : undefined,
  });
  return data;
}

export async function fetchServices(departmentId?: string) {
  const { data } = await api.get<Service[]>("/services", {
    params: departmentId ? { departmentId } : undefined,
  });
  return data;
}

export async function createFacility(body: {
  code: string;
  name: string;
  phone?: string;
  address?: string;
}) {
  const { data } = await api.post<Facility>("/facilities", body);
  return data;
}

export async function createDepartment(body: {
  facilityId: string;
  code: string;
  name: string;
}) {
  const { data } = await api.post<Department>("/departments", body);
  return data;
}

export async function setDepartmentActive(id: string, active: boolean) {
  const { data } = await api.patch<Department>(`/departments/${id}/status`, {
    active,
  });
  return data;
}

export async function createService(body: {
  departmentId: string;
  code: string;
  name: string;
  priceCents: number;
  durationMinutes?: number;
}) {
  const { data } = await api.post<Service>("/services", body);
  return data;
}

export async function setServiceActive(id: string, active: boolean) {
  const { data } = await api.patch<Service>(`/services/${id}/status`, {
    active,
  });
  return data;
}
