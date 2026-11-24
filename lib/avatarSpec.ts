import type { GameState, Item } from './game';
// Only the character and what it wears are needed, so both the server state and the browser view fit.
type Wearer = Pick<GameState, 'player' | 'eq'>;
import * as C from './content';

// Small, enumerable descriptions that the server turns into prompts (no free text from the client).

// Version of the art direction. Bump it when the look of the pictures changes on purpose (v2 = stylized 3D, v3 = Fantasy Realistic 3D with a doll-like CGI face, v4 = same with a real human face,
// v5 = lighter skin, taller and slimmer Chinese figures with faces of their own, and a standing-pose picture drawn after the base,
// v6 = women in form-fitting costumes that show the hips, and pictures checked for a third arm,
// v7 = women in a more revealing costume: deep V neckline, bare shoulders, sheer panels, thigh-high slit):
// a character whose base picture was drawn under an older version is offered a redraw (see Hero in components/Game.tsx).
export const ART_V = 7;

// Base portrait of a character: plain robe, empty hands. Drawn once; the standing pose and every outfit are edits of it.
// A guest's base picture is the one every character of that look shares; a character with an account gets one of its own: a new draw (`v`, a new seed) the first time it is drawn.
export const OWN_BASE_V = 1;
export const avatarBaseSpec = (st: Wearer, v = 0) => ({ kind: 'avatar', look: st.player.look, el: st.player.linh[0], pers: st.player.pers, ...(v ? { v } : {}) });

// What the portrait shows: base / tier / element of the six visible slots.
export function equipSpec(st: Wearer) {
  const eq: Record<string, { b: string; t: number; e: string; v?: number } | null> = {};
  for (const s of C.VISIBLE) { const it = st.eq[s]; eq[s] = it ? { b: it.base, t: it.tier, e: it.tier >= 2 ? it.el : '', ...(it.art ? { v: it.art } : {}) } : null; }
  return eq;
}
// Id (file name) of the character's own base picture. The pose and the outfit are drawn FROM this exact picture, so the face never changes.
const idOf = (u?: string) => (u || '').split('/').pop() || '';
const baseId = (st: Wearer) => idOf(st.player.avatar && st.player.avatar.base);
const poseId = (st: Wearer) => idOf(st.player.avatar && st.player.avatar.pose);
// Standing pose: the base picture redrawn in a graceful pose with more presence (chosen from the look, see POSE_F / POSE_M in content.ts).
// `v` (not 0) asks for another version of the same pose: it changes the seed, so the server draws a new picture instead of returning the cached one.
export const poseSpec = (st: Wearer, v = 0) => {
  const base = baseId(st);
  return { kind: 'pose', look: st.player.look, el: st.player.linh[0], pers: st.player.pers, ...(base ? { base } : {}), ...(v ? { v } : {}) };
};
// The outfit is drawn from the standing pose when the character has one (and keeps that pose), otherwise from the base picture.
// `v` (not 0) asks for another version of the same outfit (a new seed), for a picture the player does not like.
export const outfitSpec = (st: Wearer, v = 0) => {
  const pose = poseId(st), base = pose || baseId(st);
  return { kind: 'outfit', look: st.player.look, el: st.player.linh[0], pers: st.player.pers, eq: equipSpec(st), ...(base ? { base } : {}), ...(pose ? { posed: true } : {}), ...(v ? { v } : {}) };
};
// Signature of the base portrait (nothing equipped), so "plain" and "wearing nothing visible" compare equal.
export const PLAIN_SIG = JSON.stringify(Object.fromEntries(C.VISIBLE.map((s) => [s, null])));
// Signature of what the shown picture was drawn from. "v2" = drawn from the item icons; pictures drawn the old way (from words)
// carry a different signature, so they show as out of date and can be redrawn to match the icons.
export const equipSig = (st: Wearer) => { const s = equipSpec(st); return C.VISIBLE.every((k) => !s[k]) ? PLAIN_SIG : 'v2:' + JSON.stringify(s); };

// Item icons are keyed by (slot, base, tier, element), and the avatar is drawn from these same pictures.
// The element tints the item from tier 2 up, so its colour is part of the icon (and therefore of the avatar).
// `v` is the look of the picture: none for common items (they share pictures), a few looks for Địa, one of its own for Thiên and Tiên.
export const itemSpec = (it: Item) => ({ kind: 'item', slot: it.slot, base: it.base, tier: it.tier, e: it.tier >= 2 ? it.el : '', ...(it.art ? { v: it.art } : {}) });
export const propSpec = (id: string) => ({ kind: 'prop', id });
export const bookSpec = (id: string) => ({ kind: 'book', id });
export const placeSpec = (id: string) => ({ kind: 'place', id });
export const buyerSpec = (arch: string, g: 'f' | 'm') => ({ kind: 'buyer', arch, g });

// Fixed pictures drawn once by scripts/pregen.ts and shipped in public/art.
export const monsterSpec = (sp: string, mut = false) => ({ kind: 'monster', sp, mut });
export const introSpec = (g: 'f' | 'm') => ({ kind: 'avatar', look: { g, hc: 0, hs: 0, ey: 0, sk: 1, mk: 0, seed: g === 'f' ? 11 : 12 }, el: g === 'f' ? 'Thủy' : 'Kim', pers: 2 });
