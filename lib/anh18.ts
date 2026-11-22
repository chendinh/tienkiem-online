// Lab "Ảnh 18+": adult, fictional xianxia portraits drawn with fal models, to compare models before a paid feature exists.
// Shared by the page and by /api/lab/anh18 (the server is the one that enforces the rules; the page only shows them).
// Rules kept here on purpose: the character is always an original, fictional ADULT; suggestive (revealing clothes, alluring poses) but never explicit;
// no reference pictures are accepted, so no real person's face can be fed in.

export type ModelId = 'seedream45' | 'flux2pro' | 'flux2max' | 'flux2dev' | 'kolors' | 'sdxl';
export type Res = '2k' | '4k';

export interface ModelInfo { id: ModelId; label: string; endpoint: string; note: string; native4k: boolean; legacy?: boolean }
export const MODELS: ModelInfo[] = [
  { id: 'seedream45', label: 'Seedream 4.5', endpoint: 'fal-ai/bytedance/seedream/v4.5/text-to-image', note: '4K thật · khoảng $0.04/ảnh', native4k: true },
  { id: 'flux2pro', label: 'FLUX.2 Pro', endpoint: 'fal-ai/flux-2-pro', note: 'mặt người thật · tối đa khoảng 4MP (≈2K)', native4k: false },
  { id: 'flux2max', label: 'FLUX.2 Max', endpoint: 'fal-ai/flux-2-max', note: 'chi tiết nhất của dòng FLUX.2 · tối đa khoảng 4MP', native4k: false },
  { id: 'flux2dev', label: 'FLUX.2 dev', endpoint: 'fal-ai/flux-2', note: 'đời cũ hơn, rẻ · khoảng 1–2K', native4k: false, legacy: true },
  { id: 'kolors', label: 'Kolors', endpoint: 'fal-ai/kolors', note: 'đời cũ · ảnh chân thực · khoảng 1K', native4k: false, legacy: true },
  { id: 'sdxl', label: 'SDXL', endpoint: 'fal-ai/fast-sdxl', note: 'đời cũ · nhanh · khoảng 1K', native4k: false, legacy: true },
];
export const modelOf = (id: unknown): ModelInfo | undefined => MODELS.find((m) => m.id === id);

export const DEFAULT_SCENE = 'breathtakingly beautiful fairy cultivator, long flowing black hair with jade hairpins, delicate lifelike face, sheer layered silk hanfu with bare shoulders, plunging neckline and a high thigh slit, graceful alluring pose, standing barefoot on a giant glowing lotus above a sea of clouds, floating islands and waterfalls, drifting spirit qi and petals, dreamy ethereal moonlight';

// Preset scenes, from tasteful to bold. All stay clothed: no nudity, intimate areas always covered.
export const SCENES: { id: string; label: string; text: string }[] = [
  { id: 'gocam', label: 'Gợi cảm', text: DEFAULT_SCENE },
  { id: 'quyenru', label: 'Quyến rũ', text: 'seductive fairy cultivator reclining on silk cushions in a moonlit jade pavilion, sheer silk robe slipping off one shoulder over a tiny gauzy bodice, long skirt with a very high slit showing her legs, teasing glance over her shoulder, loose damp hair, drifting incense smoke and glowing lanterns, dreamy ethereal haze' },
  { id: 'taobao', label: 'Táo bạo', text: 'bold provocative immortal enchantress, tiny embroidered silk wrap top and low-slung gauzy skirt with a lingerie-style ornate underlayer, back arched, hands running through wet hair, standing waist-deep in a glowing spirit hot spring under a full moon, wet silk clinging to her curves, rising steam, lotus petals and fireflies, confident smoldering gaze' },
];

// What is always added around the owner's scene text.
export const PREFIX = 'Cinematic fantasy wallpaper of an original fictional adult woman (about 25-30 years old), a xianxia immortal cultivator. ';
export const SUFFIX = ' Ultra detailed masterpiece, dreamlike ethereal lighting, glowing spirit energy, richly layered background details, alluring and provocative but always clothed: all intimate areas covered by fabric, jewelry or steam, no nudity, fully non-explicit.';

// Words that stop the request: anything that points at a minor, at a real person, or at explicit nudity / sex acts.
const MINOR = /\b(loli\w*|shota|child\w*|kid\w*|minor|underage|under\s?age|teen\w*|toddler|baby|girl\w*|boy\w*|schoolgirl|school\s?uniform|student|juvenile|preteen|young\s+(?:girl|looking|face)|1[0-7]\s?(?:yo|y\/o|years?\s?old))\b|trẻ\s?em|bé\s?gái|thiếu\s?nữ|học\s?sinh|nhỏ\s?tuổi|chưa\s?đủ\s?tuổi|\b1[0-7]\s?tuổi/i;
const REAL = /\b(celebrity|real\s+person|lookalike|look-alike|deepfake|face\s?swap|photo\s+of|resembling|looks?\s+like|same\s+face\s+as)\b|người\s?nổi\s?tiếng|giống\s+(?:diễn\s?viên|ca\s?sĩ|người\s?thật)|ảnh\s?thật/i;
const EXPLICIT = /\b(nude|naked|nudity|topless|nipple\w*|areola\w*|genital\w*|vagina\w*|pussy|penis|cock|dick|cum|cumshot|sex\w*|intercourse|blowjob|fellatio|orgasm\w*|porn\w*|hentai|explicit|bondage|fetish|rape\w*|incest)\b|khỏa\s?thân|lõa\s?thể|không\s?mặc\s?gì|làm\s?tình|tình\s?dục/i;

export function promptProblem(text: string): string | null {
  const t = text.normalize('NFC');
  if (MINOR.test(t)) return 'minor';
  if (REAL.test(t)) return 'real';
  if (EXPLICIT.test(t)) return 'explicit';
  return null;
}
export const buildPrompt = (scene: string): string => PREFIX + scene.trim().replace(/\s+/g, ' ').slice(0, 2000) + SUFFIX;

// Only the older models take a negative prompt (the newer ones ignore negation, so hands and faces are handled by positive wording in lib/wallpaper.ts).
const NEG = 'extra fingers, fused fingers, bad hands, deformed face, asymmetrical eyes, extra limbs, bad anatomy, blurry, low quality, watermark, text, logo';
// Input per model. enable_safety_checker stays true unless the account has been authorised by fal to turn it off AND the owner sets FAL_NSFW_AUTHORIZED=1.
export function inputOf(id: ModelId, prompt: string, res: Res, tol: number, authorised: boolean): Record<string, unknown> {
  // The older models have no authorisation step, so the checker is never switched off for them, whatever the server flag says.
  const checker = { enable_safety_checker: modelOf(id)?.legacy ? true : !authorised };
  if (id === 'flux2dev') return { prompt, image_size: 'portrait_16_9', num_images: 1, output_format: 'jpeg', ...checker };
  if (id === 'kolors') return { prompt, negative_prompt: NEG, image_size: 'portrait_16_9', num_images: 1, output_format: 'jpeg', ...checker };
  if (id === 'sdxl') return { prompt, negative_prompt: NEG, image_size: 'portrait_16_9', num_images: 1, format: 'jpeg', ...checker };
  if (id === 'seedream45') return { prompt, image_size: res === '4k' ? { width: 2304, height: 4096 } : { width: 1536, height: 2688 }, num_images: 1, ...checker };
  return { prompt, image_size: 'portrait_16_9', safety_tolerance: String(Math.min(5, Math.max(1, Math.round(tol) || 5))), output_format: 'jpeg', ...checker };
}
