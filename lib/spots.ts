// Linh Thú Viên: the creatures STAND at fixed spots of one background picture and move in place, in a way that fits the spot (drink at the stream, eat fruit
// under the tree). Shared by the page and the server, no imports, so it is tested (tests/spots.test.ts) and the page can price a run before it starts.
//
// THE CONTRACT OF A SPOT. A spot is two exact points of the background picture, the same for every creature that ever stands there:
//   stand: where the feet touch the ground (the bottom of the creature),
//   focus: what the creature does something to (the water it drinks, the fruit it eats, what it watches).
// A creature is drawn in the pose of the spot (muzzle at the water, mouth at the fruit), its picture is cut out of the picture it was drawn in, and the cut-out
// is MEASURED (its box, its muzzle) and then put on the stage by `frameOf` below, so that its feet are on `stand` and its mouth is at `focus`, whatever
// the creature is. The creature's clip is cut out as well and laid over the background's own clip, so there is no seam between a tile and the scene.
// The points are the owner's: the page lets him tap them on the picture (saved in the database), so they are exact for the picture that is really there.

export const BG = { id: 'thanhvan', w: 1376, h: 768 } as const;   // public/art/zones/thanhvan.jpg
export type Kind = 'drink' | 'eat' | 'rest' | 'watch';
export interface Pt { x: number; y: number }                     // pixels of the BG picture
export interface Spot {
  id: string;
  name: string;                       // for the owner (Vietnamese)
  kind: Kind;
  stand: Pt;
  focus: Pt;
  size: { w: number; h: number };     // the room the creature may fill (its box), in BG pixels. drink: the width is the distance stand-focus; eat: the height is stand-focus
  pose: string;                       // the pose the picture editor draws; {dir} is "left" or "right" (towards the focus)
  action: string;                     // what the clip does there, and ends where it began
}

