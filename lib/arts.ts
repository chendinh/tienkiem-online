// Môn pháp (martial schools): what the player can do with the weapon in hand (Requirement 18, extended).
// Every weapon base belongs to one môn (C.WEAPON_CLASS). A môn has one free basic attack and four techniques (Hoàng, Huyền, Địa, Thiên) of fixed elements.
// Techniques are learned from Bí Công dropped by foes, then put into the môn's technique slots; only the môn of the weapon in hand is used in a fight.
import * as C from './content';
import { BALANCE as B } from './balance';

export interface Tech extends C.SkillDef { cls: string; tier: number; hits: number; pierce: number; crit: number; basic: boolean; desc: string }
export const GROUPS: C.SkillGroup[] = ['Tấn Công', 'Phòng Thủ', 'Hồi Phục', 'Cường Hóa', 'Suy Yếu', 'Khống Chế'];
export interface ArtClass { id: string; name: string; short: string; blurb: string; basic: string; style: string }

// One row per môn: how its techniques differ (damage per strike, strikes, armour ignored, extra crit, Spirit and cooldown scaling).
const MOD: Record<string, { coef: number; hits: number; pierce: number; crit: number; spirit: number; cd: number }> = {
  kiem: { coef: 1.0, hits: 1, pierce: 0, crit: 12, spirit: 1, cd: 0 },
  thuong: { coef: 1.0, hits: 1, pierce: 0.25, crit: 0, spirit: 1.1, cd: 0 },
  cung: { coef: 0.62, hits: 2, pierce: 0, crit: 0, spirit: 1, cd: 0 },
  dao: { coef: 1.15, hits: 1, pierce: 0, crit: 0, spirit: 1, cd: 1 },
  quyen: { coef: 1.0, hits: 1, pierce: 0, crit: 0, spirit: 0.6, cd: -1 },
  cam: { coef: 1.0, hits: 1, pierce: 0.5, crit: 0, spirit: 1, cd: 0 },
  tieu: { coef: 1.02, hits: 1, pierce: 0.5, crit: 8, spirit: 1, cd: 0 },
  phat: { coef: 1.08, hits: 1, pierce: 0, crit: 0, spirit: 0.8, cd: 0 },
};
export const ARTS: ArtClass[] = [
  { id: 'kiem', name: 'Kiếm Đạo', short: 'Kiếm', basic: 'Kiếm Khí Trảm', style: 'Bạo kích cao', blurb: 'Đường kiếm nhanh và sắc, dễ tung đòn chí mạng.' },
  { id: 'thuong', name: 'Thương Pháp', short: 'Thương', basic: 'Xuyên Vân Thương', style: 'Xuyên giáp', blurb: 'Mũi thương xuyên giáp, bỏ qua một phần phòng ngự của đối phương.' },
  { id: 'cung', name: 'Cung Đạo', short: 'Cung', basic: 'Liên Châu Tiễn', style: 'Hai mũi tên mỗi lượt', blurb: 'Bắn liền hai mũi tên mỗi lượt, mỗi mũi nhẹ hơn một nhát chém.' },
  { id: 'dao', name: 'Đao Pháp', short: 'Đao', basic: 'Phách Sơn Đao', style: 'Đòn nặng', blurb: 'Mỗi nhát đao nặng tay, đổi lại phải chờ lâu hơn mới tung lại chiêu mạnh.' },
  { id: 'quyen', name: 'Quyền Pháp', short: 'Quyền', basic: 'Thiết Quyền', style: 'Rẻ Linh Lực, hồi nhanh', blurb: 'Tay không hoặc găng sắt, chiêu tốn ít Linh Lực và hồi nhanh nên ra liên tục.' },
  { id: 'cam', name: 'Cầm Đạo', short: 'Cầm', basic: 'Cầm Âm Kích', style: 'Âm ba xuyên giáp', blurb: 'Tiếng đàn xuyên thẳng vào kinh mạch, bỏ qua một nửa phòng ngự.' },
  { id: 'tieu', name: 'Tiêu Đạo', short: 'Tiêu', basic: 'Tiêu Âm Kích', style: 'Âm xuyên giáp, có bạo kích', blurb: 'Tiếng tiêu sắc lạnh, bỏ qua một nửa phòng ngự và thỉnh thoảng gây chí mạng.' },
  { id: 'phat', name: 'Phù Chú', short: 'Phù', basic: 'Phất Trần Chú', style: 'Tiết kiệm Linh Lực', blurb: 'Phất trần niệm chú, phép đủ hệ, tốn ít Linh Lực hơn các môn khác.' },
];
export const ART = (id: string) => ARTS.find((a) => a.id === id)!;

