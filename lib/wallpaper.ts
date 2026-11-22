// Wallpaper maker for the lab: builds the scene text from a story (content), a camera angle, an expression, a style and a "level" of allure.
// Everything stays clothed and non-explicit; the levels exist so the owner can find the highest one fal's content checker lets through.
// The text is English because the image models read it best. It goes through lib/anh18.ts (buildPrompt + the server's word filter) like any other scene.

export interface Opt { id: string; label: string; text: string }
export interface Story extends Opt { setting: string }

export const STYLES: Opt[] = [
  { id: 'donghua', label: 'Hoạt hình 3D tiên hiệp', text: 'high-end Chinese xianxia donghua 3D render, flawless porcelain skin, glossy detailed hair strands, large expressive eyes, cinematic depth of field, unreal engine quality' },
  { id: 'painterly', label: 'Tranh CG vẽ tay', text: 'luxurious digital painting in the style of top Chinese CG illustrators, soft painterly brushwork, delicate rim light, rich color harmony, gorgeous fine detail' },
  { id: 'real', label: 'Gần người thật', text: 'photorealistic cinematic fantasy photography, lifelike face, skin pores and hair, 85mm lens, shallow depth of field, volumetric light' },
];

export const STORIES: Story[] = [
  { id: 'bangtuyet', label: 'Nữ vương băng tuyết', text: 'an ice empress with a frost crown, waiting at the summit for someone who never came', setting: 'a snowy fir mountain at night with a throne carved from glacier, swirling snowflakes, green and violet aurora across the sky, frozen waterfall, ice crystals glittering on her gown' },
  { id: 'lienhoa', label: 'Đêm trăng bên ao sen', text: 'a moon fairy daydreaming of a lost love beside a spirit pond', setting: 'dark glassy water with floating petals, glowing koi under the surface, giant full moon, fireflies, jade bracelets, mist rolling over lotus leaves' },
  { id: 'daohoa', label: 'Đào hoa kiếm', text: 'a sword maiden in flowing violet robes who has just released her spirit sword, which hovers and glows blue beside her', setting: 'a cherry blossom grove on a cliff, a storm of pink petals, a misty pavilion and waterfall far below, golden morning light' },
  { id: 'hoadiep', label: 'Hồ điệp lửa trong rừng trúc', text: 'an enchantress with a butterfly of living flame floating beside her, smiling as if sharing a secret', setting: 'a bamboo forest at dusk, red silk curtains, hanging lanterns, embers drifting upward, a velvet divan under warm firelight' },
  { id: 'tinhha', label: 'Ngồi bên mép đảo bay giữa ngân hà', text: 'a star priestess on a floating island whose gaze the constellations answer', setting: 'a vast galaxy with nebula clouds, comets, glowing rings of runes, waterfalls of light pouring off the island, tiny floating lanterns' },
  { id: 'longcung', label: 'Long cung dưới biển', text: 'a dragon-sea princess in her underwater palace, her silk gown floating like water', setting: 'a coral palace with pearl pillars, glowing jellyfish lanterns, shafts of sunlight from the surface, schools of luminous fish, rising bubbles' },
  { id: 'hoason', label: 'Phượng hoàng trên núi lửa', text: 'a phoenix cultivator in crimson and gold silk, defiant as a firebird circles above her', setting: 'a volcanic temple of black stone and gold, rivers of lava, rain of glowing embers, huge phoenix feathers drifting through the smoke' },
  { id: 'thuphong', label: 'Thung lũng phong đỏ', text: 'a tea-ceremony fairy by a stone bridge, sleeves fluttering, with a gentle teasing smile', setting: 'an autumn maple valley in blazing red and gold, a waterfall, falling leaves, steam rising from a tea set, soft afternoon haze' },
  { id: 'suoinong', label: 'Suối nóng linh khí dưới trăng', text: 'an immortal enchantress at the edge of a glowing spirit hot spring, her hair wet', setting: 'carved stone pools, rising steam, lotus petals and fireflies, a full moon, paper lanterns reflected in the water' },
  { id: 'thuphong2', label: 'Tàng thư các', text: 'a scholar-immortal in a vast ancient library tower, as if she had been waiting for the reader', setting: 'endless shelves, floating scrolls and glowing seals, candlelight, fireflies, a round window with the moon, drifting dust like gold' },
  { id: 'cocam', label: 'Cổ cầm dưới trăng', text: 'a gentle musician-immortal with a guqin before her, her long sleeves covering her hands, lost in a love song meant for someone far away', setting: 'a moonlit open pavilion over a lake, silk curtains stirring in the breeze, floating lanterns, drifting pear blossom petals, incense smoke curling in the light' },
  { id: 'duthu', label: 'Che ô giấy dầu trong mưa hoa', text: 'a romantic maiden with an oil-paper umbrella, as if she has just recognised her beloved in the crowd', setting: 'a stone alley in a mountain town, soft rain of peach blossom petals, red lanterns glowing in the mist, wet stone reflecting the lights' },
  { id: 'hongtuyen', label: 'Sợi chỉ đỏ nhân duyên', text: 'a fated maiden whose glowing red thread of destiny drifts from her sleeve across the frame into the distance, her eyes following it with longing and a hidden smile', setting: 'a twilight sky of rose gold clouds, floating wish lanterns, a moon bridge, thousands of tiny sparkles along the thread' },
  { id: 'nguyetmon', label: 'Cửa trăng và quạt tròn', text: 'a graceful beauty with a round silk fan, with a shy teasing look, as if waiting for a secret rendezvous', setting: 'a circular moon gate in a classical garden, plum blossoms, lattice windows, a winding path with glowing lanterns, a crescent moon' },
  { id: 'ruouhoa', label: 'Rượu hoa lê dưới trăng', text: 'a slightly tipsy immortal beauty with flushed cheeks, a jade wine cup on the low table before her, smiling at an empty seat across from her', setting: 'a pear blossom orchard in full bloom at midnight, a stone table with a wine jar and two cups, a full moon, petals falling like snow' },
];

