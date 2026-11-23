// /gen-ai: the player-facing picture maker ("Ảnh chân dung tu tiên của bạn"). Shared by the page (what to show) and /api/gen-ai (the rules the server enforces).
// Differences from the owner's lab (lib/wallpaper.ts, which stays as it is):
//  - Seedream 4.5 "edit" only, always with the player's OWN photo; the look is always elegant and fully clothed (never the alluring levels);
//  - five stories are switched off for now (HIDDEN_STORIES), the round moon-gate camera is gone and a "peek through a doorway" camera takes its place;
//  - the hands have a "natural" choice, the expressions are described feature by feature so they read clearly, and the body proportions are spelled out;
//  - the player sees the whole description (the prompt) and may rewrite it; the server still adds its fixed lines and runs the word filter on it.
import { FRAMES, HAIR, LAYOUT, LEVELS, REFLECTION, STORIES as ALL_STORIES, STORY_POSE, STYLES, VIEWS, validPoses, POSES, type Opt, type Pose } from './wallpaper';
import { FACELESS_PREFIX, FACE_SUFFIX, promptProblem } from './anh18';
import * as M from './genaiMale';

export { FRAMES, HAIR, STYLES, VIEWS, POSES, validPoses, promptProblem };
export type { Opt, Pose };

// ---- legal -------------------------------------------------------------------------------------------------------------------------
// Bump the version whenever the text changes: the page asks again and the server only accepts the current version.
export const LEGAL_VERSION = 'gen-ai-2026-11-23b';
export const MIN_AGE = 18;
export const LEGAL: { h: string; p: string }[] = [
  { h: 'Chỉ từ 18 tuổi', p: `Bạn phải từ đủ ${MIN_AGE} tuổi trở lên mới được dùng tính năng này. Tính năng không dành cho người dưới ${MIN_AGE} tuổi.` },
  { h: 'Chỉ dùng ảnh cá nhân của chính bạn', p: 'Chỉ tải lên ảnh khuôn mặt của chính bạn. Không dùng ảnh của người khác (bạn bè, người thân, người yêu, người nổi tiếng), không dùng ảnh trẻ em, và không dùng ảnh bạn không có quyền sử dụng, kể cả khi bạn nghĩ họ sẽ không phiền.' },
  { h: 'Đây không phải nội dung 18+', p: 'Ảnh tạo ra luôn thanh lịch, ăn mặc kín đáo. Hệ thống tự lọc phần mô tả và cả ảnh kết quả. Mọi cố gắng tạo ảnh khỏa thân, khiêu dâm hoặc gợi dục bằng khuôn mặt của một người đều bị chặn, và có thể bị khóa tính năng hoặc tài khoản.' },
  { h: 'Cách dùng ảnh tạo ra', p: 'Không dùng ảnh để mạo danh, lừa đảo, bôi nhọ, quấy rối, hay để người khác hiểu nhầm là ảnh thật. Bạn tự chịu trách nhiệm về việc dùng và chia sẻ ảnh của mình.' },
  { h: 'Bạn cho phép dùng ảnh cá nhân của mình', p: 'Ảnh khuôn mặt là dữ liệu cá nhân nhạy cảm. Bằng việc tải ảnh lên và bấm xác nhận, bạn đồng ý cho phép Tiên Kiếm và nhà cung cấp dịch vụ vẽ ảnh AI (fal.ai, mô hình Seedream của ByteDance) sử dụng ảnh đó, và chỉ cho một mục đích: vẽ ảnh chân dung cho riêng bạn trong lần này. Mỗi lần vẽ bạn đều phải xác nhận lại.' },
  { h: 'Ảnh không được lưu lại', p: 'Tiên Kiếm không lưu ảnh gốc và không lưu ảnh kết quả. Nhà cung cấp có thể giữ tạm theo chính sách của họ, vì vậy hãy tải ảnh về ngay sau khi vẽ xong. Việc không lưu ảnh không thay thế sự cho phép ở trên: không có sự cho phép của bạn thì ảnh không được dùng.' },
  { h: 'Nhật ký chống lạm dụng', p: 'Để ngăn lạm dụng, hệ thống ghi lại tài khoản, thời điểm, phiên bản điều khoản bạn đã xác nhận và nội dung mô tả (prompt). Hệ thống không ghi ảnh.' },
  { h: 'Kết quả do AI tạo', p: 'Ảnh có thể khác bạn hoặc có lỗi chi tiết (tay, chân, tỷ lệ). Chúng tôi không đảm bảo giống hay hoàn hảo. Mỗi tài khoản có số lượt vẽ giới hạn mỗi ngày; lượt vẽ lỗi không bị trừ.' },
];