// [name, element] of the four techniques of each môn, from Hoàng to Thiên.
const LIST: Record<string, [string, string][]> = {
  kiem: [['Kim Quang Kiếm', 'Kim'], ['Xích Diễm Kiếm', 'Hỏa'], ['Cửu Thiên Lôi Kiếm', 'Lôi'], ['Thái Dương Phá Thiên Kiếm', 'Dương']],
  thuong: [['Phá Giáp Thương', 'Kim'], ['Trấn Sơn Thương', 'Thổ'], ['Giao Long Xuất Hải', 'Thủy'], ['Thiên Lôi Phá Trận Thương', 'Lôi']],
  cung: [['Thanh Đằng Tiễn', 'Mộc'], ['Liệt Hỏa Tiễn', 'Hỏa'], ['U Minh Tiễn', 'Âm'], ['Kim Ô Xạ Nhật', 'Dương']],
  dao: [['Đoạn Kim Đao', 'Kim'], ['Liệt Hỏa Đao', 'Hỏa'], ['Khai Sơn Đao', 'Thổ'], ['Huyết Nguyệt Đao', 'Âm']],
  quyen: [['Bàn Thạch Quyền', 'Thổ'], ['Lôi Chấn Quyền', 'Lôi'], ['Liệt Dương Quyền', 'Hỏa'], ['Phật Quang Quyền', 'Dương']],
  cam: [['Xuân Phong Khúc', 'Mộc'], ['Lưu Thủy Khúc', 'Thủy'], ['U Minh Dạ Khúc', 'Âm'], ['Cửu Thiên Phượng Minh', 'Dương']],
  tieu: [['Lạc Anh Tiêu', 'Mộc'], ['Hàn Nguyệt Tiêu Âm', 'Thủy'], ['Phong Lôi Tiêu', 'Lôi'], ['Huyễn Ảnh Tiêu', 'Âm']],
  phat: [['Thanh Mộc Phù', 'Mộc'], ['Bích Ba Phù', 'Thủy'], ['Hậu Thổ Phù', 'Thổ'], ['Tam Muội Chân Hỏa', 'Hỏa']],
};
export const TIER_NAME = ['Hoàng', 'Huyền', 'Địa', 'Thiên'];
const TIER = [{ coef: 1.4, spirit: 8, cd: 1, minLevel: 1 }, { coef: 1.7, spirit: 12, cd: 2, minLevel: 5 }, { coef: 2.0, spirit: 18, cd: 3, minLevel: 10 }, { coef: 2.5, spirit: 26, cd: 4, minLevel: 15 }];

