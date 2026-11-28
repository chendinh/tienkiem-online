import * as C from './content';
import { buildOf, faceOf, poseOf } from './look';
import * as A from './arts';
import * as PB from './pets';

// One art direction for every picture. Specs are small and validated, so clients cannot inject prompts.
// Consistency rules: (1) same style block everywhere, (2) fixed seeds, (3) anything that must show the SAME subject
// (an outfit change, a mutated monster) is an edit of a reference image, not a fresh drawing.
// (4) The character wears what its item ICONS show: the editing model receives the character's base picture AND the icon of
// every worn item as pictures, so the avatar is copied from the icons instead of being re-imagined from words.
export const STYLE_VERSION = 1;
// Art direction: "Fantasy Realistic" 3D (NOT semi-realistic anime), the same for women, men, creatures and equipment, so a beautiful
// character never carries a weapon that looks like a real-life product photo. One shared core + one label per kind of picture:
//   character: Fantasy Realistic | costume: Ornate Chinese Fantasy | weapon: Realistic 3D Magical Artifact
//   creature: Fantasy Realistic Creature | item: Premium 3D RPG Item Render | setting: Cinematic Xianxia Environment
const CORE = 'High-end Chinese Xianxia Fantasy RPG art, fantasy realistic 3D rendering, magical glowing particles, luminous cinematic lighting, volumetric light rays, rich fantasy color palette, premium AAA fantasy game quality, ultra detailed 3D render';
const PERSON = 'High-end Chinese Xianxia Fantasy RPG art, fantasy realistic 3D character rendering, breathtaking ethereal beauty, idealized realistic human anatomy, exceptionally beautiful facial features, flawless yet natural skin, delicate detailed eyes, flowing silky hair, luxurious ancient Chinese fantasy costumes, intricate gold embroidery and ornaments, magical glowing particles, ethereal celestial aura, luminous cinematic lighting, dreamy atmospheric environment, volumetric light rays, rich fantasy color palette, premium AAA fantasy game quality, ultra detailed 3D render';
const BEAST = `${CORE}, fantasy realistic creature, hyper-realistic animal anatomy and musculature, ultra detailed realistic fur with individual strands, scales and feathers, natural proportions and textures, majestic AAA game creature design, ethereal aura, not a cartoon, not a plush toy, not cute chibi`;
const ENV = 'a cinematic xianxia environment';
// Linh Sủng (lib/pets.ts): the same realistic rendering as the beasts, but small, gentle and lovable. Still not a cartoon or a plush toy.
const PET = `${CORE}, fantasy realistic creature, small and adorable spirit pet with big gentle expressive eyes, realistic soft fur, scales or fins with fine natural detail, natural proportions, not a cartoon, not a plush toy, not chibi, not a sticker`;
const PET_STAGE = [
  'as a tiny newborn baby, round and soft, sitting',
  'grown into a young adult: larger and more graceful, longer limbs, fuller fur or fins, a faint glowing aura around it',
  'in its majestic spirit form: noble and elegant, a little larger, a radiant aura, softly glowing patterns along its body and drifting motes of light around it',
];
// For characters and items only: the costume, accessories and weapon read as ONE designed set.
const SET = 'costume, accessories and weapon designed as one matching set';
const NEG = 'No text, no watermark, no logo, no border.';
// Item icons only. Icon models turn "Chinese", talismans, seals and engraved bands into fake characters, so the item prompt leaves those
// words out and asks for abstract ornament instead (the picture of an item is what the avatar copies, so a stray glyph would spread).
const ITEM_CORE = CORE.replace('Chinese Xianxia', 'Eastern');
const NOWRITE = 'Ornament is only abstract (clouds, lotus petals, knots, gems, smooth filigree) and the surface has no writing of any kind: no characters, letters, runes or engraved marks.';
const TIER_ADJ = ['plain', 'neat jade-green trimmed', 'refined silver-trimmed', 'ornate gold-engraved', 'legendary radiant', 'divine immortal'];

export const HQ_TIER = 4;   // from Thiên up an item icon is drawn by the finer model
export interface Plan {
  kind: 'avatar' | 'outfit' | 'pose' | 'monster' | 'pet' | 'item' | 'place' | 'label' | 'portrait';
  prompt: string;       // full text-to-image description (no reference, or a provider that cannot edit)
  editPrompt?: string;  // instruction for the editing model when references exist
  refs?: any[];         // pictures the editing model must see, in order; the first one is the picture being edited
  editor?: 'single' | 'multi'; // single: edit one picture (monster variant). multi: edit one picture using other pictures as references (outfit)
  refLabels?: string[]; // what refs[1..] show, in English, for the reviewer
  width: number; height: number; seed: number; pri: number;
  hq?: boolean;         // a Thiên or Tiên item icon: drawn larger by a finer model (falModels().itemHq), because there are few of them and they are the ones players look at
}