// What the player confirms before every picture (and once on entering).
export interface Consent { personal: boolean; adult: boolean; terms: string }
export const consentOk = (c: any): boolean => !!c && c.personal === true && c.adult === true && c.terms === LEGAL_VERSION;

// ---- options -----------------------------------------------------------------------------------------------------------------------
// Off for now (the owner's list): they may come back later by removing the id here. suoinong (a hot spring) is also off: with a real person's face it is not worth the risk.
export const HIDDEN_STORIES = ['daohoa', 'bangtuyet', 'tinhha', 'longcung', 'thuphong', 'suoinong'];
const MOOD: Record<string, string> = {
  lienhoa: 'Ao sen dưới trăng, đom đóm và cá chép phát sáng',
  hoadiep: 'Bướm lửa bay quanh, rừng trúc lúc hoàng hôn',
  hoason: 'Thần điện đá đen, dung nham và phượng hoàng',
  thuphong2: 'Thư viện cổ khổng lồ, cuộn sách bay, ánh nến',
  cocam: 'Đình bên hồ dưới trăng, tiếng cổ cầm',
  duthu: 'Ngõ đá, mưa cánh hoa đào, đèn lồng đỏ',
  hongtuyen: 'Sợi chỉ đỏ nhân duyên bay ngang trời chiều',
  nguyetmon: 'Khu vườn cổ, hoa mai và chiếc quạt lụa tròn',
  ruouhoa: 'Vườn lê nở rộ dưới trăng, chén ngọc chờ ai đó',
};
export interface GenStory extends Opt { setting: string; mood: string }
export const STORIES: GenStory[] = ALL_STORIES.filter((s) => !HIDDEN_STORIES.includes(s.id)).map((s) => ({ ...s, mood: MOOD[s.id] || '' }));

// UI helpers shown next to each option (the text is Vietnamese for the player; `text` stays English for the model).
export interface Choice extends Opt { icon: string; hint: string; tone?: string }

export const ANGLES: Choice[] = [
  { id: 'eye', label: 'Ngang tầm mắt', icon: '👁️', hint: 'Tự nhiên, ít lỗi nhất', text: 'camera at eye level' },
  { id: 'low', label: 'Từ dưới nhìn lên', icon: '⬆️', hint: 'Dáng cao, uy nghi', text: 'dramatic low-angle camera looking up at her, powerful and graceful' },
  { id: 'high', label: 'Từ trên nhìn xuống', icon: '⬇️', hint: 'Mềm mại, đáng yêu', text: 'high-angle camera looking slightly down at her' },
  { id: 'tilt', label: 'Chéo, năng động', icon: '📐', hint: 'Bố cục chéo, có chuyển động', text: 'slightly tilted dynamic camera with a diagonal composition' },
  { id: 'peek', label: 'Nhìn qua khung cửa', icon: '🚪', hint: 'Như nhìn lén qua khe cửa, rất chân thật', text: 'candid shot from outside looking in through an open carved wooden doorway, the dark door frame and a silk curtain softly blurred in the foreground framing her' },
];

