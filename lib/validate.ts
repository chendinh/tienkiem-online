// CI checks of the Content_Catalog (Requirement 6.4, 7.13, 20.15, 24.16, 16.16). Returns a list of problems; an empty list means the catalog is valid.
import * as C from './content';
import { BALANCE as B } from './balance';
import * as A from './arts';

export function validateCatalog(): string[] {
  const e: string[] = [];
  const need = (ok: boolean, msg: string) => { if (!ok) e.push(msg); };
  const isInt = Number.isInteger;
  const cap = B.playableLevelCap;
  const speciesIds = new Set(C.SPECIES.map((s) => s.id));
  const eventIds = new Set(C.EVENTS.map((x) => x.id));

  // zones
  need(C.ZONES.length > 0, 'Content_Catalog phải có ít nhất một Zone');
  const start = C.ZONES.find((z) => z.id === C.START_ZONE);
  need(!!start && start.minLevel === 1, 'Zone khởi đầu phải tồn tại và có Level tối thiểu bằng 1');
  need(new Set(C.ZONES.map((z) => z.id)).size === C.ZONES.length, 'Zone có id trùng nhau');
  for (let L = 1; L <= cap; L++) need(C.ZONES.some((z) => z.lv[0] <= L && L <= z.lv[1]), `Level ${L} không thuộc khoảng Level của Zone nào`);
  for (const z of C.ZONES) {
    need(z.lv[0] >= 1 && z.lv[0] <= z.lv[1] && z.lv[1] <= cap, `Zone ${z.id}: khoảng Level phải nằm trong [1, ${cap}]`);
    need(z.minLevel >= 1 && z.minLevel <= cap, `Zone ${z.id}: Level tối thiểu để vào không hợp lệ`);
    need(z.density > 0, `Zone ${z.id}: Spirit_Qi_Density phải dương`);
    const ew = Object.values(z.enc);
    need(ew.every((x) => x >= 0) && ew.reduce((a, b) => a + b, 0) > 0, `Zone ${z.id}: trọng số Encounter_Type không hợp lệ`);
    const sw = Object.entries(z.species);
    need(sw.length > 0 && sw.every(([id, w]) => speciesIds.has(id) && w > 0), `Zone ${z.id}: bảng xuất hiện quái tham chiếu loài không tồn tại hoặc trọng số không dương`);
    need(z.materials.length > 0 && z.materials.every((m) => C.MATERIALS.some((x) => x.id === m.id) && m.w > 0 && isInt(m.q[0]) && m.q[0] >= 1 && m.q[0] <= m.q[1]), `Zone ${z.id}: bảng Material không hợp lệ`);
    need(z.phen.every((p) => C.PHENOMENA.some((x) => x.id === p.id) && p.w > 0), `Zone ${z.id}: Zone_Phenomenon không tồn tại hoặc trọng số không dương`);
    need(z.events.every((id) => eventIds.has(id)), `Zone ${z.id}: nhóm Event_Template tham chiếu mã không tồn tại`);
    // Requirement 7.13: at least Event_Distinct_Window templates at every Level of the Zone
    for (let L = z.lv[0]; L <= z.lv[1]; L++) {
      const n = z.events.filter((id) => { const ev = C.EVENTS.find((x) => x.id === id)!; return ev.lv[0] <= L && L <= ev.lv[1]; }).length;
      need(n >= B.eventDistinctWindow, `Zone ${z.id} Level ${L}: chỉ có ${n} Event_Template, cần ít nhất ${B.eventDistinctWindow}`);
    }
    // Drop_Table (Requirement 20.15)
    const dw = z.drop.map((d) => d.w);
    need(dw.every((w) => w >= 0) && dw.reduce((a, b) => a + b, 0) > 0, `Zone ${z.id}: Drop_Table có trọng số âm hoặc tổng bằng 0`);
    need(z.drop.some((d) => d.kind === 'item' && d.w > 0), `Zone ${z.id}: Drop_Table không có mục Item_Instance có trọng số dương`);
    for (const d of z.drop) {
      if ('q' in d) need(isInt(d.q[0]) && isInt(d.q[1]) && d.q[0] >= 1 && d.q[0] <= d.q[1], `Zone ${z.id}: Drop_Table có khoảng số lượng không hợp lệ`);
      if (d.kind === 'taming') need(isInt(d.grade) && d.grade >= 0 && d.grade < 4, `Zone ${z.id}: Drop_Table tham chiếu hạng Khế Ước Phù không tồn tại`);
      if (d.kind === 'pill') need(isInt(d.grade) && d.grade >= 0 && d.grade < 3, `Zone ${z.id}: Drop_Table tham chiếu hạng Đan Dược không tồn tại`);
    }
  }
  // events
  for (const ev of C.EVENTS) {
    need(ev.out.length > 0 && ev.out.every((o) => o.w > 0), `Event ${ev.id}: bảng kết quả rỗng hoặc có trọng số không dương`);
    need(ev.lv[0] >= 1 && ev.lv[0] <= ev.lv[1], `Event ${ev.id}: khoảng Level không hợp lệ`);
    need(!/\{[^}]+\}/.test(ev.text), `Event ${ev.id}: có chỗ giữ chỗ nhưng chưa có bảng giá trị`);
    for (const o of ev.out) {
      if (o.stonesPerLv) need(isInt(o.stonesPerLv[0]) && isInt(o.stonesPerLv[1]) && o.stonesPerLv[0] >= 1 && o.stonesPerLv[0] <= o.stonesPerLv[1], `Event ${ev.id}: khoảng Spirit_Stone không hợp lệ`);
      if (o.drops !== undefined) need(isInt(o.drops) && o.drops >= 1, `Event ${ev.id}: số lần rơi phải là số nguyên >= 1`);
    }
  }
  // species and skills (Requirement 16.16 and 18.17 subsets)
  for (const s of C.SPECIES) {
    need(s.el.every((x) => C.EO.includes(x)), `Loài ${s.id}: Element không hợp lệ`);
    need(((C.SKILLS[s.el[0]] || []).length + 1) >= B.monsterSkillMax, `Loài ${s.id}: nhóm Skill nhỏ hơn Monster_Skill_Count_Max`);
    need(s.f.length === 5 && s.f.every((x) => x > 0), `Loài ${s.id}: hệ số chỉ số không hợp lệ`);
  }
  // skills (Requirement 18.16 subset: only the Tấn Công group exists so far)
  for (const d of Object.values(C.SKILL_DEFS)) {
    need(d.spirit >= 0 && d.cd >= 0, `Skill ${d.name}: chi phí Spirit hoặc thời gian hồi âm`);
    need(d.el === '' || C.EO.includes(d.el), `Skill ${d.name}: Element không hợp lệ`);
    need(d.group !== 'Tấn Công' || (d.coef > 0 && d.target === 'Kẻ Địch'), `Skill ${d.name}: Skill Tấn Công cần hệ số công suất dương và mục tiêu Kẻ Địch`);
  }
  for (const [el, names] of Object.entries(C.SKILLS)) need(names.every((n) => n in C.SKILL_DEFS), `Hệ ${el}: có Skill chưa được định nghĩa trong SKILL_DEFS`);
  // môn pháp: every weapon has a môn, a picture description and a hand placement; every môn has four techniques, a book picture and valid numbers
  for (const b of C.SLOT_BASE.Weapon) {
    need(b in C.WEAPON_CLASS && A.ARTS.some((a) => a.id === C.WEAPON_CLASS[b]), `Pháp khí ${b} chưa thuộc môn pháp nào (WEAPON_CLASS)`);
    need(b in C.BASE_EN && b in C.PLACE_WEAPON, `Pháp khí ${b} chưa có mô tả ảnh (BASE_EN, PLACE_WEAPON)`);
  }
  for (const a of A.ARTS) {
    need(C.SLOT_BASE.Weapon.some((b) => C.WEAPON_CLASS[b] === a.id), `Môn ${a.id} chưa có pháp khí nào`);
    need(`book_${a.id}` in C.PROP_EN, `Môn ${a.id} chưa có mô tả ảnh sách Bí Công (PROP_EN.book_${a.id})`);
    need(A.attackTechs(a.id).length === 4 && A.attackTechs(a.id).every((t) => C.EO.includes(t.el) && t.coef > 0 && t.spirit >= 0 && t.cd >= 0 && t.hits >= 1), `Môn ${a.id}: chiêu thức không hợp lệ`);
  }
  for (const t of Object.values(A.TECHS)) {
    const atk = t.group === 'Tấn Công', heal = t.group === 'Hồi Phục';
    need(A.GROUPS.includes(t.group), `Chiêu ${t.name}: nhóm không hợp lệ`);
    need(atk || heal ? t.coef > 0 : t.coef === 0, `Chiêu ${t.name}: hệ số công suất chỉ dương với nhóm Tấn Công và Hồi Phục`);
    need(atk ? !t.fx : !!t.fx && t.fx.turns >= 1, `Chiêu ${t.name}: nhóm ${t.group} cần hiệu ứng trạng thái có thời lượng từ 1 hiệp`);
    need(t.group === 'Phòng Thủ' ? t.fx?.kind === 'guard' : t.group === 'Hồi Phục' ? t.fx?.kind === 'heal' : t.group === 'Cường Hóa' ? t.fx?.kind === 'atkUp' || t.fx?.kind === 'critUp' : t.group === 'Suy Yếu' ? t.fx?.kind === 'atkDown' || t.fx?.kind === 'defDown' : t.group === 'Khống Chế' ? t.fx?.kind === 'stun' : true, `Chiêu ${t.name}: hiệu ứng không khớp nhóm ${t.group}`);
    need(atk || t.group === 'Suy Yếu' || t.group === 'Khống Chế' ? t.target === 'Kẻ Địch' : t.target !== 'Kẻ Địch', `Chiêu ${t.name}: mục tiêu không khớp nhóm ${t.group}`);
  }
  need(A.GROUPS.every((g) => Object.values(A.TECHS).some((t) => t.group === g)), 'Mỗi nhóm chiêu phải có ít nhất một chiêu trong danh mục');
  // Công Pháp (Requirement 18.5, 18.16)
  need(new Set(A.METHODS.map((x) => x.name)).size === A.METHODS.length && A.METHODS.every((x) => !(x.name in A.TECHS)), 'Tên Công Pháp trùng');
  need(A.METHODS.every((x) => x.speed > 0 && x.bias.length >= 1 && x.bias.length <= 2 && (!x.el || C.EO.includes(x.el)) && x.minLevel >= 1), 'Công Pháp: hệ số tốc độ, hướng tăng chỉ số hoặc hệ không hợp lệ');
  need(A.METHODS.some((x) => x.tier === 0 && x.name === A.STARTER_METHOD), 'Thiếu Công Pháp hạng Hoàng khởi đầu');
  need(A.METHODS.every((x) => A.METHODS.every((y) => x.tier <= y.tier || x.speed >= y.speed)), 'Công Pháp hạng cao hơn phải có hệ số tốc độ không thấp hơn');
  need('book_method' in C.PROP_EN, 'Thiếu mô tả ảnh cuốn kinh Công Pháp (PROP_EN.book_method)');
  need(Object.keys(A.TECHS).every((n) => !(n in C.SKILL_DEFS)), 'Tên chiêu của môn pháp trùng tên Skill của yêu thú');
  for (const [el, cls] of Object.entries(A.CLASSES_BY_EL)) need(C.EO.includes(el) && cls.every((c) => A.ARTS.some((a) => a.id === c)), `Bảng rơi Bí Công của hệ ${el} không hợp lệ`);
  need(C.EO.every((e) => A.CLASSES_BY_EL[e]) && A.ARTS.every((a) => Object.values(A.CLASSES_BY_EL).some((l) => l.includes(a.id))), 'Có hệ hoặc môn pháp không nằm trong bảng rơi Bí Công');
  need(C.PERS.length > 0 && C.PERS.every((p) => p.dev.length === 5 && p.dev.every((d) => Math.abs(d) <= 0.1 + 1e-9)), 'Personality: độ lệch chỉ số vượt Personality_Max_Deviation');
  need(C.SPECIES.every((s) => s.id in C.SPECIES_EN), 'Có loài chưa có mô tả ảnh (SPECIES_EN)');
  need(new Set(C.SPECIES.map((s) => s.id)).size === C.SPECIES.length, 'Có loài trùng id');
  // materials and shop
  need(C.MATERIALS.every((m) => isInt(m.price) && m.price > 0), 'Material thiếu giá bán hoặc giá không phải số nguyên dương');
  need(C.SHOP.length === 12, 'Phường Thị phải bán đúng mười hai mặt hàng');
  need(new Set(C.SHOP.map((s) => s.id)).size === C.SHOP.length, 'Phường Thị có mặt hàng trùng id');
  // every fixed picture has a description (shop goods, materials, zones, market)
  for (const x of C.SHOP) need(x.id in C.PROP_EN, `Hàng ${x.id} chưa có mô tả ảnh (PROP_EN)`);
  for (const m of C.MATERIALS) need(`mat_${m.id}` in C.PROP_EN, `Nguyên liệu ${m.id} chưa có mô tả ảnh (PROP_EN)`);
  for (const z of C.ZONES) need(z.id in C.PLACE_EN, `Zone ${z.id} chưa có mô tả ảnh (PLACE_EN)`);
  need('market' in C.PLACE_EN, 'Thiếu mô tả ảnh Phường Thị (PLACE_EN.market)');
  // phenomena only change allowed fields (Requirement 6.11)
  const allowed = new Set(['id', 'name', 'text', 'cult', 'luck', 'enc', 'species']);
  for (const p of C.PHENOMENA) need(Object.keys(p).every((k) => allowed.has(k)), `Zone_Phenomenon ${p.id} đổi trường không được phép`);
  return e;
}
