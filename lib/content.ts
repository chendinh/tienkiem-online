// Content catalog (prototype subset of the spec's Content_Catalog).
export const EO = ['Kim', 'Lôi', 'Mộc', 'Âm', 'Thổ', 'Dương', 'Thủy', 'Hỏa']; // ring: Strong vs next 2, Weak vs previous 2
export const EL: Record<string, { color: string }> = {
  Kim: { color: '#e9d27a' }, Mộc: { color: '#6fd08c' }, Thủy: { color: '#5ab4ff' },
  Hỏa: { color: '#ff7a59' }, Thổ: { color: '#c9a066' }, Lôi: { color: '#b78bff' },
  Âm: { color: '#8e8cff' }, Dương: { color: '#ffd36e' },
};
export const RARITY = ['Phàm', 'Hoàng', 'Huyền', 'Địa', 'Thiên', 'Tiên'];
export const RCOLOR = ['#a7adb2', '#7bd88f', '#5ab0ff', '#c084fc', '#ffb454', '#ff6ea8'];
import { BALANCE } from './balance';
export const TIER_W = BALANCE.rarityWeights;
export const DIS = BALANCE.dissolveValueByTier;
// The full Realm_Ladder (Requirement 22). Only the first five can be played in the MVP (Playable_Level_Cap).
export const REALMS = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 'Hợp Thể', 'Đại Thừa', 'Độ Kiếp'];
export const SUBS = ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ', 'Đỉnh Phong'];
// Tribulation waves by target Realm index (0 based), from Balance_Config.
export const WAVES = [0, 0, 0, 0, 0, 0].map((_, i) => BALANCE.tribulationWaves[i + 1] || 0);
export const LINH_W = BALANCE.linhCountWeights; // 1..5 roots
export const V1 = BALANCE.baseStats; // maxHp, maxSpirit, atk, def, spd at Level 1

export interface Species { id: string; name: string; el: string[]; cm: number; f: number[]; tame: number }
export const SPECIES: Species[] = [
  { id: 'ho', name: 'Xích Viêm Hồ', el: ['Hỏa'], cm: 70, f: [0.9, 0.8, 1.15, 0.85, 1.2], tame: 1.0 },
  { id: 'giao', name: 'Bích Ba Giao', el: ['Thủy'], cm: 260, f: [1.2, 1.2, 0.95, 1.0, 0.9], tame: 0.8 },
  { id: 'loc', name: 'Thanh Mộc Lộc', el: ['Mộc'], cm: 150, f: [1.1, 1.15, 0.8, 0.95, 1.1], tame: 1.2 },
  { id: 'bang', name: 'Kim Bằng', el: ['Kim'], cm: 180, f: [0.9, 0.9, 1.2, 0.9, 1.25], tame: 0.7 },
  { id: 'quy', name: 'Huyền Quy', el: ['Thổ'], cm: 120, f: [1.4, 0.9, 0.7, 1.5, 0.5], tame: 1.1 },
  { id: 'loi', name: 'Lôi Kỳ Lân', el: ['Lôi'], cm: 190, f: [1.1, 1.0, 1.25, 1.0, 1.1], tame: 0.6 },
  { id: 'am', name: 'Nguyệt Ảnh Miêu', el: ['Âm'], cm: 55, f: [0.8, 1.1, 1.1, 0.8, 1.3], tame: 1.0 },
  { id: 'duong', name: 'Bạch Dương Hạc', el: ['Dương'], cm: 140, f: [0.95, 1.2, 1.0, 0.9, 1.15], tame: 0.9 },
  // second wave: one or two more for every element, from tiny to huge
  { id: 'tho', name: 'Thanh Linh Thố', el: ['Mộc'], cm: 40, f: [0.8, 1.2, 0.85, 0.8, 1.3], tame: 1.35 },
  { id: 'xa', name: 'Hàn Băng Xà', el: ['Thủy'], cm: 320, f: [1.0, 1.2, 1.1, 0.9, 1.0], tame: 0.8 },
  { id: 'lang', name: 'Ngân Giáp Lang', el: ['Kim'], cm: 130, f: [1.0, 0.8, 1.15, 1.15, 1.1], tame: 0.85 },
  { id: 'hung', name: 'Cổ Mộc Hùng', el: ['Mộc'], cm: 210, f: [1.35, 0.9, 1.05, 1.2, 0.6], tame: 0.9 },
  { id: 'phuong', name: 'Liệt Viêm Phượng', el: ['Hỏa'], cm: 160, f: [0.9, 1.25, 1.3, 0.8, 1.2], tame: 0.55 },
  { id: 'te', name: 'Sơn Nhạc Tê', el: ['Thổ'], cm: 240, f: [1.4, 0.8, 1.15, 1.4, 0.55], tame: 0.9 },
  { id: 'ung', name: 'Tử Điện Ưng', el: ['Lôi'], cm: 110, f: [0.85, 0.95, 1.25, 0.85, 1.35], tame: 0.7 },
  { id: 'diep', name: 'U Minh Điệp', el: ['Âm'], cm: 45, f: [0.7, 1.35, 1.0, 0.75, 1.35], tame: 1.1 },
  { id: 'su', name: 'Thần Dương Sư', el: ['Dương'], cm: 200, f: [1.2, 1.0, 1.3, 1.0, 1.0], tame: 0.6 },
  { id: 'kinh', name: 'Vân Hải Kình', el: ['Thủy'], cm: 600, f: [1.5, 1.3, 0.9, 1.2, 0.5], tame: 0.65 },
  // third wave: fifty more creatures, from a silkworm to dragons that nobody has tamed
  // Kim
  { id: 'kimtam', name: 'Kim Ti Tằm', el: ['Kim'], cm: 14, f: [0.75, 1.12, 0.82, 0.8, 1.35], tame: 1.4 },
  { id: 'kimhau', name: 'Kim Ti Hầu', el: ['Kim'], cm: 85, f: [0.85, 0.85, 1.17, 0.78, 1.35], tame: 1.0 },
  { id: 'thietbao', name: 'Thiết Cốt Báo', el: ['Kim'], cm: 150, f: [1.25, 0.85, 1.15, 1.07, 0.78], tame: 0.8 },
  { id: 'bachho', name: 'Bạch Kim Hổ', el: ['Kim'], cm: 230, f: [0.82, 0.95, 1.25, 0.75, 1.22], tame: 0.55 },
  { id: 'kimchu', name: 'Kim Cang Chu', el: ['Kim'], cm: 60, f: [1.42, 0.88, 0.8, 1.4, 0.55], tame: 1.0 },
  { id: 'kiemngu', name: 'Kiếm Ngư', el: ['Kim'], cm: 200, f: [0.8, 0.93, 1.12, 0.85, 1.3], tame: 0.8 },
  { id: 'kimlong', name: 'Kim Lân Long', el: ['Kim'], cm: 800, f: [1.3, 1.05, 1.27, 1.08, 0.95], tame: 0.32 },
  // Mộc
  { id: 'trucxa', name: 'Thanh Trúc Xà', el: ['Mộc'], cm: 90, f: [0.9, 0.9, 1.1, 0.83, 1.28], tame: 1.1 },
  { id: 'chi', name: 'Linh Chi Đồng', el: ['Mộc'], cm: 30, f: [0.88, 1.35, 1.1, 0.8, 1.02], tame: 1.3 },
  { id: 'mocnguu', name: 'Thanh Mộc Ngưu', el: ['Mộc'], cm: 220, f: [1.22, 0.82, 1.25, 1.05, 0.75], tame: 0.9 },
  { id: 'thiem', name: 'Ngọc Thiền', el: ['Mộc'], cm: 6, f: [0.75, 1.12, 0.82, 0.8, 1.35], tame: 1.4 },
  { id: 'dangmang', name: 'Thanh Đằng Mãng', el: ['Mộc'], cm: 450, f: [1.2, 0.8, 1.22, 1.03, 0.85], tame: 0.7 },
  { id: 'thiencay', name: 'Thiên Niên Mộc Tinh', el: ['Mộc'], cm: 700, f: [1.35, 1.1, 1.2, 1.12, 0.88], tame: 0.38 },
  // Thủy
  { id: 'cua', name: 'Bích Ba Giải', el: ['Thủy'], cm: 35, f: [1.38, 0.95, 0.75, 1.35, 0.62], tame: 1.2 },
  { id: 'koi', name: 'Cẩm Lý Linh', el: ['Thủy'], cm: 50, f: [0.93, 1.28, 1.15, 0.85, 0.95], tame: 1.3 },
  { id: 'haima', name: 'Hải Mã', el: ['Thủy'], cm: 20, f: [0.75, 1.12, 0.82, 0.8, 1.35], tame: 1.25 },
  { id: 'muc', name: 'Huyền Thủy Tuộc', el: ['Thủy'], cm: 180, f: [0.9, 1.25, 1.12, 0.82, 1.05], tame: 0.8 },
  { id: 'uyenuong', name: 'Ngọc Uyên Ương', el: ['Thủy'], cm: 45, f: [1.05, 1.0, 1.0, 1.02, 1.03], tame: 1.2 },
  { id: 'sa', name: 'Thương Hải Sa', el: ['Thủy'], cm: 400, f: [1.28, 1.15, 1.25, 1.05, 0.93], tame: 0.5 },
  // Hỏa
  { id: 'hoaque', name: 'Hỏa Tước', el: ['Hỏa'], cm: 18, f: [0.83, 1.08, 0.9, 0.75, 1.3], tame: 1.35 },
  { id: 'hoathu', name: 'Xích Diễm Thử', el: ['Hỏa'], cm: 22, f: [0.8, 0.93, 1.12, 0.85, 1.3], tame: 1.3 },
  { id: 'tichdich', name: 'Liệt Diễm Tích Dịch', el: ['Hỏa'], cm: 110, f: [1.0, 0.95, 1.07, 0.97, 1.1], tame: 1.0 },
  { id: 'xichma', name: 'Xích Thố Mã', el: ['Hỏa'], cm: 190, f: [0.9, 0.9, 1.1, 0.83, 1.28], tame: 0.8 },
  { id: 'khuyen', name: 'Hỏa Diễm Khuyển', el: ['Hỏa'], cm: 110, f: [1.18, 0.9, 1.2, 1.0, 0.83], tame: 0.85 },
  { id: 'chuclong', name: 'Chúc Long', el: ['Hỏa'], cm: 900, f: [1.32, 1.08, 1.3, 1.1, 0.85], tame: 0.3 },
  // Thổ
  { id: 'nhim', name: 'Sơn Nham Nhím', el: ['Thổ'], cm: 45, f: [1.35, 0.93, 0.72, 1.45, 0.6], tame: 1.2 },
  { id: 'chuidat', name: 'Địa Hành Thử', el: ['Thổ'], cm: 28, f: [0.8, 1.05, 0.88, 0.72, 1.4], tame: 1.3 },
  { id: 'tenle', name: 'Xuyên Sơn Giáp', el: ['Thổ'], cm: 80, f: [1.45, 0.9, 0.7, 1.42, 0.57], tame: 1.1 },
  { id: 'voi', name: 'Sơn Hà Tượng', el: ['Thổ'], cm: 450, f: [1.28, 1.15, 1.25, 1.05, 0.93], tame: 0.55 },
  { id: 'yet', name: 'Hoàng Sa Yết', el: ['Thổ'], cm: 70, f: [0.88, 0.88, 1.3, 0.8, 1.15], tame: 0.95 },
  { id: 'dedai', name: 'Thanh Sơn Dương', el: ['Thổ'], cm: 140, f: [0.95, 1.02, 1.03, 1.05, 1.05], tame: 0.85 },
  // Lôi
  { id: 'dienthu', name: 'Điện Quang Thử', el: ['Lôi'], cm: 25, f: [0.85, 0.85, 1.17, 0.78, 1.35], tame: 1.3 },
  { id: 'loibao', name: 'Lôi Văn Báo', el: ['Lôi'], cm: 150, f: [0.9, 0.9, 1.2, 0.83, 1.18], tame: 0.8 },
  { id: 'chuon', name: 'Tử Điện Thanh Đình', el: ['Lôi'], cm: 12, f: [0.78, 1.15, 0.85, 0.7, 1.38], tame: 1.35 },
  { id: 'loinguu', name: 'Tích Lịch Lôi Ngưu', el: ['Lôi'], cm: 260, f: [1.22, 0.82, 1.25, 1.05, 0.75], tame: 0.7 },
  { id: 'loiman', name: 'Lôi Vân Mãng', el: ['Lôi'], cm: 600, f: [0.85, 1.32, 1.08, 0.9, 1.0], tame: 0.5 },
  { id: 'thienloi', name: 'Thiên Lôi Long', el: ['Lôi'], cm: 1000, f: [1.3, 1.05, 1.27, 1.08, 0.95], tame: 0.28 },
  // Âm
  { id: 'doi', name: 'Ám Dạ Bức', el: ['Âm'], cm: 25, f: [0.85, 1.1, 0.8, 0.78, 1.33], tame: 1.3 },
  { id: 'hao', name: 'U Linh Hào', el: ['Âm'], cm: 40, f: [0.88, 1.35, 1.1, 0.8, 1.02], tame: 1.1 },
  { id: 'chuam', name: 'Tử Mạng Chu', el: ['Âm'], cm: 55, f: [0.88, 0.88, 1.3, 0.8, 1.15], tame: 1.0 },
  { id: 'coc', name: 'Huyền Độc Thiềm', el: ['Âm'], cm: 40, f: [1.35, 0.93, 0.72, 1.45, 0.6], tame: 1.2 },
  { id: 'quyma', name: 'Dạ Hành Quỷ Mã', el: ['Âm'], cm: 200, f: [0.85, 0.85, 1.17, 0.78, 1.35], tame: 0.7 },
  { id: 'hacbao', name: 'Hắc Nguyệt Thiên Báo', el: ['Âm'], cm: 240, f: [1.35, 1.1, 1.2, 1.12, 0.88], tame: 0.6 },
  // Dương
  { id: 'kimo', name: 'Tam Túc Kim Ô', el: ['Dương'], cm: 90, f: [0.88, 1.35, 1.1, 0.8, 1.02], tame: 0.6 },
  { id: 'tuocduong', name: 'Triêu Dương Tước', el: ['Dương'], cm: 15, f: [0.83, 1.08, 0.9, 0.75, 1.3], tame: 1.4 },
  { id: 'thanma', name: 'Bạch Ngọc Thần Mã', el: ['Dương'], cm: 200, f: [0.8, 0.93, 1.12, 0.85, 1.3], tame: 0.7 },
  { id: 'thuyduong', name: 'Thụy Dương', el: ['Dương'], cm: 100, f: [1.4, 0.85, 0.78, 1.38, 0.65], tame: 1.1 },
  { id: 'gaduong', name: 'Hạo Nhật Kê', el: ['Dương'], cm: 60, f: [0.9, 0.9, 1.2, 0.83, 1.18], tame: 1.2 },
  { id: 'bachtrach', name: 'Bạch Trạch', el: ['Dương'], cm: 170, f: [0.88, 1.35, 1.1, 0.8, 1.02], tame: 0.5 },
  { id: 'thuy', name: 'Tường Vân Thụy Thú', el: ['Dương'], cm: 160, f: [0.93, 1.28, 1.15, 0.85, 0.95], tame: 0.6 },
];
export interface Pers { n: string; dev: number[]; tame: number; line: string }
export const PERS: Pers[] = [
  { n: 'Hung Hãn', dev: [0, 0, 0.1, -0.08, 0], tame: 0.85, line: 'Gầm gừ, ánh mắt đỏ ngầu.' },
  { n: 'Nhút Nhát', dev: [0, 0, -0.08, 0, 0.1], tame: 1.15, line: 'Run rẩy lùi lại sau tảng đá.' },
  { n: 'Điềm Tĩnh', dev: [0.05, 0.05, 0, 0.05, -0.05], tame: 1.1, line: 'Bình thản nhìn ngươi như nhìn gió.' },
  { n: 'Kiêu Ngạo', dev: [0, 0, 0.08, 0.05, -0.1], tame: 0.75, line: 'Ngẩng cao đầu, không coi ai ra gì.' },
  { n: 'Tham Ăn', dev: [0.1, 0, -0.05, 0, -0.05], tame: 1.2, line: 'Đánh hơi túi linh thảo của ngươi.' },
  { n: 'Hiền Lành', dev: [0.05, 0.05, -0.1, 0.05, 0], tame: 1.3, line: 'Nghiêng đầu tò mò.' },
  { n: 'Tinh Nghịch', dev: [-0.05, 0, 0, -0.05, 0.1], tame: 1.0, line: 'Nhảy nhót khiêu khích.' },
  { n: 'Cô Độc', dev: [0, 0.1, 0.05, 0, 0], tame: 0.8, line: 'Im lặng, xa cách.' },
  { n: 'Trung Thành', dev: [0.05, 0, 0, 0.05, 0], tame: 1.25, line: 'Dường như đã chờ ngươi từ lâu.' },
  { n: 'Xảo Quyệt', dev: [-0.05, 0.05, 0.05, 0, 0.05], tame: 0.9, line: 'Ánh mắt đảo quanh tìm sơ hở.' },
  { n: 'Trầm Mặc', dev: [0, 0.1, 0, 0.05, -0.05], tame: 1.0, line: 'Lặng lẽ như bóng trăng.' },
  { n: 'Nóng Nảy', dev: [-0.05, 0, 0.1, -0.05, 0.05], tame: 0.9, line: 'Dậm chân liên hồi.' },
];
export const SKILLS: Record<string, string[]> = {
  Kim: ['Kim Quang Trảm', 'Thái Bạch Kiếm Khí', 'Phá Giáp Chỉ'], Mộc: ['Thanh Đằng Phược', 'Xuân Sinh Quyết', 'Mộc Linh Tiễn'],
  Thủy: ['Bích Ba Tuyệt', 'Hàn Băng Chưởng', 'Thủy Long Ngâm'], Hỏa: ['Xích Diễm Phần Thiên', 'Hỏa Phượng Vũ', 'Liệt Dương Chưởng'],
  Thổ: ['Địa Nhai Trấn', 'Sơn Hà Ấn', 'Hậu Thổ Hộ Thể'], Lôi: ['Cửu Thiên Lôi Pháp', 'Tử Điện Xuyên Vân', 'Thiên Phạt Chỉ'],
  Âm: ['U Minh Trảo', 'Nguyệt Ảnh Ma Ảnh', 'Hàn Phách Chú'], Dương: ['Thái Dương Chân Hỏa', 'Kim Ô Diệu Thế', 'Hạo Nhiên Quyết'],
};
export const NEUTRAL_SKILL = 'Thần Thức Kích';
// Skill catalog (Requirement 18.1). Only the Tấn Công group exists so far; the other five groups need status effects (not built yet).
// Each element has three attack skills: a free basic one, a stronger one with a short cooldown, and a finisher that costs a lot of Spirit and waits longer.
export type SkillGroup = 'Tấn Công' | 'Phòng Thủ' | 'Hồi Phục' | 'Cường Hóa' | 'Suy Yếu' | 'Khống Chế';
// A status effect (Requirement 18.1): heal = restore Skill_Power of Sinh Lực; guard = take less damage; atkUp / critUp = hit harder; atkDown / defDown = the foe hits softer / guards worse; stun = the foe loses `turns` actions.
export type FxKind = 'heal' | 'guard' | 'atkUp' | 'critUp' | 'atkDown' | 'defDown' | 'stun';
export interface SkillFx { kind: FxKind; amount: number; turns: number; team?: boolean }
export interface SkillDef { name: string; el: string; group: SkillGroup; spirit: number; cd: number; coef: number; target: 'Kẻ Địch' | 'Bản Thân' | 'Một Đồng Minh' | 'Cả Đội'; minLevel: number; hits?: number; pierce?: number; crit?: number; fx?: SkillFx }
const SKILL_TIERS = [{ coef: 1.0, spirit: 0, cd: 0, minLevel: 1 }, { coef: 1.45, spirit: 8, cd: 1, minLevel: 1 }, { coef: 2.0, spirit: 20, cd: 3, minLevel: 5 }];
export const SKILL_DEFS: Record<string, SkillDef> = Object.fromEntries([
  ...Object.entries(SKILLS).flatMap(([el, names]) => names.map((name, i): [string, SkillDef] => [name, { name, el, group: 'Tấn Công', target: 'Kẻ Địch', ...SKILL_TIERS[i] }])),
  [NEUTRAL_SKILL, { name: NEUTRAL_SKILL, el: '', group: 'Tấn Công', target: 'Kẻ Địch', coef: 1.0, spirit: 0, cd: 0, minLevel: 1 }],
]);
export const skillDef = (name: string): SkillDef => SKILL_DEFS[name] || SKILL_DEFS[NEUTRAL_SKILL];
export const FAMILY = ['Lý', 'Trần', 'Vương', 'Lâm', 'Diệp', 'Tiêu', 'Mộ Dung', 'Tống', 'Liễu', 'Bạch', 'Tô', 'Cố', 'Nguyệt', 'Thượng Quan'];
export const SYL1 = ['Thanh', 'Vân', 'Hàn', 'Nguyệt', 'Tuyết', 'Phong', 'Linh', 'Dao', 'Ngọc', 'Minh', 'Lăng', 'Tịch', 'Mặc', 'Y'];
export const SYL2 = ['Hi', 'Nhi', 'Tâm', 'Ảnh', 'Lan', 'Hoa', 'Uyên', 'Vũ', 'Dung', 'Nghiên', 'Ca', 'Trúc'];

