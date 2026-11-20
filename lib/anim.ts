// Linh Thú Viên lab (/lab/linh-thu). The parts that the page and the server share, with no imports, so the page can price a run before it starts.
// A variant is a mutated picture of a creature, drawn by EDITING its base picture (same body and pose, new colours and aura).
// A clip is a short looping video made from one picture: the first and the last frame are that same picture, so the end joins the start.
// A cut is a clip with its background removed: two H.264 videos, the picture and its alpha matte (the page joins them, see components/lab/AlphaVideo.tsx).
// Prices are as published on fal.ai (USD, audio off). A model that is not in the table is priced high on purpose.

export const ANIM_VERSION = 1;   // bump when the wording below changes: new ids, so new pictures are drawn instead of old ones reused
export const BASE = 'base';      // the creature's own picture, as opposed to a mutation of it
export const DEFAULT_MODEL = 'fal-ai/kling-video/v2.6/pro/image-to-video';
export const DEFAULT_CUT_MODEL = 'veed/video-background-removal/fast';
export const DEFAULT_FG_CUT_MODEL = 'fal-ai/bria/background/remove';   // picture -> PNG with alpha, for the foreground layer of a scene

export interface Mutation { id: string; name: string; en: string }
export interface Motion { id: string; name: string; en: string; move?: boolean; bold?: boolean }   // bold: the motion must be big and clearly visible on a small screen (the prompt and the negative prompt say so)   // move: the creature travels in the scene while this plays (walk, run)

// What a mutation looks like. 'ngusac' is the one the game already draws (lib/imageprompt.ts), so the lab reuses that picture instead of paying twice.
export const MUTATIONS: Mutation[] = [
  { id: 'ngusac', name: 'Ngũ Sắc', en: 'iridescent rainbow-colored fur or scales, a glowing prismatic aura and shimmering particles' },
  { id: 'hoalinh', name: 'Hỏa Linh', en: 'molten ember-red fur or scales veined with glowing lava, with a few small flames licking its back and floating sparks' },
  { id: 'hanbang', name: 'Hàn Băng', en: 'pale icy-blue fur or scales with pale frost crystals growing over its body, a thin cold glow and a few drifting snowflakes' },
  { id: 'loidien', name: 'Lôi Điện', en: 'deep violet fur or scales with bright blue-white lightning arcs running along its body and a crackling electric aura' },
  { id: 'huyetma', name: 'Huyết Ma', en: 'dark crimson fur or scales with black markings and glowing red eyes, edged by a thin blood-red glow' },
  { id: 'hoangkim', name: 'Hoàng Kim', en: 'gleaming pure-gold fur or scales like polished metal, a radiant sacred halo and drifting golden light motes' },
  { id: 'tinhha', name: 'Tinh Hà', en: 'a body that looks like a night sky full of stars and nebula colors, with glowing constellations tracing its form' },
  { id: 'ngocbich', name: 'Ngọc Bích', en: 'a solid body like polished carved jade, deep green with a soft green inner glow, and a few lotus petals clinging to it' },
  { id: 'amminh', name: 'Âm Minh', en: 'a ghostly pale-violet spirit-like but solid body with wisps of black ink-like smoke kept close to it, and cold white eyes' },
  { id: 'thanhmoc', name: 'Thanh Mộc', en: 'a moss-green coat with blossoming vines, small flowers and leaves growing on its back, and a soft glow' },
];

// What the creature does in a clip. Every clip ends where it started (the end frame is the start frame), so the motion has to come back to the first pose.
// Walk and run are done IN PLACE (like on a treadmill): the page moves the cut-out creature across the scene itself, so the picture must not travel.
const STATIC_CAM = 'The camera is completely static and the background stays the same.';
export const MOTIONS: Motion[] = [
  { id: 'idle', name: 'Đứng yên: thở, lông mượt, thân dao động', en: `The creature stands calmly in place and does not walk: its whole body sways and breathes gently and smoothly, its chest rises and falls slowly, its fur, mane, tail and any ribbons flow softly as in a light breeze, it blinks now and then, and its aura and light particles drift softly. Its feet stay planted on the same spot. ${STATIC_CAM}` },
  // The one the player's Linh Thú Viên uses. The creature is small on a phone, so 'gently' and 'softly' (the wording of idle) come out as a nearly still picture: this one names big,
  // concrete movements, all of them cyclic, and the clip still ends on the first pose. The picture it is made from has a flat plain background (plainPrompt), so nothing else moves.
  { id: 'live', name: 'Sống động (Linh Thú Viên)', bold: true, en: `The creature stays on the same spot with its feet fixed on the ground, but it is clearly alive and moving during the whole clip: its chest and flanks heave with deep, visible breaths, its whole body sways and shifts its weight from side to side, its head turns slowly to one side and then back and nods, its ears twitch, its tail swishes in a wide sweep, and its fur, mane and any vines, ribbons or feathers ripple and flutter strongly as if in a steady wind. It blinks and glances around. Its glow and light particles swirl and drift visibly around it. At the end it settles back into exactly the pose it started from. The camera is completely static and the plain flat background does not change.` },
  { id: 'aura', name: 'Hào quang dâng', en: `The creature stays in place while its glowing aura swells and pulses brighter, light particles swirl upward around it, and its fur or scales shimmer. ${STATIC_CAM}` },
  { id: 'walk', name: 'Đi bộ', move: true, en: `The creature walks in place in side view, taking slow steady steps with its legs cycling, its body and head bobbing gently and its tail or mane swaying. It stays in the same spot in the frame like on a treadmill and does not travel forward. ${STATIC_CAM}` },
  { id: 'run', name: 'Chạy', move: true, en: `The creature runs in place in side view at a fast gallop, its legs cycling quickly, its body stretching and bouncing and its fur or mane streaming backward. It stays in the same spot in the frame like on a treadmill and does not travel forward. ${STATIC_CAM}` },
  { id: 'roar', name: 'Ngẩng đầu gầm', en: `The creature slowly lifts its head and lets out a majestic roar, then settles back into the original pose, while wind moves its fur and the mist behind it. ${STATIC_CAM}` },
];