// Distance (framing): from a tight close-up to the whole figure. Legs and feet are where models slip most, so the closer frames crop them out
// and the full-length frame hides the feet under the hem (said in positive words, the models ignore negation).
export const FRAMES: Opt[] = [
  { id: 'close', label: 'Cận mặt và vai', text: 'tight close-up of her face and shoulders, 85mm portrait lens, the setting softly blurred behind her, cropped at the chest' },
  { id: 'half', label: 'Nửa người (từ eo lên)', text: 'medium shot from the waist up, 85mm lens, shallow depth of field, cropped at the waist so no legs are in the frame' },
  { id: 'knee', label: 'Gần toàn thân (từ đầu gối lên)', text: 'cowboy shot from the knees up, 50mm lens, her upper body and the richly detailed setting both clearly visible, cropped at the knees so no feet are in the frame' },
  { id: 'full', label: 'Toàn thân, thấy cả bối cảnh', text: 'full-length wide shot of her whole figure from head to toe, 35mm lens, her figure fills about two thirds of the frame height with the grand setting around her, the long hem of her gown pools on the ground and covers her feet' },
];

// Camera angle only.
export const ANGLES: Opt[] = [
  { id: 'eye', label: 'Ngang tầm mắt', text: 'camera at eye level' },
  { id: 'low', label: 'Từ dưới nhìn lên', text: 'dramatic low-angle camera looking up at her, powerful and graceful' },
  { id: 'high', label: 'Từ trên nhìn xuống', text: 'high-angle camera looking slightly down at her' },
  { id: 'tilt', label: 'Chéo, năng động', text: 'slightly tilted dynamic camera with a diagonal composition' },
  { id: 'moon', label: 'Khung cửa tròn', text: 'framed inside a circular moon gate or round window' },
];