const STATIC = 'The camera is completely static and everything in the scene stays in place except what is described.';
export const SPOTS: Spot[] = [
  { id: 'suoi', name: 'Bờ suối · uống nước', kind: 'drink', stand: { x: 425, y: 698 }, focus: { x: 575, y: 704 }, size: { w: 160, h: 120 },
    pose: 'standing on the grassy bank at the water edge in profile view, facing {dir}, all its feet on the ground, its head and neck stretched forward and lowered so that its muzzle touches the surface of the stream in front of it and it is drinking',
    action: 'The creature keeps drinking from the stream: its head stays lowered with its muzzle at the water the whole time, its throat moves as it laps, small ripples spread from its mouth, its ears and tail move a little. Once it lifts its head slightly and lowers it again. Its feet do not move. It ends exactly in the starting pose.' },
  { id: 'cay', name: 'Dưới cây thông · hái quả', kind: 'eat', stand: { x: 835, y: 588 }, focus: { x: 808, y: 486 }, size: { w: 130, h: 100 },
    pose: 'standing in profile view facing {dir} under a pine branch, rearing up or stretching its neck as its body allows, its mouth biting a glowing golden spirit fruit that hangs in front of it, its head high',
    action: 'The creature keeps its mouth at the glowing fruit and eats it, chewing contentedly, small sparks of light fall from the fruit, its tail or mane sways a little. Its feet do not move and its head stays at the same height. It ends exactly in the starting pose.' },
  { id: 'da', name: 'Tảng đá rêu · nghỉ ngơi', kind: 'rest', stand: { x: 1150, y: 574 }, focus: { x: 1090, y: 540 }, size: { w: 150, h: 95 },
    pose: 'resting on top of a large mossy boulder, lying or sitting comfortably as its body allows, in profile view facing {dir}, relaxed',
    action: 'The creature rests: it breathes slowly, blinks, yawns once, stretches a little, its tail or mane sways, then it settles back into the starting pose.' },
  { id: 'tre', name: 'Rừng tre · ngắm đom đóm', kind: 'watch', stand: { x: 310, y: 672 }, focus: { x: 250, y: 560 }, size: { w: 150, h: 130 },
    pose: 'standing on the ground in three-quarter view facing {dir}, its head raised, watching glowing fireflies that float in the air in front of it',
    action: 'The creature looks around curiously, its ears or head turning to follow glowing fireflies that drift past, it sniffs the air, then it settles back into the starting pose.' },
];
// The background itself moves too: one clip of the whole picture, made once and shared by every player (the creatures' clips are laid over it).
export const BG_SECONDS = 10;   // longer than a creature's clip, so the repeat is less noticeable; it is made once
export const bgClipPrompt = () =>
  'The whole scene is alive with clearly visible, gentle, continuous motion: the river flows steadily downstream with rippling water, moving highlights and small waves around the stones; ' +
  'the waterfalls on the cliffs pour without stopping; thick mist rolls slowly through the valley and between the mountains; the sun rays shimmer and shift; ' +
  'the pine branches and needles, the bamboo stalks and the leaves sway and rustle in a steady breeze; glowing spirit lights float and flicker; clouds drift across the sky. ' +
  'Nothing appears or disappears: no creature, bird, insect or person is added (those are drawn separately). ' +
  `${STATIC} The animation loops seamlessly: the last frame returns exactly to the first frame. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;
export const spotOf = (id: unknown) => SPOTS.find((s) => s.id === id);

// ---- the owner's points (saved in the database) laid over the defaults above
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : NaN);
const pt = (v: any): Pt | null => {
  const x = num(v?.x), y = num(v?.y);
  return x >= 0 && x <= BG.w && y >= 0 && y <= BG.h ? { x, y } : null;
};
// A pair of points the contract can work with: both inside the picture, the feet not at the very top, the two apart (a drink needs room between feet and water).
export function cleanPoints(v: any, kind?: Kind): { stand: Pt; focus: Pt } | null {
  const stand = pt(v?.stand), focus = pt(v?.focus);
  if (!stand || !focus || stand.y < 40) return null;
  const dx = Math.abs(focus.x - stand.x), dy = stand.y - focus.y;
  if (Math.hypot(dx, dy) < 20) return null;
  if (kind === 'drink' && dx < 40) return null;
  if (kind === 'eat' && dy < 40) return null;
  return { stand, focus };
}
export function spotsWith(saved: unknown): Spot[] {
  const m: Record<string, any> = saved && typeof saved === 'object' ? (saved as any) : {};
  return SPOTS.map((s) => { const p = cleanPoints(m[s.id], s.kind); return p ? { ...s, ...p } : s; });
}

// ---- geometry of a spot
export const face = (s: Spot): 1 | -1 => (s.focus.x >= s.stand.x ? 1 : -1);
export const dirWord = (s: Spot) => (face(s) > 0 ? 'right' : 'left');
// The room a creature may fill. A drink has exactly the width between the feet and the water, an apple-picker exactly the height between the feet and the fruit.
export function room(s: Spot): { w: number; h: number } {
  if (s.kind === 'drink') return { w: Math.max(30, Math.abs(s.focus.x - s.stand.x)), h: s.size.h };
  if (s.kind === 'eat') return { w: s.size.w, h: Math.max(30, s.stand.y - s.focus.y) };
  return s.size;
}

// ---- prompts
const NEG = 'No text, no watermark, no logo, no border.';
export const spotPose = (s: Spot) => s.pose.replace('{dir}', dirWord(s));
// Image 1 = the window of the background, image 2 = the creature. The creature is drawn into the window in the pose of the spot; the picture is then cut out
// and measured, so where in the window it ends up does not matter, but its pose, its light and its whole body do.
export const spotPicPrompt = (creature: string, s: Spot) =>
  `Image 1 is a painting of a place. Image 2 is a creature (${creature}). Edit image 1: add the creature from image 2, ${spotPose(s)}. ` +
  `Put it in the lower middle of the image, fully visible and not cropped, with clear space around it and a clear outline. Keep the creature's exact design, colors and markings from image 2. ` +
  `Light it exactly like the scene: same light direction and same color of light, with a soft contact shadow. Keep everything else in image 1 exactly as it is: same composition, camera, painting style and background. ${NEG}`;