export const SLOTS = ['Weapon', 'Headwear', 'Robe', 'Footwear', 'Back', 'Accessory', 'Ring', 'Talisman'];
// Slots that can be seen on the portrait (Ring and Talisman are too small to draw).
export const VISIBLE = ['Weapon', 'Headwear', 'Robe', 'Footwear', 'Back', 'Accessory'];
// Static art drawn once by scripts/pregen.ts and shipped in public/art.
// `small`: the 192 px copy for lists (made by scripts/thumbs.ts); the popup uses the original.
// Daily creatures (lib/daily.ts) have one picture drawn at run time and kept in the database: DAILY_ART maps their id to /api/img/<id>.
export const DAILY_ART: Record<string, string> = {};
// Item bases added by the daily job (lib/daily.ts), kept apart from SLOT_BASE so the old list, and every random draw made from it, stays as it was.
export const EXTRA_BASE: Record<string, string[]> = {};
export const basesOf = (slot: string): string[] => (EXTRA_BASE[slot] && EXTRA_BASE[slot].length ? [...SLOT_BASE[slot], ...EXTRA_BASE[slot]] : SLOT_BASE[slot]);
export const monsterArt = (sp: string, mut = false, small = false) => DAILY_ART[sp] || `/art/monsters/${small ? 'sm/' : ''}${sp}${mut ? '_mut' : ''}.jpg`;
export const introArt = (g: 'f' | 'm') => `/art/intro_${g}.jpg`;
export const SLOT_VI: Record<string, string> = { Weapon: 'Pháp Khí', Headwear: 'Quan', Robe: 'Đạo Bào', Footwear: 'Hài', Back: 'Bối', Accessory: 'Bội', Ring: 'Giới Chỉ', Talisman: 'Hộ Phù' };
// Plain-Vietnamese word for each slot (the Hán-Việt names above are not obvious), where it is worn, and the engraved glyph of its empty "mold".
export const SLOT_SHORT: Record<string, string> = { Weapon: 'vũ khí', Headwear: 'mũ', Robe: 'áo', Footwear: 'giày', Back: 'khoác lưng', Accessory: 'đeo hông', Ring: 'nhẫn', Talisman: 'bùa' };
export const SLOT_HINT: Record<string, string> = { Weapon: 'cầm trên tay', Headwear: 'đội trên đầu', Robe: 'mặc ngoài thân', Footwear: 'mang ở chân', Back: 'khoác sau lưng', Accessory: 'đeo bên hông', Ring: 'đeo ở ngón tay', Talisman: 'giắt trong người' };
// Paper doll: which slots sit left and right of the figure (top to bottom), and the body region of each slot on the 2:3 portrait
// (center x/y and size, in percent of the picture). Used to show where a dragged item goes.
export const DOLL_L = ['Headwear', 'Robe', 'Accessory', 'Footwear'];
export const DOLL_R = ['Back', 'Weapon', 'Ring', 'Talisman'];
export const BODY_AT: Record<string, { x: number; y: number; w: number; h: number }> = {
  Headwear: { x: 50, y: 10, w: 36, h: 14 }, Back: { x: 50, y: 27, w: 86, h: 22 }, Talisman: { x: 50, y: 30, w: 28, h: 10 }, Robe: { x: 50, y: 50, w: 60, h: 56 },
  Accessory: { x: 50, y: 38, w: 34, h: 8 }, Weapon: { x: 77, y: 56, w: 24, h: 30 }, Ring: { x: 24, y: 52, w: 20, h: 14 }, Footwear: { x: 50, y: 88, w: 44, h: 16 },
};
export const SLOT_BASE: Record<string, string[]> = {
  Weapon: ['Trường Kiếm', 'Đoản Kiếm', 'Phất Trần', 'Cổ Cầm', 'Ngọc Tiêu', 'Trường Thương', 'Trường Cung', 'Linh Cung', 'Tỳ Bà', 'Trảm Đao', 'Liễu Diệp Đao', 'Quyền Sáo', 'Hổ Trảo',
    // Every môn has exactly three mẫu, so each môn is as likely to drop as any other (the base is drawn evenly from this list). Keep it that way when adding more.
    'Trọng Kiếm', 'Họa Kích', 'Xà Mâu', 'Liên Nỗ', 'Quan Đao', 'Hộ Uyển', 'Không Hầu', 'Trúc Địch', 'Đào Huân', 'Chu Sa Bút', 'Bát Quái Kính'],
  Headwear: ['Ngọc Quan', 'Kim Quan', 'Phát Trâm', 'Đấu Lạp', 'Khăn Vân'],
  Robe: ['Đạo Bào', 'Vũ Y', 'Hạc Sưởng', 'Pháp Bào', 'Tiên Quần', 'Thanh Sam'],
  Footwear: ['Vân Hài', 'Phong Ngoa', 'Tuyết Ngoa'],
  Back: ['Đấu Bồng', 'Vũ Dực', 'Kiếm Hạp', 'Phi Y'],
  Accessory: ['Ngọc Bội', 'Hương Nang', 'Linh Ấn', 'Chuông Bạc'],
  Ring: ['Giới Chỉ', 'Linh Giới', 'Càn Khôn Giới'],
  Talisman: ['Hộ Phù', 'Linh Phù', 'Trấn Hồn Phù'],
};
// Môn pháp (weapon class) of every weapon base: it decides which techniques the player can use while holding it (see lib/arts.ts).
export const WEAPON_CLASS: Record<string, string> = {
  'Trường Kiếm': 'kiem', 'Đoản Kiếm': 'kiem', 'Trường Thương': 'thuong', 'Trường Cung': 'cung', 'Linh Cung': 'cung', 'Trảm Đao': 'dao', 'Liễu Diệp Đao': 'dao',
  'Quyền Sáo': 'quyen', 'Hổ Trảo': 'quyen', 'Cổ Cầm': 'cam', 'Tỳ Bà': 'cam', 'Ngọc Tiêu': 'tieu', 'Phất Trần': 'phat',
  'Trọng Kiếm': 'kiem', 'Họa Kích': 'thuong', 'Xà Mâu': 'thuong', 'Liên Nỗ': 'cung', 'Quan Đao': 'dao', 'Hộ Uyển': 'quyen',
  'Không Hầu': 'cam', 'Trúc Địch': 'tieu', 'Đào Huân': 'tieu', 'Chu Sa Bút': 'phat', 'Bát Quái Kính': 'phat',
};
export const SLOT_IMPL: Record<string, { stat: string; r: [number, number] }> = {
  Weapon: { stat: 'atk', r: [6, 12] }, Headwear: { stat: 'def', r: [3, 6] }, Robe: { stat: 'hp', r: [40, 80] }, Footwear: { stat: 'spd', r: [1, 3] },
  Back: { stat: 'def', r: [2, 5] }, Accessory: { stat: 'spirit', r: [15, 30] }, Ring: { stat: 'crit', r: [2, 4] }, Talisman: { stat: 'luck', r: [3, 8] },
};
export interface AffixDef { id: string; label: string; stat: string; r: [number, number]; kind: 'p' | 's'; name: string }
export const AFFIX: AffixDef[] = [
  { id: 'atk', label: 'Công Kích', stat: 'atk', r: [4, 8], kind: 'p', name: 'Sắc Bén' }, { id: 'def', label: 'Phòng Ngự', stat: 'def', r: [3, 6], kind: 'p', name: 'Kiên Cố' },
  { id: 'hp', label: 'Sinh Lực', stat: 'hp', r: [25, 45], kind: 'p', name: 'Trường Thọ' }, { id: 'spd', label: 'Thân Pháp', stat: 'spd', r: [1, 3], kind: 'p', name: 'Phiêu Dật' },
  { id: 'spirit', label: 'Linh Lực', stat: 'spirit', r: [10, 20], kind: 'p', name: 'Uẩn Linh' }, { id: 'crit', label: 'Bạo Kích %', stat: 'crit', r: [2, 5], kind: 's', name: 'Sát Phạt' },
  { id: 'critdmg', label: 'Bạo Thương %', stat: 'critdmg', r: [6, 14], kind: 's', name: 'Tuyệt Mệnh' }, { id: 'luck', label: 'May Mắn', stat: 'luck', r: [2, 6], kind: 's', name: 'Thiên Vận' },
  { id: 'cult', label: 'Tu Luyện %', stat: 'cult', r: [3, 8], kind: 's', name: 'Ngộ Đạo' },
];
export const AFFIX_COUNT: [number, number][] = [[0, 0], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]];
export const ROLL_FLOOR = [0, 0, 0.1, 0.25, 0.45, 0.65];
export const PW: Record<string, number> = { hp: 0.12, spirit: 0.2, atk: 1, def: 1, spd: 1.5, crit: 2, critdmg: 0.4, luck: 0.3, cult: 0.5 };
export const EL_PREFIX: Record<string, string> = { Kim: 'Thái Bạch', Mộc: 'Thanh Mộc', Thủy: 'Bích Ba', Hỏa: 'Liệt Diễm', Thổ: 'Hậu Thổ', Lôi: 'Cửu Lôi', Âm: 'U Nguyệt', Dương: 'Thần Dương' };
export const PROPER1 = ['Hồng Mông', 'Thái Hư', 'Cửu Tiêu', 'Vạn Cổ', 'Thiên Tâm', 'Hư Không', 'Tinh Hà', 'Vô Lượng'];
export const PROPER2 = ['Chí Tôn', 'Tuyệt Thế', 'Vô Cực', 'Hạo Nhiên', 'Phá Quân', 'Nghịch Thiên', 'Thần Hoàng'];
export const TIEN_VAN = ['Hỗn Độn Tiên Văn', 'Thái Cực Tiên Văn', 'Tinh Thần Tiên Văn', 'Hồng Liên Tiên Văn'];
// ---------- Kỳ Ngộ (Event_Template). `lv` is the Level range the event can happen at, `rare` marks a Kỳ_Ngộ hiếm (Highlight priority).
// Outcome fields: cpTicks = Tu Vi worth that many ticks, heal = full HP, drops = extra drop rolls, stonesPerLv = Spirit_Stone range per Level,
// taming = Khế Ước Phù (Hoàng) range.
export interface EventOutcome { w: number; cpTicks?: number; heal?: boolean; drops?: number; stonesPerLv?: [number, number]; taming?: [number, number]; hurtPct?: number; robPct?: number; injure?: number }
export interface EventTemplate { id: string; text: string; lv: [number, number]; rare?: boolean; bad?: boolean; out: EventOutcome[] }
export const EVENTS: EventTemplate[] = [
  { id: 'daoshi', text: 'Gặp một lão đạo sĩ bên suối, được chỉ điểm vài câu, lòng sáng như gương.', lv: [1, 36], out: [{ w: 1, cpTicks: 30 }] },
  { id: 'linhtuyen', text: 'Phát hiện một mạch linh tuyền, uống vào thấy thương thế lành hẳn.', lv: [1, 36], out: [{ w: 1, heal: true }] },
  { id: 'bitang', text: 'Dưới rễ cổ thụ lộ ra một bí tàng cổ xưa.', lv: [1, 36], out: [{ w: 1, drops: 1 }] },
  { id: 'tansu', text: 'Một tán tu hào sảng tặng ngươi túi linh thạch.', lv: [1, 36], out: [{ w: 3, stonesPerLv: [2, 6] }, { w: 1, stonesPerLv: [4, 8], drops: 1 }] },
  { id: 'dongphu', text: 'Lạc vào một động phủ vô chủ, thu được bảo vật.', lv: [1, 36], rare: true, out: [{ w: 1, drops: 2 }] },
  { id: 'linhduoc', text: 'Hái được mấy cây linh dược quý, luyện thành Khế Ước Phù.', lv: [1, 36], out: [{ w: 1, taming: [1, 2] }] },
  { id: 'ngodao', text: 'Nhìn hoa rơi nước chảy, bỗng đốn ngộ một tia đại đạo.', lv: [1, 36], out: [{ w: 1, cpTicks: 80 }] },
  { id: 'thiennu', text: 'Một thiên nữ cưỡi hạc bay qua, rải xuống linh quang.', lv: [1, 36], rare: true, out: [{ w: 1, stonesPerLv: [8, 20] }] },
  { id: 'phucco', text: 'Sa vào ổ phục kích của yêu thú, bị thương nặng mới thoát được.', lv: [1, 36], bad: true, out: [{ w: 1, hurtPct: 0.35, injure: 150 }] },
  { id: 'daotac', text: 'Gặp một toán đạo tặc chặn đường, mất một ít Linh Thạch mới yên thân.', lv: [1, 36], bad: true, out: [{ w: 1, robPct: 0.06 }] },
  { id: 'docchuong', text: 'Lỡ hít phải độc chướng trong rừng sâu, kinh mạch rối loạn.', lv: [1, 36], bad: true, out: [{ w: 1, hurtPct: 0.15, injure: 240 }] },
];