// "natural" lets the model choose what suits the pose and the scene; the others fix one simple, well-known hand pose.
export const HANDS: Choice[] = [
  { id: 'natural', label: 'Tự nhiên theo ảnh', icon: '✨', hint: 'Để AI đặt tay cho hợp dáng và cảnh', text: 'her hands rest in a relaxed position that suits her pose and the scene, small and simple, each visible hand with five slender natural fingers, partly covered by a sleeve or prop where natural' },
  { id: 'hidden', label: 'Giấu trong tay áo', icon: '🧤', hint: 'Ít lỗi nhất', text: 'both hands are hidden inside her wide flowing sleeves, no hands visible' },
  { id: 'cheek', label: 'Tựa má', icon: '🤔', hint: 'Tay áo che gần hết bàn tay', text: 'her cheek rests lightly against the back of one hand that is mostly covered by a long flowing sleeve, only the relaxed fingertips show, the other arm out of frame' },
  { id: 'hair', label: 'Vuốt tóc sau tai', icon: '💇', hint: 'Một tay, năm ngón thon', text: 'one hand with five natural slender fingers gently tucks a strand of hair behind her ear, the elbow bent naturally, the other hand out of frame' },
  { id: 'flower', label: 'Cầm một cành hoa', icon: '🌸', hint: 'Tay cầm cành hoa gần ngực', text: 'one hand holds a single flower by its stem near her chest, five natural fingers visible, the other hand out of frame' },
  { id: 'fan', label: 'Cầm quạt tròn', icon: '🪭', hint: 'Quạt che gần hết bàn tay', text: 'one hand holds a round silk fan close to her shoulder, the fan covers most of the hand, the other hand out of frame' },
];
const HANDS_CLOSE = 'her hands are outside the frame';
export const toneLine = M.toneLine;

// Each expression names the eyes, the brows and the mouth, because "a soft look" is too weak to change a face taken from a photo.
export const EXPRESSIONS: Choice[] = [
  { id: 'smile', label: 'Cười tươi', icon: '😊', hint: 'Miệng cười rạng rỡ, mắt cong', text: 'a bright, clearly visible smile with a hint of teeth, cheeks lifted, eyes curved with joy', tone: 'bright and joyful, warm golden light, lively colours, sparkling highlights, drifting petals' },
  { id: 'tender', label: 'Dịu dàng', icon: '🙂', hint: 'Cười nhẹ, ánh mắt ấm', text: 'a gentle closed-lip smile, soft warm eyes looking at the viewer, relaxed brows', tone: 'warm soft light, gentle peach and rose tones, a tender calm atmosphere' },
  { id: 'tease', label: 'Tinh nghịch', icon: '😏', hint: 'Nhếch môi, liếc ngang', text: 'a mischievous smirk with one corner of the lips raised higher, one eyebrow slightly arched, a playful sideways glance', tone: 'playful sparkling light, lively contrast, little glints of light dancing around her' },
  { id: 'shy', label: 'E thẹn', icon: '😳', hint: 'Má ửng hồng, mắt nhìn xuống', text: 'a shy blush on the cheeks, eyes glancing down and to the side, a small bashful smile', tone: 'soft pink glow, hazy blossom-coloured light, delicate drifting petals, a bashful atmosphere' },
  { id: 'sad', label: 'Man mác buồn', icon: '🥺', hint: 'Mắt long lanh, nét buồn nhẹ', text: 'a wistful, sorrowful look, eyes glistening, brows slightly drawn together, lips softly closed, the corners of the lips relaxed and slightly downturned', tone: 'wistful, cool dim blue-grey light, thin mist, a few petals falling slowly, muted colours, one lantern glowing' },
  { id: 'cool', label: 'Lạnh lùng, kiêu kỳ', icon: '😐', hint: 'Không cười, ánh mắt sắc', text: 'a cold, regal expression without a smile, sharp steady eyes, chin lifted, lips closed and calm', tone: 'cold silver-blue moonlight, crisp still air, strong contrast, a solemn regal atmosphere' },
  { id: 'dream', label: 'Mơ màng', icon: '😌', hint: 'Mắt khép hờ, nhìn xa', text: 'a dreamy look, half-closed eyes gazing into the distance, lips slightly parted', tone: 'hazy luminous bloom, pastel mist, floating motes of light, a soft dreamlike atmosphere' },
];

