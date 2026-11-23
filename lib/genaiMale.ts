// /gen-ai, male tab: the same kind of choices as the female one (lib/genai.ts) with their own content. A man picks a TYPE first (strong, cool, calm); the type
// decides the aura, the outfit and which stories are offered. Everything stays fully clothed, as for the women. Text for the model is English, labels are Vietnamese.
import { LAYOUT as _L, REFLECTION, STYLES, type Opt, type Pose } from './wallpaper';

export interface MChoice extends Opt { icon: string; hint: string }
export interface MStory extends Opt { setting: string; mood: string; type: string }

export const TYPES: (MChoice & { outfit: string })[] = [
  { id: 'strong', label: 'Mạnh mẽ', icon: '💪', hint: 'Vai rộng, khí thế áp đảo', text: 'a powerful adult cultivator with a broad-shouldered athletic build, a strong jawline and a fierce, commanding aura', outfit: 'a layered dark-blue and gold battle robe with armoured shoulder pieces, a wide belt and a long flowing outer robe' },
  { id: 'cool', label: 'Ngầu', icon: '😎', hint: 'Lạnh lùng, sắc sảo, nguy hiểm', text: 'a cool, aloof, strikingly handsome adult swordsman with sharp refined features, sleek long hair and a dangerous calm aura', outfit: 'a black and midnight-blue hanfu with silver cloud embroidery, wide sleeves, a thin chain pendant and a dangling jewelled earring' },
  { id: 'calm', label: 'Điềm tĩnh', icon: '🍃', hint: 'Ôn hòa, thanh thoát như tiên nhân', text: 'a serene, gentle adult scholar-immortal with refined features and a composed, tranquil aura like still water', outfit: 'a flowing pale-blue and white hanfu with a sheer layered outer robe, a jade belt and soft silk tassels' },
];

const S = (id: string, type: string, label: string, text: string, setting: string, mood: string): MStory => ({ id, type, label, text, setting, mood });
export const STORIES: MStory[] = [
  S('leikiep', 'strong', 'Lôi kiếp', 'a thunder cultivator facing his heavenly tribulation, unafraid as lightning coils around him', 'a stormy mountain peak at night, towering black clouds, branching white and violet lightning, crackling sparks, wind whipping his long hair and robes, floating rune seals', 'Sấm sét giáng xuống đỉnh núi đêm bão'),
  S('hoaviem', 'strong', 'Hỏa diệm xanh', 'a flame cultivator gathering a swirling ball of blue spirit fire, his gaze fixed on a distant foe', 'a misty ruined battlefield at dusk, broken stone pillars, drifting embers, coiling blue flames, low smoky clouds', 'Ngọn lửa xanh trên chiến trường đổ nát'),
  S('chienthan', 'strong', 'Chiến thần trên mây', 'a war-god cultivator standing guard above the clouds with crimson banners snapping behind him', 'a mountain cliff above a vast sea of clouds at sunrise, golden light, giant stone steps, crimson war banners, flying cranes', 'Đỉnh núi trên biển mây, cờ chiến bay phấp phới'),
  S('kiemlanh', 'cool', 'Kiếm lạnh', 'a cold swordsman holding a silver spirit sword lengthwise near his face, sharp eyes above the blade', 'a dark void with drifting glowing blue crystals, ice shards and sparkling light motes, cold blue rim light', 'Lưỡi kiếm bạc và những viên pha lê xanh'),
  S('trucdem', 'cool', 'Đêm trúc dưới trăng', 'a cold, aloof master in a deep-blue robe embroidered with white cranes, as distant as the moonlight', 'a bamboo forest at night, shafts of silver moonlight, drifting mist, fireflies, a silver hairpin glinting', 'Rừng trúc đêm, hạc trắng trên áo xanh thẫm'),
  S('luado', 'cool', 'Dải lụa đỏ trong gió', 'a black-robed wanderer with a red silk ribbon streaming in the wind, wistful and untouchable', 'a bamboo lattice pavilion, dappled sunlight, long red ribbons fluttering, falling bamboo leaves', 'Áo đen, dải lụa đỏ bay trong gió'),
  S('tuyetdinh', 'cool', 'Tuyết đêm đỉnh núi', 'a lone ice-sword cultivator standing in falling snow with frost on his lashes', 'a snowy pine mountain under a cold full moon, swirling snowflakes, a frozen lake, glittering frost', 'Một mình giữa tuyết rơi dưới trăng lạnh'),
  S('cocamnam', 'calm', 'Gảy cổ cầm bên suối', 'a silver-haired immortal playing a guqin beside a stream, a small white rabbit resting at his side', 'a moonlit bamboo grove with a gentle stream, glowing fireflies, drifting petals, a huge pale moon, blue mist on distant peaks', 'Tiếng đàn bên suối, thỏ trắng dưới trăng'),
  S('tradinh', 'calm', 'Pha trà trong đình núi', 'a scholar-immortal brewing tea in a mountain pavilion, steam curling past his calm face', 'a lantern-lit open pavilion on a misty mountain, a low tea table with a jade teapot, plum blossoms, drifting clouds', 'Hơi trà bay trong đình giữa mây núi'),
  S('thuphapnam', 'calm', 'Thư pháp dưới đèn', 'a refined scholar-immortal writing calligraphy by lantern light, floating scrolls drifting around him', 'a quiet study under a pale moon, a stone desk with ink and brushes, glowing seals, candlelight, falling plum petals', 'Cuộn thư bay quanh nét bút dưới đèn'),
  S('thienlien', 'calm', 'Thiền trên đài sen', 'a serene immortal meditating cross-legged on a lotus platform above a still lake at dawn', 'a mirror-still lake at dawn, giant glowing lotus flowers, soft golden mist', 'Đài sen giữa hồ phẳng lặng lúc bình minh'),
];
const WATER = new Set(['thienlien']);
const REFLECTION_M = REFLECTION.replace('her figure', 'his figure');