// ---------- Material (Nguyên Liệu): sold for Spirit_Stone, price is an integer per unit
export interface Material { id: string; name: string; price: number }
export const MATERIALS: Material[] = [
  { id: 'linhthao', name: 'Linh Thảo', price: 1 }, { id: 'truc', name: 'Thanh Trúc Tinh', price: 2 }, { id: 'ngoc', name: 'Hàn Ngọc Tủy', price: 4 },
  { id: 'hoatinh', name: 'Hỏa Tinh Thạch', price: 6 }, { id: 'loitinh', name: 'Lôi Tinh Sa', price: 10 }, { id: 'uminh', name: 'U Minh Hoa', price: 15 }, { id: 'tinhsa', name: 'Tinh Hà Sa', price: 25 },
];
export const MAT = (id: string) => MATERIALS.find((m) => m.id === id)!;

// ---------- Drop_Table (Requirement 20): entries of kind item | stones | taming | pill | material | none
export type DropEntry =
  | { kind: 'item'; w: number } | { kind: 'stones'; w: number; q: [number, number] } | { kind: 'taming'; w: number; grade: number; q: [number, number] }
  | { kind: 'pill'; w: number; grade: number; q: [number, number] } | { kind: 'material'; w: number; q: [number, number] } | { kind: 'none'; w: number };
export const DROP_TABLE: DropEntry[] = [
  { kind: 'item', w: 34 }, { kind: 'stones', w: 16, q: [1, 4] }, { kind: 'taming', w: 3, grade: 0, q: [1, 1] },
  { kind: 'pill', w: 3, grade: 0, q: [1, 1] }, { kind: 'material', w: 14, q: [1, 2] }, { kind: 'none', w: 30 },
];

// ---------- Zone_Phenomenon (Thiên Địa Dị Tượng). Only these fields may change (Requirement 6.11): cult factor, Luck bonus, Encounter_Type weights, species weights.
export interface Phenomenon { id: string; name: string; text: string; cult?: number; luck?: number; enc?: Partial<Record<'monster' | 'npc' | 'resource' | 'event', number>>; species?: Record<string, number> }
export const PHENOMENA: Phenomenon[] = [
  { id: 'nguyet', name: 'Nguyệt Thực', text: 'Âm khí dâng cao: yêu thú hệ Âm xuất hiện nhiều gấp ba.', species: { am: 3, doi: 3, hao: 3, chuam: 3, coc: 3, quyma: 3, hacbao: 3 } },
  { id: 'linhkhi', name: 'Linh Khí Bộc Phát', text: 'Linh khí đậm đặc: Tu Vi nhận thêm 50%.', cult: 1.5 },
  { id: 'tinhvan', name: 'Tinh Vân Rủ Xuống', text: 'May mắn cộng thêm 40 điểm khi rơi pháp khí.', luck: 40 },
  { id: 'suong', name: 'Sương Mù Giăng Lối', text: 'Kỳ ngộ xuất hiện nhiều gấp đôi, chạm trán yêu thú ít đi.', enc: { event: 2, monster: 0.7 } },
  { id: 'loivan', name: 'Lôi Vân Tụ Hội', text: 'Yêu thú hệ Lôi xuất hiện nhiều gấp ba, Tu Vi nhận thêm 20%.', species: { loi: 3, dienthu: 3, loibao: 3, chuon: 3, loinguu: 3, loiman: 3, thienloi: 3 }, cult: 1.2 },
  { id: 'thaodiep', name: 'Bách Thảo Nở Rộ', text: 'Tài nguyên xuất hiện nhiều gấp ba.', enc: { resource: 3 } },
  { id: 'linhcan', name: 'Linh Khí Cạn Kiệt', text: 'Linh khí loãng đi: Tu Vi chỉ còn 60%.', cult: 0.6 },
  { id: 'yeukhi', name: 'Yêu Khí Bùng Phát', text: 'Yêu thú kéo đến nhiều gấp rưỡi, kỳ ngộ và tài nguyên hiếm hơn.', enc: { monster: 1.6, event: 0.5, resource: 0.6 } },
  { id: 'ngungtre', name: 'Thiên Địa Ngưng Trệ', text: 'Trời đất nặng nề: Tu Vi còn 80%, may mắn giảm khi rơi pháp khí.', cult: 0.8, luck: -30 },
];

// ---------- Zone (Khu Vực)
export interface Zone {
  id: string; name: string; blurb: string; lv: [number, number]; minLevel: number; density: number;
  enc: { monster: number; npc: number; resource: number; event: number };
  species: Record<string, number>; materials: { id: string; w: number; q: [number, number] }[]; events: string[];
  phen: { id: string; w: number }[]; drop: DropEntry[];
}
const ALL_EVENTS = EVENTS.map((e) => e.id);
export const ZONES: Zone[] = [
  { id: 'thanhvan', name: 'Thanh Vân Sơn Cốc', blurb: 'Thung lũng mù sương dưới chân núi, nơi mọi đạo đồ bắt đầu.', lv: [1, 5], minLevel: 1, density: 1.0,
    enc: { monster: 60, npc: 15, resource: 15, event: 10 }, species: { ho: 3, loc: 3, am: 2, duong: 2, tho: 3, hung: 1, kimtam: 2, thiem: 2, chi: 2, cua: 1, hoaque: 2, chuidat: 2, doi: 1, tuocduong: 2, dienthu: 1, nhim: 1, trucxa: 1, hoathu: 1, chuon: 1, koi: 1 },
    materials: [{ id: 'linhthao', w: 3, q: [1, 4] }, { id: 'truc', w: 1, q: [1, 2] }], events: ALL_EVENTS, phen: [{ id: 'linhkhi', w: 2 }, { id: 'suong', w: 2 }, { id: 'thaodiep', w: 2 }, { id: 'linhcan', w: 2 }], drop: DROP_TABLE },
  { id: 'hannguyet', name: 'Hàn Nguyệt Lâm', blurb: 'Rừng trúc dưới trăng lạnh, yêu thú hệ Âm và Thủy lui tới.', lv: [4, 9], minLevel: 4, density: 1.15,
    enc: { monster: 60, npc: 15, resource: 15, event: 10 }, species: { am: 4, giao: 2, loc: 2, duong: 1, xa: 3, diep: 3, lang: 1, hung: 2, doi: 3, hao: 3, chuam: 2, coc: 2, koi: 2, cua: 2, haima: 2, uyenuong: 2, trucxa: 2, chi: 1, mocnguu: 1, quyma: 1, kimhau: 1, thuyduong: 1 },
    materials: [{ id: 'truc', w: 3, q: [1, 4] }, { id: 'ngoc', w: 2, q: [1, 3] }], events: ALL_EVENTS, phen: [{ id: 'nguyet', w: 4 }, { id: 'tinhvan', w: 2 }, { id: 'suong', w: 2 }, { id: 'yeukhi', w: 2 }], drop: DROP_TABLE },
  { id: 'xichviem', name: 'Xích Viêm Cốc', blurb: 'Hẻm núi lửa nóng rẫy, nơi Hỏa và Kim hội tụ.', lv: [8, 13], minLevel: 8, density: 1.3,
    enc: { monster: 62, npc: 14, resource: 14, event: 10 }, species: { ho: 4, bang: 3, quy: 2, giao: 1, phuong: 3, te: 3, lang: 2, hoathu: 2, tichdich: 3, xichma: 2, khuyen: 3, hoaque: 1, yet: 3, tenle: 2, nhim: 2, thietbao: 2, kimhau: 1, kimchu: 2, chuclong: 1, dedai: 2, gaduong: 1 },
    materials: [{ id: 'hoatinh', w: 3, q: [1, 3] }, { id: 'ngoc', w: 1, q: [1, 2] }], events: ALL_EVENTS, phen: [{ id: 'linhkhi', w: 3 }, { id: 'tinhvan', w: 2 }, { id: 'thaodiep', w: 1 }, { id: 'ngungtre', w: 2 }, { id: 'yeukhi', w: 1 }], drop: DROP_TABLE },
  { id: 'loivan', name: 'Lôi Vân Cao Nguyên', blurb: 'Cao nguyên mây đen sấm động, Lôi Kỳ Lân thường xuất hiện.', lv: [12, 17], minLevel: 12, density: 1.5,
    enc: { monster: 65, npc: 13, resource: 12, event: 10 }, species: { loi: 4, bang: 2, duong: 2, quy: 2, ung: 3, su: 2, te: 1, dienthu: 3, loibao: 3, chuon: 2, loinguu: 3, loiman: 2, kimchu: 1, bachho: 2, thanma: 2, thuyduong: 2, gaduong: 2, kiemngu: 1, mocnguu: 1, voi: 1, dangmang: 1, dedai: 1, thienloi: 1, kimo: 1 },
    materials: [{ id: 'loitinh', w: 3, q: [1, 3] }, { id: 'hoatinh', w: 1, q: [1, 2] }], events: ALL_EVENTS, phen: [{ id: 'loivan', w: 4 }, { id: 'tinhvan', w: 2 }, { id: 'linhkhi', w: 2 }, { id: 'linhcan', w: 2 }], drop: DROP_TABLE },
  { id: 'cuuu', name: 'Cửu U Hư Không', blurb: 'Vùng đất ranh giới Âm Dương, nguy hiểm nhưng linh khí dồi dào.', lv: [16, 20], minLevel: 16, density: 1.8,
    enc: { monster: 65, npc: 15, resource: 10, event: 10 }, species: { am: 3, duong: 3, loi: 2, bang: 2, ho: 1, kinh: 2, su: 2, diep: 2, phuong: 1, quyma: 3, hacbao: 3, hao: 1, coc: 1, kimo: 2, bachtrach: 2, thuy: 2, thanma: 1, bachho: 1, kimlong: 1, thienloi: 1, chuclong: 1, muc: 2, sa: 2, voi: 2, dangmang: 2, thiencay: 1, loiman: 1, kiemngu: 2 },
    materials: [{ id: 'uminh', w: 3, q: [1, 3] }, { id: 'loitinh', w: 1, q: [1, 2] }], events: ALL_EVENTS, phen: [{ id: 'nguyet', w: 3 }, { id: 'linhkhi', w: 3 }, { id: 'loivan', w: 2 }, { id: 'ngungtre', w: 2 }, { id: 'yeukhi', w: 2 }], drop: DROP_TABLE },
  { id: 'tinhha', name: 'Tinh Hà Hư Cảnh', blurb: 'Dòng sông sao vỡ nát giữa hư không, nơi Luyện Hư Tu Sĩ luyện hóa hư vô thành đạo.', lv: [20, 24], minLevel: 20, density: 2.1,
    enc: { monster: 66, npc: 15, resource: 9, event: 10 }, species: { am: 2, duong: 2, loi: 2, bang: 2, kinh: 2, su: 2, phuong: 2, quyma: 2, hacbao: 2, kimo: 3, bachtrach: 2, thuy: 2, thanma: 2, bachho: 2, kimlong: 3, thienloi: 2, chuclong: 2, muc: 1, sa: 1, voi: 1, dangmang: 1, thiencay: 2, loiman: 1, kiemngu: 2 },
    materials: [{ id: 'tinhsa', w: 3, q: [1, 3] }, { id: 'uminh', w: 1, q: [1, 2] }], events: ALL_EVENTS, phen: [{ id: 'tinhvan', w: 3 }, { id: 'linhkhi', w: 3 }, { id: 'nguyet', w: 2 }, { id: 'loivan', w: 2 }, { id: 'ngungtre', w: 1 }, { id: 'yeukhi', w: 2 }], drop: DROP_TABLE },
];
export const START_ZONE = 'thanhvan';
export const ZONE = (id: string) => ZONES.find((z) => z.id === id) || ZONES[0];
export const PHEN = (id: string) => PHENOMENA.find((p) => p.id === id)!;