const bad = (): never => { throw new Error('bad spec'); };
const oneOf = (v: any, arr: string[], allowEmpty = false): string => (typeof v === 'string' && ((allowEmpty && v === '') || arr.includes(v)) ? v : bad());
const intIn = (v: any, a: number, b: number): number => (Number.isInteger(v) && v >= a && v <= b ? v : bad());
// `v` asks for ANOTHER version of the same pose or outfit (0 = the first draw): it only changes the seed, so a picture the player does not like can be drawn again.
const variant = (spec: any) => (spec.v === undefined ? 0 : intIn(spec.v, 0, 999999));
const seedV = (seed: number, v: number) => (v ? ((seed + 104729 * v) % 2147483647) || 1 : seed);
// A species whose first picture had a flaw (for example a stray glyph) gets a new seed here, so the shipped set stays reproducible.
const REROLL: Record<string, number> = { quy: 1 };
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1073741823) + 1; }
const monsterSeed = (sp: string) => hash(REROLL[sp] ? `${sp}#${REROLL[sp]}` : sp);
const art = (w: string) => (/^[aeiou]/i.test(w) ? 'an' : 'a');

function readLook(L: any) {
  if (!L || typeof L !== 'object') bad();
  const g = oneOf(L.g, ['f', 'm']) as 'f' | 'm';
  const styles = g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
  return { g, hc: intIn(L.hc, 0, C.HAIR_COLORS.length - 1), hs: intIn(L.hs, 0, styles.length - 1), ey: intIn(L.ey, 0, C.EYES.length - 1), sk: intIn(L.sk, 0, C.SKINS.length - 1), mk: intIn(L.mk, 0, C.MARKS.length - 1), seed: intIn(L.seed, 1, 2 ** 30) };
}
function readEq(eq: any) {
  const out: Record<string, { b: string; t: number; e: string; v?: number } | null> = {};
  for (const s of C.VISIBLE) {
    const v = eq && eq[s];
    out[s] = v ? { b: oneOf(v.b, C.basesOf(s)), t: intIn(v.t, 0, 5), e: oneOf(v.e, C.EO, true), ...(v.v ? { v: intIn(v.v, 1, 2 ** 30) } : {}) } : null;
  }
  return out;
}
// Text-only description of a worn item (used only by providers that cannot take reference pictures).
const itemDesc = (v: { b: string; t: number; e: string }, energy = false) => `${art(TIER_ADJ[v.t])} ${TIER_ADJ[v.t]} ${C.BASE_EN[v.b]}${v.e && v.t >= 2 ? ` in ${C.EL_EN[v.e].color} colors${energy ? ` with ${C.EL_EN[v.e].energy}` : ''}` : ''}`;

// ---------- item icons: they are what the player sees AND what the editing model copies onto the avatar
function readItem(spec: any) {
  const slot = oneOf(spec.slot, C.SLOTS), tier = intIn(spec.tier, 0, 5), base = oneOf(spec.base, C.basesOf(slot), true);
  // the element tints the item from Huyền (tier 2) up; plainer items have no element colour
  const e = tier >= 2 ? oneOf(spec.e === undefined ? '' : spec.e, C.EO, true) : '';
  // v: which look of the same kind of item (0 = the common one). Địa uses a few looks, Thiên and Tiên a different one for every item.
  const v = spec.v === undefined ? 0 : intIn(spec.v, 0, 2 ** 30);
  return { slot, tier, base, e, v };
}
// Garments are drawn as a hollow "ghost mannequin" shot: no stand, no mannequin hands, so the icon is a clean reference.
const GARMENT = new Set(['Đạo Bào', 'Vũ Y', 'Hạc Sưởng', 'Pháp Bào', 'Tiên Quần', 'Thanh Sam', 'Đấu Bồng']);
export function itemObject(slot: string, base: string): string {
  const name = base ? C.BASE_EN[base] : C.SLOT_EN[slot];
  const garment = GARMENT.has(base) || (!base && (slot === 'Robe' || slot === 'Back'));
  return garment ? `empty ${name} floating upright in the air as if worn by an invisible person, seen from the front with the sleeves slightly open, nobody inside it, no mannequin, no stand, no hanger` : name;
}
const iconSpecOf = (slot: string, v: { b: string; t: number; e: string; v?: number }) => ({ kind: 'item', slot, base: v.b, tier: v.t, e: v.t >= 2 ? v.e : '', ...(v.v ? { v: v.v } : {}) });

