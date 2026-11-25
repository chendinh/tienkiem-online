// The cultivators drawn on the stages (Phó Bản, Triển lãm, the result cards): pictures drawn by AI once (scripts/gen-tusi.ts), one kind per môn of weapon, a woman and a man
// each, in a few outfits. Nothing per player but the weapon: a player is drawn with the kind of their weapon's môn (lib/content.ts WEAPON_CLASS), empty-handed with none.
// Until a kind has pictures (lib/tusi-art.ts, written by the script) the figure drawn in code (components/Cultivator.tsx) stands in for it.
import { TUSI_ART, TUSI_REV } from './tusi-art';

export interface TusiKind { id: string; name: string; weapon: string /* what the character holds, and how (for the prompt) */ }
export const TUSI_KINDS: TusiKind[] = [
  { id: 'kiem', name: 'Kiếm', weapon: 'a slender straight double-edged jian sword with a silk tassel on the hilt, held in the right hand with the blade angled forward and down, the left hand raised in a two-finger sword seal' },
  { id: 'thuong', name: 'Thương', weapon: 'a long spear with a gleaming leaf-shaped spearhead and a red horsehair tassel under it, gripped in both hands, angled forward and slightly up, ready to thrust' },
  { id: 'cung', name: 'Cung', weapon: 'a tall elegant recurve longbow held up in the left hand, the right hand drawing the string back with an arrow of light nocked on it, a quiver of arrows on the back' },
  { id: 'dao', name: 'Đao', weapon: 'a broad curved single-edged dao saber with a ring pommel and a long red cloth tied to it, held in the right hand and swept back, ready to slash' },
  { id: 'quyen', name: 'Quyền', weapon: 'no blade: armoured martial-arts gauntlets with steel tiger-claw knuckles on both hands, fists raised in a fighting stance, the forearms wrapped in cloth' },
  { id: 'cam', name: 'Cầm', weapon: 'a guqin (a long seven-string Chinese zither of dark wood) cradled across the left forearm, the right hand plucking the strings, a few glowing musical notes floating from it' },
  { id: 'tieu', name: 'Tiêu', weapon: 'a slender pale jade xiao flute held to the lips with both hands, playing it' },
  { id: 'phat', name: 'Phất', weapon: 'a Taoist fly-whisk with a long white horsetail and a jade handle, held in the right hand with the horsetail draped over the left arm, a few yellow paper talismans floating beside the hand' },
  { id: 'tay', name: 'Tay không', weapon: 'empty hands: the right hand raised before the chest in a glowing qi hand seal, the left hand held behind the back' },
];
export const TUSI_KIND_IDS = TUSI_KINDS.map((k) => k.id);

// The outfits, one per picture of a kind (the first N are drawn: scripts/gen-tusi.ts --variants N). Hair styles go with them, one for a woman, one for a man.
export const TUSI_LOOKS: { robe: string; f: string; m: string }[] = [
  { robe: 'flowing layered robes of white and pale azure silk with fine silver embroidery and a pale blue sash', f: 'long black hair in a high bun with a silver hairpin, the rest flowing down her back', m: 'long black hair tied in a topknot under a small silver crown, two locks framing the face' },
  { robe: 'flowing layered robes of deep crimson and black silk with gold embroidery and a gold sash', f: 'long black hair half tied up with red silk ribbons, the rest loose and streaming', m: 'long black hair in a high ponytail tied with a red cord' },
  { robe: 'flowing layered robes of jade green and cream silk with bronze trim and a dark green sash', f: 'long dark brown hair in two loops with jade pins and long strands hanging', m: 'long dark brown hair half tied up with a jade hairpin, the rest loose' },
  { robe: 'flowing layered robes of violet and moon white silk with pale gold trim and a lilac sash', f: 'very long silver white hair loose and streaming, a small crescent hair ornament', m: 'long silver white hair loose with a thin dark headband' },
  { robe: 'flowing layered robes of midnight black silk with dark red lining and silver trim', f: 'long black hair in a low braid with a black veil-like ribbon', m: 'long black hair loose and wild, a dark jade crown' },
];

const ARCH_KINDS: Record<string, string[]> = {
  'Kiếm Tu': ['kiem'], 'Thể Tu': ['quyen', 'dao'], 'Phù Sư': ['phat'], 'Đan Sư': ['cam', 'tieu'], 'Ma Tu': ['dao', 'kiem', 'thuong'], 'Tán Tu': ['thuong', 'cung', 'tay'],
};
/** The kind a cultivator is drawn as: from the môn of its weapon when it is known ('' = no weapon), else from the kind of cultivator it is (a visitor of Triển lãm). */
export function tusiKind(cls: string | undefined, arch: string, h: number): string {
  if (cls !== undefined) return TUSI_KIND_IDS.includes(cls) ? cls : 'tay';
  const l = ARCH_KINDS[arch] || ARCH_KINDS['Tán Tu'];
  return l[(h >>> 5) % l.length];
}
/** Its picture, if that kind has been drawn (h picks one of the outfits), else null. */
export function tusiArt(kind: string, g: 'f' | 'm', h: number): string | null {
  const n = TUSI_ART[`${kind}_${g}`] || 0;
  return n ? `/art/tusi/${kind}_${g}_${(h >>> 0) % n}.webp?v=${TUSI_REV}` : null;
}