// ---------- NPC_Cultivator (a Cultivator met on the road; fights like a monster, cannot be tamed)
export const NPC_TITLES = ['Tán Tu', 'Kiếm Tu', 'Đan Sư', 'Phù Sư', 'Thể Tu', 'Ma Tu'];
export const NPC_LINES = ['chặn đường đòi thử sức', 'nhận nhầm ngươi là kẻ thù cũ', 'muốn thử Thần Thông mới', 'cướp đường vì cần linh thạch', 'khiêu chiến vì thấy ngươi trẻ tuổi'];
export const SIZE_CLASS = ['Tí Hon', 'Nhỏ', 'Vừa', 'Lớn', 'Khổng Lồ'];
export const SIZE_T = [0.65, 0.85, 1.15, 1.5];

// ---------- image-generation vocabulary (English, used only to build prompts on the server)
export const BASE_EN: Record<string, string> = {
  'Trường Kiếm': 'slender straight double-edged long sword (jian) with a smooth plain blade and a tasseled hilt', 'Đoản Kiếm': 'slender straight double-edged short sword (jian) with a smooth plain blade and a tasseled hilt', 'Phất Trần': 'daoist fly whisk with a long ornate handle and a tuft of long flowing white horsehair', 'Cổ Cầm': 'ancient Chinese guqin zither', 'Ngọc Tiêu': 'ancient Chinese jade xiao flute', 'Trường Thương': 'ancient Chinese long spear with a red tassel',
  'Trường Cung': 'ancient Chinese recurve longbow of dark lacquered wood with a taut silk string and a small jade ornament at the grip, with one slender arrow beside it', 'Linh Cung': 'ornate ancient Chinese spirit bow of pale wood and gold, with a glowing string of light and a small jade ornament at the grip',
  'Tỳ Bà': 'ancient Chinese pipa lute with a pear-shaped wooden body, a bent neck and four silk strings', 'Trảm Đao': 'ancient Chinese broad single-edged saber (dao) with a curved blade, a guard and a tasseled hilt', 'Liễu Diệp Đao': 'slender ancient Chinese willow-leaf saber (liuyedao) with a gently curved narrow blade and a tasseled hilt',
  'Quyền Sáo': 'pair of ornate ancient Chinese iron-knuckled fighting gauntlets with wrapped leather straps and bronze studs', 'Hổ Trảo': 'pair of ancient Chinese tiger-claw fighting gauntlets with curved steel claws on the fingers and leather straps',
  'Trọng Kiếm': 'broad heavy straight double-edged sword (jian) with a thick wide plain blade, a sturdy guard and a tasseled hilt',
  'Họa Kích': 'ancient Chinese halberd (ji) with a long shaft, a straight spear tip and a single crescent-shaped blade at its side, with a red tassel',
  'Xà Mâu': 'ancient Chinese serpent spear with a wavy flame-shaped blade like a coiling snake, a long dark shaft and a red tassel',
  'Liên Nỗ': 'ancient Chinese repeating crossbow of dark lacquered wood with a box-shaped magazine on top and a small jade ornament, with one slender bolt beside it',
  'Quan Đao': 'ancient Chinese guandao glaive with a long shaft and a broad curved crescent blade ending in a pointed tip, a dragon-head ornament at the blade base and a red tassel',
  'Hộ Uyển': 'pair of ornate ancient Chinese steel forearm bracers (vambraces) with engraved cloud patterns, bronze studs and leather straps',
  'Không Hầu': 'ancient Chinese konghou, a vertical harp with a curved wooden frame, a carved dragon-head top and many silk strings',
  'Trúc Địch': 'ancient Chinese dizi, a slender transverse bamboo flute with finger holes, wrapped silk bands at both ends and a tassel',
  'Đào Huân': 'ancient Chinese xun, a small egg-shaped glazed clay ocarina with finger holes, hanging from a silk cord with a tassel',
  'Chu Sa Bút': 'ancient Chinese talisman brush with a long slender bamboo handle and a tip dipped in bright red cinnabar, with a small jade ornament',
  'Bát Quái Kính': 'ancient Chinese bagua mirror, a round bronze mirror with an octagonal border of eight trigram symbols, a polished face and a short ornate handle with a tassel',
  'Ngọc Quan': 'small ornate jade topknot hair crown (guan)', 'Kim Quan': 'small ornate golden topknot hair crown (guan)', 'Phát Trâm': 'ornate ancient Chinese hairpin with dangling ornaments', 'Đấu Lạp': 'bamboo hat with a light veil', 'Khăn Vân': 'ornate cloud-patterned forehead headband',
  'Đạo Bào': 'daoist robe', 'Vũ Y': 'feather robe', 'Hạc Sưởng': 'crane-feather coat', 'Pháp Bào': 'spell robe', 'Tiên Quần': 'immortal gown', 'Thanh Sam': 'azure long shirt',
  'Vân Hài': 'pair of slim elegant ancient Chinese cloth slippers with upturned pointed scroll-shaped toe tips and embroidered cloud patterns, thin flat soles, not sneakers, not boots', 'Phong Ngoa': 'pair of tall ancient Chinese boots with winged side embroidery', 'Tuyết Ngoa': 'pair of ancient Chinese fur-trimmed winter boots', 'Đấu Bồng': 'flowing cloak', 'Vũ Dực': 'pair of feather wings', 'Kiếm Hạp': 'ornate ancient Chinese sword case with straps', 'Phi Y': 'long flowing silk ribbon scarf (piaodai)',
  'Ngọc Bội': 'carved jade pendant with a tassel', 'Hương Nang': 'embroidered perfume sachet', 'Linh Ấn': 'ornate spirit pendant, a round gold-framed gemstone medallion with a swirling cloud relief and a tassel', 'Chuông Bạc': 'ornate silver bell charm with a tassel', 'Giới Chỉ': 'jade ring', 'Linh Giới': 'spirit ring', 'Càn Khôn Giới': 'cosmos ring',
  'Hộ Phù': 'protective amulet plaque, a smooth rounded jade-and-gold tablet with a lotus-petal relief and a tassel', 'Linh Phù': 'spirit amulet plaque, a smooth gold-rimmed gemstone tablet with a swirling cloud relief and a tassel', 'Trấn Hồn Phù': 'soul-guarding amulet plaque, a smooth dark jade tablet with a carved dragon-scale relief and a tassel',
};
export const SLOT_EN: Record<string, string> = { Weapon: 'sword', Headwear: 'hair crown', Robe: 'daoist robe', Footwear: 'pair of boots', Back: 'flowing cloak', Accessory: 'jade pendant', Ring: 'jade ring', Talisman: 'amulet plaque with a tassel' };
// How the editing model must place an item on the character (gender neutral). The item picture itself is the reference for what it looks like.
export const PLACE_BACK: Record<string, string> = {
  'Đấu Bồng': 'It is worn as a cloak over the shoulders and flows down behind the back.',
  'Vũ Dực': 'It is attached to the back and spreads open behind the body.',
  'Kiếm Hạp': 'It is carried strapped diagonally across the back.',
  'Phi Y': 'It drapes over the shoulders and arms and floats in the air around the body.',
};
export const PLACE_WEAPON: Record<string, string> = {
  'Trường Kiếm': 'It is held in the right hand with the tip pointing down.', 'Đoản Kiếm': 'It is held in the right hand with the tip pointing down.',
  'Phất Trần': 'It is held in the right hand.', 'Cổ Cầm': 'It is carried in both arms in front of the body.',
  'Ngọc Tiêu': 'It is held in the right hand.', 'Trường Thương': 'It is held upright in the right hand, standing beside the body.',
  'Trường Cung': 'It is held in the left hand at the side, the bow standing beside the body with its string facing inward.', 'Linh Cung': 'It is held in the left hand at the side, the bow standing beside the body with its string facing inward.',
  'Tỳ Bà': 'It is carried in both arms in front of the body.', 'Trảm Đao': 'It is held in the right hand with the tip pointing down.', 'Liễu Diệp Đao': 'It is held in the right hand with the tip pointing down.',
  'Quyền Sáo': 'They are worn on both hands as fighting gauntlets, the fists relaxed at the sides.', 'Hổ Trảo': 'They are worn on both hands as claw gauntlets, the hands relaxed at the sides.',
  'Trọng Kiếm': 'It is held in the right hand with the tip pointing down.', 'Họa Kích': 'It is held upright in the right hand, standing beside the body.',
  'Xà Mâu': 'It is held upright in the right hand, standing beside the body.', 'Liên Nỗ': 'It is held in both hands in front of the body, pointing slightly down.',
  'Quan Đao': 'It is held upright in the right hand, standing beside the body with the blade up.', 'Hộ Uyển': 'They are worn on both forearms as bracers, the hands relaxed at the sides.',
  'Không Hầu': 'It is carried in both arms in front of the body.', 'Trúc Địch': 'It is held in the right hand.', 'Đào Huân': 'It is held in the right hand in front of the chest.',
  'Chu Sa Bút': 'It is held in the right hand.', 'Bát Quái Kính': 'It is held in the right hand, raised in front of the chest with the mirror face outward.',
};
export const EL_EN: Record<string, { color: string; energy: string }> = {
  Kim: { color: 'gold and silver', energy: 'metallic golden light' }, Mộc: { color: 'emerald green', energy: 'living vines and green leaves' },
  Thủy: { color: 'azure blue', energy: 'flowing water and mist' }, Hỏa: { color: 'crimson and orange', energy: 'blazing flames' },
  Thổ: { color: 'amber and earthy brown', energy: 'floating stone fragments and amber light' }, Lôi: { color: 'violet', energy: 'crackling purple lightning' },
  Âm: { color: 'indigo and dark violet', energy: 'moonlit shadow wisps' }, Dương: { color: 'radiant gold and white', energy: 'warm sunlight rays' },
};
// Tier = how rich the piece is (material, ornament, glow). Every tier from Huyền up shares an ivory-white and gold base, so a whole
// outfit reads as one designed set; the element only tints the accents (trim, gems, tassels, lining), see EL_ACCENT.
export const TIER_EN = [
  'simple and plain, undyed cream and soft grey cloth with dark brown leather, slightly worn',
  'well-made, cream and jade green cloth with bronze trim',
  'refined, ivory white with silver trim and a faint glow',
  'ornate, ivory white and gold with smooth gold filigree, polished gemstone details and a soft inner glow',
  'legendary, radiant white and gold with celestial energy and floating particles',
  'divine immortal artifact, iridescent pearl-white and rose gold with a halo of light and prismatic starlight swirls',
];
export const EL_ACCENT: Record<string, string> = { Kim: 'silver and gold', Mộc: 'jade green', Thủy: 'azure blue', Hỏa: 'crimson red', Thổ: 'amber and warm brown', Lôi: 'violet', Âm: 'deep indigo', Dương: 'sunlit gold' };
export const SPECIES_EN: Record<string, string> = {
  ho: 'a majestic nine-tailed spirit fox with white fur and crimson flame on its tails', giao: 'a graceful azure water dragon serpent with pearl-like scales coiling through clouds',
  loc: 'an ethereal spirit deer with glowing jade antlers covered in blossoms', bang: 'a giant golden roc peng bird with shining metallic feathers',
  quy: 'an ancient stone spirit tortoise with a mossy shell carrying a small mountain with pine trees', loi: 'a thunder qilin chinese unicorn beast with a purple lightning mane and glowing eyes',
  am: 'a mysterious moon shadow cat spirit with silver and black fur and glowing violet eyes', duong: 'a radiant sun crane bird with white and gold plumage and a halo of light',
  tho: 'a tiny ethereal spirit rabbit with soft moss-green fur, long ears crowned with glowing leaves and blossoms',
  xa: 'a long frost serpent with icy blue-white scales, crystalline frost spikes along its spine and pale glowing eyes, coiled on snow',
  lang: 'a powerful silver wolf covered in polished silver armor-like plates of fur with metallic gleam and sharp golden eyes',
  hung: 'a huge ancient wood bear with bark-like fur, moss and small trees growing on its back, and glowing green eyes',
  phuong: 'a blazing fire phoenix with crimson and gold flame feathers, long flowing tail plumes of fire and an ember halo',
  te: 'a massive mountain rhinoceros with rock-plate hide, crystal veins glowing amber and a stone horn',
  ung: 'a swift thunder eagle with violet and white feathers wreathed in crackling lightning and bright electric eyes',
  diep: 'a delicate netherworld butterfly with large indigo and black wings patterned with glowing violet moon marks, trailing shadow mist',
  su: 'a majestic sun lion with a mane of golden flame and white-gold fur, soft warm sunlight glowing around it, plain smooth light with no symbols or patterns around it',
  kinh: 'a gigantic cloud-sea whale with pale blue skin, swimming through the sky among glowing clouds, gentle luminous eyes and small waterfalls flowing off its fins',
  // third wave
  kimtam: 'a tiny golden silkworm spirit with glittering gold silk threads trailing behind it, a soft metallic sheen and a faint halo',
  kimhau: 'a nimble golden snub-nosed monkey spirit with lustrous golden fur and a long tail, perched on a rock with a calm clever face',
  thietbao: 'a lean steel-boned leopard with dark iron-gray fur, polished metal plates along its shoulders and spine, and cold amber eyes',
  bachho: 'a majestic white tiger with platinum and gold stripes and a gleaming metallic mane, powerful and regal',
  kimchu: 'a spider spirit with a faceted diamond-like golden carapace, eight sharp metallic legs and a softly glowing core on its back',
  kiemngu: 'a sleek swordfish spirit with a long blade-like silver bill, mirror-bright scales and trailing silken fins, swimming through misty clouds',
  kimlong: 'a colossal golden scale dragon, every scale like beaten gold leaf, coiling through clouds with solemn glowing eyes',
  trucxa: 'a slender bamboo-green viper spirit with jade segmented scales like bamboo joints, coiled around a bamboo stalk',
  chi: 'a small mushroom spirit child with a glowing red lingzhi cap, tiny limbs and gentle bright eyes, standing on mossy ground',
  mocnguu: 'a sturdy green wood ox with bark-textured hide and curved horns twined with vines and blossoms',
  thiem: 'a tiny jade cicada spirit with translucent green wings veined with light, perched on a leaf',
  dangmang: 'a huge python whose body is woven of living green vines and leaves, with small flowers blooming along its coils',
  thiencay: 'an ancient towering tree spirit with a gnarled trunk body, glowing green eyes in the bark, branches heavy with blossoms and a canopy of leaves',
  cua: 'a crab spirit with a shell of deep sea-blue like glazed porcelain, wave patterns on its claws and tiny pearls on its legs',
  koi: 'a graceful koi carp spirit with luminous scarlet and white scales and flowing translucent fins, swimming in a lotus pond',
  haima: 'a delicate seahorse spirit with a pearl-white curled body and fins like silk, surrounded by drifting bubbles',
  muc: 'a giant deep-water octopus spirit with indigo skin, glowing blue spots and long tentacles curling around ancient coral',
  uyenuong: 'a mandarin duck spirit with jade-teal and amber plumage, floating on still water among lotus petals',
  sa: 'a huge ancient shark spirit with slate-blue armored hide, glowing cyan gill lines and rows of crystalline teeth, rising from a stormy sea',
  hoaque: 'a small sparrow spirit with feathers of orange and crimson flame, a trailing ember tail and bright golden eyes',
  hoathu: 'a quick red fire mouse spirit with ember-glowing fur, a flaming tail tip and tiny sparks around its paws',
  tichdich: 'a salamander lizard spirit with black scaly skin and glowing lava cracks, flames licking along its back',
  xichma: 'a magnificent crimson horse with a flowing mane of flame, burning hooves and a glowing red coat',
  khuyen: 'a fierce hound with charcoal fur, glowing magma veins, a mane of fire and burning eyes',
  chuclong: 'a vast crimson torch dragon whose body glows like molten metal, scales edged with flame, curling over a volcanic mountain',
  nhim: 'a stout porcupine spirit whose quills are sharp stone crystals in amber and gray, with moss on its back',
  chuidat: 'a small mole spirit with velvety brown fur, large golden digging claws and tiny glowing eyes, emerging from the earth',
  tenle: 'a pangolin spirit with overlapping stone-plate scales like roof tiles and amber crystal veins glowing between them',
  voi: 'a colossal ancient elephant with a hide like layered mountain rock, small pine trees on its back and tusks of pale jade',
  yet: 'a desert scorpion spirit with golden sand-colored armor, a curved glowing amber stinger and stone-textured claws',
  dedai: 'a sturdy mountain goat spirit with massive spiral horns of rock and an earth-brown coat, standing on a cliff',
  dienthu: 'a small squirrel-like spirit with golden-violet fur, a zigzag lightning-shaped tail and crackling sparks',
  loibao: 'a sleek leopard with violet-black fur marked by glowing lightning-shaped stripes and eyes of white light',
  chuon: 'a dragonfly spirit with translucent violet wings crackling with tiny lightning and a glowing blue body',
  loinguu: 'a mighty buffalo with a dark storm-cloud hide and curved horns wrapped in arcs of lightning',
  loiman: 'a long python spirit whose body is made of dark thunderclouds with scales of white lightning, drifting through a storm sky',
  thienloi: 'a titanic violet thunder dragon with a mane of living lightning and glowing white eyes, soaring through black storm clouds',
  doi: 'a bat spirit with deep indigo wings edged with silver moonlight, small glowing violet eyes and wing membranes like the night sky',
  hao: 'a mysterious owl spirit with dark gray and violet plumage, large luminous pale eyes and faint ghostly wisps around its wings',
  chuam: 'a black spider spirit with a smooth glossy obsidian carapace, a soft violet glow along its back and silver threads of web trailing from its legs, no markings or patterns on its body',
  coc: 'a dark toad spirit with warty indigo skin, glowing violet spots and a calm ancient gaze, sitting on a mossy stone',
  quyma: 'a spectral night horse with a coat of black smoke, a mane of pale blue ghost fire and hollow glowing eyes',
  hacbao: 'a huge black panther with silver crescent markings and eyes like full moons, moving silently through dark mist',
  kimo: 'a three-legged golden sun crow with blazing golden feathers and a glowing sun disc behind it',
  tuocduong: 'a tiny sparrow spirit with white and gold feathers like dawn light and a small halo',
  thanma: 'a divine white jade horse with a luminous coat, a golden mane and hooves that leave sparks of sunlight',
  thuyduong: 'an auspicious ram spirit with curled golden horns and a fluffy white coat that glows softly like clouds at sunrise',
  gaduong: 'a proud golden rooster spirit with long radiant tail feathers like sun rays and a glowing crest',
  bachtrach: 'the legendary baize beast, a white lion-like creature with a gentle face, curved golden horns and a mane of soft light',
  thuy: 'an auspicious cloud beast, a deer-like creature of soft golden clouds with luminous antlers and swirling auspicious cloud patterns',
};
export const MON_SCENE = ['in a misty bamboo forest', 'under a pale full moon', 'in a stormy sky with distant mountains', 'among golden dawn clouds', 'in ancient mossy ruins'];
export const PERS_EXPR = ['fierce determined gaze', 'shy gentle expression', 'serene calm expression', 'proud aloof gaze', 'cheerful warm smile', 'kind soft smile', 'playful smirk', 'distant melancholic gaze', 'sincere resolute look', 'sly clever eyes', 'quiet contemplative look', 'intense fiery look'];
export const OUTFIT_F = ['a plain humble cream linen robe with a rope belt', 'a fresh jade-green hanfu with bamboo embroidery', 'a refined deep-blue and silver hanfu with cloud patterns and flowing sleeves', 'an ornate crimson and gold battle hanfu with light armor and phoenix embroidery', 'a magnificent white and gold celestial robe with glowing runes', 'a radiant immortal robe woven from starlight with long translucent ribbons and a soft halo'];
export const OUTFIT_M = ['a simple cream linen robe with a rope belt', 'a jade-green daoist robe with bamboo embroidery', 'a refined deep-blue and silver robe with cloud patterns and flowing sleeves', 'an ornate crimson and gold battle robe with light armor', 'a magnificent white and gold celestial robe with glowing runes', 'a radiant immortal robe woven from starlight with long translucent ribbons and a soft halo'];
export const SCENE_T = ['a misty mountain valley at dawn', 'a bamboo forest in morning mist', 'misty blue mountain peaks', 'a sunset sky over mountains with floating embers', 'storm clouds and floating islands with lightning', 'a galaxy sky above a sea of clouds, standing on a glowing lotus'];
export const HAIR_COLORS = ['jet black', 'jet black', 'dark brown', 'silver white', 'midnight blue', 'deep burgundy'];
export const HAIR_STYLES_F = ['very long loose hair with a jade hairpin', 'high ponytail with silk ribbons', 'twin hair buns with hanging tassels', 'half-up hairstyle with a silver hair crown', 'long braid over the shoulder'];
export const HAIR_STYLES_M = ['hair tied in a high topknot with a jade hairpin', 'long loose hair with a headband', 'half-up topknot with flowing hair', 'neat short hair with a small crown'];
export const EYES = ['dark brown', 'amber', 'jade green', 'ice blue', 'violet'];
export const SKINS = ['fair jade-white', 'porcelain-pale luminous', 'warm ivory', 'soft peach-ivory'];
export const MARKS = ['', '', 'a small red mark on the forehead', 'a faint crescent moon mark on the forehead', 'a tiny beauty mole under the eye'];
// Faces with a personality of their own: structure and feeling, chosen from the character's seed (see lib/look.ts). The expression comes from PERS_EXPR.
export const FACE_F = [
  'a slender melon-seed face with phoenix eyes, thin willow-leaf brows and a cool, aloof, otherworldly beauty',
  'a delicate oval face with almond fox-like eyes, a high straight nose bridge and a confident, faintly mischievous charm',
  'a soft heart-shaped face with large clear deer-like eyes, gently arched brows and a serene, compassionate, knowing beauty',
  'a refined face with a pointed chin, sword-like brows, bright piercing eyes and a proud, resolute, heroic beauty',
  'a graceful long oval face with dreamy half-lidded eyes and a poetic, wistful, mysterious air',
];
export const FACE_M = [
  'a chiseled jawline, sword-shaped brows and starry deep-set eyes with a calm, piercing, righteous presence',
  'a refined jade-like face with gentle phoenix eyes, a high straight nose and a faint, warm, knowing smile',
  'a strong angular face with thick straight brows, intense bright eyes and a fearless, proud bearing',
  'a handsome long face with slightly upturned eyes and a free-spirited, roguish charm',
  'a pale elegant face with cool aloof eyes and a faint, melancholic, otherworldly air, like an immortal who has watched ten thousand years',
];
// Figures. Women: tall, slim waist, full bust, wide rounded hips that stay visible (adult, tasteful but body-revealing, form-fitting cuts). Men: build 0 = handsome scholar, build 1 = muscular.
export const FIGURE_F = 'tall and slender with long legs and a graceful long neck, a curvaceous elegant hourglass figure with a very slim waist, a full bust and wide, fully rounded hips with shapely thighs, with a glamorous, sensual silhouette, in tight form-fitting clothes';
export const FIGURE_M = [
  'tall and slender with long legs, elegant long hands and a refined scholarly build',
  'tall with very broad shoulders, a deep strong chest, thick powerfully muscular arms and a narrow waist, a heavily muscled heroic athletic build',
];
// The standing pose picture: a graceful pose full of presence instead of a stiff straight stance. Chosen from the seed, so a character keeps its pose.
export const POSE_F = [
  'one hand lightly lifting a long flowing sleeve in front of her chest, her weight on one leg with her hip pushed out to the side in a pronounced graceful S-curve, her chin slightly raised, a poised, alluring and faintly aloof gaze, sleeves, ribbons and hair swaying in a gentle wind',
  'a graceful three-quarter turn with her face looking back over the shoulder at the viewer, one hand holding her sleeve, her hips turned and swaying to one side, a long curving silhouette that shows the curve of her waist and hips, long hair flowing in the wind, a confident, knowing expression',
  'standing tall with one hand resting on her hip and the other raised in a delicate lotus-finger gesture, her weight on one leg and one foot slightly forward so that her hip juts out to the side, a regal immortal presence with her robes billowing softly',
  'her body in a three-quarter side view in a long elegant S-curve with her hip swaying out, one hand lightly touching her waist and the other arm relaxed, her face turned toward the viewer with a serene, alluring, otherworldly look, sleeves and hair drifting in a breeze',
];
export const POSE_M = [
  [ // scholar
    'a three-quarter turn with one foot a step forward, one arm swept gracefully out to the side with the palm open and a long sleeve streaming in the wind, the other hand behind his back, his head turned and lifted toward the viewer with a calm, transcendent smile, his long hair and robe flowing strongly in the wind',
    'standing in an elegant leaning stance with his weight on the back leg, one hand raised at his chest in a two-finger sword gesture and the other hand behind his back, his chest open and his chin lifted, a poised, righteous gaze, his hair and wide sleeves blown by a strong wind',
    'a graceful turning pose as if stepping onto a cloud: his body twisted in three-quarter view, one hand lifting a wide sleeve high in front of his face-side while the other arm trails behind, his eyes looking back at the viewer with a free, immortal air, robes and hair billowing in the wind',
  ],
  [ // muscular
    'a powerful wide stance with his feet shoulder-width apart, one fist held against his chest and the other hand behind his back, his chest forward, a heroic confident look, hair and robe blown by a strong wind',
    'a commanding three-quarter stance, one hand extended with the palm open as if gathering spiritual energy, the other fist at his waist, his shoulders squared, a fierce yet noble gaze, robe and hair streaming in the wind',
    'standing tall with his arms crossed over his broad chest, his weight on one leg, his head slightly raised with a confident, noble smile, his robe and hair stirred by the wind',
  ],
];

