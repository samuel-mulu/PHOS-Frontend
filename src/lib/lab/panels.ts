export const PANEL_ORDER = [
  "CBC",
  "BMP",
  "LFT",
  "Lipid",
  "Urinalysis",
  "Coagulation",
  "Parasitology",
  "BloodGroup",
  "BodyFluid",
  "Bacteriology",
  "Serology",
  "HormoneAnalysis",
  "OtherPanels",
] as const;

export const PANEL_LABEL: Record<string, string> = {
  CBC: "CBC",
  BMP: "BMP",
  LFT: "LFT",
  Lipid: "Lipid",
  Urinalysis: "Urinalysis",
  Coagulation: "Coagulation",
  Parasitology: "Parasitology",
  BloodGroup: "Blood group",
  BodyFluid: "Body fluid",
  Bacteriology: "Bacteriology",
  Serology: "Serology",
  HormoneAnalysis: "Hormones",
  OtherPanels: "Other",
};

export const PAPER_TITLE: Record<string, string> = {
  CBC: "HEMATOLOGY (Complete Blood Count)",
  BMP: "BASIC METABOLIC PANEL",
  LFT: "LIVER FUNCTION TESTS",
  Lipid: "LIPID PANEL",
  Urinalysis: "URINALYSIS",
  Coagulation: "COAGULATION PANEL",
  Parasitology: "PARASITOLOGY",
  BloodGroup: "BLOOD GROUP",
  BodyFluid: "BODY FLUID ANALYSIS",
  Bacteriology: "BACTERIOLOGY",
  Serology: "SEROLOGY",
  HormoneAnalysis: "HORMONE ANALYSIS",
  OtherPanels: "OTHER LAB TESTS",
};

export function panelLabel(category: string | null | undefined): string {
  if (!category) return "Other";
  return PANEL_LABEL[category] ?? category;
}

export function paperTitle(category: string | null | undefined): string {
  if (!category) return "OTHER LAB TESTS";
  return PAPER_TITLE[category] ?? category.toUpperCase();
}

function panelRank(category: string | null | undefined): number {
  if (!category) return 999;
  const i = PANEL_ORDER.indexOf(category as (typeof PANEL_ORDER)[number]);
  return i === -1 ? 800 : i;
}

export function uniquePanelLabels(
  items: Array<{ category?: string | null }>,
): string {
  const seen = new Set<string>();
  const labels: string[] = [];
  for (const item of items) {
    const cat = item.category?.trim() || "OtherPanels";
    if (seen.has(cat)) continue;
    seen.add(cat);
    labels.push(panelLabel(cat));
  }
  return labels.join(", ") || "Lab";
}

export function groupByPanel<T>(
  items: T[],
  categoryOf: (item: T) => string | null | undefined,
  sortOf?: (item: T) => number,
): Array<{ category: string; label: string; title: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = categoryOf(item)?.trim() || "OtherPanels";
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => panelRank(a) - panelRank(b))
    .map(([category, group]) => ({
      category,
      label: panelLabel(category),
      title: paperTitle(category),
      items: sortOf
        ? group.slice().sort((x, y) => sortOf(x) - sortOf(y))
        : group,
    }));
}