// ---------- the character
const PLAIN_WEAR_F = 'wearing a seductive yet elegant improved-hanfu in ivory and pale blue like a glamorous heroine of a Chinese xianxia drama, tailored very tightly to the body: an off-the-shoulder crossed-collar bodice with a deep plunging V neckline that shows her collarbones and a hint of cleavage and shapes her full bust, a sheer see-through panel at the waist that shows a hint of her skin under a wide pale-blue waist seal (yaofeng) that makes her waist very slim, and a TIGHT body-hugging silk fishtail skirt that fits like a second skin over her hips and thighs so that the full rounded curve of her hips and the shape of her thighs are clearly visible, flaring out only below the knees, with a very high side slit up to the thigh that shows her bare leg; sheer see-through fabric only on the sleeves and as a short train behind her, no loose flowing skirt layers in front; sensual, glamorous and tasteful, never vulgar, never nude, fully an adult, and soft cloth shoes, arms relaxed at the sides with empty open hands';
const PLAIN_WEAR_M = [
  'wearing a neat elegant ivory scholar robe with a slim pale-blue sash and soft cloth shoes, arms relaxed at the sides with empty open hands',
  'wearing a fitted ivory martial robe with short sleeves, leather bracers on his forearms and a wide belt, cut close to the body so that his very broad shoulders, deep strong chest and thick muscular arms are clearly visible, and soft cloth boots, arms relaxed at the sides with empty open hands',
];
// Pretty, cute and a little alluring (always a fully dressed ADULT), with natural balanced proportions.
const WHO = {
  f: 'an adult young woman in her early twenties, a classical Chinese beauty of breathtaking ethereal grace with a subtle alluring elegance',
  m: [
    'an adult young man in his mid twenties, a handsome and refined Chinese scholar-cultivator of breathtaking elegance',
    'an adult young man in his mid twenties, a strikingly handsome, noble-looking Chinese warrior-cultivator of heroic bearing',
  ],
};
type LookR = ReturnType<typeof readLook>;
const who = (L: LookR) => (L.g === 'f' ? WHO.f : WHO.m[buildOf(L)]);
const figure = (L: LookR) => (L.g === 'f' ? C.FIGURE_F : C.FIGURE_M[buildOf(L)]);
const faceOfL = (L: LookR) => (L.g === 'f' ? C.FACE_F : C.FACE_M)[faceOf(L)];
const plainWear = (L: LookR) => (L.g === 'f' ? PLAIN_WEAR_F : PLAIN_WEAR_M[buildOf(L)]);
const poseFor = (L: LookR) => { if (L.g === 'f') return C.POSE_F[poseOf(L) % C.POSE_F.length]; const l = C.POSE_M[buildOf(L)]; return l[poseOf(L) % l.length]; };
const BEARING = 'with the aura and bearing of an immortal: calm, graceful and transcendent, the head held high and the chin slightly raised';
const CHINESE = 'East Asian Han Chinese features like a lead of a Chinese xianxia drama';
const BRIGHT = 'bright, clear, soft daylight that lights the face and the whole figure evenly with a luminous clean complexion, not dark and not moody';
// Edits that keep a pose and add a held weapon drew a third arm (the hand lifted in the pose AND a new hand with the weapon), so edit prompts count the limbs.
const ANATOMY = 'Anatomy: exactly two arms with exactly two hands (five fingers each) and exactly two legs, no third arm, no extra or duplicated hand, no extra leg.';
// Women: the hips must stay visible whatever is worn. The robe icons are loose gowns on an invisible body, so without this rule the editor copied
// the loose shape and hid the figure. The owner asked for clearly visible hips and accepts body-revealing (adult, tasteful) cuts.
const FIT_F = 'FIT RULE (very important, whatever the garment is): the garment from the robe picture keeps its colors, patterns and ornaments, but it is TAILORED CLOSE TO HER BODY like the costume of a glamorous, seductive heroine in a Chinese costume drama. It is cinched tightly at the waist and clings to her hips and thighs like thin silk, so the full rounded shape of her hips and the line of her legs stay clearly visible through it. It has a deep plunging V neckline that shows her collarbones and a hint of cleavage, bare or sheer shoulders, and a very high side slit up to the thigh that shows her bare leg. Only the outer sleeves, cape and outer layers stay wide and flowing. The lower part of the garment is NOT a loose, straight, shapeless gown. Sensual and glamorous but tasteful, never vulgar, never nude, and she is an adult.';
// The master prompt says "3D rendering"; on its own that gives a doll-like CGI face (huge glossy eyes, airbrushed plastic skin). This keeps the
// owner's wording and adds what "fantasy realistic" has to mean for a face.
const REAL = 'Realistic live-action look: a real human face and body with natural skin texture (fine pores, subtle imperfections, soft subsurface scattering), natural eye proportions with realistic iris detail (not oversized anime eyes), individual hair strands, realistic fabric weave and metal reflections, like a still from a high-budget cinematic fantasy movie shot on a cinema camera with an 85mm lens. Not a cartoon, not a doll, not a plastic CGI toy figure.';
const PROPORTION = 'natural balanced adult proportions, a tall figure about 8 heads tall with long legs, the head neither tiny nor oversized';
function avatarText(L: LookR, el: string, pers: number, wear: string, scene: string) {
  const styles = L.g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
  return `${PERSON}. ${REAL} Front view, full-length portrait of ${who(L)}, a xianxia cultivator ${BEARING}, standing tall and relaxed and looking directly at the viewer, ${PROPORTION}, ${figure(L)}, ${faceOfL(L)}, a distinctive memorable face with its own strong personality, ${CHINESE}, ${C.SKINS[L.sk]} skin, ${C.HAIR_COLORS[L.hc]} ${styles[L.hs]}, ${C.EYES[L.ey]} eyes${C.MARKS[L.mk] ? ', ' + C.MARKS[L.mk] : ''}, ${C.PERS_EXPR[pers]}, ${wear}, faint glowing wisps of ${C.EL_EN[el].energy} floating around the body, standing on a rocky ledge in ${ENV}, ${scene}, ${BRIGHT}. The entire body from the top of the head down to the shoes is visible, the figure fills about 80% of the image height with empty space above the head and below the feet. No signature, no calligraphy. ${NEG}`;
}

