// A count short enough for a small place on a phone: 950, 1,2k, 12k, 999k, 1,2tr, 12tr, 1,2tỷ (a comma for the decimal, as the game writes numbers). Never longer than 5 characters.
export function shortNum(n: number): string {
  n = Math.max(0, Math.round(n || 0));
  const one = (x: number, unit: string) => { const r = Math.round(x * 10) / 10; return `${Number.isInteger(r) ? r : String(r).replace('.', ',')}${unit}`; };
  if (n < 1000) return String(n);
  if (n < 9_950) return one(n / 1000, 'k');            // 9.95k and more is written 10k, never 10,0k
  if (n < 999_500) return `${Math.round(n / 1000)}k`;
  if (n < 9_950_000) return one(n / 1e6, 'tr');
  if (n < 999_500_000) return `${Math.round(n / 1e6)}tr`;
  return one(n / 1e9, 'tỷ');
}