// Looking through a doorway must fit the place: each story names the door, gate or opening that really belongs to its setting (the generic text is the fallback).
const PEEK: Record<string, string> = {
  lienhoa: 'candid shot from outside looking in through an open carved wooden doorway of a lakeside corridor, the dark door frame and a silk curtain softly blurred in the foreground framing her',
  hoadiep: 'candid shot from outside looking in through the parted red silk curtains at the entrance of a bamboo pavilion, the curtain edges and a hanging lantern softly blurred in the foreground framing her',
  hoason: 'candid shot from outside looking in through a tall black stone temple archway edged with gold, the archway pillars and drifting embers softly blurred in the foreground framing her',
  thuphong2: 'candid shot from outside looking in through a half-open carved wooden library door, the dark door frame and a hanging silk curtain softly blurred in the foreground framing her',
  cocam: 'candid shot from outside looking in through the hanging silk curtains at the edge of the lakeside pavilion, the curtains and the carved railing softly blurred in the foreground framing her',
  duthu: 'candid shot from outside looking in through a carved wooden gate left ajar in a stone alley wall, the dark gate frame and a red lantern softly blurred in the foreground framing her',
  hongtuyen: 'candid shot from outside looking in through a carved archway of a high pavilion terrace, the dark arch and a hanging wish lantern softly blurred in the foreground framing her',
  nguyetmon: 'candid shot from outside looking in through a carved lattice window opening in a classical garden wall, the lattice frame and plum branches softly blurred in the foreground framing her',
  ruouhoa: 'candid shot from outside looking in through a wooden garden gate left ajar at the edge of the orchard, the gate frame and a few pear blossom branches softly blurred in the foreground framing her',
};

// Positive wording only (the model ignores negation): counts, proportions, symmetry. The head size line is the one that matters most for a face taken from a photo.
export const ANATOMY = 'exactly two arms and at most two hands in the whole picture; the head is small and in natural proportion to the body, about one seventh to one eighth of her total height, with shoulders clearly wider than her head and a long slender neck; a slim waist; every visible hand is small and simple with five natural fingers and a natural thumb; elbows, wrists and knees bend at natural angles';

// Stories whose setting has still water: the scene asks for one clean reflection.
const WATER = new Set(['lienhoa', 'cocam', 'duthu']);

// ---- the player's choices ----------------------------------------------------------------------------------------------------------
export type GenPick = { style: string; story: string; frame: string; angle: string; view: string; pose: string; hands: string; hair: string; expr: string };
export const DEFAULT_PICK: GenPick = { style: 'donghua', story: 'lienhoa', frame: 'half', angle: 'eye', view: 'front', pose: 'auto', hands: 'natural', hair: 'long', expr: 'tender' };

export const isFaceless = (view: string) => view === 'back' || view === 'hidden';
// A photo without a face is only used for pictures that show none.
export const FACELESS_VIEWS = ['back', 'profile', 'hidden'];

const has = (a: Opt[], id: unknown): id is string => typeof id === 'string' && a.some((x) => x.id === id);
// Anything the browser sends is checked against the lists; unknown values fall back to the default. noFace narrows the view.
export function cleanPick(raw: unknown, noFace = false): GenPick {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_PICK;
  const p: GenPick = {
    style: has(STYLES, r.style) ? r.style : d.style,
    story: has(STORIES, r.story) ? r.story : d.story,
    frame: has(FRAMES, r.frame) ? r.frame : d.frame,
    angle: has(ANGLES, r.angle) ? r.angle : d.angle,
    view: has(VIEWS, r.view) ? r.view : d.view,
    pose: 'auto',
    hands: has(HANDS, r.hands) ? r.hands : d.hands,
    hair: has(HAIR, r.hair) ? r.hair : d.hair,
    expr: has(EXPRESSIONS, r.expr) ? r.expr : d.expr,
  };
  if (noFace && !FACELESS_VIEWS.includes(p.view)) p.view = 'back';
  if (typeof r.pose === 'string' && validPoses(p.frame, p.view).some((x) => x.id === r.pose)) p.pose = r.pose;
  return p;
}

const by = <T extends Opt>(a: T[], id: string): T => a.find((x) => x.id === id) || a[0];

export function poseText(p: GenPick): string {
  const chosen = validPoses(p.frame, p.view).find((x) => x.id === p.pose);
  return chosen ? chosen.text : (STORY_POSE[p.story] || STORY_POSE[STORIES[0].id] || '');
}

