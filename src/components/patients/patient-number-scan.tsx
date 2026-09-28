"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePatientLookup } from "@/features/patients/hooks";
import type { Patient } from "@/types/patient";
import { parsePatientQrPayload } from "./patient-qr-badge";

export function PatientNumberScan({
  onFound,
}: {
  onFound: (patient: Patient) => void;
}) {
  const [value, setValue] = useState("");
  const lookup = usePatientLookup();

  function submit() {
    const num = parsePatientQrPayload(value);
    if (!num) return;
    lookup.mutate(num, {
      onSuccess: (patient) => {
        onFound(patient);
        setValue("");
      },
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed border-teal-300 bg-teal-50/50 p-3">
      <Label htmlFor="patient-scan" className="text-xs font-semibold text-teal-900">
        QR / card number
      </Label>
      <div className="flex gap-2">
        <Input
          id="patient-scan"
          placeholder="Scan or type patient number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          autoComplete="off"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!value.trim() || lookup.isPending}
          onClick={submit}
        >
          Look up
        </Button>
      </div>
      <p className="text-xs text-slate-600">
        USB scanners usually paste into this field; press Enter to search.
      </p>
    </div>
  );
}
