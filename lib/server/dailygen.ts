// The daily job: writes one pack per UTC day with Claude (a chronicle chapter, journey beats for every zone, a new creature) and draws the creature.
// Everything that touches game balance (element, size, stats, rarity, zones) is chosen by this code from the day, never by the model.
// The model only writes names and words, and its output is checked before it is saved.
import { ask, llmEnabled, parseJson } from '../llm';
import * as C from '../content';
import { type DailyPack, type DailySpecies, dailyPacks } from '../daily';
import { ensureDaily, loadPacks, savePack } from './dailystore';
import { withLock } from './db';
import lore from '../../content/lore.json';

const MODEL = () => process.env.DAILY_MODEL || 'claude-sonnet-5-5';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const HAN = /[\u2e80-\u9fff\uf900-\ufaff]/;   // no Chinese characters in any text
const TEXT = (s: unknown, min: number, max: number): string => {
  if (typeof s !== 'string') throw new Error('text');
  const t = s.replace(/[<>]/g, '').trim();
  if (t.length < min || t.length > max || HAN.test(t)) throw new Error('text');
  return t;
};

// ---- the part code decides
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ARCH: Record<string, { f: number[]; vi: string }> = {
  tank: { f: [1.35, 0.9, 0.8, 1.35, 0.6], vi: 'chịu đòn, chậm' },
  striker: { f: [0.9, 0.85, 1.3, 0.85, 1.15], vi: 'công mạnh, mỏng manh' },
  swift: { f: [0.8, 1.0, 1.1, 0.75, 1.4], vi: 'cực nhanh, nhỏ nhắn' },
  mystic: { f: [0.85, 1.35, 1.05, 0.8, 1.05], vi: 'thiên về linh lực' },
  bruiser: { f: [1.25, 0.85, 1.2, 1.1, 0.7], vi: 'cứng cáp, đánh đau' },
  balanced: { f: [1.0, 1.0, 1.05, 1.0, 1.05], vi: 'cân bằng' },
};
const RARITY = [
  { id: 'thuong', w: 55, tame: 1.2, mult: 1.0, vi: 'phổ biến', zones: [0, 1, 2] },
  { id: 'hiem', w: 30, tame: 0.85, mult: 1.03, vi: 'hiếm', zones: [1, 2, 3] },
  { id: 'quy', w: 12, tame: 0.55, mult: 1.08, vi: 'quý', zones: [2, 3, 4] },
  { id: 'huyenthoai', w: 3, tame: 0.33, mult: 1.15, vi: 'huyền thoại', zones: [3, 4] },
];
const SIZES: [number, number][] = [[10, 40], [40, 90], [90, 160], [160, 300], [300, 700], [700, 1000]];

export interface Plan { day: string; el: string; archetype: string; rarity: string; rarityVi: string; archVi: string; cm: number; f: number[]; tame: number; zones: string[] }
export function planFor(day: string): Plan {
  const r = rng(hash(`tutien-daily|${day}`));
  const idx = Math.floor(Date.parse(day + 'T00:00:00Z') / 86400e3);
  const el = C.EO[((idx % C.EO.length) + C.EO.length) % C.EO.length];   // every element comes round every eight days
  const archKeys = Object.keys(ARCH), archetype = archKeys[Math.floor(r() * archKeys.length)];
  let x = r() * RARITY.reduce((a, b) => a + b.w, 0), ra = RARITY[0];
  for (const q of RARITY) { if (x < q.w) { ra = q; break; } x -= q.w; }
  const sz = SIZES[Math.min(SIZES.length - 1, Math.floor(r() * (archetype === 'swift' ? 2 : archetype === 'tank' ? SIZES.length : 5)))];
  const cm = Math.round(sz[0] + r() * (sz[1] - sz[0]));
  const f = ARCH[archetype].f.map((v) => Math.round(Math.min(1.6, Math.max(0.5, v * ra.mult * (0.97 + r() * 0.06))) * 100) / 100);
  const pool = C.ZONES.map((z) => z.id), want = ra.zones.filter((i) => i < pool.length);
  const zones = want.sort(() => r() - 0.5).slice(0, 2).map((i) => pool[i]);
  return { day, el, archetype, rarity: ra.id, rarityVi: ra.vi, archVi: ARCH[archetype].vi, cm, f, tame: ra.tame, zones };
}

