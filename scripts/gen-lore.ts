// One-off: asks Claude to write the shared world story and saves it to content/lore.json (commit the result).
import fs from 'node:fs';
import { ask, parseJson } from '../lib/llm';
import * as C from '../lib/content';
try { (process as any).loadEnvFile('.env.local'); } catch {}

const beasts = C.SPECIES.map((s) => `${s.id}: ${s.name} (hệ ${s.el[0]})`).join('; ');
const prompt = `Hãy viết bối cảnh chung (lore) cho game tu tiên treo máy bằng tiếng Việt. Văn phong mơ mộng, đẹp, giàu hình ảnh, Hán-Việt vừa phải. Chỉ viết bằng tiếng Việt với chữ Latinh: tuyệt đối không dùng chữ Hán hay chữ Trung Quốc. Không lấy nhân vật hay tình tiết từ tác phẩm có bản quyền.

Những yếu tố của game, hãy lồng vào bối cảnh một cách tự nhiên:
- Tám hệ theo vòng tương khắc: ${C.EO.join(' → ')}.
- Năm cảnh giới: ${C.REALMS.join(' → ')}; mỗi cảnh giới có Sơ Kỳ, Trung Kỳ, Hậu Kỳ, Đỉnh Phong; từ Kim Đan trở lên khi đột phá phải qua Thiên Kiếp; đột phá thất bại sinh Tâm Ma.
- Tám Linh Thú: ${beasts}. Thỉnh thoảng có cá thể Dị Biến (đổi màu, tỏa hào quang) do linh khí trời đất rối loạn.
- Thiên Đạo Bảo Hộ: trời đất thương kẻ xui xẻo, càng nhiều lần thất bại thì cơ duyên càng gần.
- Pháp khí có sáu hạng: Phàm, Hoàng, Huyền, Địa, Thiên, Tiên (hạng Tiên mang Tiên Văn). Có Linh Thạch, Khế Ước Phù, Bế Quan, Kỳ Ngộ.

Trả về JSON đúng cấu trúc, không thêm lời dẫn:
{
 "worldName": "tên đại lục",
 "tagline": "một câu giới thiệu, tối đa 20 từ",
 "prologue": ["3 đoạn mở đầu, mỗi đoạn 60-90 từ"],
 "threat": "mối họa lớn xuyên suốt, 40-60 từ",
 "eras": [{"name":"","text":"tối đa 45 từ"}] (3 thời kỳ),
 "elements": [{"element":"Kim","text":"tối đa 35 từ"}] (đủ 8 hệ, đúng tên: ${C.EO.join(', ')}),
 "realms": [{"realm":"Luyện Khí","text":"tối đa 40 từ"}] (đủ 5 cảnh giới),
 "beasts": {"ho":"truyền thuyết 35-50 từ", "giao":"...", "loc":"...", "bang":"...", "quy":"...", "loi":"...", "am":"...", "duong":"..."},
 "regions": [{"name":"","text":"tối đa 40 từ"}] (4 vùng; vùng đầu tiên BẮT BUỘC tên là "Vân Mộng Sơn", nơi nhân vật bắt đầu),
 "factions": [{"name":"","text":"tối đa 40 từ"}] (3 thế lực),
 "hook": "câu dẫn nhập cho nhân vật chính, tối đa 40 từ"
}`;
(async () => {
  const text = await ask({ model: process.env.LORE_MODEL || 'claude-sonnet-5-5', content: prompt, maxTokens: 6000, tag: 'lore', maxPerHour: 5 });
  const lore = parseJson(text);
  for (const k of ['worldName', 'tagline', 'prologue', 'threat', 'eras', 'elements', 'realms', 'beasts', 'regions', 'factions', 'hook']) if (!lore[k]) throw new Error('missing ' + k);
  for (const s of C.SPECIES) if (!lore.beasts[s.id]) throw new Error('missing beast ' + s.id);
  fs.mkdirSync('content', { recursive: true });
  fs.writeFileSync('content/lore.json', JSON.stringify(lore, null, 1));
  console.log('saved content/lore.json:', lore.worldName, '|', lore.tagline);
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