// Which way she faces. 'back' and 'hidden' never show the face (also the choice when the owner's own photo shows no face).
export const VIEWS: Opt[] = [
  { id: 'front', label: 'Nhìn thẳng ống kính', text: 'she faces the camera, her eyes on the viewer' },
  { id: 'three', label: 'Chếch 3/4, ngoái lại', text: 'three-quarter view, her body turned slightly away while her face looks back toward the camera' },
  { id: 'profile', label: 'Góc nghiêng (nhìn ngang)', text: 'clean side profile view, her face seen from the side, looking toward the distance' },
  { id: 'back', label: 'Nhìn từ sau lưng (không lộ mặt)', text: 'seen from behind with her back to the camera, her face is not visible' },
  { id: 'hidden', label: 'Che mặt (quạt, ô, tóc)', text: 'her face is hidden from the viewer' },
];

export interface Pose extends Opt { frames: string[]; views: string[] }
const ALL = ['close', 'half', 'knee', 'full'], FRONT = ['front', 'three'];
export const POSES: Pose[] = [
  { id: 'tilt', label: 'Nghiêng đầu nhẹ, vai thả lỏng', text: 'head tilted gently to one side, chin slightly lowered, shoulders soft and relaxed', frames: ['close', 'half'], views: FRONT },
  { id: 'chin', label: 'Ngẩng cằm, cổ thanh', text: 'chin slightly raised, shoulders back, a long graceful neck', frames: ['close', 'half', 'knee'], views: FRONT },
  { id: 'hairsweep', label: 'Xoay đầu, tóc lướt qua vai', text: 'her head turns slowly as her hair sweeps over her shoulder', frames: ['close', 'half'], views: FRONT },
  { id: 'lean', label: 'Hơi nghiêng người về trước', text: 'leaning forward slightly with relaxed shoulders, as if leaning on a railing', frames: ['half', 'knee'], views: FRONT },
  { id: 'recline', label: 'Tựa lưng thư thái', text: 'reclining against silk cushions with a relaxed natural posture', frames: ['half', 'knee', 'full'], views: FRONT },
  { id: 'stand', label: 'Đứng dồn một chân, dáng chữ S', text: 'standing with her weight on one leg, a gentle S-curve, shoulders relaxed, arms soft and natural', frames: ['knee', 'full'], views: FRONT },
  { id: 'walk', label: 'Bước đi, váy áo bay', text: 'mid-step walking toward the camera, hem and sleeves swaying with the motion', frames: ['knee', 'full'], views: FRONT },
  { id: 'sit', label: 'Ngồi nghiêng, lưng thẳng', text: 'sitting sideways on a stone seat, upright back, knees together and angled, hands resting in her lap', frames: ['knee', 'full'], views: FRONT },
  { id: 'kneel', label: 'Quỳ ngồi, váy xòe quanh', text: 'kneeling gracefully, sitting back on her heels, the hem of her gown spread around her', frames: ['full'], views: FRONT },
  { id: 'lying', label: 'Nằm nghiêng trên cánh hoa', text: 'lying on her side on a bed of petals, one arm under her head, the gown draped softly over her legs', frames: ['full'], views: FRONT },
  { id: 'float', label: 'Lơ lửng, tóc và tay áo bay lên', text: 'floating weightlessly above the ground, hair and sleeves drifting upward', frames: ['knee', 'full'], views: FRONT },
  { id: 'twirl', label: 'Xoay vòng, váy xòe', text: 'turning in a slow twirl, the layered skirt flaring in a circle', frames: ['full'], views: FRONT },
  { id: 'profile', label: 'Nhìn ngang xa xăm, lưng thẳng', text: 'in clean side profile, gazing at the distance, a long neck and a straight back', frames: ALL, views: ['profile'] },
  { id: 'profile-bow', label: 'Cúi đầu nhẹ, mi dài', text: 'in side profile with her head bowed softly, long lashes lowered, a quiet bittersweet mood', frames: ALL, views: ['profile'] },
  { id: 'back-neck', label: 'Vai trần và gáy, tóc xõa xuống lưng', text: 'seen from behind, her bare shoulders and the nape of her neck, long hair cascading down her back, her head turned slightly', frames: ['close', 'half'], views: ['back'] },
  { id: 'back-stand', label: 'Đứng quay lưng nhìn phong cảnh', text: 'standing with her back to the camera, shoulders relaxed, looking out over the scene', frames: ['half', 'knee', 'full'], views: ['back'] },
  { id: 'back-sit', label: 'Ngồi quay lưng nhìn xa', text: 'sitting with her back to the camera, hair cascading down her back, looking into the distance', frames: ['knee', 'full'], views: ['back'] },
  { id: 'fan-hide', label: 'Mặt sau quạt tròn', text: 'her face is hidden behind a round silk fan held in front of it, only her hair and shoulders are visible', frames: ALL, views: ['hidden'] },
  { id: 'umbrella-hide', label: 'Mặt dưới vành ô giấy dầu', text: 'her face is hidden under the tilted rim of an oil-paper umbrella, only her chin and shoulders are visible', frames: ALL, views: ['hidden'] },
  { id: 'hair-hide', label: 'Mặt khuất sau mái tóc', text: 'her face is hidden by a curtain of her hair as she bows her head', frames: ALL, views: ['hidden'] },
];
export const validPoses = (frame: string, view: string): Pose[] => POSES.filter((x) => x.frames.includes(frame) && x.views.includes(view));