export const FRAMES: Opt[] = [
  { id: 'close', label: 'Cận mặt và vai', text: 'tight close-up of his face and shoulders, 85mm portrait lens, the setting softly blurred behind him, cropped at the chest' },
  { id: 'half', label: 'Nửa người (từ eo lên)', text: 'medium shot from the waist up, 85mm lens, shallow depth of field, cropped at the waist so no legs are in the frame' },
  { id: 'knee', label: 'Gần toàn thân (từ đầu gối lên)', text: 'cowboy shot from the knees up, 50mm lens, his upper body and the richly detailed setting both clearly visible, cropped at the knees so no feet are in the frame' },
  { id: 'full', label: 'Toàn thân, thấy cả bối cảnh', text: 'full-length wide shot of his whole figure from head to toe, 35mm lens, his figure fills about two thirds of the frame height with the grand setting around him, the long hem of his robe and swirling mist covering his feet' },
];
export const ANGLES: MChoice[] = [
  { id: 'eye', label: 'Ngang tầm mắt', icon: '👁️', hint: 'Tự nhiên, ít lỗi nhất', text: 'camera at eye level' },
  { id: 'low', label: 'Từ dưới nhìn lên', icon: '⬆️', hint: 'Dáng cao lớn, uy lực', text: 'dramatic low-angle camera looking up at him, powerful and imposing' },
  { id: 'high', label: 'Từ trên nhìn xuống', icon: '⬇️', hint: 'Cô độc, trầm lặng', text: 'high-angle camera looking slightly down at him' },
  { id: 'tilt', label: 'Chéo, năng động', icon: '📐', hint: 'Bố cục chéo, có chuyển động', text: 'slightly tilted dynamic camera with a diagonal composition' },
  { id: 'peek', label: 'Nhìn qua khung cửa', icon: '🚪', hint: 'Như nhìn lén qua khe cửa, rất chân thật', text: 'candid shot from outside looking in through an open carved wooden doorway, the dark door frame and a hanging silk curtain softly blurred in the foreground framing him like a glimpse into his world' },
];
export const VIEWS: Opt[] = [
  { id: 'front', label: 'Nhìn thẳng ống kính', text: 'he faces the camera, his eyes on the viewer' },
  { id: 'three', label: 'Chếch 3/4, ngoái lại', text: 'three-quarter view, his body turned slightly away while his face looks back toward the camera' },
  { id: 'profile', label: 'Góc nghiêng (nhìn ngang)', text: 'clean side profile view, his face seen from the side, looking toward the distance' },
  { id: 'back', label: 'Nhìn từ sau lưng (không lộ mặt)', text: 'seen from behind with his back to the camera, his face is not visible' },
  { id: 'hidden', label: 'Che mặt (nón, tóc)', text: 'his face is hidden from the viewer' },
];

