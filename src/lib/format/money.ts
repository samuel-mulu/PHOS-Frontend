export function formatCents(cents: number, currency = "ETB"): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}