// Order in which the worn items are shown to the editing model (and numbered as images 2, 3, ...).
const ORDER = ['Robe', 'Headwear', 'Footwear', 'Back', 'Accessory', 'Weapon'];
const WORN_LABEL: Record<string, string> = { Robe: 'robe', Headwear: 'headwear', Footwear: 'footwear', Back: 'back item', Accessory: 'waist ornament', Weapon: 'weapon or instrument' };
type Pron = { s: string; S: string; p: string };
// Soft, natural poses for the outfit picture: the base picture is only a plain, stiff reference stance and must not be copied.
// One pose per character, picked from its seed, so a character keeps the same pose every time it is redrawn while different characters differ.
const POSES: ((p: Pron) => string)[] = [
  (p) => `a ${p.s === 'she' ? 'soft, graceful' : 'relaxed, elegant'} stance: ${p.p} weight rests on one leg with the other knee slightly bent, ${p.p} hips and shoulders tilt gently in a soft S-curve, ${p.p} head tilts a little toward the viewer and the free hand rests lightly and naturally`,
  (p) => `a graceful three-quarter turn: ${p.p} body angles slightly to one side while ${p.p} face turns back toward the viewer, one foot a little in front of the other, shoulders relaxed, sleeves and ribbons swaying softly in a light breeze`,
  (p) => `a gentle slow step: one foot slightly forward as if ${p.s} is walking calmly toward the viewer, ${p.p} robe and ribbons trailing softly and ${p.p} arms moving loosely and naturally`,
  (p) => `a relaxed elegant lean: ${p.p} weight on one side with a slight natural lean, one hand lightly lifting a sleeve or resting near the waist, ${p.p} head tilted a little, a soft calm smile`,
];
const poseText = (p: Pron, seed: number) => `POSE: ${POSES[seed % POSES.length](p)}. The pose is ${p.s === 'she' ? 'soft' : 'relaxed'}, natural and fluid: never stiff, never rigid, not a symmetrical straight-on stance with the arms hanging at the sides (image 1 is only a plain reference stance, do NOT copy its pose). ${p.S} still faces the viewer with the face clearly visible, both feet and shoes stay fully visible, and the camera distance and painting style stay the same as image 1.`;
function slotLine(pr: Pron, slot: string, n: number, b: string): string {
  const nm = C.BASE_EN[b];
  switch (slot) {
    case 'Robe': return `Image ${n} is ${pr.p} robe (${nm}). ${pr.S} wears exactly this garment on ${pr.p} body and it replaces the old clothes completely.`;
    case 'Headwear': return `Image ${n} is ${pr.p} headwear (${nm}). ${pr.S} wears exactly this on ${pr.p} head and ${pr.p} face stays fully visible.`;
    case 'Footwear': return `Image ${n} is ${pr.p} footwear (${nm}). ${pr.S} wears exactly these on ${pr.p} feet, clearly visible.`;
    case 'Back': return `Image ${n} is ${pr.p} back item (${nm}). ${C.PLACE_BACK[b] || 'It is worn on the back.'}`;
    case 'Accessory': return `Image ${n} is ${pr.p} waist ornament (${nm}). It hangs clearly visible from ${pr.p} belt at the waist.`;
    default: return `Image ${n} is ${pr.p} ${nm}. ${C.PLACE_WEAPON[b] || 'It is held in the right hand.'}`;
  }
}

