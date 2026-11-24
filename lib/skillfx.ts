// Battle effects of every technique (Thần Thông): which picture flies, how it moves and what it does on impact.
// A recipe is plain data. The stage engine (components/fx/SkillFx.ts) plays it with the textures in public/art/fx, tinted in the colour of the
// technique's element. The textures are drawn once by scripts/gen-skillfx.ts (grayscale light on black); nothing is drawn while the game runs.
// A technique without a recipe still gets one: see `fxOf` (by support kind, then by element, then a plain orb).
import * as C from './content';
import { TECHS } from './arts';

// Where the sprite appears and how it travels, caster -> recipient:
//   bolt   flies straight (n copies one after another: a volley)      arc    flies in a lob
//   sweep  a wide wave that grows while it travels                    beam   a ray stretched from caster to recipient
//   slash  appears on the recipient and cuts across it                rain   falls on the recipient from above (n copies)
//   burst  erupts on the recipient                                    aura   rises around the recipient (heals, shields, buffs, curses)
export type Motion = 'bolt' | 'arc' | 'sweep' | 'beam' | 'slash' | 'rain' | 'burst' | 'aura';
export interface SkillFx {
  m: Motion;
  tex: string;        // the main picture (a key of TEXTURES)
  hit?: string;       // picture that flashes on the recipient at impact (attacks default to burst_star)
  cast?: string;      // picture that gathers on the caster before the technique is released
  n?: number;         // copies: arrows of a volley, bolts of a storm
  size?: number;      // width of the main picture in px (default: the texture's own)
  shake?: 0 | 1 | 2;  // how hard the stage shakes on impact
  spin?: boolean;
  trail?: boolean;
}