const FX_TEXT: Record<C.FxKind, (f: C.SkillFx) => string> = {
  heal: () => 'hồi Sinh Lực',
  guard: (f) => `giảm ${Math.round(f.amount * 100)}% sát thương nhận vào`,
  atkUp: (f) => `tăng ${Math.round(f.amount * 100)}% công kích${f.team ? ' cho cả đội' : ''}`,
  critUp: (f) => `tăng ${f.amount}% bạo kích`,
  atkDown: (f) => `giảm ${Math.round(f.amount * 100)}% công kích của địch`,
  defDown: (f) => `giảm ${Math.round(f.amount * 100)}% phòng ngự của địch`,
  stun: (f) => `địch mất ${f.turns} lượt`,
};
function describe(t: Omit<Tech, 'desc'>): string {
  const bits: string[] = [t.group];
  if (t.group === 'Tấn Công') {
    bits.push(t.el ? `hệ ${t.el}` : 'không hệ', `×${(t.coef * t.hits).toFixed(2)} sát thương${t.hits > 1 ? ` (${t.hits} đòn)` : ''}`);
    if (t.pierce) bits.push(`bỏ qua ${Math.round(t.pierce * 100)}% phòng ngự`);
    if (t.crit) bits.push(`+${t.crit}% bạo kích`);
  } else if (t.fx) {
    bits.push(t.fx.kind === 'heal' ? `hồi Sinh Lực ×${t.coef.toFixed(2)} công kích` : FX_TEXT[t.fx.kind](t.fx));
    if (t.fx.kind !== 'heal' && t.fx.kind !== 'stun') bits.push(`${t.fx.turns} hiệp`);
  }
  bits.push(t.spirit ? `${t.spirit} Linh Lực` : 'miễn phí', t.cd ? `hồi ${t.cd} hiệp` : 'không hồi chiêu');
  return bits.join(' · ');
}
// One line on what a support technique does, for the technique cards.
export function effectOf(t: Tech): string {
  if (!t.fx) return '';
  if (t.fx.kind === 'heal') return `Hồi Sinh Lực bằng ${t.coef.toFixed(2)} lần công kích`;
  const s = FX_TEXT[t.fx.kind](t.fx);
  return `${s[0].toUpperCase()}${s.slice(1)}${t.fx.kind === 'stun' ? '' : `, kéo dài ${t.fx.turns} hiệp`}`;
}
function make(cls: string, name: string, el: string, tier: number, basic: boolean): Tech {
  const m = MOD[cls], t = basic ? { coef: 1.0, spirit: 0, cd: 0, minLevel: 1 } : TIER[tier];
  const base = { name, el, group: 'Tấn Công' as const, target: 'Kẻ Địch' as const, coef: +(t.coef * m.coef).toFixed(3), spirit: Math.round(t.spirit * m.spirit), cd: Math.max(0, t.cd + (basic ? 0 : m.cd)), minLevel: t.minLevel, cls, tier, hits: m.hits, pierce: m.pierce, crit: m.crit, basic };
  return { ...base, desc: describe(base) };
}
// Support techniques (Phòng Thủ, Hồi Phục, Cường Hóa, Suy Yếu, Khống Chế): [name, group, tier, effect, Spirit, cooldown, target, heal power]. They have no element.
type Sup = [string, C.SkillGroup, number, C.SkillFx, number, number, C.SkillDef['target'], number?];
const SUPPORT: Record<string, Sup[]> = {
  kiem: [['Kiếm Ý Ngưng Thần', 'Cường Hóa', 0, { kind: 'atkUp', amount: 0.25, turns: 3 }, 10, 5, 'Bản Thân'], ['Kiếm Mạc Hộ Thân', 'Phòng Thủ', 1, { kind: 'guard', amount: 0.35, turns: 3 }, 14, 6, 'Bản Thân']],
  thuong: [['Thương Trận Bất Động', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.3, turns: 3 }, 10, 5, 'Bản Thân'], ['Điểm Huyệt Thương', 'Khống Chế', 1, { kind: 'stun', amount: 1, turns: 1 }, 16, 7, 'Kẻ Địch']],
  cung: [['Phá Phòng Tiễn', 'Suy Yếu', 0, { kind: 'defDown', amount: 0.3, turns: 3 }, 10, 5, 'Kẻ Địch'], ['Ngưng Thần Nhắm Bắn', 'Cường Hóa', 1, { kind: 'critUp', amount: 20, turns: 3 }, 12, 5, 'Bản Thân']],
  dao: [['Cuồng Đao Chiến Ý', 'Cường Hóa', 0, { kind: 'atkUp', amount: 0.3, turns: 3, team: true }, 12, 6, 'Cả Đội'], ['Trảm Giáp Kình', 'Suy Yếu', 2, { kind: 'defDown', amount: 0.4, turns: 3 }, 18, 6, 'Kẻ Địch']],
  quyen: [['Kim Chung Tráo', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.3, turns: 3 }, 6, 5, 'Bản Thân'], ['Thái Cực Điều Tức', 'Hồi Phục', 1, { kind: 'heal', amount: 0, turns: 1 }, 10, 5, 'Bản Thân', 1.6]],
  cam: [['Thanh Tâm Chú Khúc', 'Hồi Phục', 0, { kind: 'heal', amount: 0, turns: 1 }, 10, 4, 'Bản Thân', 1.4], ['Mê Hồn Khúc', 'Khống Chế', 2, { kind: 'stun', amount: 1, turns: 1 }, 18, 8, 'Kẻ Địch']],
  tieu: [['Tán Công Tiêu Âm', 'Suy Yếu', 0, { kind: 'atkDown', amount: 0.3, turns: 3 }, 10, 5, 'Kẻ Địch'], ['Hồi Xuân Tiêu', 'Hồi Phục', 2, { kind: 'heal', amount: 0, turns: 1 }, 16, 5, 'Bản Thân', 2.2]],
  phat: [['Hộ Thân Phù', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.35, turns: 3 }, 8, 5, 'Bản Thân'], ['Cam Lộ Chú', 'Hồi Phục', 1, { kind: 'heal', amount: 0, turns: 1 }, 10, 4, 'Bản Thân', 1.8], ['Định Thân Phù', 'Khống Chế', 3, { kind: 'stun', amount: 1, turns: 2 }, 24, 8, 'Kẻ Địch']],
};
function makeSupport(cls: string, [name, group, tier, fx, spirit, cd, target, heal]: Sup): Tech {
  const base = { name, el: '', group, target, coef: heal || 0, spirit, cd, minLevel: TIER[tier].minLevel, cls, tier, hits: 1, pierce: 0, crit: 0, basic: false, fx };
  return { ...base, desc: describe(base) };
}
// ---------- Ten more Bí Công for every môn (80 in all): six attack techniques and four support ones.
// The attack ones are [name, element, tier]. Together with the first four, each môn can hit with all eight elements; two are Hoàng, two Huyền, one Địa and one Thiên.
// Their power is the tier's (see TIER), so they differ in element and look, not in strength. The support ones follow the same numbers as the first set, scaled by tier.
// Tu Sĩ keep fighting with the first set only (coreTechsOf), so their strength does not change.
const MORE: Record<string, [string, string, number][]> = {
  kiem: [['Thúy Trúc Kiếm', 'Mộc', 0], ['Hàn Tuyền Kiếm', 'Thủy', 0], ['Huyền Nham Kiếm', 'Thổ', 1], ['Huyết Ảnh Kiếm', 'Âm', 1], ['Vạn Kiếm Quy Tông', 'Kim', 2], ['Chu Tước Phần Thiên Kiếm', 'Hỏa', 3]],
  thuong: [['Lục Ngọc Thương', 'Mộc', 0], ['Hỏa Tinh Thương', 'Hỏa', 0], ['Dạ Hành Thương', 'Âm', 1], ['Bạch Nhật Thương', 'Dương', 1], ['Phích Lịch Thương', 'Lôi', 2], ['Lăng Tiêu Phá Quân Thương', 'Kim', 3]],
  cung: [['Kim Phong Tiễn', 'Kim', 0], ['Băng Phách Tiễn', 'Thủy', 0], ['Trọng Nham Tiễn', 'Thổ', 1], ['Tử Lôi Tiễn', 'Lôi', 1], ['Vạn Diệp Phi Hoa Tiễn', 'Mộc', 2], ['Cửu Tiêu Lôi Minh Tiễn', 'Lôi', 3]],
  dao: [['Cổ Mộc Đao', 'Mộc', 0], ['Hàn Giang Đao', 'Thủy', 0], ['Lôi Đình Đao', 'Lôi', 1], ['Liệt Nhật Đao', 'Dương', 1], ['Trấn Nhạc Đao', 'Thổ', 2], ['Tu La Diệt Thế Đao', 'Âm', 3]],
  quyen: [['Thiết Sa Chưởng', 'Kim', 0], ['Linh Mộc Quyền', 'Mộc', 0], ['Nhu Thủy Quyền', 'Thủy', 1], ['Âm Phong Chưởng', 'Âm', 1], ['Lôi Long Quyền', 'Lôi', 2], ['Phật Thủ Trấn Thiên Quyền', 'Dương', 3]],
  cam: [['Kim Qua Khúc', 'Kim', 0], ['Phần Tâm Khúc', 'Hỏa', 0], ['Cao Sơn Khúc', 'Thổ', 1], ['Kinh Lôi Khúc', 'Lôi', 1], ['Bách Hoa Tề Phóng Khúc', 'Mộc', 2], ['Quảng Lăng Tuyệt Âm', 'Âm', 3]],
  tieu: [['Kim Thạch Tiêu', 'Kim', 0], ['Xích Phụng Tiêu', 'Hỏa', 0], ['Hoàng Thổ Tiêu', 'Thổ', 1], ['Triêu Dương Tiêu', 'Dương', 1], ['Dạ Ô Đề Tiêu', 'Âm', 2], ['Hạo Nhật Lăng Thiên Tiêu', 'Dương', 3]],
  phat: [['Kim Thích Phù', 'Kim', 0], ['Ngũ Lôi Phù', 'Lôi', 0], ['Câu Hồn Phù', 'Âm', 1], ['Chính Dương Phù', 'Dương', 1], ['Huyền Băng Phù', 'Thủy', 2], ['Thiên Hình Lôi Phù', 'Lôi', 3]],
};
const MORE_SUPPORT: Record<string, Sup[]> = {
  kiem: [
    ['Phá Thể Kiếm Chỉ', 'Suy Yếu', 0, { kind: 'defDown', amount: 0.25, turns: 3 }, 10, 5, 'Kẻ Địch'], ['Kiếm Tâm Dưỡng Thương', 'Hồi Phục', 1, { kind: 'heal', amount: 0, turns: 1 }, 12, 5, 'Bản Thân', 1.7],
    ['Kiếm Tâm Thông Minh', 'Cường Hóa', 2, { kind: 'critUp', amount: 30, turns: 3 }, 16, 6, 'Bản Thân'], ['Kiếm Vực Phong Tỏa', 'Khống Chế', 3, { kind: 'stun', amount: 1, turns: 2 }, 24, 8, 'Kẻ Địch'],
  ],
  thuong: [
    ['Chấn Nhiếp Thương Uy', 'Suy Yếu', 0, { kind: 'atkDown', amount: 0.25, turns: 3 }, 10, 5, 'Kẻ Địch'], ['Thương Ý Đột Tiến', 'Cường Hóa', 1, { kind: 'atkUp', amount: 0.28, turns: 3 }, 12, 5, 'Bản Thân'],
    ['Toái Giáp Thương Kình', 'Suy Yếu', 2, { kind: 'defDown', amount: 0.4, turns: 3 }, 18, 6, 'Kẻ Địch'], ['Kim Thương Bất Đảo', 'Phòng Thủ', 3, { kind: 'guard', amount: 0.45, turns: 3 }, 24, 7, 'Bản Thân'],
  ],
  cung: [
    ['Ẩn Thân Tiễn Trận', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.3, turns: 3 }, 8, 5, 'Bản Thân'], ['Tiễn Ý Hồi Xuân', 'Hồi Phục', 1, { kind: 'heal', amount: 0, turns: 1 }, 12, 5, 'Bản Thân', 1.7],
    ['Tỏa Nhuệ Tiễn', 'Suy Yếu', 2, { kind: 'atkDown', amount: 0.35, turns: 3 }, 16, 6, 'Kẻ Địch'], ['Vạn Tiễn Chiến Ý', 'Cường Hóa', 3, { kind: 'atkUp', amount: 0.3, turns: 3, team: true }, 22, 7, 'Cả Đội'],
  ],
  dao: [
    ['Đao Cương Hộ Thể', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.3, turns: 3 }, 8, 5, 'Bản Thân'], ['Chấn Đao Kình', 'Khống Chế', 1, { kind: 'stun', amount: 1, turns: 1 }, 16, 7, 'Kẻ Địch'],
    ['Thiết Huyết Hồi Xuân', 'Hồi Phục', 2, { kind: 'heal', amount: 0, turns: 1 }, 16, 5, 'Bản Thân', 2.2], ['Bá Đao Sát Ý', 'Cường Hóa', 3, { kind: 'critUp', amount: 30, turns: 3 }, 20, 6, 'Bản Thân'],
  ],
  quyen: [
    ['Khí Huyết Bôn Dũng', 'Cường Hóa', 0, { kind: 'atkUp', amount: 0.25, turns: 3 }, 6, 5, 'Bản Thân'], ['Phá Thể Chấn Kình', 'Suy Yếu', 1, { kind: 'defDown', amount: 0.3, turns: 3 }, 8, 5, 'Kẻ Địch'],
    ['Chấn Hồn Quyền', 'Khống Chế', 2, { kind: 'stun', amount: 1, turns: 1 }, 12, 7, 'Kẻ Địch'], ['Bất Hoại Kim Thân', 'Phòng Thủ', 3, { kind: 'guard', amount: 0.45, turns: 3 }, 16, 7, 'Bản Thân'],
  ],
  cam: [
    ['Ai Oán Khúc', 'Suy Yếu', 0, { kind: 'atkDown', amount: 0.25, turns: 3 }, 10, 5, 'Kẻ Địch'], ['Thiên Âm Hộ Thể', 'Phòng Thủ', 1, { kind: 'guard', amount: 0.35, turns: 3 }, 14, 6, 'Bản Thân'],
    ['Chiến Ý Trường Ca', 'Cường Hóa', 2, { kind: 'atkUp', amount: 0.3, turns: 3, team: true }, 18, 6, 'Cả Đội'], ['Phượng Cầm Hồi Xuân', 'Hồi Phục', 3, { kind: 'heal', amount: 0, turns: 1 }, 22, 6, 'Bản Thân', 2.8],
  ],
  tieu: [
    ['Tĩnh Tâm Tiêu Âm', 'Phòng Thủ', 0, { kind: 'guard', amount: 0.3, turns: 3 }, 8, 5, 'Bản Thân'], ['Thôi Miên Tiêu', 'Khống Chế', 1, { kind: 'stun', amount: 1, turns: 1 }, 16, 7, 'Kẻ Địch'],
    ['Phá Cương Tiêu Âm', 'Suy Yếu', 2, { kind: 'defDown', amount: 0.4, turns: 3 }, 18, 6, 'Kẻ Địch'], ['Chiến Ý Tiêu Khúc', 'Cường Hóa', 3, { kind: 'atkUp', amount: 0.3, turns: 3, team: true }, 22, 7, 'Cả Đội'],
  ],
  phat: [
    ['Khai Nhãn Phù', 'Cường Hóa', 0, { kind: 'critUp', amount: 20, turns: 3 }, 10, 5, 'Bản Thân'], ['Suy Nhược Phù', 'Suy Yếu', 1, { kind: 'atkDown', amount: 0.3, turns: 3 }, 12, 5, 'Kẻ Địch'],
    ['Phong Ấn Phù', 'Khống Chế', 2, { kind: 'stun', amount: 1, turns: 1 }, 18, 8, 'Kẻ Địch'], ['Cửu Chuyển Hoàn Hồn Phù', 'Hồi Phục', 3, { kind: 'heal', amount: 0, turns: 1 }, 22, 6, 'Bản Thân', 2.8],
  ],
};
export const TECHS: Record<string, Tech> = {};
for (const a of ARTS) {
  TECHS[a.basic] = make(a.id, a.basic, '', 0, true);
  LIST[a.id].forEach(([n, e], i) => { TECHS[n] = make(a.id, n, e, i, false); });
  for (const [n, e, t] of MORE[a.id] || []) TECHS[n] = make(a.id, n, e, t, false);
  for (const sp of [...(SUPPORT[a.id] || []), ...(MORE_SUPPORT[a.id] || [])]) TECHS[sp[0]] = makeSupport(a.id, sp);
}
// Lowest tier first; techniques of the same tier keep the order they were written in (the first set before the later ones).
const byTier = (l: Tech[]): Tech[] => l.map((t, i) => [t, i] as const).sort((x, y) => x[0].tier - y[0].tier || x[1] - y[1]).map(([t]) => t);
export const attackTechs = (cls: string): Tech[] => byTier([...(LIST[cls] || []).map(([n]) => TECHS[n]), ...(MORE[cls] || []).map(([n]) => TECHS[n])]);
// Every technique of a môn (not the basic attack): the attack techniques first, then the support ones, each from Hoàng up.
export const techsOf = (cls: string): Tech[] => [...attackTechs(cls), ...byTier([...(SUPPORT[cls] || []), ...(MORE_SUPPORT[cls] || [])].map((x) => TECHS[x[0]]))];
// The first set (four attack techniques and the first support ones): what a Tu Sĩ of the môn fights with.
export const coreTechsOf = (cls: string): Tech[] => [...(LIST[cls] || []).map(([n]) => TECHS[n]), ...(SUPPORT[cls] || []).map((x) => TECHS[x[0]])];
export const basicOf = (cls: string): Tech => TECHS[ART(cls).basic];
export const isTech = (name: string) => !!TECHS[name] && !TECHS[name].basic;
// A technique name resolves to its full definition; beast and element skills (C.SKILL_DEFS) and the neutral skill are the fallback.
export const skillOf = (name: string): C.SkillDef => TECHS[name] || C.skillDef(name);