export const spotClipPrompt = (s: Spot) =>
  `${s.action} ${STATIC} The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design, colors and the background unchanged. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;

// The square window to crop from the background for the picture editor: around the two points, the feet low in it, snapped to a grid so that nudging a point by a few
// pixels does not change the window (and so does not pay for a new picture); always inside the picture.
export const SIDE = 512;
const snap = (n: number) => Math.round(n / 32) * 32;
export function cropBox(s: Spot, w = BG.w, h = BG.h) {
  const side = Math.min(SIDE, w, h), cx = (s.stand.x + s.focus.x) / 2;
  const left = Math.max(0, Math.min(w - side, snap(cx - side / 2))), top = Math.max(0, Math.min(h - side, snap(s.stand.y - side * 0.78)));
  return { left, top, width: side, height: side };
}
// Where the window sits on the stage, as percentages of the stage (which has the background's shape): the plain tile shown until the cut-out exists.
export function tileRect(s: Spot, w = BG.w, h = BG.h) {
  const b = cropBox(s, w, h), p = (n: number) => Math.round(n * 10000) / 100;
  return { left: p(b.left / w), top: p(b.top / h), width: p(b.width / w), height: p(b.height / h) };
}

// ---- measuring the cut-out picture (its alpha channel): the box of the creature and its two extremes
export interface Metrics { x0: number; y0: number; x1: number; y1: number; l: { x: number; y: number }; r: { x: number; y: number } }   // fractions of the picture
// `a` is one byte per pixel (0..255), row by row. A few stray pixels (dust left by the cut-out) must not stretch the box: a row or column counts when enough of it is opaque.
export function alphaMetrics(a: ArrayLike<number>, w: number, h: number): Metrics | null {
  if (!(w > 0 && h > 0) || a.length < w * h) return null;
  const rows = new Uint32Array(h), cols = new Uint32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[y * w + x] >= 128) { rows[y]++; cols[x]++; }
  const need = (n: number) => Math.max(2, Math.ceil(n * 0.004));
  let y0 = 0, y1 = h - 1, x0 = 0, x1 = w - 1;
  while (y0 < h && rows[y0] < need(w)) y0++;
  while (y1 >= 0 && rows[y1] < need(w)) y1--;
  while (x0 < w && cols[x0] < need(h)) x0++;
  while (x1 >= 0 && cols[x1] < need(h)) x1--;
  if (y0 > y1 || x0 > x1) return null;
  // the height of an extreme: the middle of the opaque pixels in the outermost few columns (the muzzle, or the tail)
  const edge = (from: number, dir: 1 | -1) => {
    const span = Math.max(2, Math.round((x1 - x0 + 1) * 0.03)); let sum = 0, n = 0;
    for (let i = 0; i < span; i++) { const x = from + dir * i; for (let y = y0; y <= y1; y++) if (a[y * w + x] >= 128) { sum += y; n++; } }
    return { x: (from + 0.5) / w, y: n ? (sum / n + 0.5) / h : (y0 + y1) / 2 / h };
  };
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h, l: edge(x0, 1), r: edge(x1, -1) };
}
const okMetrics = (m: any): m is Metrics => !!m && [m.x0, m.y0, m.x1, m.y1, m.l?.x, m.l?.y, m.r?.x, m.r?.y].every((v) => typeof v === 'number' && Number.isFinite(v)) && m.x1 > m.x0 && m.y1 > m.y0;
export const metricsOf = (m: unknown): Metrics | null => (okMetrics(m) ? m : null);

// ---- putting the measured creature on the stage. Everything in BG pixels, except the returned percentages.
// The creature is scaled (all in one scale) to the biggest size that fits the room of the spot, its feet (the bottom of its box) are on `stand`, and
// a creature that reaches (drink, eat) has the front of its box at `focus`: its muzzle is where the water is, for a fox as for a dragon.
export function frameOf(s: Spot, m: Metrics, side = SIDE, w = BG.w, h = BG.h) {
  const bw = (m.x1 - m.x0) * side, bh = (m.y1 - m.y0) * side, rm = room(s);
  const k = Math.min(rm.w / bw, rm.h / bh), tw = bw * k, th = bh * k;
  const reach = s.kind === 'drink' || s.kind === 'eat';
  const left = Math.max(0, Math.min(w - tw, reach ? (face(s) > 0 ? s.focus.x - tw : s.focus.x) : s.stand.x - tw / 2)), top = s.stand.y - th;
  const el = { left: left - m.x0 * side * k, top: top - m.y0 * side * k, w: side * k, h: side * k };   // the whole picture (the video's frame), scaled and moved
  const front = face(s) > 0 ? m.r : m.l;
  const p = (n: number, d: number) => Math.round((n / d) * 100000) / 1000;
  return {
    k, bbox: { left, top, w: tw, h: th },
    frame: { left: p(el.left, w), top: p(el.top, h), width: p(el.w, w), height: p(el.h, h) },     // percentages of the stage
    nose: { x: (el.left + front.x * el.w) / w, y: (el.top + front.y * el.h) / h },                  // the muzzle, as shares of the stage
    focus: { x: s.focus.x / w, y: s.focus.y / h },
    shadow: { left: p(left + tw / 2, w), top: p(s.stand.y, h), width: p(tw * 1.05, w), height: p(Math.max(10, th * 0.14), h) },   // centre of the contact shadow, and its size
  };
}

// Rough price of a run: one picture per (creature, spot) and one clip each, optionally minus what exists. Prices are passed in (see lib/anim.ts clipCost).
export const spotRunUsd = (n: number, picUsd: number, clipUsd: number, more = 0) => Math.round(Math.max(0, n) * (picUsd + clipUsd + more) * 100) / 100;
// What is still missing at one spot costs: the steps already made are free.
export const spotNeedUsd = (u: { pic: number; box: number; clip: number; cut: number }, have: { pic?: boolean; box?: boolean; clip?: boolean; cut?: boolean }) =>
  Math.round(((have.pic ? 0 : u.pic) + (have.box ? 0 : u.box) + (have.clip ? 0 : u.clip) + (have.cut ? 0 : u.cut)) * 1000) / 1000;