// The textures. `ar` is width / height, `size` the default width on the stage, `what` is what the picture shows (the drawing prompt, see scripts/gen-skillfx.ts).
export interface Texture { ar: number; size: number; what: string }
export const TEXTURES: Record<string, Texture> = {
  slash_arc: { ar: 1, size: 130, what: 'one single sweeping crescent sword slash: a bright curved blade-shaped streak of light, thin at both tips and thick in the middle, tilted diagonally' },
  slash_x: { ar: 1, size: 120, what: 'two bright sword slashes crossing each other in an X shape, sharp tapered streaks of light' },
  claw: { ar: 1, size: 120, what: 'three parallel curved claw-rake slash marks made of light, tapered streaks like a beast\'s claw scratches, diagonal' },
  thrust: { ar: 16 / 9, size: 240, what: 'a long horizontal spear thrust: a sharp pointed lance tip of light on the right and a long tapering speed-line tail running to the left' },
  arrow: { ar: 16 / 9, size: 200, what: 'a glowing arrow of light flying to the right with a long fading comet tail and a few tiny sparks, horizontal' },
  orb: { ar: 1, size: 64, what: 'a glowing round sphere of energy with a swirling bright core and a soft halo, a few small wisps orbiting it' },
  beam: { ar: 16 / 9, size: 300, what: 'a horizontal beam of pure energy running across the whole width, a bright thin core with a soft glow and crackling edges, fading at both ends' },
  blade_wave: { ar: 1, size: 120, what: 'a large crescent-shaped blade wave of qi flying to the right, curved like a moon with the convex side facing right, thin streaks trailing behind it' },
  shock_ring: { ar: 1, size: 120, what: 'an expanding circular shockwave ring seen face-on: a thin bright ring, a fainter second ring inside it, and short radial dust lines' },
  burst_star: { ar: 1, size: 100, what: 'a sharp impact flash: a bright starburst with radiating spikes of light and a white-hot center' },
  palm: { ar: 1, size: 100, what: 'a glowing palm-shaped energy imprint: a flat open palm print made of light seen from the front (only the hand shape, no arm and no body) with radiating force lines' },
  flame: { ar: 1, size: 110, what: 'a roaring ball of fire exploding outward, layered flames with licking tongues and flying embers' },
  fire_swirl: { ar: 1, size: 110, what: 'a spiralling vortex of flames, ribbons of fire swirling and wrapping around a bright center' },
  phoenix: { ar: 1, size: 130, what: 'a majestic phoenix made of flame and light with wings spread wide and long flowing tail feathers, seen from the side flying to the right' },
  lightning: { ar: 1, size: 150, what: 'a branching jagged lightning bolt striking straight down from the top edge of the picture, white-hot forked lightning with side branches' },
  ice: { ar: 1, size: 110, what: 'a cluster of sharp jagged ice crystal shards bursting outward, translucent faceted spikes with frost mist' },
  water_swirl: { ar: 1, size: 120, what: 'a curling wave of water with foam and splashing droplets, spiral ribbons of flowing water' },
  dragon: { ar: 1, size: 150, what: 'a long serpentine Chinese dragon made of energy coiling through the air with scales, whiskers and a flowing mane, the head facing right, mist trailing behind' },
  vine: { ar: 1, size: 110, what: 'thorny vines and tendrils whipping and wrapping, spiralling plant stems with a few small leaves' },
  leaf: { ar: 1, size: 110, what: 'a spiral of drifting leaves and flower petals carried by the wind' },
  rock: { ar: 1, size: 110, what: 'jagged stone spikes and boulders erupting upward from the bottom edge of the picture, with flying rubble and dust' },
  shadow: { ar: 1, size: 120, what: 'wisps of ghostly smoke shaped like spectral claws and streaks, ethereal wraith-like tendrils' },
  moon: { ar: 1, size: 110, what: 'a luminous crescent moon with a soft halo and thin ripples of moonlight' },
  sun: { ar: 1, size: 120, what: 'a radiant blazing sun disc with long straight rays and a bright corona' },
  shard: { ar: 1, size: 110, what: 'a spray of sharp metallic blade shards and flying sword fragments, glinting and scattering outward' },
  sound: { ar: 1, size: 110, what: 'concentric curved sound waves rippling to the right: several nested arcs of light with tiny sparkles (no musical notes, no symbols)' },
  rune: { ar: 1, size: 110, what: 'a circular magic formation seen face-on: concentric rings and geometric star polygons with ornamental patterns made only of lines and dots, absolutely no letters, no characters and no writing' },
  shield: { ar: 1, size: 120, what: 'a translucent energy barrier: a glowing dome with hexagon and ring patterns and a bright rim, a protective ward' },
  heal: { ar: 1, size: 130, what: 'a rising swirl of soft healing light: floating glowing lotus petals and sparkling motes drifting upward, a gentle halo' },
  aura: { ar: 1, size: 150, what: 'a tall vertical column of rising spiritual energy: streams of light flowing upward with sparks, a power-up aura' },
  bind: { ar: 1, size: 110, what: 'glowing spectral chains looping and tightening around a central point, linked rings, a binding spell' },
  swirl: { ar: 1, size: 90, what: 'a dizzying spiral vortex of rotating rings and small star sparkles seen face-on, a stun daze effect (no symbols)' },
  miasma: { ar: 1, size: 110, what: 'billowing tendrils of cursed smoke spiralling downward, an eerie weakening hex fog' },
};

const R = (m: Motion, tex: string, o: Omit<SkillFx, 'm' | 'tex'> = {}): SkillFx => ({ m, tex, ...o });