// The "natural" pose of each story, used when the owner leaves the pose on "auto".
export const STORY_POSE: Record<string, string> = {
  bangtuyet: 'seated on the glacier throne, upright and regal, hands resting in her sleeves',
  lienhoa: 'lying on her side among white lilies at the water\'s edge, relaxed and dreamy',
  daohoa: 'standing in a graceful ready stance with her weight on one leg, sleeves drifting',
  hoadiep: 'lying on her side on a velvet divan, propped on one elbow, relaxed',
  tinhha: 'sitting at the edge of the floating island, her long skirt covering her legs, glancing back over her shoulder',
  longcung: 'drifting weightlessly, one arm lightly lifted, hair and gown floating around her',
  hoason: 'standing tall and defiant, chin raised, sleeves blowing in the heat',
  thuphong: 'kneeling at a low tea table, back straight, her head lifted as she glances up',
  suoinong: 'seated at the pool\'s edge, shoulders relaxed, her wet hair over one shoulder',
  thuphong2: 'leaning lightly against a desk, looking up from a scroll',
  cocam: 'sitting upright on a cushion with the guqin across her lap, head tilted',
  duthu: 'standing in a relaxed gentle stance with the umbrella resting on her shoulder',
  hongtuyen: 'standing with her body turned slightly, gazing along the thread, one shoulder lowered',
  nguyetmon: 'standing in the moon gate with a gentle S-curve, the fan raised near her face',
  ruouhoa: 'sitting at the stone table, leaning slightly forward, relaxed and smiling',
};
const WATER = new Set(['lienhoa', 'cocam', 'suoinong', 'duthu']);
// Positive wording so the water gives one clean mirror image (models draw a poor reflection when it is not asked for).
export const REFLECTION = 'the water is still like a mirror, with a single clear, accurate reflection of her figure and the lights in the same pose, softly rippled only near the edges';