export const mutationOf = (id: unknown) => MUTATIONS.find((m) => m.id === id);
export const motionOf = (id: unknown) => MOTIONS.find((m) => m.id === id);
export const isPictureId = (id: unknown): id is string => typeof id === 'string' && /^[a-f0-9]{20}$/.test(id);

const NEG = 'No text, no watermark, no logo, no border.';
// The same instruction the game uses for its own mutated creatures, with the look swapped.
export const variantPrompt = (m: Mutation) => `Edit this image. Transform the creature into a rare mutated variant with ${m.en}. Keep exactly the same creature design, body shape, pose, camera framing, background and painting style. ${NEG}`;
export const clipPrompt = (m: Motion) => m.bold
  ? `${m.en} The motion is lively and clearly visible, not subtle. The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design and colors unchanged. Cinematic fantasy realism, no cuts, no text.`
  : `${m.en} The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design, colors and the background unchanged. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;

// The picture a Linh Thú Viên clip is made from: the creature on ONE flat colour. The game's own creature pictures stand in a misty dusk landscape; the background remover
// kept patches of that landscape (dark blotches round the creature) and the video model moved the mist instead of the creature. On a plain ground neither can happen.
// The colour is the one the creature differs from most (pale and glowing looks on a dark ground, the rest on white).
const PLAIN_DARK = new Set(['ngusac', 'hanbang', 'tinhha']);
export const plainBg = (look: string) => (PLAIN_DARK.has(look) ? 'deep charcoal grey' : 'pure white');
// keep: the picture already has the look (the game's own Ngũ Sắc picture), only its ground is changed; otherwise the look is drawn at the same time.
export const plainPrompt = (m: Mutation, keep: boolean) => `Edit this image. ${keep ? 'Keep the creature exactly as it is, with its colors and glow.' : `Transform the creature into a rare mutated variant with ${m.en}.`} Keep exactly the same creature design, body shape, pose, framing and painting style. Replace the entire background with one perfectly flat, uniform ${plainBg(m.id)} that fills the whole picture, with nothing else in it: no landscape, no mountains, no mist, no clouds, no ground, no floor, no cast shadow, no gradient, no vignette. Any glow, aura or particles stay close to the creature's body, and its outline stays sharp against the plain background. ${NEG}`;
// ---- poses: a creature of the pen takes the pose that fits the perch it stands on (on a rock it watches the distance, at the water it drinks, ...). 'stand' is the picture
// the creature already has (plainPrompt); every other pose is the same creature redrawn in that pose on the same flat ground, then cut out.
export const POSES: Record<string, { name: string; en: string }> = {
  stand: { name: 'Đứng', en: '' },
  watch: { name: 'Ngắm xa', en: 'sitting or standing tall and proud with its chest out and its head raised high, gazing far into the distance, seen from the side' },
  drink: { name: 'Uống nước', en: 'standing with its head lowered right down to the ground, its mouth reaching down as if drinking from the water at its feet, seen from the side' },
  rest: { name: 'Nghỉ ngơi', en: 'lying down peacefully on the ground, curled up and relaxed with its eyes half closed, seen from the side' },
  walk: { name: 'Dạo bước', en: 'walking calmly forward in mid-stride, one front limb lifted, its head level and its eyes ahead, seen from the side' },
};
export const poseOk = (id: unknown): id is string => typeof id === 'string' && Object.prototype.hasOwnProperty.call(POSES, id);
export const posePrompt = (m: Mutation, keep: boolean, pose: string) => pose === 'stand' || !poseOk(pose) ? plainPrompt(m, keep)
  : plainPrompt(m, keep).replace('Keep exactly the same creature design, body shape, pose, framing and painting style.', `Keep exactly the same creature design, body shape, colors and painting style, but redraw the creature in a new pose: ${POSES[pose].en}. Adapt the pose to its anatomy and keep the whole creature, including its tail and limbs, inside the picture with some space around it.`);
