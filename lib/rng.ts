// Seeded RNG with independent named streams (prototype: 32-bit mulberry32 per stream).
export type StreamName = 'enc' | 'combat' | 'loot' | 'tame' | 'gen' | 'cult' | 'event';
export type Streams = Record<StreamName, number>;

export function newStreams(seed: number): Streams {
  const mix = (n: number) => {
    let t = (seed ^ Math.imul(n, 0x9e3779b1)) | 0;
    t = Math.imul(t ^ (t >>> 16), 0x85ebca6b);
    t = Math.imul(t ^ (t >>> 13), 0xc2b2ae35);
    return (t ^ (t >>> 16)) | 0;
  };
  return { enc: mix(1), combat: mix(2), loot: mix(3), tame: mix(4), gen: mix(5), cult: mix(6), event: mix(7) };
}

export function next(s: Streams, k: StreamName): number {
  s[k] = (s[k] + 0x6d2b79f5) | 0;
  let t = s[k];
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const int = (s: Streams, k: StreamName, a: number, b: number) => a + Math.floor(next(s, k) * (b - a + 1));
export const pick = <T,>(s: Streams, k: StreamName, arr: T[]): T => arr[Math.floor(next(s, k) * arr.length)];
export function weighted(s: Streams, k: StreamName, w: number[]): number {
  const total = w.reduce((a, b) => a + b, 0);
  let r = next(s, k) * total;
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
  return w.length - 1;
}
export function gauss(s: Streams, k: StreamName): number {
  const u = Math.max(next(s, k), 1e-12), v = next(s, k);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function truncNormal(s: Streams, k: StreamName, mu: number, sigma: number, lo: number, hi: number): number {
  for (let i = 0; i < 60; i++) { const x = mu + sigma * gauss(s, k); if (x >= lo && x <= hi) return x; }
  return mu;
}
export function shuffle<T>(s: Streams, k: StreamName, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = int(s, k, 0, i); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