export function buildPlan(spec: any): Plan {
  if (!spec || typeof spec !== 'object') bad();
  const pri = Number.isInteger(spec.pri) ? Math.min(3, Math.max(0, spec.pri)) : 2;

  if (spec.kind === 'avatar' || spec.kind === 'outfit') {
    const L = readLook(spec.look), el = oneOf(spec.el, C.EO), pers = intIn(spec.pers, 0, C.PERS_EXPR.length - 1);
    const base = { kind: 'avatar', look: spec.look, el, pers };
    if (spec.kind === 'avatar') return { kind: 'avatar', prompt: avatarText(L, el, pers, plainWear(L), C.SCENE_T[0]), width: 768, height: 1152, seed: seedV(L.seed, variant(spec)), pri: 0 };
    const eq = readEq(spec.eq);
    // nothing visible is worn: that is exactly the base picture (no paid edit)
    if (C.VISIBLE.every((s) => !eq[s])) return buildPlan({ ...base, pri: spec.pri });
    const scene = C.SCENE_T[eq.Robe ? eq.Robe.t : 0];
    const worn = ORDER.filter((s) => eq[s]);

    // The character's own base picture is the picture to edit. The client names it (`base`, the id of its file) because the
    // prompt that drew it may be worded differently today; without a name it is looked up from the look.
    const baseRef: any = spec.base === undefined ? base : (typeof spec.base === 'string' && /^[a-f0-9]{20}$/.test(spec.base) ? { kind: 'file', id: spec.base, fallback: base } : bad());
    const refs: any[] = [baseRef, ...worn.map((s) => iconSpecOf(s, eq[s]!))];

    // ---- instruction for the editing model: which picture is which, then what must not change
    const pr: Pron = L.g === 'f' ? { s: 'she', S: 'She', p: 'her' } : { s: 'he', S: 'He', p: 'his' };
    const styles = L.g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
    const person = L.g === 'f' ? 'woman' : 'man';
    const posed = spec.posed === true, v = variant(spec);
    // A held weapon and a pose with a busy hand (a sleeve lifted to the chest) made the editor keep that hand AND draw a new one with the weapon: three arms.
    const hands = posed && eq.Weapon ? ` HANDS: ${pr.S} has exactly two arms. The weapon is held in ${pr.p} right hand: that arm moves to hold it and REPLACES whatever that hand was doing in image 1 (for example lifting a sleeve or touching the chest), while the other arm stays as in image 1. Never keep a hand at the chest AND draw another hand with the weapon, that would make a third arm.` : '';
    const lines = [posed ? 'Image 1 is the character (use it for the face, hair, skin tone, body and pose).' : 'Image 1 is the character (use it only for the face, hair, skin tone and body).', ...worn.map((s, k) => slotLine(pr, s, k + 2, eq[s]!.b))];
    // The worn items are the point of the picture: they REPLACE what image 1 wears, and each one is listed again as a checklist
    // (a priority rule alone was not enough: with a realistic base picture the editor kept the plain clothes and dropped items).
    const rule = `PRIORITY RULE: the worn items in images 2 to ${worn.length + 1} are the most important part of this picture. They REPLACE everything that image 1 wears (its robe, hair ornaments, shoes and anything held). Use image 1 ONLY for the face, hair, skin tone and body of the person; do not keep any of its clothing or its simple hairpins.`;
    const checklist = `CHECKLIST, every one of these must be clearly visible and recognisable in the final picture: ${worn.map((s, k) => `(${k + 1}) the ${WORN_LABEL[s]}${s === 'Back' ? ` (${C.BASE_EN[eq[s]!.b]})` : ''} from image ${k + 2}`).join('; ')}. If one of them is missing or replaced by something plain, the picture is wrong.`;
    const editPrompt = [
      rule,
      ...lines,
      `Redraw image 1 so that ${pr.s} wears and holds EXACTLY the items shown in images 2 to ${worn.length + 1}.`,
      `IDENTITY (must not change): the same adult ${person} as in image 1 with ${C.HAIR_COLORS[L.hc]} ${styles[L.hs]}, ${C.EYES[L.ey]} eyes and ${C.SKINS[L.sk]} skin${C.MARKS[L.mk] ? ', ' + C.MARKS[L.mk] : ''}, and the same face shape, nose, lips and eyebrows. Do not change the hair color, eye color or skin tone.`,
      `BODY: ${PROPORTION}, ${figure(L)}. ${ANATOMY} ${posed ? `POSE: keep the same pose, body shape, figure, camera framing and perspective as image 1${eq.Weapon ? ' (only the arm that holds the weapon may change, see HANDS)' : ''} (it is already a graceful, characterful standing pose: do not straighten it). The skirt and sleeves follow the pose.${hands}` : poseText(pr, L.seed)}`,
      ...(L.g === 'f' ? [FIT_F] : []),
      `ITEMS: every item must look identical to its own picture: same shape, colors, materials, patterns and ornaments. Ignore the backgrounds, stands, mannequins and hands in the item pictures and draw only the items themselves. ${L.g === 'f' ? '' : "The worn garment is belted or tied at the waist so that his figure stays visible under it, without changing the garment's design. "}If the garment is an open coat, ${pr.s} wears a neat ivory inner ${L.g === 'f' ? 'hanfu dress' : 'robe'} down to the knees under it. Together the items form one matching ${SET}. Render the whole picture as a high-end fantasy realistic 3D character render (premium AAA fantasy game quality) with idealized realistic human anatomy, luxurious ornate Chinese fantasy costume materials and luminous cinematic lighting with volumetric light rays, while ${pr.s} keeps the face, hair and skin of image 1. ${pr.S} stays a real-looking human being with natural skin texture and natural eye proportions, not a doll and not a plastic CGI toy figure. Do not add any other item.`,
      `${pr.S} looks ${L.g === 'f' ? 'pretty, sweet and charming, with a graceful, slightly alluring elegance' : 'handsome and charming, with a gentle, elegant air'}. Full body visible from head to feet, background: ${ENV}, ${scene}. ${NEG}`,
      checklist,
    ].join(' ');

    // ---- full description for a provider that cannot edit (it redraws the whole picture from text)
    const parts: string[] = [];
    parts.push(eq.Robe ? `wearing ${itemDesc(eq.Robe)}` : 'wearing a simple plain cream linen robe');
    if (eq.Headwear) parts.push(`wearing ${itemDesc(eq.Headwear)} on the head`);
    if (eq.Footwear) parts.push(`wearing ${itemDesc(eq.Footwear)} on the feet, visible below the robe hem`);
    if (eq.Back) parts.push(`with ${itemDesc(eq.Back)} flowing behind the back`);
    if (eq.Accessory) parts.push(`with ${itemDesc(eq.Accessory)} hanging at the waist`);
    parts.push(eq.Weapon ? `holding ${itemDesc(eq.Weapon)}` : 'with empty hands');
    const prompt = avatarText(L, el, pers, parts.join(', '), scene);
    return { kind: 'outfit', prompt, editPrompt, refs, editor: 'multi', refLabels: worn.map((s) => WORN_LABEL[s]), width: 768, height: 1152, seed: seedV(L.seed, v), pri: 0 };
  }

  // ---- standing pose: the same character in a graceful pose full of presence, edited from its base picture (after the base is drawn)
  if (spec.kind === 'pose') {
    const L = readLook(spec.look), el = oneOf(spec.el, C.EO), pers = intIn(spec.pers, 0, C.PERS_EXPR.length - 1);
    const base = { kind: 'avatar', look: spec.look, el, pers };
    const baseRef: any = spec.base === undefined ? base : (typeof spec.base === 'string' && /^[a-f0-9]{20}$/.test(spec.base) ? { kind: 'file', id: spec.base, fallback: base } : bad());
    const pr: Pron = L.g === 'f' ? { s: 'she', S: 'She', p: 'her' } : { s: 'he', S: 'He', p: 'his' };
    const styles = L.g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
    const pose = poseFor(L), v = variant(spec);
    const editPrompt = [
      'Image 1 is the character.',
      `Redraw image 1 with the SAME ${L.g === 'f' ? 'woman' : 'man'}: the same face and face shape, the same ${C.HAIR_COLORS[L.hc]} ${styles[L.hs]} and hair ornaments, ${C.EYES[L.ey]} eyes, ${C.SKINS[L.sk]} skin, the same body and figure (${figure(L)}), the SAME clothes, the same background and the same camera distance and framing. Change ONLY the pose and the wind.${L.g === 'f' ? ' Her hips and thighs stay clearly visible in the new pose, and her skirt keeps clinging to their rounded curve.' : ''}`,
      `NEW POSE: ${pose}.`,
      `The new pose must be CLEARLY different from image 1: the torso is turned or leaning and the arms and legs are in clearly different positions, with hair and robes moving in the wind. The pose is graceful, natural and full of presence and spirit, with the bearing of an immortal cultivator: never a stiff straight-on stance with the arms hanging at the sides (image 1 is only a plain reference stance, do NOT copy its pose). ${pr.S} keeps the face clearly visible and turned toward the viewer (front or three-quarter view), the whole body from head to shoes stays visible, and both feet stay on the ground. Keep the bright, clear lighting and the high-end fantasy realistic 3D look of image 1: a real-looking human being, not a doll. ${ANATOMY} ${NEG}`,
    ].join(' ');
    const prompt = `${avatarText(L, el, pers, plainWear(L), C.SCENE_T[0])} Pose: ${pose}.`;
    return { kind: 'pose', prompt, editPrompt, refs: [baseRef], editor: 'multi', width: 768, height: 1152, seed: seedV(L.seed, v), pri: 0 };
  }

  if (spec.kind === 'monster') {
    const sp = oneOf(spec.sp, Object.keys(C.SPECIES_EN)), mut = spec.mut === true;
    const master = `${BEAST}. ${C.SPECIES_EN[sp]}, chinese mythology creature, full body, side view, centered, against ${ENV}, a soft misty mountain landscape at dusk. No people. ${NEG}`;
    if (!mut) return { kind: 'monster', prompt: master, width: 960, height: 960, seed: monsterSeed(sp), pri: 2 };
    const mutTxt = 'a rare mutated variant with iridescent rainbow-colored fur or scales, a glowing prismatic aura and shimmering particles';
    return { kind: 'monster', prompt: master.replace('chinese mythology creature', `${mutTxt}, chinese mythology creature`), editPrompt: `Edit this image. Transform the creature into ${mutTxt}. Keep exactly the same creature design, body shape, pose, camera framing, background and painting style. ${NEG}`, refs: [{ kind: 'monster', sp, mut: false }], editor: 'single', width: 960, height: 960, seed: monsterSeed(sp), pri: 1 };
  }

  // Linh Sủng: the egg is an object (an icon like an item); the baby form is drawn from words; the two grown forms are EDITS of the baby, so they stay the same creature
  if (spec.kind === 'pet') {
    const sp = oneOf(spec.sp, ['egg', ...PB.PET_SPECIES.map((s) => s.id)]);
    if (sp === 'egg') return { kind: 'item', prompt: `${ITEM_CORE}. Premium 3D RPG item render with magical glowing details, an inventory icon of a single luminous spirit beast egg, a smooth pearly cream shell with soft swirling gold and jade patterns and a faint warm glow from inside, resting on a small tuft of white cloud, isolated and centered, three-quarter front view, soft rim light, on a plain dark slate gradient background, rendered as AAA game art and not a real-life product photo. ${NOWRITE} No person, no hands. ${NEG}`, width: 512, height: 512, seed: hash('pet|egg'), pri: 2 };
    const st = intIn(spec.st, 0, 2), en = PB.PSP(sp).en;
    const base = `${PET}. ${en}, ${PET_STAGE[0]}, full body, three-quarter front view, centered, looking at the viewer, on a plain dark slate gradient background with a soft magical glow behind it. No people. ${NEG}`;
    if (st === 0) return { kind: 'pet', prompt: base, width: 768, height: 768, seed: hash(`pet|${sp}`), pri: 2 };
    return { kind: 'pet', prompt: base.replace(PET_STAGE[0], PET_STAGE[st]), editPrompt: `Edit this image. Show the same creature ${PET_STAGE[st]}. Keep exactly the same species, colors, markings and eye color, the same realistic painting style, the same camera framing and the same plain dark background. ${NEG}`, refs: [{ kind: 'pet', sp, st: 0 }], editor: 'single', width: 768, height: 768, seed: hash(`pet|${sp}`), pri: 2 };
  }

  if (spec.kind === 'item') {
    const it = readItem(spec);
    const accent = (it.e ? `, with ${C.EL_ACCENT[it.e]} accents in the trim, gems and tassels` : '') + (it.v ? `, ${C.ITEM_DESIGNS[it.v % C.ITEM_DESIGNS.length]}, a one-of-a-kind design` : '');
    const label = it.slot === 'Weapon' ? 'realistic 3D magical artifact with a glowing ethereal aura' : 'premium 3D RPG item render with magical glowing details';
    return { kind: 'item', prompt: `${ITEM_CORE}. ${label[0].toUpperCase()}${label.slice(1)}, an inventory icon of a single ${itemObject(it.slot, it.base)}, ${C.TIER_EN[it.tier]}${accent}, isolated and centered, three-quarter front view, dramatic rim light, on a plain dark slate gradient background, rendered as AAA game art and not a real-life product photo. ${NOWRITE} No person, no hands. ${NEG}`, width: it.tier >= HQ_TIER ? 1024 : 512, height: it.tier >= HQ_TIER ? 1024 : 512, seed: (4242 + it.v * 7919) % 2147483647, pri: Number.isInteger(spec.pri) ? pri : 3, ...(it.tier >= HQ_TIER ? { hq: true } : {}) };
  }
  // Fixed pictures of goods and materials (inventory icons) and of places (wide scenes), drawn once and shipped in public/art.
  if (spec.kind === 'prop') {
    const id = oneOf(spec.id, Object.keys(C.PROP_EN));
    // interface frames (buttons, seals): flat, straight-on and symmetrical so the browser can stretch them (9-slice) and blend the dark background away
    // a button plaque that carries its own words (the text is part of the picture; PROP_EN holds the plaque and the exact wording)
    if (id.startsWith('ui_lbl_')) {
      return { kind: 'label', prompt: `${CORE}. A flat front-facing game interface asset: ${C.PROP_EN[id]}. Perfectly symmetrical straight-on view with no perspective, evenly lit, no cast shadow, centered on a plain solid pure black background with nothing else in the picture. The lettering must be sharp, clean and spelled exactly as quoted, with every Vietnamese diacritic mark in place. No other text, no watermark, no logo.`, width: 1024, height: 384, seed: 7100 + Object.keys(C.PROP_EN).indexOf(id), pri: 3 };
    }
    // the things of Triển Lãm that stand on the stage (the stone stand, the chest): a solid object seen three-quarter from a little above, cut out later by scripts/thumbs.ts
    if (id.startsWith('ui_expo_')) {
      return { kind: 'item', prompt: `${ITEM_CORE}. A game interface asset: ${C.PROP_EN[id]}. Three-quarter front view from slightly above, evenly lit with a soft light from the top, no cast shadow, no glow outside the object, centered on a plain solid pure black background. ${NOWRITE} No person, no hands. ${NEG}`, width: 512, height: 512, seed: 7000 + Object.keys(C.PROP_EN).indexOf(id), pri: 3 };
    }
    if (id.startsWith('ui_')) {
      const wide = id.startsWith('ui_btn');
      return { kind: 'item', prompt: `${ITEM_CORE}. A flat front-facing game interface asset: ${C.PROP_EN[id]}. Perfectly symmetrical, straight-on orthographic view with no perspective, evenly lit, no cast shadow, no glow outside the object, centered on a plain solid pure black background. ${NOWRITE} No person, no hands. ${NEG}`, width: wide ? 1024 : 512, height: wide ? 384 : 512, seed: 7000 + Object.keys(C.PROP_EN).indexOf(id), pri: 3 };
    }
    return { kind: 'item', prompt: `${ITEM_CORE}. Premium 3D RPG item render with magical glowing details, an inventory icon of ${C.PROP_EN[id]}, isolated and centered, three-quarter front view, dramatic rim light, on a plain dark slate gradient background, rendered as AAA game art and not a real-life product photo. ${NOWRITE} No person, no hands. ${NEG}`, width: 512, height: 512, seed: 5000 + Object.keys(C.PROP_EN).indexOf(id), pri: 3 };
  }
  // A secret manual (Bí Kíp) of one technique, or a Công Pháp scripture: its cover shows the môn and the element, its richness shows the rarity.
  if (spec.kind === 'book') {
    const names = [...Object.values(A.TECHS).filter((t) => !t.basic).map((t) => t.name), ...A.METHODS.map((m) => m.name)];
    const id = oneOf(spec.id, names), t = A.TECHS[id], mt = A.METHODS.find((m) => m.name === id);
    const tier = t ? t.tier : mt!.tier, el = t ? t.el : mt!.el;
    const cover = ['a worn bamboo-slip scroll rolled up and tied with a hemp cord, simple and humble', 'a silk-bound manual with a jade-green cloth cover, silver corner caps and a braided silk tie', 'an ornate manual with a deep purple lacquered cover, gold-engraved corner plates and a carved jade clasp', 'a legendary radiant manual with a gold and orange lacquered cover, a coiling dragon in relief, a glowing seal and floating motes of golden light'][tier];
    const emblem: Record<string, string> = { kiem: 'a sword', thuong: 'a spear', cung: 'a bow', dao: 'a broad saber', quyen: 'a clenched fist', cam: 'a guqin zither', tieu: 'a bamboo flute', phat: 'a folded paper charm' };
    const grp: Record<string, string> = { 'Phòng Thủ': 'a round shield of light', 'Hồi Phục': 'a blooming lotus', 'Cường Hóa': 'a rising flame of power', 'Suy Yếu': 'a cracked ward', 'Khống Chế': 'a binding rope of light' };
    const mark = mt ? 'an abstract lotus and swirling qi' : t!.group === 'Tấn Công' ? emblem[t!.cls] : `${grp[t!.group] || 'a swirl of qi'} beside ${emblem[t!.cls]}`;
    const accent = el ? `${C.EL_ACCENT[el]} glow and magical particles` : 'soft white-gold glow';
    return { kind: 'item', prompt: `${ITEM_CORE}. Premium 3D RPG item render with magical glowing details, an inventory icon of a single ${mt ? 'cultivation scripture' : 'martial secret manual'}: ${cover}, the cover embossed with an abstract emblem of ${mark}, ${accent}, isolated and centered, three-quarter front view, dramatic rim light, on a plain dark slate gradient background, rendered as AAA game art and not a real-life product photo. ${NOWRITE} No person, no hands. ${NEG}`, width: 512, height: 512, seed: 9000 + names.indexOf(id) * 31, pri: 3 };
  }
  // The portrait of a buyer (Khách Cầu Mua, lib/orders.ts): one adult woman or man for each kind of cultivator, a bust shot drawn once and shared by every player.
  if (spec.kind === 'buyer') {
    const arch = oneOf(spec.arch, Object.keys(C.BUYER_EN)), g = oneOf(spec.g, ['f', 'm']);
    const who = g === 'f' ? 'an adult young woman in her late twenties, a classical Chinese beauty with a poised, graceful look' : 'an adult young man in his late twenties, a handsome, refined Chinese man with a composed, noble look';
    return { kind: 'portrait', prompt: `${PERSON}. Bust portrait from the chest up, centered, of ${who}, ${C.BUYER_EN[arch]}. ${CHINESE}, natural realistic skin, looking directly at the viewer, soft warm lantern light on the face, an out-of-focus xianxia market street at dusk behind. ${NEG}`, width: 768, height: 768, seed: hash(`buyer|${arch}|${g}`), pri: 2 };
  }

  if (spec.kind === 'place') {
    const id = oneOf(spec.id, Object.keys(C.PLACE_EN));
    const tall = id.endsWith('_v');   // the phone version: a vertical picture, sky above and ground below, the interesting part in the middle third
    return { kind: 'place', prompt: tall
      ? `${CORE}. A tall vertical cinematic xianxia environment concept painting of ${C.PLACE_EN[id]}. Portrait composition (9:16) with sky and distant mountains in the upper part, the scene in the middle and open ground below, no people in the foreground, no writing. ${NEG}`
      : `${CORE}. A wide cinematic xianxia environment concept painting of ${C.PLACE_EN[id]}. Wide landscape composition with open space, no people in the foreground, no writing. ${NEG}`,
      width: tall ? 720 : 1280, height: tall ? 1280 : 720, seed: 6000 + Object.keys(C.PLACE_EN).indexOf(id), pri: 3 };
  }
  return bad();
}