// The description the player sees (and may rewrite). Everything stays elegant and clothed: the outfit is always the first level of the lab's table.
export function composeScene(p: GenPick): string {
  const st = by(STORIES, p.story), view = by(VIEWS, p.view), faceless = isFaceless(view.id);
  // from behind no hand is shown; in a close-up the hands are outside the frame whatever was chosen
  const hands = view.id === 'back' ? by(HANDS, 'hidden').text : p.frame === 'close' && p.hands === 'natural' ? HANDS_CLOSE : by(HANDS, p.hands).text;
  return [
    `${st.text}. Setting: ${st.setting}.`,
    WATER.has(st.id) ? `Water: ${REFLECTION}.` : '',
    `Camera: ${by(FRAMES, p.frame).text}, ${p.angle === 'peek' && PEEK[st.id] ? PEEK[st.id] : by(ANGLES, p.angle).text}.`,
    `View: ${view.text}.`,
    faceless ? '' : `Expression: ${by(EXPRESSIONS, p.expr).text}, clearly readable on her face.`,
    faceless ? '' : toneLine(by(EXPRESSIONS, p.expr).tone),
    `Pose: ${poseText(p)}.`,
    `Hands: ${hands}.`,
    `Hair: ${by(HAIR, p.hair).text}.`,
    `Anatomy: ${ANATOMY}.`,
    `Outfit: ${LEVELS[0].text}.`,
    `Style: ${by(STYLES, p.style).text}.`,
    `${LAYOUT}.`,
  ].filter(Boolean).join(' ');
}

// ---- the request ---------------------------------------------------------------------------------------------------------------------
export const SCENE_MAX = 2600, SCENE_MIN = 20;
// Lines the server always puts around the scene, whatever the player wrote. The first one takes ONLY the identity from the photo.
export const FACE_PREFIX = 'Use the adult person in the reference photo as the face of the character. Keep the identity clearly recognisable, but gently refine it into a slimmer, more elegant face with smooth luminous skin and bright eyes. Take only the identity from the photo: the framing, pose, expression, clothing and background all come from the description below, and the head is drawn at a natural size in proportion to the body. The face is redrawn with exactly the expression named in the description, whatever expression the photo has. Cinematic fantasy wallpaper of this person as a xianxia immortal cultivator. ';
export type Gender = 'f' | 'm';
export const isGender = (v: unknown): v is Gender => v === 'f' || v === 'm';
export const buildGenPrompt = (scene: string, noFace: boolean, gender: Gender = 'f', fixes?: unknown, faceless = noFace): string => {
  const body = scene.trim().replace(/\s+/g, ' ').slice(0, SCENE_MAX);
  const notes = fixesText(cleanFixes(fixes), faceless);
  const mid = notes ? `${body} ${notes}` : body;
  return gender === 'm' ? (noFace ? M.FACELESS_PREFIX : M.FACE_PREFIX) + mid + M.SUFFIX : (noFace ? FACELESS_PREFIX : FACE_PREFIX) + mid + FACE_SUFFIX;
};

// The scene that is really used: the player's own text when they rewrote it (custom), otherwise the one made from the choices (never trusted from the browser).
export function sceneOf(pick: unknown, custom: unknown, noFace: boolean, gender: Gender = 'f'): { scene: string; custom: boolean } {
  if (typeof custom === 'string' && custom.trim()) return { scene: custom.trim().replace(/\s+/g, ' ').slice(0, SCENE_MAX), custom: true };
  return { scene: gender === 'm' ? M.composeScene(M.cleanPick(pick, noFace)) : composeScene(cleanPick(pick, noFace)), custom: false };
}
export const sceneProblem = (scene: string): string | null => (scene.trim().length < SCENE_MIN ? 'short' : promptProblem(scene));

// The day the turns are counted in: the Vietnamese day (UTC+7).
export const dayKey = (now = Date.now()) => new Date(now + 7 * 3600e3).toISOString().slice(0, 10);

