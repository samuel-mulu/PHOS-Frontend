"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDoctors } from "./api";

export function useDoctors() {
  return useQuery({
    queryKey: ["users", "doctors"],
    queryFn: fetchDoctors,
    staleTime: 60_000,
  });
}