// One recipe per technique. Attack techniques take the colour of their element, support techniques the colour of their effect.
const RECIPES: Record<string, SkillFx> = {
  // ---- basic attack of each môn
  'Kiếm Khí Trảm': R('slash', 'slash_arc'),
  'Xuyên Vân Thương': R('bolt', 'thrust', { trail: true }),
  'Liên Châu Tiễn': R('bolt', 'arrow', { n: 2, size: 160 }),
  'Phách Sơn Đao': R('slash', 'slash_arc', { size: 160, shake: 1 }),
  'Thiết Quyền': R('burst', 'palm', { hit: 'shock_ring' }),
  'Cầm Âm Kích': R('bolt', 'sound', { hit: 'shock_ring' }),
  'Tiêu Âm Kích': R('bolt', 'sound', { size: 90, hit: 'shock_ring' }),
  'Phất Trần Chú': R('arc', 'rune', { size: 70, spin: true }),
  [C.NEUTRAL_SKILL]: R('bolt', 'orb', { hit: 'shock_ring' }),

  // ---- Kiếm
  'Kim Quang Kiếm': R('slash', 'slash_x', { hit: 'shard' }),
  'Xích Diễm Kiếm': R('sweep', 'blade_wave', { hit: 'flame' }),
  'Cửu Thiên Lôi Kiếm': R('rain', 'lightning', { n: 2, shake: 2, cast: 'slash_arc' }),
  'Thái Dương Phá Thiên Kiếm': R('sweep', 'blade_wave', { size: 150, hit: 'sun', cast: 'sun', shake: 2 }),
  // ---- Thương
  'Phá Giáp Thương': R('bolt', 'thrust', { hit: 'shard', trail: true }),
  'Trấn Sơn Thương': R('burst', 'rock', { hit: 'shock_ring', shake: 1 }),
  'Giao Long Xuất Hải': R('bolt', 'dragon', { hit: 'water_swirl', shake: 1 }),
  'Thiên Lôi Phá Trận Thương': R('bolt', 'thrust', { hit: 'lightning', shake: 2, trail: true }),
  // ---- Cung
  'Thanh Đằng Tiễn': R('bolt', 'arrow', { n: 2, hit: 'vine' }),
  'Liệt Hỏa Tiễn': R('bolt', 'arrow', { n: 2, hit: 'flame', trail: true }),
  'U Minh Tiễn': R('bolt', 'arrow', { n: 2, hit: 'shadow' }),
  'Kim Ô Xạ Nhật': R('bolt', 'arrow', { n: 2, size: 240, hit: 'sun', cast: 'sun', shake: 1 }),
  // ---- Đao
  'Đoạn Kim Đao': R('slash', 'slash_arc', { size: 160, hit: 'shard', shake: 1 }),
  'Liệt Hỏa Đao': R('sweep', 'blade_wave', { hit: 'flame', shake: 1 }),
  'Khai Sơn Đao': R('slash', 'slash_arc', { size: 180, hit: 'rock', shake: 2 }),
  'Huyết Nguyệt Đao': R('sweep', 'moon', { hit: 'shadow', shake: 1 }),
  // ---- Quyền
  'Bàn Thạch Quyền': R('burst', 'rock', { hit: 'shock_ring', shake: 1 }),
  'Lôi Chấn Quyền': R('burst', 'palm', { hit: 'lightning', shake: 2 }),
  'Liệt Dương Quyền': R('bolt', 'fire_swirl', { hit: 'flame', shake: 1 }),
  'Phật Quang Quyền': R('burst', 'palm', { size: 140, hit: 'sun', cast: 'aura', shake: 2 }),
  // ---- Cầm
  'Xuân Phong Khúc': R('sweep', 'leaf', { hit: 'burst_star' }),
  'Lưu Thủy Khúc': R('sweep', 'water_swirl', { hit: 'shock_ring' }),
  'U Minh Dạ Khúc': R('bolt', 'sound', { hit: 'shadow' }),
  'Cửu Thiên Phượng Minh': R('bolt', 'phoenix', { hit: 'sun', cast: 'sound', shake: 1 }),
  // ---- Tiêu
  'Lạc Anh Tiêu': R('bolt', 'leaf', { hit: 'vine' }),
  'Hàn Nguyệt Tiêu Âm': R('bolt', 'sound', { hit: 'ice' }),
  'Phong Lôi Tiêu': R('bolt', 'sound', { hit: 'lightning', shake: 1 }),
  'Huyễn Ảnh Tiêu': R('bolt', 'shadow', { hit: 'moon', cast: 'moon' }),
  // ---- Phù
  'Thanh Mộc Phù': R('arc', 'rune', { spin: true, hit: 'vine' }),
  'Bích Ba Phù': R('arc', 'rune', { spin: true, hit: 'water_swirl' }),
  'Hậu Thổ Phù': R('arc', 'rune', { spin: true, hit: 'rock' }),
  'Tam Muội Chân Hỏa': R('bolt', 'fire_swirl', { hit: 'flame', cast: 'rune' }),

  // ---- skills of the eight elements (monsters, Linh Thú and Tu Sĩ)
  'Kim Quang Trảm': R('slash', 'slash_arc', { hit: 'shard' }),
  'Thái Bạch Kiếm Khí': R('sweep', 'blade_wave', { hit: 'burst_star' }),
  'Phá Giáp Chỉ': R('bolt', 'thrust', { size: 190, hit: 'shard' }),
  'Thanh Đằng Phược': R('burst', 'vine', { hit: 'leaf' }),
  'Xuân Sinh Quyết': R('bolt', 'leaf', { hit: 'burst_star' }),
  'Mộc Linh Tiễn': R('bolt', 'arrow', { hit: 'leaf' }),
  'Bích Ba Tuyệt': R('sweep', 'water_swirl', { hit: 'shock_ring' }),
  'Hàn Băng Chưởng': R('bolt', 'ice', { hit: 'ice' }),
  'Thủy Long Ngâm': R('bolt', 'dragon', { hit: 'water_swirl', shake: 1 }),
  'Xích Diễm Phần Thiên': R('rain', 'flame', { n: 3, hit: 'flame', shake: 1 }),
  'Hỏa Phượng Vũ': R('bolt', 'phoenix', { hit: 'flame', shake: 1 }),
  'Liệt Dương Chưởng': R('bolt', 'palm', { hit: 'flame' }),
  'Địa Nhai Trấn': R('burst', 'rock', { hit: 'shock_ring', shake: 1 }),
  'Sơn Hà Ấn': R('rain', 'rock', { hit: 'shock_ring', shake: 2 }),
  'Hậu Thổ Hộ Thể': R('arc', 'rock', { size: 90, hit: 'rock' }),
  'Cửu Thiên Lôi Pháp': R('rain', 'lightning', { n: 2, shake: 2 }),
  'Tử Điện Xuyên Vân': R('beam', 'beam', { hit: 'lightning', shake: 1 }),
  'Thiên Phạt Chỉ': R('rain', 'lightning', { size: 190, cast: 'rune', shake: 2 }),
  'U Minh Trảo': R('slash', 'claw', { hit: 'shadow' }),
  'Nguyệt Ảnh Ma Ảnh': R('bolt', 'moon', { hit: 'shadow' }),
  'Hàn Phách Chú': R('bolt', 'shadow', { hit: 'miasma' }),
  'Thái Dương Chân Hỏa': R('arc', 'sun', { size: 90, hit: 'flame' }),
  'Kim Ô Diệu Thế': R('bolt', 'phoenix', { hit: 'sun', shake: 1 }),
  'Hạo Nhiên Quyết': R('burst', 'sun', { hit: 'burst_star', shake: 1 }),

  // ---- support techniques (they act on the recipient: the caster for buffs, heals and guards, the foe for curses and stuns)
  'Kiếm Ý Ngưng Thần': R('aura', 'aura', { cast: 'slash_arc' }),
  'Kiếm Mạc Hộ Thân': R('aura', 'shield'),
  'Thương Trận Bất Động': R('aura', 'shield', { cast: 'rune' }),
  'Điểm Huyệt Thương': R('bolt', 'thrust', { hit: 'swirl' }),
  'Phá Phòng Tiễn': R('bolt', 'arrow', { hit: 'shard' }),
  'Ngưng Thần Nhắm Bắn': R('aura', 'aura', { cast: 'sun' }),
  'Cuồng Đao Chiến Ý': R('aura', 'aura', { size: 180, cast: 'flame' }),
  'Trảm Giáp Kình': R('slash', 'slash_x', { hit: 'shard' }),
  'Kim Chung Tráo': R('aura', 'shield', { size: 130 }),
  'Thái Cực Điều Tức': R('aura', 'heal'),
  'Thanh Tâm Chú Khúc': R('aura', 'heal', { cast: 'sound' }),
  'Mê Hồn Khúc': R('bolt', 'sound', { hit: 'swirl' }),
  'Tán Công Tiêu Âm': R('bolt', 'sound', { hit: 'miasma' }),
  'Hồi Xuân Tiêu': R('aura', 'heal', { cast: 'leaf' }),
  'Hộ Thân Phù': R('aura', 'shield', { cast: 'rune' }),
  'Cam Lộ Chú': R('aura', 'heal', { cast: 'rune' }),
  'Định Thân Phù': R('arc', 'rune', { spin: true, hit: 'bind' }),

  // ---- the later Bí Công (ten per môn, lib/arts.ts MORE and MORE_SUPPORT), in the same look as the môn's first set
  // Kiếm
  'Thúy Trúc Kiếm': R('slash', 'slash_arc', { hit: 'leaf' }),
  'Hàn Tuyền Kiếm': R('sweep', 'blade_wave', { hit: 'water_swirl' }),
  'Huyền Nham Kiếm': R('slash', 'slash_arc', { size: 150, hit: 'rock', shake: 1 }),
  'Huyết Ảnh Kiếm': R('slash', 'slash_x', { hit: 'shadow' }),
  'Vạn Kiếm Quy Tông': R('rain', 'shard', { n: 3, hit: 'shard', cast: 'slash_arc', shake: 1 }),
  'Chu Tước Phần Thiên Kiếm': R('bolt', 'phoenix', { size: 160, hit: 'flame', cast: 'fire_swirl', shake: 2 }),
  'Phá Thể Kiếm Chỉ': R('slash', 'slash_x', { hit: 'shard' }),
  'Kiếm Tâm Dưỡng Thương': R('aura', 'heal', { cast: 'slash_arc' }),
  'Kiếm Tâm Thông Minh': R('aura', 'aura', { cast: 'slash_arc' }),
  'Kiếm Vực Phong Tỏa': R('arc', 'rune', { size: 100, spin: true, hit: 'bind', cast: 'slash_arc' }),
  // Thương
  'Lục Ngọc Thương': R('bolt', 'thrust', { hit: 'vine', trail: true }),
  'Hỏa Tinh Thương': R('bolt', 'thrust', { hit: 'flame', trail: true }),
  'Dạ Hành Thương': R('bolt', 'thrust', { hit: 'shadow', trail: true }),
  'Bạch Nhật Thương': R('bolt', 'thrust', { hit: 'sun', trail: true }),
  'Phích Lịch Thương': R('bolt', 'thrust', { hit: 'lightning', shake: 1, trail: true }),
  'Lăng Tiêu Phá Quân Thương': R('bolt', 'thrust', { size: 300, hit: 'shard', cast: 'aura', shake: 2, trail: true }),
  'Chấn Nhiếp Thương Uy': R('bolt', 'thrust', { hit: 'miasma' }),
  'Thương Ý Đột Tiến': R('aura', 'aura', { cast: 'thrust' }),
  'Toái Giáp Thương Kình': R('bolt', 'thrust', { hit: 'shard', trail: true }),
  'Kim Thương Bất Đảo': R('aura', 'shield', { size: 140, cast: 'thrust' }),
  // Cung
  'Kim Phong Tiễn': R('bolt', 'arrow', { n: 2, hit: 'shard' }),
  'Băng Phách Tiễn': R('bolt', 'arrow', { n: 2, hit: 'ice' }),
  'Trọng Nham Tiễn': R('bolt', 'arrow', { n: 2, hit: 'rock', shake: 1 }),
  'Tử Lôi Tiễn': R('bolt', 'arrow', { n: 2, hit: 'lightning' }),
  'Vạn Diệp Phi Hoa Tiễn': R('bolt', 'arrow', { n: 2, hit: 'leaf', cast: 'leaf' }),
  'Cửu Tiêu Lôi Minh Tiễn': R('bolt', 'arrow', { n: 2, size: 230, hit: 'lightning', cast: 'rune', shake: 2, trail: true }),
  'Ẩn Thân Tiễn Trận': R('aura', 'shield', { cast: 'arrow' }),
  'Tiễn Ý Hồi Xuân': R('aura', 'heal', { cast: 'leaf' }),
  'Tỏa Nhuệ Tiễn': R('bolt', 'arrow', { hit: 'miasma' }),
  'Vạn Tiễn Chiến Ý': R('aura', 'aura', { size: 180, cast: 'arrow' }),
  // Đao
  'Cổ Mộc Đao': R('slash', 'slash_arc', { size: 160, hit: 'vine', shake: 1 }),
  'Hàn Giang Đao': R('sweep', 'blade_wave', { hit: 'water_swirl', shake: 1 }),
  'Lôi Đình Đao': R('slash', 'slash_arc', { size: 170, hit: 'lightning', shake: 2 }),
  'Liệt Nhật Đao': R('sweep', 'blade_wave', { hit: 'sun', shake: 1 }),
  'Trấn Nhạc Đao': R('slash', 'slash_arc', { size: 180, hit: 'rock', shake: 2 }),
  'Tu La Diệt Thế Đao': R('sweep', 'moon', { size: 150, hit: 'shadow', cast: 'shadow', shake: 2 }),
  'Đao Cương Hộ Thể': R('aura', 'shield', { size: 130, cast: 'slash_arc' }),
  'Chấn Đao Kình': R('slash', 'slash_arc', { size: 150, hit: 'swirl', shake: 1 }),
  'Thiết Huyết Hồi Xuân': R('aura', 'heal', { cast: 'flame' }),
  'Bá Đao Sát Ý': R('aura', 'aura', { size: 170, cast: 'slash_arc' }),
  // Quyền
  'Thiết Sa Chưởng': R('burst', 'palm', { hit: 'shard' }),
  'Linh Mộc Quyền': R('burst', 'palm', { hit: 'vine' }),
  'Nhu Thủy Quyền': R('burst', 'water_swirl', { hit: 'shock_ring' }),
  'Âm Phong Chưởng': R('burst', 'palm', { hit: 'shadow' }),
  'Lôi Long Quyền': R('bolt', 'dragon', { hit: 'lightning', shake: 2 }),
  'Phật Thủ Trấn Thiên Quyền': R('burst', 'palm', { size: 160, hit: 'sun', cast: 'aura', shake: 2 }),
  'Khí Huyết Bôn Dũng': R('aura', 'aura', { cast: 'palm' }),
  'Phá Thể Chấn Kình': R('burst', 'palm', { hit: 'shard' }),
  'Chấn Hồn Quyền': R('burst', 'palm', { hit: 'swirl', shake: 1 }),
  'Bất Hoại Kim Thân': R('aura', 'shield', { size: 140, cast: 'aura' }),
  // Cầm
  'Kim Qua Khúc': R('bolt', 'sound', { hit: 'shard' }),
  'Phần Tâm Khúc': R('bolt', 'sound', { hit: 'flame' }),
  'Cao Sơn Khúc': R('bolt', 'sound', { hit: 'rock', shake: 1 }),
  'Kinh Lôi Khúc': R('bolt', 'sound', { hit: 'lightning', shake: 1 }),
  'Bách Hoa Tề Phóng Khúc': R('sweep', 'leaf', { hit: 'vine', cast: 'sound' }),
  'Quảng Lăng Tuyệt Âm': R('bolt', 'sound', { size: 140, hit: 'shadow', cast: 'moon', shake: 1 }),
  'Ai Oán Khúc': R('bolt', 'sound', { hit: 'miasma' }),
  'Thiên Âm Hộ Thể': R('aura', 'shield', { cast: 'sound' }),
  'Chiến Ý Trường Ca': R('aura', 'aura', { size: 180, cast: 'sound' }),
  'Phượng Cầm Hồi Xuân': R('aura', 'heal', { size: 150, cast: 'phoenix' }),
  // Tiêu
  'Kim Thạch Tiêu': R('bolt', 'sound', { size: 90, hit: 'shard' }),
  'Xích Phụng Tiêu': R('bolt', 'phoenix', { size: 110, hit: 'flame' }),
  'Hoàng Thổ Tiêu': R('bolt', 'sound', { size: 90, hit: 'rock' }),
  'Triêu Dương Tiêu': R('bolt', 'sound', { size: 90, hit: 'sun' }),
  'Dạ Ô Đề Tiêu': R('bolt', 'shadow', { hit: 'miasma', cast: 'moon' }),
  'Hạo Nhật Lăng Thiên Tiêu': R('bolt', 'sun', { size: 110, hit: 'sun', cast: 'sound', shake: 2 }),
  'Tĩnh Tâm Tiêu Âm': R('aura', 'shield', { cast: 'sound' }),
  'Thôi Miên Tiêu': R('bolt', 'sound', { size: 90, hit: 'swirl' }),
  'Phá Cương Tiêu Âm': R('bolt', 'sound', { size: 90, hit: 'shard' }),
  'Chiến Ý Tiêu Khúc': R('aura', 'aura', { size: 180, cast: 'sound' }),
  // Phù
  'Kim Thích Phù': R('arc', 'rune', { spin: true, hit: 'shard' }),
  'Ngũ Lôi Phù': R('arc', 'rune', { spin: true, hit: 'lightning' }),
  'Câu Hồn Phù': R('arc', 'rune', { spin: true, hit: 'shadow' }),
  'Chính Dương Phù': R('arc', 'rune', { spin: true, hit: 'sun' }),
  'Huyền Băng Phù': R('arc', 'rune', { spin: true, hit: 'ice', cast: 'rune' }),
  'Thiên Hình Lôi Phù': R('rain', 'lightning', { n: 3, size: 170, cast: 'rune', shake: 2 }),
  'Khai Nhãn Phù': R('aura', 'aura', { cast: 'rune' }),
  'Suy Nhược Phù': R('arc', 'rune', { spin: true, hit: 'miasma' }),
  'Phong Ấn Phù': R('arc', 'rune', { spin: true, hit: 'bind' }),
  'Cửu Chuyển Hoàn Hồn Phù': R('aura', 'heal', { size: 150, cast: 'rune' }),
};