// ---- the part the model writes
const loreText = () => { const l: any = lore; return `Thế giới: ${l.worldName}. ${l.tagline}\nMối họa: ${l.threat || ''}\nPhe phái: ${(l.factions || []).map((f: any) => `${f.name}: ${f.text}`).join(' | ')}`; };
const system = () => `Bạn là người viết truyện tiên hiệp bằng tiếng Việt cho một game treo máy, mỗi ngày viết một chương mới của biên niên sử thế giới. Văn phong mơ mộng, giàu hình ảnh, dùng từ Hán-Việt vừa phải, dễ đọc. Chỉ viết bằng tiếng Việt với chữ Latinh: tuyệt đối không dùng chữ Hán, chữ Trung Quốc hay phiên âm tiếng Trung. Không bạo lực quá mức, không nội dung nhạy cảm, không lấy nhân vật hay tình tiết từ tác phẩm có bản quyền. Mỗi ngày một chủ đề khác, không lặp lại tình tiết các ngày trước.\n\nBỐI CẢNH CHUNG:\n${loreText()}\n\nChỉ trả về JSON hợp lệ, không thêm lời dẫn.`;

function userPrompt(plan: Plan, past: DailyPack[], names: string[]): string {
  const zones = C.ZONES.map((z) => `- ${z.id}: ${z.name}. ${z.blurb}`).join('\n');
  const prev = past.slice(-5).map((p) => `${p.day}: ${p.title}`).join('\n') || '(chưa có chương nào)';
  const last = past.length ? past[past.length - 1].chronicle.slice(0, 500) : '';
  return `Hôm nay là ngày ${plan.day}. Hãy viết nội dung mới cho ngày này.

CÁC CHƯƠNG GẦN ĐÂY:
${prev}
${last ? `Chương gần nhất bắt đầu như sau (hãy nối tiếp mạch truyện nhưng mở ra một sự kiện mới):\n${last}\n` : ''}
CÁC KHU VỰC (id: tên. mô tả):
${zones}

LOÀI YÊU THÚ MỚI hôm nay (đã định sẵn, chỉ cần đặt tên và miêu tả): hệ ${plan.el}, độ hiếm ${plan.rarityVi}, dài khoảng ${plan.cm} cm, vai trò ${plan.archVi}. Xuất hiện ở: ${plan.zones.map((z) => C.ZONE(z).name).join(', ')}.
Tên các loài đã có, không được trùng: ${names.join(', ')}.

Trả về JSON đúng dạng:
{"title":"tiêu đề chương, tối đa 60 ký tự",
"chronicle":"ba đoạn cách nhau bằng hai dấu xuống dòng, tổng 150-220 từ, kể một sự kiện của ngày hôm nay trong thế giới, có nhắc đến loài yêu thú mới",
"tales":{${C.ZONES.map((z) => `"${z.id}":["4 câu ngắn, mỗi câu 1-2 vế, tối đa 160 ký tự, tả cảnh hoặc chuyện nhỏ trên đường tu hành ở khu vực này hôm nay, có thể nhắc sự kiện trong chương"]`).join(',')}},
"beast":{"name":"tên Hán-Việt 2 đến 4 chữ, có hệ ${plan.el} trong ý nghĩa tên",
"en":"mô tả hình dáng bằng TIẾNG ANH, 20-45 từ, một con vật duy nhất, kiểu thần thú phương Đông, nêu màu sắc, vật liệu cơ thể và hiệu ứng ${plan.el}, không có người, không có chữ",
"legend":"truyền thuyết về loài này bằng tiếng Việt, 50-80 từ"}}`;
}

