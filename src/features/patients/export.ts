import { format } from "date-fns";
import { fetchPatients } from "@/features/patients/api";
import { ageYears } from "@/lib/format/age";
import type { Patient } from "@/types/patient";

const PAGE_SIZE = 100;

export async function fetchAllPatientsForExport(search?: string): Promise<Patient[]> {
  const items: Patient[] = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total) {
    const data = await fetchPatients({
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    });
    total = data.total;
    items.push(...data.items);
    if (data.items.length === 0) break;
    page += 1;
  }

  return items;
}

function patientFullName(p: Patient): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
}

export async function downloadPatientsXlsx(
  patients: Patient[],
  search?: string,
) {
  const XLSX = await import("xlsx");
  const stamp = format(new Date(), "yyyy-MM-dd");
  const rows = [
    [
      "Patient number",
      "Full name",
      "First name",
      "Middle name",
      "Last name",
      "Sex",
      "Age",
      "Phone",
      "Email",
      "Address",
      "Government ID",
      "Emergency contact",
      "Emergency phone",
      "Allergies",
      "Registered at",
    ],
    ...patients.map((p) => [
      p.patientNumber,
      patientFullName(p),
      p.firstName,
      p.middleName ?? "",
      p.lastName,
      p.sex,
      ageYears(p.dateOfBirth) ?? "",
      p.phone ?? "",
      p.email ?? "",
      p.address ?? "",
      p.governmentId ?? "",
      p.emergencyContactName ?? "",
      p.emergencyContactPhone ?? "",
      p.allergies ?? "",
      p.createdAt
        ? format(new Date(p.createdAt), "yyyy-MM-dd HH:mm")
        : "",
    ]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Patients");

  const suffix = search?.trim()
    ? `_search_${search.trim().replace(/[^\w.-]+/g, "_").slice(0, 40)}`
    : "";
  XLSX.writeFile(wb, `Patients_${stamp}${suffix}.xlsx`);
}