export const ORIGINS = [
  { n: 'Tán Tu', note: 'lang bạt khắp nơi, không sư môn', stones: 30, talis: 3 },
  { n: 'Thế Gia Đệ Tử', note: 'con cháu một gia tộc tu tiên đã sa sút', stones: 150, talis: 0 },
  { n: 'Cô Nhi Sơn Thôn', note: 'lớn lên ở thôn nhỏ dưới chân núi', stones: 0, talis: 6 },
  { n: 'Thiếu Chủ Sa Sút', note: 'thiếu chủ của một môn phái đã diệt vong', stones: 80, talis: 2 },
  { n: 'Lãng Khách', note: 'kiếm khách rong ruổi, mang theo ân oán giang hồ', stones: 20, talis: 4 },
  { n: 'Đệ Tử Ngoại Môn', note: 'đệ tử ngoại môn thường bị coi thường', stones: 60, talis: 3 },
];

// A guest plays with these three; linking an e-mail rolls the character's own (see G.rollFate).
export const GUEST_FATE = { origin: 0, linh: ['Thổ'], purity: 0.75, pers: 2 };   // Tán Tu, Thổ Linh Căn, Điềm Tĩnh

// ---------- Phường Thị (shop): twelve items, unlimited stock, prices from Balance_Config.shop (Requirement 24)
export const GRADES = ['Hoàng', 'Huyền', 'Địa', 'Thiên'];
export interface ShopItem { id: string; name: string; kind: 'taming' | 'hp' | 'bt' | 'trib'; idx: number; price: number; note: string }
export const SHOP: ShopItem[] = [
  ...BALANCE.shop.taming.map((price, idx) => ({ id: `taming${idx}`, name: `Khế Ước Phù hạng ${GRADES[idx]}`, kind: 'taming' as const, idx, price, note: 'Dùng cho mỗi lần thử thu phục. Hạng cao thu phục dễ hơn.' })),
  ...BALANCE.shop.hp.map((price, idx) => ({ id: `hp${idx}`, name: `Hồi Khí Đan hạng ${idx + 1}`, kind: 'hp' as const, idx, price, note: `Hồi ${Math.round(BALANCE.pillRestore[idx] * 100)}% sinh lực tối đa.` })),
  ...BALANCE.shop.breakthrough.map((price, idx) => ({ id: `bt${idx}`, name: `Phá Cảnh Đan (vào ${REALMS[idx + 1]})`, kind: 'bt' as const, idx, price, note: `Cộng ${Math.round(BALANCE.breakPillBonus * 100)}% xác suất khi đột phá vào ${REALMS[idx + 1]}.` })),
  { id: 'trib', name: 'Độ Kiếp Phù', kind: 'trib' as const, idx: 0, price: BALANCE.shop.tribulation, note: `Giảm ${Math.round(BALANCE.tribulationReduction * 100)}% sát thương nhận từ Thiên Kiếp.` },
];
export const SHOP_ITEM = (id: string) => SHOP.find((s) => s.id === id);