function build(plan: Plan, raw: any, names: Set<string>): DailyPack {
  const title = TEXT(raw.title, 3, 80);
  const chronicle = TEXT(raw.chronicle, 400, 2400);
  const tales: Record<string, string[]> = {};
  for (const z of C.ZONES) {
    const a = raw.tales && raw.tales[z.id];
    if (!Array.isArray(a) || a.length < 3 || a.length > 6) throw new Error('tales ' + z.id);
    tales[z.id] = a.map((t: unknown) => TEXT(t, 12, 200));
  }
  const b = raw.beast || {};
  const name = TEXT(b.name, 3, 32);
  if (!/^[\p{L} ]+$/u.test(name) || names.has(name.toLowerCase())) throw new Error('name');
  const en = TEXT(b.en, 40, 400);
  if (!/^[A-Za-z0-9 ,.'\-]+$/.test(en)) throw new Error('en');
  const legend = TEXT(b.legend, 120, 700);
  const beast: DailySpecies = { id: 'd' + plan.day.replace(/-/g, ''), name, el: [plan.el], cm: plan.cm, f: plan.f, tame: plan.tame, day: plan.day, zones: plan.zones, legend, en };
  return { day: plan.day, title, chronicle, tales, beast };
}

export type DailyResult = { day: string; story: 'created' | 'exists' | 'disabled' | 'failed'; art: 'ready' | 'pending' | 'skipped' | 'none'; error?: string };

// Idempotent: a second run on the same day only tries to finish the picture.
export async function runDaily(day: string, o: { art?: boolean; force?: boolean } = {}): Promise<DailyResult> {
  if (!DAY.test(day) || Number.isNaN(Date.parse(day))) throw new Error('bad day');
  const res: DailyResult = { day, story: 'exists', art: 'none' };
  await ensureDaily(true);
  if (!dailyPacks().some((p) => p.day === day) || o.force) {
    if (!llmEnabled()) return { ...res, story: 'disabled' };
    try {
      await withLock(`daily:${day}`, async () => {
        const past = await loadPacks();
        if (past.some((p) => p.day === day) && !o.force) return;
        const plan = planFor(day);
        const names = new Set([...C.SPECIES.map((s) => s.name), ...past.map((p) => p.beast.name)].map((n) => n.toLowerCase()));
        let pack: DailyPack | null = null, err = '';
        for (let i = 0; i < 3 && !pack; i++) {
          try {
            const text = await ask({ model: MODEL(), system: system(), content: userPrompt(plan, past.filter((p) => p.day < day), [...names]), maxTokens: 4000, tag: 'daily', maxPerHour: 8 });
            pack = build(plan, parseJson(text), names);
          } catch (e: any) { err = String(e?.message || e); if (err === 'budget' || err === 'rate' || err === 'no-key') break; }
        }
        if (!pack) throw new Error(err || 'invalid');
        await savePack(pack, !!o.force);
        res.story = 'created';
      });
    } catch (e: any) { return { ...res, story: 'failed', error: String(e?.message || e).slice(0, 160) }; }
    await ensureDaily(true);
  }
  if (o.art === false) return { ...res, art: 'skipped' };
  return { ...res, art: await drawArt(day) };
}

// Draw the picture of the day's creature with the normal image pipeline (budget, hourly cap and the Claude picture check all apply).
async function drawArt(day: string): Promise<DailyResult['art']> {
  const pack = dailyPacks().find((p) => p.day === day);
  if (!pack) return 'none';
  if (pack.beast.art) return 'ready';
  const { request, idle } = await import('../imagegen');
  let r = await request({ kind: 'monster', sp: pack.beast.id });
  if (r.status === 'pending') { await idle(240000); r = await request({ kind: 'monster', sp: pack.beast.id }); }
  if (r.status !== 'ready' || !r.url) return r.status === 'pending' ? 'pending' : 'skipped';
  await savePack({ ...pack, beast: { ...pack.beast, art: r.url } }, true);
  await ensureDaily(true);
  return 'ready';
}
