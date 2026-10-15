/** Converts a price string such as "$1,234.56" or "12.01" to integer cents to avoid float rounding errors. */
export function toCents(text: string): number {
  const numeric = text.replace(/[^0-9.]/g, '');
  if (!numeric) throw new Error(`Cannot parse price from "${text}"`);
  return Math.round(parseFloat(numeric) * 100);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