// ---------- fixed pictures: Phường Thị goods, materials, zones and the market (drawn once by scripts/pregen.ts into public/art)
export const shopArt = (id: string) => `/art/shop/${id}.jpg`;
export const matArt = (id: string) => `/art/shop/mat_${id}.jpg`;
export const zoneArt = (id: string) => `/art/zones/${id}.jpg`;
export const MARKET_ART = '/art/zones/market.jpg';
export const NIGHT_ART = '/art/zones/chodem.jpg';
export const NIGHT_EMPTY_ART = '/art/zones/chodem_quay.jpg';
export const uiArt = (id: string) => `/art/ui/${id}.jpg`;
// The same pictures with the black around them cut away (`npm run thumbs` makes them from the drawn ones, scripts/thumbs.ts): public/art/ui/cut/{id}.png. Triển Lãm uses these for its stands and its chest.
export const cutArt = (id: string) => `/art/ui/cut/${id}.png`;
export const bookArt = (cls: string) => `/art/shop/book_${cls}.jpg`;
// One picture per technique (Bí Kíp) and per Công Pháp scroll, shared by every player: drawn once by scripts/pregen.ts into public/art/books.
export const slug = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
export const techArt = (name: string) => `/art/books/${slug(name)}.jpg`;
// The portraits of the Khách Cầu Mua (lib/orders.ts): one woman and one man for each of the six kinds of cultivator in NPC_TITLES. They are drawn once by `npm run pregen -- --only buyers`
// and shared by every player; a card without its file shows the kind's icon instead.
export const buyerArt = (arch: string, g: 'f' | 'm') => `/art/buyers/${slug(arch)}_${g}.jpg`;
export const BUYER_EN: Record<string, string> = {
  'Tán Tu': 'a wandering rogue cultivator in a clean but well-worn travelling robe of grey-blue linen with a bamboo hat slung on the back and a small gourd at the belt, warm friendly eyes and a relaxed half-smile',
  'Kiếm Tu': 'a sword cultivator in sleek dark-blue and silver robes with a sword hilt rising over one shoulder, a sharp composed gaze and a calm, proud bearing',
  'Đan Sư': 'an alchemist in layered jade-green and cream robes with a small jade pill gourd and a herb pouch at the belt, gentle clever eyes and a kind smile',
  'Phù Sư': 'a talisman master in deep violet and white robes with blank paper talismans tucked into a sleeve and a calligraphy brush resting in the hair, a calm mysterious look',
  'Thể Tu': 'a body cultivator in a short martial robe with bare strong forearms wrapped in leather bracers, a healthy glow and a confident, cheerful grin',
  'Ma Tu': 'a dark-path cultivator in elegant black and crimson robes with silver filigree and a faint violet aura around the shoulders, a graceful, slightly dangerous smile',
};
// ---------- Chiến trường: every fight happens on one of 12 arenas (two per zone, chosen by the tick). An arena strengthens the techniques of some
// elements and weakens those of others, for everybody on it (the player, Linh Thú and the foe). Pictures: public/art/arenas (scripts/pregen.ts).
export interface Arena { id: string; zone: string; name: string; note: string; boost: string[]; weaken: string[] }
export const ARENA_BOOST = 1.12, ARENA_WEAKEN = 0.88;
export const ARENAS: Arena[] = [
  { id: 'thanvan_suoi', zone: 'thanhvan', name: 'Linh Tuyền Cốc', note: 'Suối linh chảy qua thung lũng mù sương.', boost: ['Thủy', 'Mộc'], weaken: ['Hỏa'] },
  { id: 'thanvan_cothu', zone: 'thanhvan', name: 'Cổ Thụ Đài', note: 'Đài đá dưới gốc cổ thụ ngàn năm.', boost: ['Mộc', 'Thổ'], weaken: ['Kim'] },
  { id: 'hannguyet_truc', zone: 'hannguyet', name: 'Nguyệt Quang Trúc Hải', note: 'Rừng trúc dưới trăng lạnh.', boost: ['Âm', 'Thủy'], weaken: ['Dương'] },
  { id: 'hannguyet_dam', zone: 'hannguyet', name: 'Hàn Đàm', note: 'Đầm băng phản chiếu ánh trăng.', boost: ['Thủy'], weaken: ['Hỏa', 'Lôi'] },
  { id: 'xichviem_dungnham', zone: 'xichviem', name: 'Dung Nham Trì', note: 'Hồ dung nham sôi sục.', boost: ['Hỏa'], weaken: ['Thủy', 'Mộc'] },
  { id: 'xichviem_lo', zone: 'xichviem', name: 'Thiết Hỏa Lò', note: 'Lò rèn cổ bên vách núi lửa.', boost: ['Kim', 'Hỏa'], weaken: ['Mộc'] },
  { id: 'loivan_dai', zone: 'loivan', name: 'Lôi Đài Cổ', note: 'Đài đá giữa bão sấm.', boost: ['Lôi'], weaken: ['Mộc', 'Thủy'] },
  { id: 'loivan_nhai', zone: 'loivan', name: 'Vân Nhai', note: 'Vách đá trên biển mây đen.', boost: ['Lôi', 'Dương'], weaken: ['Âm'] },
  { id: 'cuuu_khe', zone: 'cuuu', name: 'U Minh Liệt Khe', note: 'Khe nứt hư không nuốt ánh sáng.', boost: ['Âm'], weaken: ['Dương', 'Kim'] },
  { id: 'cuuu_nhatnguyet', zone: 'cuuu', name: 'Nhật Nguyệt Giao Thực', note: 'Nhật nguyệt giao nhau trên đài vỡ.', boost: ['Dương', 'Âm'], weaken: ['Thổ'] },
  { id: 'tinhha_cau', zone: 'tinhha', name: 'Thiên Hà Ngọc Kiều', note: 'Cầu ngọc vỡ bắc ngang dòng sông sao.', boost: ['Kim', 'Dương'], weaken: ['Mộc'] },
  { id: 'tinhha_dai', zone: 'tinhha', name: 'Tinh Thần Tế Đài', note: 'Đài tế cổ giữa biển sao rơi.', boost: ['Lôi', 'Âm'], weaken: ['Thổ'] },
];
export const ARENA = (id: string | undefined) => ARENAS.find((a) => a.id === id) || null;
export const arenaMult = (a: Arena | null, el?: string) => (!a || !el ? 1 : a.boost.includes(el) ? ARENA_BOOST : a.weaken.includes(el) ? ARENA_WEAKEN : 1);
export const arenaArt = (id: string) => `/art/arenas/${id}.jpg`;
// English descriptions used only to build prompts on the server (the browser sends just the id).
export const PROP_EN: Record<string, string> = {
  taming0: 'a rectangular spirit-taming contract tablet of warm yellow jade with a glowing knot pattern and a silk tassel',
  taming1: 'a rectangular spirit-taming contract tablet of deep midnight-blue jade with a glowing silver knot pattern and a silk tassel',
  taming2: 'a rectangular spirit-taming contract tablet of earthy crimson-brown jade with a glowing amber knot pattern and a silk tassel',
  taming3: 'a rectangular spirit-taming contract tablet of radiant white-gold jade with a brilliant glowing knot pattern, floating light particles and a silk tassel',
  hp0: 'one small round healing elixir pill, pale green, resting in a tiny jade dish with a faint glow',
  hp1: 'two round healing elixir pills, silver-green with a soft shimmering aura, resting in an ornate jade dish',
  hp2: 'a radiant golden-red spirit elixir pill wrapped in swirling qi, resting in an ornate gold-trimmed jade dish',
  bt0: 'a luminous breakthrough elixir pill glowing blue-white with swirling qi, in a small jade cup',
  bt1: 'a luminous breakthrough elixir pill glowing molten gold with swirling qi, in a small jade cup',
  bt2: 'a luminous breakthrough elixir pill glowing violet with crackling energy, in an ornate jade cup',
  bt3: 'a radiant breakthrough elixir pill glowing white-gold with a halo and prismatic light, in an ornate gold-trimmed jade cup',
  bt4: 'a radiant breakthrough elixir pill of swirling silver starlight and a tiny glowing galaxy inside, haloed by drifting stardust, in an ornate silver-and-gold jade cup',
  trib: 'a protective thunder-ward amulet, a dark jade tablet wrapped in coiling violet lightning, with a silk tassel',
  mat_linhthao: 'a bundle of glowing spirit herbs with jade-green leaves and tiny luminous buds',
  mat_truc: 'a polished crystal shard of green bamboo essence with faint light inside',
  mat_ngoc: 'a chunk of icy cold jade marrow glowing pale blue with frost on its edges',
  mat_hoatinh: 'a fiery red-orange fire-spirit crystal stone with drifting embers',
  mat_loitinh: 'a crystal vial of violet lightning-essence sand with tiny sparks inside',
  mat_uminh: 'a ghostly dark indigo lotus flower glowing violet, with wisps of shadow',
  mat_tinhsa: 'a small crystal hourglass-shaped vial of glittering silver-blue stardust sand with tiny shining stars drifting inside',
  book_kiem: 'an ancient Chinese martial-arts manual, a thin bound book with a plain smooth dark blue leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a sword, glowing faintly',
  book_thuong: 'an ancient Chinese martial-arts manual, a thin bound book with a plain smooth dark red leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a spear, glowing faintly',
  book_cung: 'an ancient Chinese martial-arts manual, a thin bound book with a plain smooth dark green leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a bow, glowing faintly',
  book_dao: 'an ancient Chinese martial-arts manual, a thin bound book with a plain smooth dark brown leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a curved saber, glowing faintly',
  book_quyen: 'an ancient Chinese martial-arts manual, a thin bound book with a plain smooth dark orange leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a clenched fist, glowing faintly',
  book_cam: 'an ancient Chinese music manual, a thin bound book with a plain smooth deep purple leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a zither, glowing faintly',
  book_tieu: 'an ancient Chinese music manual, a thin bound book with a plain smooth teal leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a flute, glowing faintly',
  book_phat: 'an ancient Chinese daoist manual, a thin bound book with a plain smooth ivory-white leather cover that has no marks, no emblem and no ornament on it, closed with a silk cord from which hangs a small carved jade charm in the shape of a fly whisk, glowing faintly',
  book_method: 'an ancient Chinese cultivation scripture, a rolled scroll of aged paper with a smooth plain jade-green silk wrapping and carved jade end rollers, closed with a silk cord and a small carved jade charm in the shape of a lotus, glowing faintly',
  ui_lbl_alchemy: 'a wide horizontal xianxia button plaque with a smooth deep amber-bronze panel framed by a thick gold filigree border with carved cloud-scroll corners, a small gold alchemy cauldron with a wisp of smoke at the top centre, in the middle the words “Luyện Đan” in large embossed gold brush calligraphy lettering (exact spelling: L u y ệ n, then Đ a n; ệ is e with a circumflex and a dot below, Đ is D with a horizontal stroke)',
  ui_lbl_market: 'a wide horizontal xianxia button plaque with a smooth deep green jade panel framed by a thick gold filigree border with carved cloud-scroll corners, a small gold ingot and a coin pouch at the top centre, in the middle the words “Phường Thị” in large embossed gold brush calligraphy lettering (exact spelling: P h ư ờ n g, then T h ị; ư is u with a horn, ờ is o with a horn and a grave accent, ị is i with a dot below)',
  ui_lbl_arts: 'a wide horizontal xianxia button plaque with a smooth deep indigo-violet lacquer panel framed by a thick gold filigree border with carved cloud-scroll corners, a small floating sword at the top centre, in the middle the words “Thần Thông” in large embossed gold brush calligraphy lettering (exact spelling: T h ầ n, then T h ô n g; ầ is a with a circumflex and a grave accent, ô is o with a circumflex)',
  ui_lbl_pen: 'a wide horizontal xianxia button plaque with a smooth forest-green jade panel framed by a thick gold filigree border with carved cloud-scroll corners, a small carved fox head at the top centre, in the middle the words “Linh Thú” in large embossed gold brush calligraphy lettering (exact spelling: L i n h, then T h ú; ú is u with an acute accent)',
  ui_lbl_story: 'a wide horizontal xianxia button plaque with a smooth dark azure-blue lacquer panel framed by a thick gold filigree border with carved cloud-scroll corners, a small unrolled scroll at the top centre, in the middle the words “Thiên Thư” in large embossed gold brush calligraphy lettering (exact spelling: T h i ê n, then T h ư; ê is e with a circumflex, ư is u with a horn)',
  ui_lbl_odds: 'a wide horizontal xianxia button plaque with a smooth deep purple jade panel framed by a thick gold filigree border with carved cloud-scroll corners, a small glowing crystal orb at the top centre, in the middle the words “Xác suất” in large embossed gold brush calligraphy lettering (exact spelling: X á c, then s u ấ t; á is a with an acute accent, ấ is a with a circumflex and an acute accent)',
  ui_lbl_settings: 'a wide horizontal xianxia button plaque with a smooth dark bronze-slate panel framed by a thick gold filigree border with carved cloud-scroll corners, a small armillary sphere of gold rings at the top centre, in the middle the words “Cài đặt” in large embossed gold brush calligraphy lettering (exact spelling: C à i, then đ ặ t; à is a with a grave accent, đ is d with a stroke, ặ is a with a breve and a dot below)',
  ui_lbl_rank: 'a majestic wide horizontal ceremonial plaque of deep crimson lacquer with a thick gold border, two golden dragons curling around its left and right ends and a golden phoenix crest rising from the top centre, in the middle the two words “Phong Thần” in large embossed gold brush calligraphy lettering (exact spelling: P h o n g, then T h ầ n, where the letter ầ is the letter a with a circumflex hat ^ and a grave accent ` both drawn above it, clearly visible)',
  ui_lbl_kho: 'a wide horizontal treasure-vault plaque of dark teal jade with gold filigree borders, a small gold ingot and a lotus flower at each end and a jade pearl at the top centre, in the middle the two words “Kho báu” in large embossed gold brush calligraphy lettering (exact spelling: K h o, then b á u)',
  ui_btn_a: 'a wide horizontal xianxia button plaque of dark green jade with a thick gold filigree border, carved cloud-scroll ornaments at both ends and notched ornate corners, a smooth empty dark jade centre panel',
  ui_btn_b: 'a wide horizontal xianxia button plaque of deep red lacquer with a gold dragon-scale border, golden cloud-scroll corner brackets and a small gold lotus finial at each end, a smooth empty dark lacquer centre panel',
  ui_btn_c: 'a wide horizontal ancient talisman-shaped button plaque of dark teal jade with silver and gold inlay borders, pointed leaf-shaped ends with curled cloud tips and a thin glowing jade rim, a smooth empty centre panel',
  ui_seal_a: 'a round xianxia seal medallion of dark green jade with a thick gold ring border, eight small gold cloud ornaments around the rim and a smooth empty dark jade centre disc',
  ui_seal_b: 'a round xianxia seal medallion of deep red lacquer with a gold ring border, small gold lotus petals around the rim and a smooth empty dark lacquer centre disc',
  ui_loading: 'a cute round chibi-style glowing lotus flower icon that fills about 90 percent of the picture: one blooming pink and white lotus with soft rounded petals, a warm golden glow at its heart, two small jade-green leaves beneath it and a few tiny sparkling golden motes around it, adorable, gentle and friendly',
  ui_ico_rank: 'a round xianxia medallion icon that fills about 92 percent of the picture: a thick gold ring border with small gold cloud ornaments around a dark green jade disc, in the centre a golden crown above a mountain peak with a soft gold glow',
  ui_ico_bag: 'a round xianxia medallion icon that fills about 92 percent of the picture: a thick gold ring border with small gold cloud ornaments around a deep purple lacquer disc, in the centre a golden-corded embroidered qiankun cloth pouch with a glowing gold knot',
  ui_ico_quest: 'a round xianxia medallion icon that fills about 96 percent of the picture: a thick gold ring border with small gold cloud ornaments around a deep red lacquer disc, in the centre a smooth blank carved jade command token with a gold tassel and a bright golden flame rising above it, completely smooth surfaces',
  ui_expo_slab: 'a thin flat round slab of real natural light-grey granite, used as a display plinth: a low wide disc only about one fifth as tall as it is wide, its top surface smooth and slightly worn with faint natural veins and a few tiny dark and pale speckles, one thin shallow carved circle line close to the top edge, a plain rough-hewn chiselled side with visible stone grain and small chips, matte natural stone with no gold, no metal, no paint, no glow and no carving on the side, crisp clean outline, it fills about 92 percent of the picture width and nothing else is in the picture, an original design',
  ui_expo_chest: 'a small ornate xianxia treasure chest for the gifts of visitors, its lid closed: a rounded lid of deep red-brown lacquered wood with broad gold filigree bands and carved cloud-scroll gold corner plates, a round green jade medallion lock at the front centre with a gold ring, two small gold lotus finials at the ends of the lid, a thin line of warm golden light along the seam of the lid, crisp clean outline, it fills about 88 percent of the picture width and nothing else is in the picture, an original design',
};
export const PLACE_EN: Record<string, string> = {
  thanhvan: 'a misty green mountain valley at dawn with a clear stream, bamboo and pines, soft golden light rays, a serene beginning of a journey',
  hannguyet: 'a moonlit bamboo forest under a pale full moon, cold silver fog, blue and teal tones, glowing fireflies',
  xichviem: 'a volcanic canyon with rivers of glowing lava, black rock arches, red-orange light and drifting embers',
  loivan: 'a high plateau under dark storm clouds, violet lightning striking ancient stone pillars, dramatic wind',
  cuuu: 'a surreal void between yin and yang, floating islands, swirling black and gold mist, a glowing rift of light in the sky',
  tinhha: 'a shattered celestial river of stars in the void, a broken jade bridge of light arching over a glowing silver-blue galaxy, floating ruined palace pillars, drifting meteors and violet nebula clouds',
  market: 'a bustling ancient fantasy market street at dusk, hanging lanterns, wooden stalls with elixir bottles and jade tablets, warm lamp light, no readable signs',
  chodem: 'a mysterious xianxia night market in an ancient mountain-town alley after midnight, rows of red and amber paper lanterns, cloaked cultivators browsing wooden stalls laid with jade tablets, swords and glowing spirit artifacts, drifting incense smoke, a crescent moon over tiled roofs, deep indigo and warm gold light, no readable signs',
  chodem_quay: 'a single small wooden xianxia night-market stall under a hanging red paper lantern, empty cloth-covered counter with a tiny incense burner and a faint spirit-light glow, narrow stone alley at night, soft blue mist, no people, no readable signs',
  arena_thanvan_suoi: 'a wide xianxia duel arena beside a crystal-clear spirit spring in a misty green valley, smooth flat mossy stone ground in the foreground, bamboo and pines, soft golden light rays, cyan glowing water',
  arena_thanvan_cothu: 'a wide xianxia duel arena, a circular ancient stone platform beneath the roots of a colossal thousand-year tree, glowing green leaves, flat stone ground in the foreground, warm dappled light',
  arena_hannguyet_truc: 'a wide xianxia duel arena, a clearing of flat pale stone inside a moonlit bamboo sea under a huge full moon, cold silver fog, blue teal tones, drifting fireflies',
  arena_hannguyet_dam: 'a wide xianxia duel arena on a frozen pond of dark ice reflecting the moon, flat icy ground in the foreground, frost crystals, pale blue mist, cold moonlight',
  arena_xichviem_dungnham: 'a wide xianxia duel arena, a flat basalt platform in the middle of a bubbling lava lake, rivers of glowing orange lava, black rock arches, drifting embers',
  arena_xichviem_lo: 'a wide xianxia duel arena inside an ancient cliff-side forge cavern, flat dark iron-plated floor in the foreground, glowing molten metal channels, anvils and weapon racks in the dim background, orange sparks',
  arena_loivan_dai: 'a wide xianxia duel arena, a huge flat carved stone thunder platform on a high plateau, violet lightning striking ancient pillars around it, dark storm clouds, dramatic wind',
  arena_loivan_nhai: 'a wide xianxia duel arena on a flat cliff-top ledge above a sea of dark thunder clouds, golden sunset glow breaking through the clouds, forks of lightning in the distance',
  arena_cuuu_khe: 'a wide xianxia duel arena, a flat black stone floor beside a glowing rift in the void swallowing light, floating broken islands, swirling black and violet mist, faint gold cracks',
  arena_tinhha_cau: 'a wide xianxia duel arena, a flat broken jade bridge platform of pale stone spanning a glowing river of stars, silver-blue galaxy light, floating ruined pillars, drifting meteors',
  arena_tinhha_dai: 'a wide xianxia duel arena, a flat ancient circular sacrificial altar of dark stone amid falling stars and violet nebula clouds, faint silver rune lines, wide starry void',
  arena_cuuu_nhatnguyet: 'a wide xianxia duel arena, a cracked flat circular platform in the void under a solar eclipse where sun and moon overlap, black and gold light, floating stone fragments',
};
// Different looks for Địa and above (Requirement: rarer items are not drawn twice the same way).
export const ITEM_DESIGNS = [
  'with flowing cloud-swirl filigree', 'with a dragon-scale pattern', 'with lotus-petal motifs', 'with phoenix-feather detailing', 'with a star-map inlay of tiny gems', 'with intertwined bamboo-knot ornament',
  'with a crane-wing silhouette', 'with flame-like curves', 'with wave and mist patterns', 'with a crescent-moon motif', 'with thorny vine ornament', 'with a sun-ray burst design',
];

