"use client";

import QRCode from "react-qr-code";

export function PatientQrBadge({
  patientNumber,
  size = 96,
}: {
  patientNumber: string;
  size?: number;
}) {
  const payload = `PHOS:${patientNumber}`;
  return (
    <div className="inline-flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-3">
      {/* White quiet zone keeps the code scannable in dark mode. */}
      <div className="rounded bg-white p-1.5 dark:bg-white">
        <QRCode value={payload} size={size} level="M" />
      </div>
      <p className="text-center text-xs font-medium text-foreground">
        Scan at reception
      </p>
      <p className="font-mono text-xs text-muted">{patientNumber}</p>
    </div>
  );
}

/** Strip PHOS: prefix from scanned QR text or raw patient number. */
export function parsePatientQrPayload(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toUpperCase().startsWith("PHOS:")) {
    return trimmed.slice(5).trim();
  }
  return trimmed;
}