export const weaponClass = (base?: string | null): string => (base && C.WEAPON_CLASS[base]) || '';
export const slotsAt = (realm: number) => B.skillSlotsByRealm[Math.min(realm, B.skillSlotsByRealm.length - 1)];

// Which môn a foe of each element tends to leave a Bí Công of.
export const CLASSES_BY_EL: Record<string, string[]> = {
  Kim: ['kiem', 'thuong', 'dao'], Mộc: ['cung', 'cam', 'phat'], Thủy: ['tieu', 'cam', 'phat'], Hỏa: ['dao', 'quyen', 'kiem'],
  Thổ: ['thuong', 'quyen', 'dao'], Lôi: ['kiem', 'quyen', 'thuong'], Âm: ['cung', 'tieu', 'dao'], Dương: ['cung', 'phat', 'quyen'],
};
// Where a Bí Công of a môn can come from, for the "not learned yet" cards: the elements of the beasts that can leave it, and the kind of Tu Sĩ who fights with that môn.
export const dropElements = (cls: string): string[] => Object.entries(CLASSES_BY_EL).filter(([, l]) => l.includes(cls)).map(([e]) => e);
export const dropNpc = (cls: string): string => ({ kiem: 'Kiếm Tu', cam: 'Đan Sư', phat: 'Phù Sư', quyen: 'Thể Tu', dao: 'Ma Tu' } as Record<string, string>)[cls] || 'Tán Tu';
// The môn of a Tu Sĩ, from its title (a Tán Tu picks one from its name so the same person always fights the same way).
export function npcClass(name: string): string {
  if (name.startsWith('Kiếm Tu')) return 'kiem';
  if (name.startsWith('Đan Sư')) return 'cam';
  if (name.startsWith('Phù Sư')) return 'phat';
  if (name.startsWith('Thể Tu')) return 'quyen';
  if (name.startsWith('Ma Tu')) return 'dao';
  const pool = ['thuong', 'cung', 'tieu'];
  return pool[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % pool.length];
}
// Everything a Tu Sĩ can use: the basic attack and the first set of techniques of its môn (not the later Bí Công), plus the skills of its own elements.
export const npcSkills = (name: string, el: string[]): string[] => { const c = npcClass(name); return [ART(c).basic, ...coreTechsOf(c).map((t) => t.name), ...el.flatMap((e) => C.SKILLS[e] || [])]; };

