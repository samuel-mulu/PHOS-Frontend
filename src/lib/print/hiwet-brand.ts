/** Shared Hiwet Clinic print branding (header, sidebar, footer). */

export const HIWET_BRAND = {
  nameEn: "HIWET CLINIC",
  nameAm: "ሂወት ክሊኒክ",
  titleBilingual: "HIWET CLINIC - ሂወት ክሊኒክ",
  tagline: "Shire, Tigray, Ethiopia ❤️ Your Trusted Partner In Healthcare ✨",
  locationEn: "Shire, Tigray, Ethiopia",
  phones: "0966281315 / 0903050666",
  footerAm: "ሂወት ክሊኒክ ሽረ",
  footerAddress: "ኣድራሻ ሽረ እ/ስላሴ ቀበሌ 05 ፊት ንፊት ኣይቴል ህንፃ",
  footerEn:
    "Hiwet Clinic 📍 Shire, Tigray, Ethiopia 🌐 © 2026 ❤️ Your Trusted Partner In Healthcare ✨",
  logoPath: "/logo.png",
  logoFallbackPath: "/branding/logo.png",
  sidebarIcon: "🏥",
  sidebarTitle: "እንህቦም ግልጋሎት",
  sidebarServices: [
    "ናይ ማህፀንን ጥንስን ሕክምና",
    "ሃንደበታዊ ሕክምና",
    "ክትትል ቅድመወሊድ",
    "ግልጋሎት ምዉላድ",
    "ምርመራ ብፀታዊርክብ ተማሓላለፊቲ ሕማማት",
    "ዘመናዊ ግርዛት ደቂትባዕትዮን መጥባሕትን",
    "ሓፈሻዊ ሕክምና ዓበይትን ህፃዉንትን",
    "ግልጋሎት ኣልትራሳውንድን ላባራቶርን",
    "ግልጋሎት ምጣነ ስድራ",
  ],
  colors: {
    teal: "#0f766e",
    tealDark: "#0d5c56",
    tealBorder: "#5eead4",
    tealSoft: "#f0fdfa",
    cyanSoft: "#ecfeff",
    patientBg: "#eefbf8",
    patientBorder: "#99f6e4",
    check: "#7c3aed",
    phone: "#dc2626",
    pin: "#ec4899",
    ink: "#1e293b",
    muted: "#64748b",
  },
} as const;

export type VisitPrintSectionKey =
  | "vitals"
  | "notes"
  | "diagnosis"
  | "ultrasound"
  | "prescription";

export const VISIT_SECTION_STYLE: Record<
  VisitPrintSectionKey,
  {
    label: string;
    icon: string;
    bar: string;
    title: string;
    tint: string;
  }
> = {
  vitals: {
    label: "Vitals",
    icon: "🩺",
    bar: "#3b82f6",
    title: "#1d4ed8",
    tint: "#eff6ff",
  },
  notes: {
    label: "Medical Notes",
    icon: "📝",
    bar: "#a855f7",
    title: "#7e22ce",
    tint: "#faf5ff",
  },
  diagnosis: {
    label: "Diagnosis",
    icon: "🧠",
    bar: "#ef4444",
    title: "#b91c1c",
    tint: "#fef2f2",
  },
  ultrasound: {
    label: "Ultrasound",
    icon: "🧪",
    bar: "#6366f1",
    title: "#4338ca",
    tint: "#eef2ff",
  },
  prescription: {
    label: "Prescription (Rx)",
    icon: "💊",
    bar: "#22c55e",
    title: "#15803d",
    tint: "#f0fdf4",
  },
};

/** Load clinic logo as a data URL so print popups always show it. */
export async function loadClinicLogoDataUrl(): Promise<string | null> {
  const paths = [HIWET_BRAND.logoPath, HIWET_BRAND.logoFallbackPath];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      return dataUrl;
    } catch {
      /* try next path */
    }
  }
  return null;
}
