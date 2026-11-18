// Linh Thú Viên lab (/lab/linh-thu). The parts that the page and the server share, with no imports, so the page can price a run before it starts.
// A variant is a mutated picture of a creature, drawn by EDITING its base picture (same body and pose, new colours and aura).
// A clip is a short looping video made from one picture: the first and the last frame are that same picture, so the end joins the start.
// Prices are as published on fal.ai (USD, audio off). A model that is not in the table is priced high on purpose.

export const ANIM_VERSION = 1;   // bump when the wording below changes: new ids, so new pictures are drawn instead of old ones reused
export const BASE = 'base';      // the creature's own picture, as opposed to a mutation of it
export const DEFAULT_MODEL = 'fal-ai/kling-video/v2.6/pro/image-to-video';

export interface Mutation { id: string; name: string; en: string }
export interface Motion { id: string; name: string; en: string }

// What a mutation looks like. 'ngusac' is the one the game already draws (lib/imageprompt.ts), so the lab reuses that picture instead of paying twice.
export const MUTATIONS: Mutation[] = [
  { id: 'ngusac', name: 'Ngũ Sắc', en: 'iridescent rainbow-colored fur or scales, a glowing prismatic aura and shimmering particles' },
  { id: 'hoalinh', name: 'Hỏa Linh', en: 'molten ember-red fur or scales veined with glowing lava, wreathed in drifting flames and floating sparks' },
  { id: 'hanbang', name: 'Hàn Băng', en: 'pale icy-blue fur or scales with translucent frost crystals growing over its body, a cold mist aura and drifting snow' },
  { id: 'loidien', name: 'Lôi Điện', en: 'deep violet fur or scales with bright blue-white lightning arcs running along its body and a crackling electric aura' },
  { id: 'huyetma', name: 'Huyết Ma', en: 'dark crimson fur or scales with black markings and glowing red eyes, wrapped in a blood-red mist' },
  { id: 'hoangkim', name: 'Hoàng Kim', en: 'gleaming pure-gold fur or scales like polished metal, a radiant sacred halo and drifting golden light motes' },
  { id: 'tinhha', name: 'Tinh Hà', en: 'a body that looks like a night sky full of stars and nebula colors, with glowing constellations tracing its form' },
  { id: 'ngocbich', name: 'Ngọc Bích', en: 'translucent jade-green body like polished jade with a soft green inner glow and drifting lotus petals' },
  { id: 'amminh', name: 'Âm Minh', en: 'a ghostly pale-violet semi-transparent spirit body trailing black ink-like smoke, with cold white eyes' },
  { id: 'thanhmoc', name: 'Thanh Mộc', en: 'a moss-green coat with blossoming vines, small flowers and leaves growing on its back, and a soft glowing pollen haze' },
];

// What the creature does in a clip. Every clip ends where it started (the end frame is the start frame), so the motion has to come back to the first pose.
const STATIC_CAM = 'The camera is completely static and the background stays the same.';
export const MOTIONS: Motion[] = [
  { id: 'idle', name: 'Thở và chớp mắt', en: `The creature stands calmly: its chest rises and falls as it breathes slowly, it blinks, its tail or mane sways gently, and the aura and light particles drift softly. ${STATIC_CAM}` },
  { id: 'aura', name: 'Hào quang dâng', en: `The creature stays in place while its glowing aura swells and pulses brighter, light particles swirl upward around it, and its fur or scales shimmer. ${STATIC_CAM}` },
  { id: 'roar', name: 'Ngẩng đầu gầm', en: `The creature slowly lifts its head and lets out a majestic roar, then settles back into the original pose, while wind moves its fur and the mist behind it. ${STATIC_CAM}` },
];

export const mutationOf = (id: unknown) => MUTATIONS.find((m) => m.id === id);
export const motionOf = (id: unknown) => MOTIONS.find((m) => m.id === id);
export const isPictureId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{20}$/.test(id);

const NEG = 'No text, no watermark, no logo, no border.';
// The same instruction the game uses for its own mutated creatures, with the look swapped.
export const variantPrompt = (m: Mutation) => `Edit this image. Transform the creature into a rare mutated variant with ${m.en}. Keep exactly the same creature design, body shape, pose, camera framing, background and painting style. ${NEG}`;
export const clipPrompt = (m: Motion) => `${m.en} The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design, colors and the background unchanged. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;
const CLIP_NEG = 'blur, distortion, low quality, text, watermark, camera movement, zoom, scene change, extra limbs, morphing into another creature';

// Input of the video model. Only Kling 2.6 Pro has been checked against its documentation (start_image_url, end_image_url, duration "5" or "10",
// generate_audio). Any other model gets the plainest input, which may need adjusting: check its page on fal.ai before switching FAL_ANIM_MODEL.
export function clipInput(model: string, p: { prompt: string; imageUrl: string; seconds: number }): Record<string, unknown> {
  const duration = String(p.seconds === 10 ? 10 : 5);
  if (/\/kling-video\/v2\.6\//.test(model)) return { prompt: p.prompt, start_image_url: p.imageUrl, end_image_url: p.imageUrl, duration, negative_prompt: CLIP_NEG, generate_audio: false };
  return { prompt: p.prompt, image_url: p.imageUrl, duration };
}

// USD per second of video, audio off.
const CLIP_PER_SEC: Record<string, number> = {
  'fal-ai/kling-video/v2.6/pro/image-to-video': 0.07,
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': 0.07,
  'fal-ai/kling-video/o3/pro/image-to-video': 0.112,
  'fal-ai/kling-video/v3/pro/image-to-video': 0.112,
  'fal-ai/wan-pro/image-to-video': 0.16,
};
const r3 = (x: number) => Math.round(x * 1000) / 1000;
export const clipCost = (model: string, seconds: number) => r3((CLIP_PER_SEC[model] ?? 0.2) * seconds);

export interface RunPlan { edits: number; clips: number; usd: number }
// The most a run can cost: every variant drawn and every clip made (pictures that already exist are free).
export function estimate(o: { model: string; seconds: number; editUsd: number; variants: number; motions: number }): RunPlan {
  const edits = Math.max(0, o.variants), clips = (edits + 1) * Math.max(0, o.motions);
  return { edits, clips, usd: Math.round((edits * o.editUsd + clips * clipCost(o.model, o.seconds)) * 100) / 100 };
}

// One HTTP Range header -> the bytes to send. null: no header (send everything). 'bad': cannot be satisfied (answer 416).
// A phone asks for "bytes=0-" and must be given pieces; the piece is cut to `chunk` bytes because a serverless answer has a size limit.
export function parseRange(header: string | null, size: number, chunk = 1_048_576): { start: number; end: number } | 'bad' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '') || size <= 0) return 'bad';
  let start: number, end: number;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (!(n > 0)) return 'bad';
    start = Math.max(0, size - n); end = size - 1;
  } else {
    start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (!(start <= end) || start >= size) return 'bad';
  return { start, end: Math.min(end, start + chunk - 1) };
}
