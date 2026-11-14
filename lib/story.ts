import crypto from 'node:crypto';
import * as C from './content';
import lore from '../content/lore.json';
import { ask, budget, llmEnabled, parseJson } from './llm';
import { query } from './server/db';

// Biography and diary chapters. Prompts are built here from validated attributes only (no free text from clients).
// Finished texts are cached in the story_cache table, shared by every server instance.
const VER = 1;
const MODEL = () => process.env.STORY_MODEL || 'claude-haiku-5-5';
const bad = (): never => { throw new Error('bad'); };
const num = (v: any, a: number, b: number) => (Number.isInteger(v) && v >= a && v <= b ? v : bad());
const nameOk = (v: any) => (typeof v === 'string' && /^[\p{L} ]{2,40}$/u.test(v) ? v : bad());
const textOk = (v: any) => (typeof v === 'string' && v.length <= 160 && /^[\p{L}\p{N} ,.!?;:'"“”…\-—()]*$/u.test(v) ? v : bad());

function lorePack(): string {
  try {
    const l: any = lore;
    return `Thế giới: ${l.worldName}. ${l.tagline}\n${(l.prologue || [])[0] || ''}\nMối họa: ${l.threat || ''}\nPhe phái: ${(l.factions || []).map((f: any) => `${f.name}: ${f.text}`).join(' | ')}\nNơi khởi đầu: ${l.regions?.[0]?.name}: ${l.regions?.[0]?.text}`;
  } catch { return ''; }
}
const system = () => `Bạn là người viết truyện tiên hiệp bằng tiếng Việt cho một game treo máy. Văn phong mơ mộng, giàu hình ảnh, dùng từ Hán-Việt vừa phải, dễ đọc. Chỉ viết bằng tiếng Việt với chữ Latinh: tuyệt đối không dùng chữ Hán, chữ Trung Quốc hay phiên âm tiếng Trung. Không bạo lực quá mức, không nội dung nhạy cảm, không lấy nhân vật hay tình tiết từ tác phẩm có bản quyền.\n\nBỐI CẢNH CHUNG:\n${lorePack()}\n\nChỉ trả về JSON hợp lệ, không thêm lời dẫn.`;

export type StoryResult = { status: 'ready'; bio?: string; motto?: string; secret?: string; text?: string } | { status: 'disabled' | 'limited' | 'failed' | 'invalid' };

export async function storyRequest(b: any): Promise<StoryResult> {
  if (!llmEnabled()) return { status: 'disabled' };
  let user = '', key: any;
  try {
    if (!b || typeof b !== 'object') bad();
    const name = nameOk(b.name);
    const g = b.g === 'm' ? 'm' : b.g === 'f' ? 'f' : bad();
    if (b.kind === 'bio') {
      const dao = b.dao ? nameOk(b.dao) : '';
      const linh: string[] = Array.isArray(b.linh) && b.linh.length >= 1 && b.linh.length <= 5 ? b.linh.map((e: any) => (C.EO.includes(e) ? e : bad())) : bad();
      const purity = typeof b.purity === 'number' && b.purity >= 0.5 && b.purity <= 1 ? b.purity : bad();
      const pers = num(b.pers, 0, C.PERS.length - 1), origin = num(b.origin, 0, C.ORIGINS.length - 1);
      const L = b.look || bad(); const styles = g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
      const hc = num(L.hc, 0, C.HAIR_COLORS.length - 1), hs = num(L.hs, 0, styles.length - 1), ey = num(L.ey, 0, C.EYES.length - 1), sk = num(L.sk, 0, C.SKINS.length - 1), mk = num(L.mk, 0, C.MARKS.length - 1);
      user = `Viết tiểu sử cho nhân vật:\n- Tên: ${name}${dao ? ` (đạo hiệu ${dao})` : ''}\n- Giới tính: ${g === 'f' ? 'nữ' : 'nam'}\n- Linh Căn: ${linh.join(', ')}, độ thuần ${purity}\n- Tính cách: ${C.PERS[pers].n} (${C.PERS[pers].line})\n- Xuất thân: ${C.ORIGINS[origin].n}, ${C.ORIGINS[origin].note}\n- Ngoại hình (mô tả tiếng Anh, hãy diễn đạt lại bằng tiếng Việt): tóc ${C.HAIR_COLORS[hc]}, ${styles[hs]}; mắt ${C.EYES[ey]}; da ${C.SKINS[sk]}${C.MARKS[mk] ? `; ${C.MARKS[mk]}` : ''}\n\nTrả về JSON: {"bio":"ba đoạn ngắn cách nhau bằng hai dấu xuống dòng, tổng 120-170 từ, kể quá khứ và lý do bước vào con đường tu tiên, gắn với bối cảnh chung","motto":"một câu châm ngôn tối đa 14 từ","secret":"một bí mật chưa ai biết, tối đa 25 từ"}`;
      key = { k: 'bio', name, dao, g, linh, purity, pers, origin, hc, hs, ey, sk, mk };
    } else if (b.kind === 'chapter') {
      const realm = num(b.realm, 1, 4), motto = textOk(b.motto || '');
      user = `Nhân vật ${name} (${g === 'f' ? 'nữ' : 'nam'}) vừa đột phá lên cảnh giới ${C.REALMS[realm]}.${motto ? ` Châm ngôn của nhân vật: "${motto}".` : ''}\nViết một đoạn nhật ký 60-90 từ (ngôi thứ ba), nhắc cảnh giới mới và cảm giác lúc đột phá, nối tiếp hành trình.\nTrả về JSON: {"text":"..."}`;
      key = { k: 'chapter', name, g, realm, motto };
    } else bad();
  } catch { return { status: 'invalid' }; }

  const id = crypto.createHash('sha1').update(`${VER}|${MODEL()}|${JSON.stringify(key)}`).digest('hex').slice(0, 20);
  try { const hit = (await query<{ value: StoryResult }>('SELECT value FROM story_cache WHERE id = $1', [id])).rows[0]; if (hit) return hit.value; } catch {}
  try {
    const raw = await ask({ model: MODEL(), system: system(), content: user, maxTokens: key.k === 'bio' ? 900 : 350, tag: 'story', maxPerHour: Number(process.env.STORY_MAX_PER_HOUR || 60) });
    let out: any;
    try { out = parseJson(raw); } catch (e) { console.warn('[story] unparsable output:', JSON.stringify(raw.slice(0, 240))); throw e; }
    const res: StoryResult = key.k === 'bio'
      ? { status: 'ready', bio: String(out.bio || '').slice(0, 1600), motto: String(out.motto || '').slice(0, 160), secret: String(out.secret || '').slice(0, 260) }
      : { status: 'ready', text: String(out.text || '').slice(0, 700) };
    if (key.k === 'bio' ? !(res as any).bio : !(res as any).text) return { status: 'failed' };
    try { await query('INSERT INTO story_cache (id, value) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING', [id, JSON.stringify(res)]); } catch (e: any) { console.warn('[story] could not cache', String(e?.message || e).slice(0, 120)); }
    return res;
  } catch (e: any) {
    const m = String(e?.message || e);
    console.warn('[story]', m.slice(0, 160));
    return { status: m === 'rate' || m === 'budget' ? 'limited' : 'failed' };
  }
}
export const storyInfo = async () => ({ enabled: llmEnabled(), model: MODEL(), ...(await budget()) });