// Hair is a separate choice, so the same story can be drawn with very different, striking hairstyles.
export const HAIR: Opt[] = [
  { id: 'long', label: 'Đen dài mượt, bay nhẹ', text: 'long, glossy, silky black hair flowing past her shoulders, a few windswept strands across her cheek' },
  { id: 'silver', label: 'Bạc trắng, trâm pha lê', text: 'long silver-white hair with delicate crystal hairpins and fine braids woven through it' },
  { id: 'bun', label: 'Búi cao, trâm ngọc phượng', text: 'an elegant high bun held by a jade hairpin and a gold phoenix hair ornament, loose wisps framing her face' },
  { id: 'halfup', label: 'Nửa búi, dải lụa', text: 'half-up half-down hair tied with a long silk ribbon, the rest flowing in soft waves' },
  { id: 'braid', label: 'Tết lệch, hoa và ngọc trai', text: 'a loose side braid draped over one shoulder, woven with small white flowers and pearls' },
  { id: 'waves', label: 'Xoăn sóng nâu ánh vàng', text: 'soft voluminous loose waves in deep chestnut brown with golden highlights, petals caught in the curls' },
  { id: 'crimson', label: 'Đỏ thẫm, mão lửa', text: 'long hair in deep crimson shading to black at the ends, with a golden flame-shaped crown' },
  { id: 'ice', label: 'Xanh băng chuyển tím', text: 'long ice-blue to lavender gradient hair with tiny glowing snowflake ornaments' },
  { id: 'ponytail', label: 'Đuôi ngựa cao, dây đỏ', text: 'a high flowing ponytail tied with a red cord, long side bangs and wind-swept strands' },
  { id: 'butterfly', label: 'Cài bướm và chuồn chuồn phát sáng', text: 'black hair swept up and adorned with glowing butterfly and dragonfly ornaments with dangling beaded tassels' },
  { id: 'moon', label: 'Rẽ giữa, trán chuỗi vàng, mão trăng', text: 'centre-parted hair with a delicate gold forehead pendant and a moon-shaped crown, long hair falling behind her' },
];

export const HANDS: Opt[] = [
  { id: 'hidden', label: 'Giấu tay trong tay áo (ít lỗi nhất)', text: 'both hands are hidden inside her wide flowing sleeves, no hands visible' },
  { id: 'cheek', label: 'Tựa má, tay áo che gần hết', text: 'her cheek rests lightly against the back of one hand that is mostly covered by a long flowing sleeve, only the relaxed fingertips show, the other arm out of frame' },
  { id: 'lap', label: 'Tay đặt xuôi ngoài khung hình', text: 'both arms relaxed and low, the hands out of frame below the edge of the picture' },
  { id: 'fan', label: 'Cầm quạt tròn che nửa tay', text: 'one hand holds a round silk fan close to her shoulder, the fan covers most of the hand, the other hand out of frame' },
  { id: 'hair', label: 'Vuốt tóc sau tai', text: 'one hand with five natural slender fingers gently tucks a strand of hair behind her ear, the elbow bent naturally, the other hand out of frame' },
  { id: 'flower', label: 'Cầm một cành hoa', text: 'one hand holds a single flower by its stem near her chest, five natural fingers visible, the other hand out of frame' },
];

export const EXPRESSIONS: Opt[] = [
  { id: 'tease', label: 'Tinh nghịch', text: 'a teasing half-smile and a sideways glance, eyes full of mischief' },
  { id: 'wistful', label: 'Man mác', text: 'a wistful, slightly sad gaze, eyes shining, as if remembering someone' },
  { id: 'cool', label: 'Kiêu kỳ', text: 'a cool, confident and aloof expression, chin slightly lifted, an unreachable beauty' },
  { id: 'soft', label: 'Dịu dàng', text: 'a soft, tender smile, warm half-lidded eyes looking straight at the viewer' },
  { id: 'dream', label: 'Mơ màng', text: 'a dreamy, drowsy look, lips slightly parted, lost in thought' },
];

// Levels of allure: all clothed. 3 is the ceiling to try; fal's checker may refuse it for some models.
export const LEVELS: Opt[] = [
  { id: '1', label: 'Mức 1 · thanh lịch', text: 'elegant and graceful: a layered silk gown with an off-shoulder neckline and sheer gauze sleeves' },
  { id: '2', label: 'Mức 2 · quyến rũ', text: 'alluring: a fitted silk bodice with bare shoulders and collarbone, a softly open collar' },
  { id: '3', label: 'Mức 3 · táo bạo', text: 'bold and glamorous: a short embroidered silk top with an ornate underlayer and bare midriff' },
];

