import * as C from './content';
import { itemObject } from './imageprompt';
import type { ItemKeyInput } from './assetKey';

// Pictures drawn before the spec was stored in their meta only have a prompt and a seed. This turns them back into a stable key.
// It reads only the parts of the prompt that identify the item (object, tier word, accent colour, one-of-a-kind marker), so rewordings of the
// rest of the prompt do not matter. Returns null when it cannot tell for sure (the picture is then simply not indexed).
const P = 2147483647n;
const GEN = 7919n;
const pow = (b: bigint, e: bigint, m: bigint) => { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; };
const INV = pow(GEN, P - 2n, P);
// seed = (4242 + v * 7919) mod 2147483647 and v < 2^30 < prime, so v is recovered uniquely.
export const lookFromSeed = (seed: number): number => Number((((BigInt(seed) - 4242n) % P + P) % P * INV) % P);

const TIER_WORDS: [RegExp, number][] = [[/^simple and plain/, 0], [/^well-made/, 1], [/^refined/, 2], [/^ornate/, 3], [/^legendary/, 4], [/^divine immortal/, 5]];

let OBJ: Map<string, { slot: string; base: string }> | null = null;
const objects = () => {
  if (OBJ) return OBJ;
  OBJ = new Map();
  for (const slot of C.SLOTS) {
    for (const base of C.basesOf(slot)) OBJ.set(itemObject(slot, base), { slot, base });
    if (!OBJ.has(itemObject(slot, ''))) OBJ.set(itemObject(slot, ''), { slot, base: '' });
  }
  return OBJ;
};

// `attempt`: a picture the reviewer rejected is drawn again with seed + 7919 * attempt (see imagegen.ts), so the stored seed is shifted by that much.
export function itemKeyFromPrompt(prompt: unknown, seed: unknown, attempt: unknown = 0): ItemKeyInput | null {
  if (typeof prompt !== 'string') return null;
  const i = prompt.indexOf('an inventory icon of a single ');
  if (i < 0) return null;
  const rest = prompt.slice(i + 'an inventory icon of a single '.length);
  const m = /, (simple and plain|well-made|refined|ornate|legendary|divine immortal)/.exec(rest);
  if (!m) return null;
  const obj = objects().get(rest.slice(0, m.index));
  if (!obj) return null;
  const tier = TIER_WORDS.find(([re]) => re.test(m[1]))![1];
  const tail = rest.slice(m.index + 2, rest.indexOf(', isolated and centered') >= 0 ? rest.indexOf(', isolated and centered') : undefined);
  let e = '';
  for (const [el, acc] of Object.entries(C.EL_ACCENT)) if (tail.includes(`with ${acc} accents`)) e = el;
  if (tier >= 2 && !e) return null;
  if (tier < 2 && e) return null;
  let v = 0;
  if (tail.includes('a one-of-a-kind design')) {
    if (typeof seed !== 'number' || !Number.isInteger(seed)) return null;
    const n = typeof attempt === 'number' && Number.isInteger(attempt) && attempt >= 0 && attempt < 10 ? attempt : 0;
    const base = seed - 7919 * n;
    v = lookFromSeed(base);
    if (v < 1 || v > 2 ** 30 || (4242 + v * 7919) % 2147483647 !== base) return null;
  }
  return { slot: obj.slot, base: obj.base, tier, e, v };
}