// ---- "chống lỗi" (error guards) -------------------------------------------------------------------------------------------------
// Seedream has no negative prompt box, and "no extra fingers" tends to draw extra fingers. So each guard is a short POSITIVE sentence describing the right
// result; the ones the player switches on are added after the scene. The player only switches them on or off (no free text), the server rebuilds the text from the ids.
// The wording is neutral ("the character") so the same guards serve both tabs.
export interface Fix { id: string; group: string; label: string; hint: string; text: string }
export const FIX_GROUPS = ['Tay và chân', 'Khuôn mặt', 'Cơ thể và dáng', 'Trang phục', 'Bối cảnh và ánh sáng', 'Chất lượng ảnh'];
const F = (id: string, group: string, label: string, hint: string, text: string): Fix => ({ id, group, label, hint, text });
export const FIXES: Fix[] = [
  F('fingers', 'Tay và chân', 'Ngón tay thon, tách rõ', 'Tránh ngón dính, thừa, thiếu', 'every visible hand has slender, clearly separated fingers with natural joints and neat fingernails'),
  F('arms', 'Tay và chân', 'Cánh tay nối liền mạch', 'Tránh tay dài ngắn, gập lạ', 'the shoulders, elbows, wrists and hands connect smoothly, both arms of equal natural length'),
  F('legs', 'Tay và chân', 'Hai chân cân đối', 'Tránh chân dài ngắn, đầu gối lệch', 'the legs have equal natural length with smooth knees and balanced weight on the ground'),
  F('feet', 'Tay và chân', 'Bàn chân gọn', 'Tránh bàn chân to, méo', 'any visible feet are small, neat and firmly grounded'),
  F('faceSym', 'Khuôn mặt', 'Mặt cân đối', 'Tránh mặt lệch, méo', 'a symmetrical, harmonious face with two eyes of the same size, a straight nose and a natural mouth'),
  F('eyes', 'Khuôn mặt', 'Mắt sáng, rõ nét', 'Tránh mắt lé, lệch', 'bright clear eyes with detailed irises, both looking in the same direction'),
  F('head', 'Khuôn mặt', 'Đầu nhỏ vừa người', 'Tránh đầu to hơn cơ thể', 'a small delicate head that suits the slim figure, a long natural neck'),
  F('hair', 'Khuôn mặt', 'Tóc mượt, từng lọn rõ', 'Tránh tóc rối, dính vào mặt', 'hair flows in smooth, well-defined locks that frame the face'),
  F('single', 'Cơ thể và dáng', 'Chỉ một nhân vật', 'Tránh nhân đôi, hai đầu', 'exactly one person in the picture, with one head and one body'),
  F('posture', 'Cơ thể và dáng', 'Dáng đứng, ngồi vững', 'Tránh dáng gãy, vặn lạ', 'a balanced, relaxed posture with a straight spine, level shoulders and natural weight distribution'),
  F('shoulders', 'Cơ thể và dáng', 'Vai và cổ tự nhiên', 'Tránh vai lệch, cổ dài quá', 'a slender neck joins naturally to level shoulders'),
  F('cloth', 'Trang phục', 'Vải rủ tự nhiên', 'Tránh áo méo, tay áo lạ', 'fabric folds fall naturally with gravity, sleeves and sashes flow in one consistent direction, the collar is neat and symmetrical'),
  F('accessory', 'Trang phục', 'Trang sức gọn, đối xứng', 'Tránh phụ kiện rối, thừa', 'a few elegant accessories placed symmetrically, each clearly drawn'),
  F('bg', 'Bối cảnh và ánh sáng', 'Nền gọn, một điểm nhấn', 'Tránh nền rối, nhiều vật lạ', 'an orderly background with layered depth and one clear focal point on the character'),
  F('blend', 'Bối cảnh và ánh sáng', 'Nhân vật hòa nhập với cảnh', 'Tránh người như dán vào nền', "the character is lit by the scene's own light, with the scene's colours reflected on skin, hair and clothes, and is painted in the same style as the background so the figure belongs naturally in the setting"),
  F('light', 'Bối cảnh và ánh sáng', 'Ánh sáng nhất quán', 'Tránh bóng đổ nhiều hướng', 'one consistent light direction with matching soft shadows'),
  F('clean', 'Chất lượng ảnh', 'Ảnh sạch, không chữ', 'Tránh chữ, logo, khung viền', 'a clean, pure illustration made of the scene alone, filling the whole frame'),
  F('sharp', 'Chất lượng ảnh', 'Sắc nét, nhiều chi tiết', 'Tránh ảnh nhòe, mờ', 'sharp focus, crisp fine detail, high resolution, smooth clean edges'),
  F('color', 'Chất lượng ảnh', 'Màu hài hòa', 'Tránh màu chói, lòe loẹt', 'a harmonious colour palette built on three main hues'),
];
// On by default: the ones that fix what players meet most (hands, face, doubles, posture, mess, blur). The rest the player may add.
export const DEFAULT_FIXES = ['fingers', 'faceSym', 'eyes', 'single', 'posture', 'bg', 'blend', 'sharp'];
// Ids about the face are left out of pictures that show none (they would invite the model to show it).
const FACE_FIXES = ['faceSym', 'eyes', 'hair'];
export const FIXES_MAX = 1700;
// Anything not a known id is dropped, duplicates too; no list at all means the defaults. The order is always the one of FIXES.
export function cleanFixes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [...DEFAULT_FIXES];
  const want = new Set(raw.filter((x): x is string => typeof x === 'string'));
  return FIXES.filter((f) => want.has(f.id)).map((f) => f.id);
}
export function fixesText(ids: string[], faceless = false): string {
  const t = FIXES.filter((f) => ids.includes(f.id) && !(faceless && FACE_FIXES.includes(f.id))).map((f) => f.text);
  return t.length ? `Quality notes: ${t.join('; ')}.`.slice(0, FIXES_MAX) : '';
}
// Whether the picture shows no face: the photo has none, or the chosen view is from behind or hidden.
export const facelessOf = (gender: Gender, pick: unknown, noFace: boolean): boolean => noFace || isFaceless(TABS_VIEW(gender, pick, noFace));
const TABS_VIEW = (gender: Gender, pick: unknown, noFace: boolean): string => (gender === 'm' ? M.cleanPick(pick, noFace).view : cleanPick(pick, noFace).view);

