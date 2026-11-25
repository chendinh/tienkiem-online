// Cutting the black away from a picture drawn on a plain black background (the stand and the chest of Triển Lãm): a flood fill from the edges, so the dark inside of the object stays.
// It is the same cut scripts/thumbs.ts makes for pictures shipped in the build; this one runs in the browser, for a picture the owner had the server draw (components/CutImg.tsx),
// which has no cut-out file next to it.
export const DARK = 66;   // red + green + blue below this is black

/** Makes the black that touches the edge transparent, in place (`rgba` is width x height x 4). Returns the box of what is left, or null when nothing is. */
export function cutBlack(rgba: Uint8ClampedArray | Uint8Array, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  const seen = new Uint8Array(w * h), stack = new Int32Array(w * h);
  let sp = 0;
  const push = (p: number) => { if (!seen[p] && rgba[p * 4] + rgba[p * 4 + 1] + rgba[p * 4 + 2] < DARK) { seen[p] = 1; stack[sp++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const p = stack[--sp], x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (seen[p]) { rgba[p * 4 + 3] = 0; continue; }
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