const ALL = ['close', 'half', 'knee', 'full'], FRONT = ['front', 'three'];
export const POSES: Pose[] = [
  { id: 'm-stand', label: 'Đứng thẳng, vai rộng', text: 'standing tall with squared shoulders and relaxed arms, weight evenly on both feet', frames: ['half', 'knee', 'full'], views: FRONT },
  { id: 'm-chin', label: 'Cúi mắt, nhìn lên qua mái tóc', text: 'head slightly lowered, eyes looking up through his fringe with a piercing gaze', frames: ['close', 'half'], views: FRONT },
  { id: 'm-turn', label: 'Ngoái đầu qua vai', text: 'his head turns over his shoulder, hair swinging with the motion', frames: ['close', 'half'], views: FRONT },
  { id: 'm-fold', label: 'Khoanh tay trước ngực', text: 'arms folded across his chest, sleeves covering his hands, shoulders relaxed', frames: ['half', 'knee', 'full'], views: FRONT },
  { id: 'm-lean', label: 'Tựa lưng vào cột', text: 'leaning back against a pillar with one knee slightly bent, relaxed and nonchalant', frames: ['half', 'knee', 'full'], views: FRONT },
  { id: 'm-walk', label: 'Bước đi, áo choàng bay', text: 'mid-step walking toward the camera, the long outer robe and hair swaying with the motion', frames: ['knee', 'full'], views: FRONT },
  { id: 'm-kneel', label: 'Quỳ một gối, kiếm chống đất', text: 'kneeling on one knee with a sword planted point-down before him, head slightly bowed', frames: ['knee', 'full'], views: FRONT },
  { id: 'm-sit', label: 'Ngồi xếp bằng, lưng thẳng', text: 'sitting cross-legged with a straight back, hands resting calmly on his knees', frames: ['knee', 'full'], views: FRONT },
  { id: 'm-float', label: 'Lơ lửng, áo tóc bay lên', text: 'floating weightlessly above the ground, hair and sleeves drifting upward', frames: ['knee', 'full'], views: FRONT },
  { id: 'm-profile', label: 'Nhìn ngang xa xăm', text: 'in clean side profile, gazing at the distance, a straight back and a strong jawline', frames: ALL, views: ['profile'] },
  { id: 'm-profile-down', label: 'Cúi mắt, vẻ trầm tư', text: 'in side profile with his head bowed slightly, eyes lowered, a quiet pensive mood', frames: ALL, views: ['profile'] },
  { id: 'm-back-stand', label: 'Đứng quay lưng nhìn xa', text: 'standing with his back to the camera, shoulders relaxed, looking out over the scene', frames: ['half', 'knee', 'full'], views: ['back'] },
  { id: 'm-back-hair', label: 'Lưng và tóc dài buông xuống', text: 'seen from behind, long hair cascading down his back, his head turned slightly', frames: ['close', 'half'], views: ['back'] },
  { id: 'm-back-sit', label: 'Ngồi quay lưng nhìn xa', text: 'sitting with his back to the camera, hair cascading down his back, looking into the distance', frames: ['knee', 'full'], views: ['back'] },
  { id: 'm-hat', label: 'Mặt khuất dưới nón lá tre', text: 'his face is hidden under the wide brim of a bamboo hat with a thin veil, only his chin and shoulders are visible', frames: ALL, views: ['hidden'] },
  { id: 'm-hair-hide', label: 'Mặt khuất sau mái tóc', text: 'his face is hidden by his long hair as he bows his head', frames: ALL, views: ['hidden'] },
];
export const validPoses = (frame: string, view: string): Pose[] => POSES.filter((x) => x.frames.includes(frame) && x.views.includes(view));

const STORY_POSE: Record<string, string> = {
  leikiep: 'standing firmly on the cliff edge with feet apart, chin lifted, robes and hair blown by the wind',
  hoaviem: 'standing with one palm open before him holding swirling blue spirit fire, the other arm relaxed, body slightly turned',
  chienthan: 'standing tall in a wide stance, shoulders squared, one hand resting on the hilt of a sheathed sword, the outer robe billowing',
  kiemlanh: 'holding the sword blade lengthwise in front of his chin, head slightly lowered, eyes looking up',
  trucdem: 'standing still with a relaxed upright posture, head slightly bowed, gazing past the viewer',
  luado: 'leaning lightly against a lattice pillar, head tilted, hair drifting',
  tuyetdinh: 'standing alone with relaxed shoulders, a sheathed sword at his side, gazing into the distance',
  cocamnam: 'sitting upright on a stone with the guqin across his knees, eyes lowered, long sleeves covering his hands as they rest on the strings',
  tradinh: 'kneeling at the low tea table with a straight back, sleeves falling gracefully, eyes on the teacup',
  thuphapnam: 'sitting at the stone desk with a straight back, a brush held lightly in a sleeve-covered hand, head bowed in focus',
  thienlien: 'sitting cross-legged with a straight back, hands resting calmly on his knees, eyes closed',
};

