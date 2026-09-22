"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeApiError } from "@/lib/api/errors";
import { dispensePrescription, type DispenseItemInput } from "./api";

export function useDispensePrescription(prescriptionId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (items: DispenseItemInput[]) =>
      dispensePrescription(prescriptionId, items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["queues"] });
      toast.success("Dispensing recorded");
      router.push("/pharmacy");
    },
    onError: (e) => toast.error(normalizeApiError(e).message),
  });
}