// A phone wallpaper: 9:16, subject low, a calm empty upper area so a phone's own widgets sit well.
export const LAYOUT = 'vertical 9:16 phone wallpaper, a calm, softly lit, uncluttered upper third (just sky, mist or foliage), a strong focal point and a clear romantic story, unforgettable wow-factor';

// Said in positive words (the models ignore negation): counts, proportions, symmetry.
export const ANATOMY = 'exactly two arms and at most two hands in the whole picture, any visible hand has five natural fingers with a natural thumb and relaxed wrist, natural elbow and shoulder angles, balanced elegant proportions with a slim waist, a long neck, a head in harmony with the body (about seven and a half heads tall), a symmetrical face, one single person';

const by = (a: Opt[], id: string) => a.find((x) => x.id === id) || a[0];
export interface Pick { style: string; story: string; frame: string; angle: string; view: string; pose: string; hands: string; hair: string; expr: string; level: string }
export const DEFAULT_PICK: Pick = { style: 'donghua', story: 'nguyetmon', frame: 'half', angle: 'eye', view: 'front', pose: 'auto', hands: 'hidden', hair: 'long', expr: 'soft', level: '2' };

export const isFaceless = (view: string) => view === 'back' || view === 'hidden';

// The pose actually used: the chosen one when it fits the frame and the view, otherwise the story's own natural pose.
export function poseText(p: Pick): string {
  const chosen = validPoses(p.frame, p.view).find((x) => x.id === p.pose);
  return chosen ? chosen.text : (STORY_POSE[p.story] || '');
}

export function composeScene(p: Pick): string {
  const st = STORIES.find((x) => x.id === p.story) || STORIES[0];
  const view = by(VIEWS, p.view), faceless = isFaceless(view.id);
  // from behind, or in a wide frame where "hands out of frame" cannot be true, the hands stay hidden in the sleeves
  const hands = by(HANDS, view.id === 'back' || (p.hands === 'lap' && (p.frame === 'knee' || p.frame === 'full')) ? 'hidden' : p.hands);
  return [
    `${st.text}. Setting: ${st.setting}.`,
    WATER.has(st.id) ? `Water: ${REFLECTION}.` : '',
    `Camera: ${by(FRAMES, p.frame).text}, ${by(ANGLES, p.angle).text}.`,
    `View: ${view.text}.`,
    `Pose: ${poseText(p)}.`,
    `Hands: ${hands.text}.`,
    `Hair: ${by(HAIR, p.hair).text}.`,
    `Anatomy: ${ANATOMY}.`,
    faceless ? '' : `Expression: ${by(EXPRESSIONS, p.expr).text}.`,
    `Outfit: ${by(LEVELS, p.level).text}.`,
    `Style: ${by(STYLES, p.style).text}.`,
    `${LAYOUT}.`,
  ].filter(Boolean).join(' ');
}

const pick = <T,>(a: T[], r: () => number): T => a[Math.floor(r() * a.length) % a.length];
export function randomPick(keep: Partial<Pick> = {}, r: () => number = Math.random): Pick {
  const frame = keep.frame ?? pick(FRAMES, r).id, view = keep.view ?? pick(VIEWS.slice(0, 3), r).id;
  return { style: keep.style ?? pick(STYLES, r).id, story: pick(STORIES, r).id, frame, angle: pick(ANGLES, r).id, view, pose: 'auto', hands: pick(HANDS, r).id, hair: pick(HAIR, r).id, expr: pick(EXPRESSIONS, r).id, level: keep.level ?? '2' };
}

// For the "my face" model the allure level is forced to 1 (elegant, covered); whatever the page sends for the level is ignored.
export const faceScene = (p: Pick): string => composeScene({ ...p, level: '1' });