const CLIP_NEG = 'blur, distortion, low quality, text, watermark, camera movement, zoom, scene change, extra limbs, morphing into another creature';
const CLIP_NEG_BOLD = 'static, frozen, still image, motionless, ' + CLIP_NEG;

// Input of the video model. Only Kling 2.6 Pro has been checked against its documentation (start_image_url, end_image_url, duration "5" or "10",
// generate_audio). Any other model gets the plainest input, which may need adjusting: check its page on fal.ai before switching FAL_ANIM_MODEL.
export function clipInput(model: string, p: { prompt: string; imageUrl: string; seconds: number; bold?: boolean }): Record<string, unknown> {
  const duration = String(p.seconds === 10 ? 10 : 5);
  if (/\/kling-video\/v2\.6\//.test(model)) return { prompt: p.prompt, start_image_url: p.imageUrl, end_image_url: p.imageUrl, duration, negative_prompt: p.bold ? CLIP_NEG_BOLD : CLIP_NEG, generate_audio: false };
  return { prompt: p.prompt, image_url: p.imageUrl, duration };
}

// Input of the background-removal model. H.264 gives TWO videos (the picture and its alpha matte), which is what Safari needs: it shows the alpha of a
// WebM as black. Only VEED's fast model is checked against its documentation (video_url, output_codec, refine_foreground_edges, subject_is_person).
export function cutInput(model: string, videoUrl: string): Record<string, unknown> {
  if (model === 'veed/video-background-removal/fast') return { video_url: videoUrl, output_codec: 'h264', refine_foreground_edges: true, subject_is_person: false };
  return { video_url: videoUrl };
}

// The foreground layer of a scene (grass, rocks, roots drawn OVER the creatures' feet): the zone's own picture is edited down to its nearest elements on a
// plain white ground, then the white is cut away. The page also fades the top of this layer out, so whatever the edit keeps of the middle distance never hides a creature.
export const fgPrompt = () => `Edit this image. Keep ONLY the closest foreground elements along the bottom edge and the lower corners (the nearest grass, plants, rocks, roots and branches), exactly as they are. Replace everything else (sky, mountains, distant trees, water, buildings, mist) with a flat pure white background. Do not add anything new and do not change the foreground you keep. ${NEG}`;
export const fgCutInput = (imageUrl: string): Record<string, unknown> => ({ image_url: imageUrl });
export const FG_CUT_USD = 0.02;   // Bria background removal is about 0.018 USD per picture, rounded up
export const fgCost = (editUsd: number) => Math.round((editUsd + FG_CUT_USD) * 1000) / 1000;
// The pictures a scene can stand on: the two of the game's own atmosphere (a sea of clouds, by day and by night) and the pictures of the zones.
export const SCENE_IDS = ['dawn', 'night'] as const;
export const bgPath = (id: string) => ((SCENE_IDS as readonly string[]).includes(id) ? `/art/scene/${id}.webp` : `/art/zones/${id}.jpg`);
export const bgExt = (id: string) => ((SCENE_IDS as readonly string[]).includes(id) ? 'webp' : 'jpg');
export const isZoneId = (id: unknown): id is string => typeof id === 'string' && /^[a-z]{3,12}$/.test(id);

// USD per second of video, audio off.
const CLIP_PER_SEC: Record<string, number> = {
  'fal-ai/kling-video/v2.6/pro/image-to-video': 0.07,
  'fal-ai/kling-video/v2.5-turbo/pro/image-to-video': 0.07,
  'fal-ai/kling-video/o3/pro/image-to-video': 0.112,
  'fal-ai/kling-video/v3/pro/image-to-video': 0.112,
  'fal-ai/wan-pro/image-to-video': 0.16,
};
// VEED fast: $0.012 per 30 frames with edge refinement, counted here as 30 frames per second of clip (a clip may have fewer, so this errs high).
const CUT_PER_SEC: Record<string, number> = { 'veed/video-background-removal/fast': 0.012 };
const r3 = (x: number) => Math.round(x * 1000) / 1000;
export const clipCost = (model: string, seconds: number) => r3((CLIP_PER_SEC[model] ?? 0.2) * seconds);
export const cutCost = (model: string, seconds: number) => r3((CUT_PER_SEC[model] ?? 0.05) * seconds);

export interface RunPlan { edits: number; clips: number; usd: number }
// The most a run can cost: every variant drawn, every clip made and, when cutModel is given, every clip cut out (pictures that already exist are free).
export function estimate(o: { model: string; seconds: number; editUsd: number; variants: number; motions: number; cutModel?: string }): RunPlan {
  const edits = Math.max(0, o.variants), clips = (edits + 1) * Math.max(0, o.motions);
  const per = clipCost(o.model, o.seconds) + (o.cutModel ? cutCost(o.cutModel, o.seconds) : 0);
  return { edits, clips, usd: Math.round((edits * o.editUsd + clips * per) * 100) / 100 };
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