// ---------- Đạo hiệu (a name that belongs to the e-mail address) and its starting privileges
// About three accounts in ten have one (see daoOfEmail in game.ts). It is decided by the address alone, so making the character again does not change it.
// The privileges are given once, when the character is made. `taming` and `hp` are counts per grade (Hoàng..., Hạng 1...), `bt` per Realm of the pill.
export interface DaoPerks { stones?: number; taming?: number[]; hp?: number[]; bt?: number[]; trib?: number; weaponTier?: number }
export interface DaoInfo { name: string; blurb: string; perks: DaoPerks }
export const DAO_INFO: DaoInfo[] = [
  { name: 'Thanh Vân Tử', blurb: 'Người của Thanh Vân Sơn Cốc, nơi mọi đạo đồ bắt đầu. Mây núi ở đó vẫn nhớ tên ngươi.', perks: { stones: 80, taming: [3, 0, 0, 0] } },
  { name: 'Bạch Hạc Chân Nhân', blurb: 'Hạc trắng từng đưa tin cho ngươi giữa mây. Người đời tin ngươi có phúc đức từ kiếp trước.', perks: { hp: [6, 0, 0], trib: 1 } },
  { name: 'Vô Ưu Cư Sĩ', blurb: 'Sống nhàn giữa đời, của cải tự tìm đến. Ngươi chẳng mấy khi phải lo chuyện ăn tiêu.', perks: { stones: 200 } },
  { name: 'Phiêu Miểu Tiên Tử', blurb: 'Bóng dáng ngươi như ẩn như hiện giữa sương. Linh thú thường chịu lại gần ngươi hơn người khác.', perks: { taming: [0, 2, 0, 0], hp: [2, 1, 0] } },
  { name: 'Tử Hà Quân', blurb: 'Sinh ra lúc ráng tím phủ đầu núi. Pháp khí đầu đời của ngươi mang theo chút linh khí.', perks: { weaponTier: 1 } },
  { name: 'Linh Tê Đạo Nhân', blurb: 'Một sợi linh tê nối lòng ngươi với thiên đạo. Cửa ải đầu tiên sẽ dễ vượt hơn.', perks: { taming: [2, 0, 0, 0], bt: [1, 0, 0, 0] } },
  { name: 'Huyền Băng Lão Tổ', blurb: 'Hơi lạnh quanh ngươi chưa bao giờ tan. Thương thế đến gần ngươi cũng chậm lại.', perks: { hp: [4, 2, 0], stones: 40 } },
  { name: 'Xích Diễm Chân Quân', blurb: 'Lửa trong người ngươi nóng hơn người thường. Pháp khí cầm lên là ấm tay.', perks: { weaponTier: 1, stones: 30 } },
  { name: 'Lôi Đình Tán Nhân', blurb: 'Sấm đánh trúng nơi ngươi đứng mà ngươi vẫn sống. Thiên kiếp sau này chưa chắc làm khó được ngươi.', perks: { bt: [1, 0, 0, 0], trib: 1 } },
  { name: 'Thanh Liên Cư Sĩ', blurb: 'Hoa sen nở trong đầm nơi ngươi dừng chân. Linh thú thấy ngươi hiền nên dễ lại gần.', perks: { taming: [2, 1, 0, 0] } },
  { name: 'Hồng Trần Khách', blurb: 'Đã nếm đủ chuyện đời trước khi bước vào đạo. Túi tiền và bình thuốc của ngươi đều đã sẵn.', perks: { stones: 150, hp: [2, 0, 0] } },
  { name: 'Mạc Sơn Đạo Nhân', blurb: 'Ở ẩn dưới chân núi Mạc từ rất lâu. Nghề quen tay: bắt linh thú bằng khế ước.', perks: { taming: [4, 0, 0, 0] } },
  { name: 'Vân Hạc Tiên Sinh', blurb: 'Đi theo đàn hạc qua mây, học được cách giữ gìn sức lực trên đường dài.', perks: { hp: [3, 2, 0], taming: [1, 0, 0, 0] } },
  { name: 'Ngọc Hư Tử', blurb: 'Tâm sáng như ngọc. Ai gặp ngươi cũng muốn tặng thứ gì đó cho yên lòng.', perks: { stones: 100, trib: 1 } },
  { name: 'Cửu Thiên Lữ Khách', blurb: 'Đi tới đâu cũng như đang ngó xuống từ chín tầng trời. Linh thú tin ngươi nhanh hơn thường.', perks: { taming: [0, 3, 0, 0] } },
  { name: 'Tuyết Nguyệt Tiên Tử', blurb: 'Trăng trên tuyết là thứ ngươi thấy đầu tiên. Dáng người nhẹ như không, ít khi bị thương nặng.', perks: { hp: [5, 1, 0], stones: 40 } },
  { name: 'Hắc Phong Cư Sĩ', blurb: 'Gió đen thổi qua nơi ngươi sinh ra. Một món binh khí cũ ngươi đem theo vẫn còn sắc.', perks: { weaponTier: 1 } },
  { name: 'Kim Ô Chân Nhân', blurb: 'Nắng gắt nơi ngươi lớn lên làm da ngươi sạm lại nhưng ví dày lên.', perks: { stones: 120, taming: [2, 0, 0, 0] } },
  { name: 'Trúc Lâm Ẩn Sĩ', blurb: 'Sống giữa rừng trúc, quen pha thuốc từ lá. Bình đan nhà ngươi lúc nào cũng đầy.', perks: { hp: [8, 0, 0] } },
  { name: 'Thiên Cơ Đạo Trưởng', blurb: 'Biết trước vài chuyện nhỏ. Lúc cần, ngươi luôn có sẵn một viên đan phá cảnh.', perks: { bt: [1, 0, 0, 0], stones: 60 } },
  { name: 'Hạo Nhiên Tiên Sinh', blurb: 'Chính khí đầy người, tà ma tránh xa. Linh thú hiếm cũng tin ngươi hơn.', perks: { taming: [0, 2, 0, 0], trib: 1 } },
  { name: 'Phong Ngọc Công Tử', blurb: 'Phong thái nhàn nhã của kẻ chưa từng thiếu thốn. Tiền bạc đến và đi dễ dàng.', perks: { stones: 90, hp: [3, 0, 0] } },
  { name: 'Dạ Du Thần', blurb: 'Quen đi đêm một mình. Trên đường không ai, ngươi có đủ khế ước và thuốc để tự lo.', perks: { taming: [3, 0, 0, 0], hp: [2, 0, 0] } },
  { name: 'Thiên Sơn Lão Nhân', blurb: 'Người già nhất trong thôn dưới Thiên Sơn kể ngươi có phúc. Họ đóng góp đôi chút để tiễn ngươi lên đường.', perks: { stones: 60, taming: [1, 1, 0, 0], hp: [2, 1, 0] } },
  { name: 'Bích Hà Tiên Tử', blurb: 'Ráng xanh phủ trên đầu ngươi lúc ngươi sinh ra. Hai tấm phù hộ thân là quà của người nhà.', perks: { trib: 2 } },
  { name: 'Vạn Pháp Đạo Nhân', blurb: 'Học một chút của mọi môn. Một món pháp khí tốt và vài khế ước đủ cho ngươi bắt đầu.', perks: { weaponTier: 1, taming: [1, 0, 0, 0] } },
];
export const DAO = DAO_INFO.map((d) => d.name);
export const daoInfo = (name: string): DaoInfo | undefined => DAO_INFO.find((d) => d.name === name);