// Used when a technique has no recipe of its own (a new technique added to the catalog): by what it does, then by element.
const BY_KIND: Record<string, SkillFx> = {
  heal: R('aura', 'heal'), guard: R('aura', 'shield'), atkUp: R('aura', 'aura'), critUp: R('aura', 'aura'),
  atkDown: R('bolt', 'sound', { hit: 'miasma' }), defDown: R('bolt', 'arrow', { hit: 'shard' }), stun: R('bolt', 'orb', { hit: 'swirl' }),
};
const BY_EL: Record<string, SkillFx> = {
  Kim: R('slash', 'slash_arc', { hit: 'shard' }), Mộc: R('bolt', 'leaf', { hit: 'vine' }), Thủy: R('sweep', 'water_swirl', { hit: 'shock_ring' }), Hỏa: R('bolt', 'fire_swirl', { hit: 'flame' }),
  Thổ: R('burst', 'rock', { hit: 'shock_ring', shake: 1 }), Lôi: R('rain', 'lightning', { shake: 2 }), Âm: R('bolt', 'shadow', { hit: 'miasma' }), Dương: R('bolt', 'sun', { size: 90, hit: 'burst_star' }),
};
const PLAIN = R('bolt', 'orb', { hit: 'shock_ring' });

export function fxOf(name?: string, kind?: string, el?: string): SkillFx {
  if (name && RECIPES[name]) return RECIPES[name];
  if (kind && BY_KIND[kind]) return BY_KIND[kind];
  const e = el || (name ? C.skillDef(name).el : '');
  return (e && BY_EL[e]) || PLAIN;
}

