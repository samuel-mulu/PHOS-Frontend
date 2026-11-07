import { HIWET_BRAND } from "@/lib/print/hiwet-brand";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Shared CSS for Hiwet letterhead prints (header, services sidebar, footer). */
export function hiwetPrintShellCss() {
  const { colors } = HIWET_BRAND;
  return `
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Noto Sans Ethiopic", "Nyala", "Abyssinica SIL", "Segoe UI", system-ui, sans-serif;
    color: ${colors.ink};
    margin: 0;
    padding: 18px 20px 14px;
    background: #fff;
    font-size: 13px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    border-bottom: 2px solid ${colors.tealBorder};
    padding-bottom: 12px;
    margin-bottom: 14px;
  }
  .brand-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo, .logo-fallback {
    width: 56px;
    height: 56px;
    border-radius: 999px;
    object-fit: cover;
    border: 2px solid ${colors.teal};
    box-shadow: 0 2px 8px rgba(15, 118, 110, 0.18);
    flex-shrink: 0;
  }
  .logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ccfbf1;
    color: ${colors.teal};
    font-weight: 800;
    font-size: 20px;
  }
  .brand-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    color: ${colors.tealDark};
    letter-spacing: -0.02em;
    line-height: 1.15;
  }
  .brand-sub {
    margin: 4px 0 0;
    font-size: 11px;
    color: ${colors.muted};
    font-weight: 500;
  }
  .header-meta {
    text-align: right;
    font-size: 12px;
    color: ${colors.ink};
    line-height: 1.6;
    flex-shrink: 0;
  }
  .header-meta .meta-line {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    align-items: baseline;
  }
  .header-meta .meta-label { font-weight: 600; white-space: nowrap; }
  .header-meta .meta-value {
    border-bottom: 1px dotted #64748b;
    min-width: 7rem;
    font-weight: 700;
    padding: 0 4px 1px;
  }
  .layout {
    display: grid;
    grid-template-columns: 22% 1fr;
    gap: 14px;
    align-items: start;
  }
  .sidebar {
    background: linear-gradient(165deg, #f0fdfa 0%, #fff 42%, #ecfeff 100%);
    border: 1px solid ${colors.patientBorder};
    border-left: 3px solid ${colors.teal};
    border-radius: 12px;
    padding: 12px 10px 14px;
    box-shadow: 0 2px 10px rgba(15, 118, 110, 0.08);
  }
  .sidebar h2 {
    margin: 0 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #99f6e4;
    font-size: 11px;
    font-weight: 700;
    color: ${colors.tealDark};
    letter-spacing: 0.04em;
    line-height: 1.3;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .sidebar h2 .side-icon { font-size: 14px; }
  .sidebar ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .sidebar li {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 10.5px;
    font-weight: 500;
    color: #334155;
    line-height: 1.35;
  }
  .sidebar .check {
    color: ${colors.check};
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    flex-shrink: 0;
  }
  .main { min-width: 0; padding-top: 4px; }
  .sheet-title {
    text-align: center;
    font-size: 18px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-decoration: underline;
    margin: 0 0 18px;
    color: ${colors.ink};
  }
  .sheet-title-am {
    text-align: center;
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 4px;
    color: ${colors.tealDark};
  }
  .row-inline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 14px;
    margin-bottom: 8px;
  }
  .mt-sm { margin-top: 8px; }
  .mt-md { margin-top: 16px; }
  .mt-lg { margin-top: 22px; }
  .inline-field {
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 40%;
  }
  .inline-field.full { min-width: 100%; flex: 1 1 100%; }
  .if-label {
    font-weight: 600;
    color: ${colors.ink};
    white-space: nowrap;
  }
  .if-value {
    border-bottom: 1px dotted #64748b;
    min-height: 1.2em;
    flex: 1;
    font-weight: 600;
    color: #0f172a;
    padding: 0 4px 2px;
  }
  .block-field { margin-top: 14px; }
  .block-label {
    margin: 0 0 6px;
    font-weight: 600;
    color: ${colors.ink};
  }
  .block-body {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.45;
    font-weight: 600;
    color: #334155;
    border-bottom: 1px dotted #cbd5e1;
    padding-bottom: 4px;
    min-height: 1.4em;
  }
  .dotted-block { display: flex; flex-direction: column; gap: 12px; }
  .dotted-row {
    border-bottom: 1px dotted #94a3b8;
    height: 1px;
    width: 100%;
  }
  .sig-row {
    display: flex;
    justify-content: flex-end;
    margin-top: 28px;
  }
  .sig-box {
    min-width: 220px;
    text-align: center;
  }
  .sig-line {
    border-bottom: 1px solid #64748b;
    height: 36px;
    margin-bottom: 6px;
  }
  .sig-label {
    font-size: 12px;
    font-weight: 600;
    color: ${colors.ink};
  }
  .sig-doctor {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    font-weight: 700;
    color: #334155;
  }
  .footer {
    margin-top: 22px;
    padding-top: 12px;
    border-top: 2px solid ${colors.tealBorder};
    text-align: center;
  }
  .footer-am {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    color: ${colors.tealDark};
    line-height: 1.45;
  }
  .footer-am .pin { color: ${colors.pin}; }
  .footer-phones {
    margin: 6px 0 0;
    font-size: 12px;
    color: #334155;
    font-weight: 600;
  }
  .footer-phones .phone-ico { color: ${colors.phone}; }
  .footer-en {
    margin: 6px 0 0;
    font-size: 10px;
    color: #94a3b8;
  }
  .footer-meta {
    margin: 4px 0 0;
    font-size: 10px;
    color: #cbd5e1;
  }
  @media print {
    body { padding: 0; }
    .sidebar, .logo, .dotted-row, .if-value, .block-body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;
}

export function wrapHiwetPrintDocument(input: {
  title: string;
  mainHtml: string;
  logoUrl?: string | null;
  encounterNumber?: string;
  headerMetaHtml?: string;
}): string {
  const {
    title,
    mainHtml,
    logoUrl = null,
    encounterNumber = "",
    headerMetaHtml = "",
  } = input;

  const sidebarItems = HIWET_BRAND.sidebarServices
    .map(
      (item) =>
        `<li><span class="check">✔</span><span>${escapeHtml(item)}</span></li>`,
    )
    .join("");

  const logoHtml = logoUrl
    ? `<img class="logo" src="${logoUrl}" alt="Hiwet Clinic" />`
    : `<div class="logo-fallback">${escapeHtml(HIWET_BRAND.nameEn.charAt(0))}</div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>${hiwetPrintShellCss()}</style></head><body>
  <header class="header">
    <div class="brand-row">
      ${logoHtml}
      <div>
        <h1 class="brand-title">${escapeHtml(HIWET_BRAND.titleBilingual)}</h1>
        <p class="brand-sub">${HIWET_BRAND.tagline}</p>
      </div>
    </div>
    ${headerMetaHtml ? `<div class="header-meta">${headerMetaHtml}</div>` : ""}
  </header>

  <div class="layout">
    <aside class="sidebar">
      <h2><span class="side-icon">${HIWET_BRAND.sidebarIcon}</span>${escapeHtml(HIWET_BRAND.sidebarTitle)}</h2>
      <ul>${sidebarItems}</ul>
    </aside>
    <main class="main">
      ${mainHtml}
    </main>
  </div>

  <footer class="footer">
    <p class="footer-am">${escapeHtml(HIWET_BRAND.footerAm)} | <span class="pin">📍</span> ${escapeHtml(HIWET_BRAND.footerAddress)}</p>
    <p class="footer-phones"><span class="phone-ico">📞</span> ${escapeHtml(HIWET_BRAND.phones)}</p>
    <p class="footer-en">${HIWET_BRAND.footerEn}</p>
    ${encounterNumber ? `<p class="footer-meta">${escapeHtml(encounterNumber)}</p>` : ""}
  </footer>
</body></html>`;
}

export function printInlineField(label: string, value: string, full = false) {
  const text = value.trim();
  return `<span class="inline-field${full ? " full" : ""}">
    <span class="if-label">${escapeHtml(label)}</span>
    <span class="if-value">${escapeHtml(text || " ")}</span>
  </span>`;
}

export function printBlockField(
  label: string,
  value: string | undefined,
  minLines: number,
) {
  const body = value?.trim() ?? "";
  if (body) {
    return `<div class="block-field">
      <p class="block-label">${escapeHtml(label)}</p>
      <pre class="block-body">${escapeHtml(body)}</pre>
    </div>`;
  }
  const rows = Array.from(
    { length: minLines },
    () => '<div class="dotted-row"></div>',
  ).join("");
  return `<div class="block-field">
    <p class="block-label">${escapeHtml(label)}</p>
    <div class="dotted-block">${rows}</div>
  </div>`;
}