// ---------- Chức vụ: a post the character holds for a while. 30 of them. They bring nothing yet: they are only a name next to the character.
// Fate (a person met on the road) gives, changes or takes one away while the character adventures (see destinyAt in game.ts).
export interface TitleDef { id: string; name: string; blurb: string }
export const TITLES: TitleDef[] = [
  ['khachkhanh', 'Khách Khanh Thanh Vân Tông', 'Được tông môn mời làm khách, ra vào sơn môn không bị cản.'],
  ['chapsu', 'Ngoại Môn Chấp Sự', 'Trông coi việc vặt của đệ tử ngoại môn, nói gì người ta cũng nghe nửa câu.'],
  ['truonglao', 'Trưởng Lão Danh Dự', 'Cái danh nhiều hơn cái quyền, nhưng đi đâu cũng được chào hỏi.'],
  ['tuansonsu', 'Tuần Sơn Sứ', 'Đi tuần quanh sơn môn, xua yêu thú lạc đường.'],
  ['thuto', 'Thủ Tọa Kiếm Đường', 'Đứng đầu một nhóm kiếm tu trẻ, tay chưa từng rời chuôi kiếm.'],
  ['dancp', 'Đan Các Cung Phụng', 'Được Đan Các nuôi để thử đan mới, mỗi lần uống đều thấp thỏm.'],
  ['phutran', 'Phù Trận Khách Khanh', 'Biết vẽ vài đạo phù, được các phù sư kính nể.'],
  ['hophap', 'Hộ Pháp Hàn Nguyệt Lâm', 'Giữ rừng trúc dưới trăng, đêm đêm nghe tiếng sáo từ xa.'],
  ['tranthu', 'Trấn Thủ Linh Mạch', 'Canh một mạch linh khí nhỏ, ngày ngày ngồi thiền bên nó.'],
  ['sugia', 'Sứ Giả Truyền Tin', 'Chạy tin giữa các tông môn, chân nhanh hơn phép.'],
  ['thivi', 'Thị Vệ Của Thành Chủ', 'Đứng gác trước cổng một tòa thành nhỏ, lương ít nhưng yên ổn.'],
  ['dientich', 'Điển Tịch Quan', 'Giữ kho sách cũ, biết chỗ nào có bí kíp mà chưa dám mở.'],
  ['duocvien', 'Dược Viên Quản Sự', 'Chăm vườn linh thảo, tay lúc nào cũng dính bùn và hương thuốc.'],
  ['thuhoc', 'Linh Thú Sư Học Đồ', 'Đang học cách nói chuyện với linh thú, chưa con nào chịu nghe.'],
  ['daosu', 'Truyền Công Đạo Sư', 'Dạy người khác điều mình vừa mới hiểu.'],
  ['tetuu', 'Tế Tửu Học Cung', 'Trông coi học cung, mỗi sáng đọc một đoạn kinh cho đệ tử nghe.'],
  ['phomon', 'Phó Môn Chủ Danh Nghĩa', 'Một môn phái nhỏ sắp diệt vong ban cho cái danh này, kèm lời nhờ cậy.'],
  ['cungphung', 'Cung Phụng Của Thế Gia', 'Được một thế gia nuôi để phòng khi cần ra tay.'],
  ['thamhiem', 'Thám Hiểm Đoàn Trưởng', 'Dẫn một đoàn người liều lĩnh đi tìm bí cảnh, chưa lần nào về đủ người.'],
  ['khaison', 'Khai Sơn Tiên Phong', 'Đi trước dọn đường cho đoàn người sau, quen với mùi yêu khí.'],
  ['thuho', 'Thủ Hộ Cổ Miếu', 'Giữ một ngôi miếu hoang, khói hương lạnh nhưng thần vẫn nghe.'],
  ['luckhach', 'Lữ Khách Ngộ Đạo', 'Không thuộc về đâu, chỉ đi và nhìn, thỉnh thoảng thấy mình đã hiểu ra điều gì.'],
  ['chuongquy', 'Chưởng Quầy Phường Thị', 'Có một sạp nhỏ ở Phường Thị, giá cả toàn do ngươi nói.'],
  ['thoren', 'Thợ Rèn Linh Khí', 'Tay chai sạn vì búa, tai quen với tiếng lửa kêu.'],
  ['hoasu', 'Họa Sư Thiên Cơ', 'Vẽ lại những gì mình thấy trên đường, vài nét bỗng thành điềm báo.'],
  ['camsu', 'Cầm Sư Dưới Trăng', 'Gảy đàn bên suối, ai nghe cũng im lặng một lúc.'],
  ['kiemkhach', 'Kiếm Khách Vô Danh', 'Kiếm tốt nhưng không ai biết tên, ngươi thấy thế cũng được.'],
  ['quantinh', 'Quan Tinh Thuật Sĩ', 'Ngước nhìn sao mỗi đêm, đoán được vài chuyện nhỏ sắp tới.'],
  ['dexi', 'Đệ Tử Ký Danh', 'Tên có trong sổ tông môn nhưng chưa có sư phụ.'],
  ['hanhgia', 'Hành Giả Vân Du', 'Đi theo mây, ở đâu qua đêm cũng được.'],
].map(([id, name, blurb]) => ({ id: id.replace(/\s/g, ''), name, blurb }));
export const titleOf = (id?: string | null): TitleDef | undefined => (id ? TITLES.find((t) => t.id === id) : undefined);
// The people fate puts on the road, and what they do (used to write the line in the journey; the numbers come from a hash, not from the game's random streams).
export const DESTINY_WHO = ['một lão đạo sĩ râu bạc', 'một vị tiên tử áo lam', 'một thiếu niên đeo kiếm gỗ', 'một lão thương nhân của Phường Thị', 'một ni cô lặng lẽ bên suối', 'một trưởng lão tông môn áo xám', 'một thư sinh đọc sách dưới trăng', 'một lão ngư ông bên hồ', 'một cô gái bán hoa trên núi', 'một hành giả che nửa mặt'];
export const DESTINY_GIVE = ['nhìn ngươi hồi lâu rồi gật đầu', 'trao cho ngươi một tấm lệnh bài gỗ', 'nói một câu như chỉ điểm cả đời', 'mời ngươi một chén trà nguội', 'đặt tay lên vai ngươi và mỉm cười'];
export const DESTINY_LOSE = ['thu lại tấm lệnh bài, chẳng nói gì', 'lắc đầu bảo ngươi chưa xứng', 'chỉ nhìn ngươi, rồi chức vị tan như khói', 'nói thời của ngươi ở đó đã hết'];
// The privileges of a đạo hiệu as plain lines for the window that shows it.
export function daoPerkLines(k: DaoPerks): string[] {
  const out: string[] = [];
  if (k.stones) out.push(`+${k.stones} Linh Thạch`);
  (k.taming || []).forEach((n, i) => { if (n) out.push(`+${n} Khế Ước Phù hạng ${GRADES[i]}`); });
  (k.hp || []).forEach((n, i) => { if (n) out.push(`+${n} Hồi Khí Đan hạng ${i + 1}`); });
  (k.bt || []).forEach((n, i) => { if (n) out.push(`+${n} Phá Cảnh Đan (vào ${REALMS[i + 1]})`); });
  if (k.trib) out.push(`+${k.trib} Độ Kiếp Phù`);
  if (k.weaponTier !== undefined) out.push(`Pháp khí khởi đầu hạng ${RARITY[k.weaponTier]}`);
  return out;
}

// ---------- Luyện Đan (the Alchemy window): recipes that turn materials into Hồi Khí Đan. Free: only the materials are used.
export interface Recipe { id: string; grade: number; need: Record<string, number> }
export const RECIPES: Recipe[] = [
  { id: 'hp0', grade: 0, need: { linhthao: 8 } },
  { id: 'hp1', grade: 1, need: { linhthao: 12, truc: 4 } },
  { id: 'hp2', grade: 2, need: { linhthao: 10, truc: 8, ngoc: 4 } },
];

// A tall (portrait) version of each zone scene for phones: drawn at 9:16, shown instead of the wide one when the screen is taller than it is wide.
for (const z of ['thanhvan', 'hannguyet', 'xichviem', 'loivan', 'cuuu', 'tinhha']) PLACE_EN[`${z}_v`] = PLACE_EN[z];
// The banner behind each element's Chủ Đề Tuần (the weekly theme in Nhiệm Vụ & Tin Tức): one wide scene per element, drawn once by `npm run pregen -- --only zones` into public/art/zones/week_<el>.jpg.
// A wide, low strip is what is shown, so the interesting part sits in the middle and the sides are calm (the text lies over the left).
export const WEEK_EN: Record<string, string> = {
  hoa: 'a sea of drifting flame and glowing embers rising from a cracked volcanic plain, rivers of molten gold, a vermilion phoenix-like fire spirit made only of flames far away, deep crimson and orange light',
  thuy: 'a vast moonlit ocean of luminous blue waves under a swirling sky, a mighty tide rolling toward ancient stone steps, foam of glowing jade and sapphire, drifting water spirits made of mist',
  moc: 'an ancient colossal spirit tree forest with glowing green leaves, thick hanging vines and blossoms, shafts of soft golden light, floating pollen of qi, deep emerald tones',
  kim: 'a mountain of gleaming white-gold metal peaks and sword-like crystalline spires catching sharp sunlight, falling silver sparks, a cold polished steel sky, radiant platinum and pale gold',
  tho: 'rolling ochre highlands and monumental carved stone terraces with towering earthen pillars, a great yellow dust-wind, warm amber light, quiet and heavy atmosphere',
  loi: 'a violent storm sky over jagged black peaks, forks of violet and white lightning striking down, glowing purple storm clouds, crackling electric arcs, dramatic and powerful',
  am: 'a midnight valley under a dim half-hidden moon, thick indigo mist and pale ghostly lanterns, silent black pines, wisps of purple shadow, cold and mysterious',
  duong: 'a radiant golden sunrise over a sea of clouds, huge rays of warm light fanning out, shining jade-gold temple roofs far away, glowing white and gold, majestic and warm',
};
for (const [el, d] of Object.entries(WEEK_EN)) PLACE_EN[`week_${el}`] = d;
export const weekArt = (el: string) => zoneArt(`week_${slug(el)}`);
// The three story cards a new character sees first (components/Onboarding.tsx), vertical for phones. Appended last so no earlier picture changes its seed.
PLACE_EN.onboard_1_v = 'a vast sea of clouds at dawn above floating spirit mountains, ribbons of luminous qi falling like silver rain onto blossoming land, a tiny lone pavilion on a far peak, warm golden light, the quiet birth of a world';
PLACE_EN.onboard_2_v = 'a creeping wall of thick gray fog swallowing a green valley, withering glowing trees, pale hollow ghost-like beast silhouettes drifting inside the mist, sickly gray and cold teal tones, the last warm light fading, ominous but beautiful';
PLACE_EN.onboard_3_v = 'the foot of a misty mountain above a sea of clouds at first light, a winding stone path rising through old pines toward a glowing sunrise, a single small spirit stone glowing warmly on a mossy rock in the foreground, hopeful gold and jade tones';