export const HANDS: MChoice[] = [
  { id: 'natural', label: 'Tự nhiên theo ảnh', icon: '✨', hint: 'Để AI đặt tay cho hợp dáng và cảnh', text: 'his hands rest in a relaxed position that suits his pose and the scene, each visible hand with five natural fingers, partly covered by a sleeve or prop where natural' },
  { id: 'hidden', label: 'Giấu trong tay áo', icon: '🧤', hint: 'Ít lỗi nhất', text: 'both hands are hidden inside his wide sleeves, no hands visible' },
  { id: 'behind', label: 'Chắp tay sau lưng', icon: '🧍', hint: 'Dáng đĩnh đạc, không lộ tay', text: 'both hands clasped behind his back, not visible' },
  { id: 'sword', label: 'Tay đặt trên chuôi kiếm', icon: '🗡️', hint: 'Một tay nắm chuôi kiếm bên hông', text: 'one hand rests on the hilt of a sheathed sword at his waist, five natural fingers, the other arm relaxed and out of frame' },
  { id: 'palm', label: 'Xòe tay ngưng linh lực', icon: '🔥', hint: 'Một bàn tay mở, ánh sáng bay lên', text: 'one open palm held before him with glowing spirit energy swirling above it, five natural fingers, the other hand out of frame' },
  { id: 'fold', label: 'Khoanh tay', icon: '🙅', hint: 'Tay áo che gần hết bàn tay', text: 'arms folded across his chest with the hands tucked under his arms, sleeves covering them' },
];
const HANDS_CLOSE = 'his hands are outside the frame';

export const EXPRESSIONS: MChoice[] = [
  { id: 'cool', label: 'Lạnh lùng', icon: '😐', hint: 'Không cười, ánh mắt sắc', text: 'a cold, composed expression without a smile, sharp steady eyes, lips closed and calm' },
  { id: 'fierce', label: 'Quyết liệt', icon: '😠', hint: 'Mày chau, mắt rực khí thế', text: 'a fierce, determined expression, brows drawn together, burning intense eyes, jaw set firm' },
  { id: 'calm', label: 'Điềm tĩnh', icon: '😌', hint: 'Mắt hiền, môi thả lỏng', text: 'a serene, tranquil expression, soft steady eyes, relaxed brows and gently closed lips' },
  { id: 'smirk', label: 'Nhếch môi tà mị', icon: '😏', hint: 'Cười nhếch một bên, mắt liếc', text: 'a charming smirk with one corner of the lips raised, one eyebrow slightly arched, a knowing sideways glance' },
  { id: 'gentle', label: 'Ôn hòa mỉm cười', icon: '🙂', hint: 'Cười nhẹ, ánh mắt ấm', text: 'a gentle warm smile, kind eyes looking at the viewer, relaxed brows' },
  { id: 'sad', label: 'Trầm buồn', icon: '😔', hint: 'Mắt long lanh, nét buồn nhẹ', text: 'a wistful, sorrowful look, eyes glistening, brows slightly drawn together, lips softly closed' },
];

export const HAIR: Opt[] = [
  { id: 'long', label: 'Đen dài buông xõa', text: 'long, glossy black hair falling loose past his shoulders, a few windswept strands across his face' },
  { id: 'silver', label: 'Bạc trắng buông xõa', text: 'long silver-white hair flowing loose down his back, a few strands drifting in the wind' },
  { id: 'topknot', label: 'Búi cao, mão ngọc', text: 'hair gathered in a neat high topknot with a jade hair crown and a slim silver hairpin, long hair falling behind him' },
  { id: 'halfup', label: 'Nửa búi, trâm ngọc', text: 'half-up half-down black hair held by a jade hairpin, loose strands framing his face' },
  { id: 'lowtie', label: 'Buộc thấp, hai lọn mai rủ trước', text: 'long black hair tied low at the nape with a silk cord, two long strands hanging down on either side of his face' },
  { id: 'ribbon', label: 'Xõa dài, dải lụa đỏ', text: 'long loose black hair with a red silk ribbon fluttering through it' },
  { id: 'ponytail', label: 'Đuôi ngựa cao, dây buộc', text: 'a high flowing ponytail tied with a dark cord, long side bangs and wind-swept strands' },
  { id: 'wind', label: 'Tóc dài bay trong gió', text: 'long black hair blown back by the wind, flowing behind him in dramatic streams' },
];