// The colour (hex, the stage tints the textures with it): the element of an attack, the nature of a support effect, gold-white for a plain strike.
const KIND_COLOR: Record<string, string> = { heal: '#8ee6a8', guard: '#9ad0ff', atkUp: '#ff9a6b', critUp: '#ffd36e', atkDown: '#b78bff', defDown: '#cfd6e4', stun: '#ffe27a' };
export const fxColor = (el?: string, kind?: string): string => (kind && KIND_COLOR[kind]) || (el && C.EL[el]?.color) || '#f1e3b0';

// Every texture a technique (or a skill of the eight elements) can show; used by the generator and by `npm run check`.
export const textureIds = (r: SkillFx): string[] => [r.tex, ...(r.hit ? [r.hit] : []), ...(r.cast ? [r.cast] : [])];
export const defaultHit = (r: SkillFx): string | undefined => r.hit || (r.m === 'aura' ? undefined : 'burst_star');

// Data check: every technique and element skill has its own recipe and every recipe only names textures that exist.
export function validateSkillFx(): string[] {
  const out: string[] = [];
  const names = new Set([...Object.keys(TECHS), ...Object.keys(C.SKILL_DEFS)]);
  for (const n of names) if (!RECIPES[n]) out.push(`SkillFx: chiêu «${n}» chưa có hiệu ứng chiến đấu (lib/skillfx.ts)`);
  for (const [n, r] of Object.entries(RECIPES)) {
    if (!names.has(n)) out.push(`SkillFx: hiệu ứng của «${n}» nhưng không có chiêu nào tên này`);
    for (const t of textureIds(r)) if (!TEXTURES[t]) out.push(`SkillFx: «${n}» dùng ảnh «${t}» không có trong TEXTURES`);
  }
  for (const r of [...Object.values(BY_KIND), ...Object.values(BY_EL), PLAIN]) for (const t of textureIds(r)) if (!TEXTURES[t]) out.push(`SkillFx: hiệu ứng mặc định dùng ảnh «${t}» không có trong TEXTURES`);
  return out;
}
export const usedTextures = (): string[] => [...new Set([...Object.values(RECIPES), ...Object.values(BY_KIND), ...Object.values(BY_EL), PLAIN].flatMap(textureIds))];
