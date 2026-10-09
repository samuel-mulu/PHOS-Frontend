"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import type { AppointmentStatus } from "@/types/appointment";
import {
  checkInAppointment,
  createAppointment,
  fetchAppointments,
  updateAppointmentStatus,
} from "./api";

export function useAppointments(params?: {
  from?: string;
  to?: string;
  status?: AppointmentStatus;
}) {
  return useQuery({
    queryKey: ["appointments", params ?? {}],
    queryFn: () => fetchAppointments(params),
    refetchInterval: 30_000,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment scheduled");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      updateAppointmentStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment updated");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}

export function useCheckInAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      encounterId,
    }: {
      id: string;
      encounterId: string;
    }) => checkInAppointment(id, encounterId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
      void queryClient.invalidateQueries({ queryKey: ["encounters"] });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