export const ANATOMY = 'exactly two arms and at most two hands in the whole picture; the head is small and in natural proportion to the body, about one seventh to one eighth of his total height, with broad shoulders clearly wider than his head and a strong neck; a lean athletic build; every visible hand is strong and simple with five natural fingers and a natural thumb; elbows, wrists and knees bend at natural angles';
export const LAYOUT = _L.replace('a clear romantic story', 'a clear epic story');

export type MalePick = { style: string; type: string; story: string; frame: string; angle: string; view: string; pose: string; hands: string; hair: string; expr: string };
export const DEFAULT_PICK: MalePick = { style: 'donghua', type: 'cool', story: 'kiemlanh', frame: 'half', angle: 'eye', view: 'front', pose: 'auto', hands: 'natural', hair: 'long', expr: 'cool' };
export const FACELESS_VIEWS = ['back', 'profile', 'hidden'];
export const isFaceless = (view: string) => view === 'back' || view === 'hidden';
export const storiesOf = (type: string): MStory[] => STORIES.filter((s) => s.type === type);

const has = (a: Opt[], id: unknown): id is string => typeof id === 'string' && a.some((x) => x.id === id);
export function cleanPick(raw: unknown, noFace = false): MalePick {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, d = DEFAULT_PICK;
  const type = has(TYPES, r.type) ? r.type : d.type;
  const mine = storiesOf(type);
  const p: MalePick = {
    style: has(STYLES, r.style) ? r.style : d.style, type,
    story: typeof r.story === 'string' && mine.some((s) => s.id === r.story) ? r.story : mine[0].id,   // a story always fits the type
    frame: has(FRAMES, r.frame) ? r.frame : d.frame, angle: has(ANGLES, r.angle) ? r.angle : d.angle, view: has(VIEWS, r.view) ? r.view : d.view, pose: 'auto',
    hands: has(HANDS, r.hands) ? r.hands : d.hands, hair: has(HAIR, r.hair) ? r.hair : d.hair, expr: has(EXPRESSIONS, r.expr) ? r.expr : d.expr,
  };
  if (noFace && !FACELESS_VIEWS.includes(p.view)) p.view = 'back';
  if (typeof r.pose === 'string' && validPoses(p.frame, p.view).some((x) => x.id === r.pose)) p.pose = r.pose;
  return p;
}
const by = <T extends Opt>(a: T[], id: string): T => a.find((x) => x.id === id) || a[0];
export function poseText(p: MalePick): string {
  return validPoses(p.frame, p.view).find((x) => x.id === p.pose)?.text || STORY_POSE[p.story] || '';
}
export function composeScene(p: MalePick): string {
  const st = by(STORIES, p.story), ty = by(TYPES, p.type), view = by(VIEWS, p.view), faceless = isFaceless(view.id);
  const hands = view.id === 'back' ? by(HANDS, 'hidden').text : p.frame === 'close' && p.hands === 'natural' ? HANDS_CLOSE : by(HANDS, p.hands).text;
  return [
    `${st.text}. Setting: ${st.setting}.`,
    WATER.has(st.id) ? `Water: ${REFLECTION_M}.` : '',
    `Character: ${ty.text}.`,
    `Camera: ${by(FRAMES, p.frame).text}, ${by(ANGLES, p.angle).text}.`,
    `View: ${view.text}.`,
    faceless ? '' : `Expression: ${by(EXPRESSIONS, p.expr).text}, clearly readable on his face.`,
    `Pose: ${poseText(p)}.`,
    `Hands: ${hands}.`,
    `Hair: ${by(HAIR, p.hair).text}.`,
    `Anatomy: ${ANATOMY}.`,
    `Outfit: ${ty.outfit}.`,
    `Style: ${by(STYLES, p.style).text}.`,
    `${LAYOUT}.`,
  ].filter(Boolean).join(' ');
}

export const FACE_PREFIX = 'Use the adult man in the reference photo as the face of the character. Keep the identity clearly recognisable, but gently refine it into a sharper, more handsome face with a defined jawline, clear luminous skin and bright eyes, natural and still clearly the same person. Take only the identity from the photo: the framing, pose, expression, clothing and background all come from the description below, and the head is drawn at a natural size in proportion to the body. Cinematic fantasy wallpaper of this man as a xianxia immortal cultivator. ';
export const FACELESS_PREFIX = 'Use the adult man in the reference photo only for hair, hair colour and overall look, keeping that look recognisable with natural proportions. His face is not shown. Cinematic fantasy wallpaper of this man as a xianxia immortal cultivator. ';
export const SUFFIX = ' Ultra detailed masterpiece, cinematic dramatic lighting, richly layered background details, handsome, heroic and elegant, fully clothed, modest and non-suggestive.';