// ---------- Công Pháp (Cultivation_Method, Requirement 18.5 and 18.6): passive. It multiplies Tu Vi per tick and adds a share of the base stat to the stats it favours.
export interface Method { name: string; tier: number; speed: number; el: string; bias: ('hp' | 'spirit' | 'atk' | 'def' | 'spd')[]; minLevel: number; desc: string }
const BIAS_VI: Record<string, string> = { hp: 'Sinh Lực', spirit: 'Linh Lực', atk: 'Công Kích', def: 'Phòng Ngự', spd: 'Thân Pháp' };
const m = (name: string, tier: number, speed: number, el: string, bias: Method['bias']): Method => ({
  name, tier, speed, el, bias, minLevel: TIER[tier].minLevel,
  desc: `Tu luyện ×${speed.toFixed(2)}${el ? `, hệ ${el} (thêm ${Math.round(B.methodAffinityBonus * 100)}% nếu hợp Linh Căn)` : ', không hệ'} · cộng ${Math.round(B.methodStatBias * 100)}% ${bias.map((b) => BIAS_VI[b]).join(' và ')} gốc`,
});
export const METHODS: Method[] = [
  m('Thanh Tâm Quyết', 0, 1.0, '', ['hp']), m('Dưỡng Khí Công', 0, 1.04, '', ['spirit']), m('Hỏa Dương Công', 0, 1.06, 'Hỏa', ['atk']), m('Trường Sinh Mộc Quyết', 0, 1.06, 'Mộc', ['hp']),
  m('Bích Thủy Tâm Kinh', 1, 1.15, 'Thủy', ['spirit', 'def']), m('Hậu Thổ Hộ Thể Công', 1, 1.15, 'Thổ', ['def', 'hp']), m('Kim Cang Bất Hoại', 1, 1.18, 'Kim', ['atk', 'def']),
  m('Cửu Thiên Lôi Điển', 2, 1.3, 'Lôi', ['atk', 'spd']), m('U Minh Quy Nguyên Kinh', 2, 1.3, 'Âm', ['spirit', 'spd']),
  m('Thái Dương Chân Kinh', 3, 1.5, 'Dương', ['atk', 'hp']), m('Hỗn Nguyên Nhất Khí Quyết', 3, 1.45, '', ['hp', 'atk']),
];
export const METHOD_TIER = ['Hoàng', 'Huyền', 'Địa', 'Thiên'];
export const STARTER_METHOD = METHODS[0].name;
export const methodOf = (name?: string): Method => METHODS.find((x) => x.name === name) || METHODS[0];
export const isMethod = (name: string) => METHODS.some((x) => x.name === name);
// The Method_Speed_Factor (Requirement 18.6): the Công Pháp's speed, plus the affinity bonus when its element is one of the Linh Căn.
export const methodSpeed = (name: string | undefined, linh: string[]): number => { const x = methodOf(name); return x.speed * (x.el && linh.includes(x.el) ? 1 + B.methodAffinityBonus : 1); };
