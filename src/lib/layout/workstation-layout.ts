/** Routes where the UI focuses on one patient / order (immersive chart mode). */
const CHART_PATHS: RegExp[] = [
  /^\/doctor\/[^/]+$/,
  /^\/nurse\/[^/]+$/,
  /^\/laboratory\/orders\/[^/]+$/,
  /^\/pharmacy\/prescriptions\/[^/]+$/,
  /^\/billing\/invoices\/[^/]+$/,
  /^\/patients\/(?!new$)[^/]+$/,
];

export function isChartWorkspace(pathname: string): boolean {
  return CHART_PATHS.some((re) => re.test(pathname));
}

export function chartWorkspaceReturn(pathname: string): {
  href: string;
  label: string;
} | null {
  if (pathname.startsWith("/doctor/")) {
    return { href: "/doctor", label: "Doctor queue" };
  }
  if (pathname.startsWith("/nurse/")) {
    return { href: "/nurse", label: "Triage queue" };
  }
  if (pathname.startsWith("/laboratory/orders/")) {
    return { href: "/laboratory", label: "Laboratory queue" };
  }
  if (pathname.startsWith("/pharmacy/prescriptions/")) {
    return { href: "/pharmacy", label: "Pharmacy queue" };
  }
  if (pathname.startsWith("/billing/invoices/")) {
    return { href: "/billing", label: "Billing" };
  }
  if (pathname.startsWith("/patients/") && pathname !== "/patients/new") {
    return { href: "/patients", label: "Patients" };
  }
  return null;
}

export const SIDEBAR_STORAGE_KEY = "phos.sidebar.open";