// What the page needs for each tab, so one page serves both (the page only reads this table).
type Pk = Record<string, string>;
export interface TabConfig {
  stories: (Opt & { mood: string; type?: string })[]; frames: Opt[]; angles: Choice[]; views: Opt[]; hands: Choice[]; exprs: Choice[]; hairs: Opt[]; types: Choice[];
  defaults: Pk; clean: (raw: unknown, noFace: boolean) => Pk; compose: (p: Pk) => string; poses: (frame: string, view: string) => Opt[];
}
export const TABS: Record<Gender, TabConfig> = {
  f: { stories: STORIES, frames: FRAMES, angles: ANGLES, views: VIEWS, hands: HANDS, exprs: EXPRESSIONS, hairs: HAIR, types: [], defaults: DEFAULT_PICK, clean: cleanPick, compose: (p) => composeScene(cleanPick(p)), poses: validPoses },
  m: { stories: M.STORIES, frames: M.FRAMES, angles: M.ANGLES, views: M.VIEWS, hands: M.HANDS, exprs: M.EXPRESSIONS, hairs: M.HAIR, types: M.TYPES, defaults: M.DEFAULT_PICK, clean: M.cleanPick, compose: (p) => M.composeScene(M.cleanPick(p)), poses: M.validPoses },
};

// Accounts with no daily limit and no site budget check (the owner). Compared in lower case; more addresses may be added in GENAI_UNLIMITED (comma separated).
export const UNLIMITED_EMAILS = ['chendinhit@gmail.com'];
export const isUnlimited = (email: unknown, extra = ''): boolean => {
  if (typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  return !!e && [...UNLIMITED_EMAILS, ...extra.split(',')].some((x) => x.trim().toLowerCase() === e);
};

// Turns an account can still use today: what is left of the free turns plus the extra turns the owner granted.
export const turnsLeft = (limit: number, usedToday: number, bonus: number): number => Math.max(0, limit - usedToday) + Math.max(0, bonus);

// ---- error log (owner page): what is kept about a failed picture. Never the photo; the texts are cut short.
export interface GenError { ref: string; at: number; acc: string; email: string; gender: string; stage: string; code: string; http: number; fal: number; detail: string; scene: string; ms: number }
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/\s+/g, ' ').trim().slice(0, n);
const int = (v: unknown) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : 0);
export const shapeError = (e: Partial<Record<keyof GenError, unknown>>): Omit<GenError, 'ref' | 'at'> => ({
  acc: clip(e.acc, 64), email: clip(e.email, 120), gender: e.gender === 'm' ? 'm' : 'f', stage: clip(e.stage, 16) || 'server', code: clip(e.code, 40) || 'E_SERVER',
  http: int(e.http), fal: int(e.fal), detail: clip(e.detail, 700), scene: clip(e.scene, 500), ms: int(e.ms),
});
// States the player is expected to meet (no turns left, one picture at a time, signed out, feature closed): not errors, so they are not logged.
export const QUIET_CODES = ['E_GENAI_LIMIT', 'E_GENAI_BUSY', 'E_GENAI_LINK', 'E_GENAI_OFF', 'E_AUTH'];
