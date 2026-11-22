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
  { id: 'bangtuyet', label: 'Nữ vương băng tuyết', text: 'an ice empress with long silver-white hair and a frost crown, seated on a throne carved from glacier, waiting at the summit for someone who never came', setting: 'a snowy fir mountain at night, swirling snowflakes, green and violet aurora across the sky, frozen waterfall, ice crystals glittering on her gown' },
  { id: 'lienhoa', label: 'Đêm trăng bên ao sen', text: 'a moon fairy lying among white lilies beside a spirit pond, daydreaming of a lost love', setting: 'dark glassy water with floating petals, glowing koi under the surface, giant full moon, fireflies, jade bracelets, mist rolling over lotus leaves' },
  { id: 'daohoa', label: 'Đào hoa kiếm', text: 'a sword maiden in flowing violet robes who has just released her spirit sword, which hovers and glows blue beside her', setting: 'a cherry blossom grove on a cliff, a storm of pink petals, a misty pavilion and waterfall far below, golden morning light' },
  { id: 'hoadiep', label: 'Hồ điệp lửa trong rừng trúc', text: 'an enchantress with long black hair who lets a butterfly of living flame rest on her fingertip, smiling as if sharing a secret', setting: 'a bamboo forest at dusk, red silk curtains, hanging lanterns, embers drifting upward, a velvet divan under warm firelight' },
  { id: 'tinhha', label: 'Ngồi bên mép đảo bay giữa ngân hà', text: 'a star priestess sitting barefoot on the edge of a floating island, looking back over her shoulder as constellations answer her gaze', setting: 'a vast galaxy with nebula clouds, comets, glowing rings of runes, waterfalls of light pouring off the island, tiny floating lanterns' },
  { id: 'longcung', label: 'Long cung dưới biển', text: 'a dragon-sea princess drifting weightlessly in her underwater palace, her silk gown floating like water', setting: 'a coral palace with pearl pillars, glowing jellyfish lanterns, shafts of sunlight from the surface, schools of luminous fish, rising bubbles' },
  { id: 'hoason', label: 'Phượng hoàng trên núi lửa', text: 'a phoenix cultivator in crimson and gold silk, standing defiant as a firebird circles above her', setting: 'a volcanic temple of black stone and gold, rivers of lava, rain of glowing embers, huge phoenix feathers drifting through the smoke' },
  { id: 'thuphong', label: 'Thung lũng phong đỏ', text: 'a tea-ceremony fairy by a stone bridge, sleeves fluttering, glancing up with a gentle teasing smile', setting: 'an autumn maple valley in blazing red and gold, a waterfall, falling leaves, steam rising from a tea set, soft afternoon haze' },
  { id: 'suoinong', label: 'Suối nóng linh khí dưới trăng', text: 'an immortal enchantress resting at the edge of a glowing spirit hot spring, hands running through her wet hair', setting: 'carved stone pools, rising steam, lotus petals and fireflies, a full moon, paper lanterns reflected in the water' },
  { id: 'thuphong2', label: 'Tàng thư các', text: 'a scholar-immortal leaning on a desk in a vast ancient library tower, looking up from a scroll as if she had been waiting for the reader', setting: 'endless shelves, floating scrolls and glowing seals, candlelight, fireflies, a round window with the moon, drifting dust like gold' },
];

export const ANGLES: Opt[] = [
  { id: 'low', label: 'Từ dưới nhìn lên', text: 'dramatic low-angle shot looking up at her, powerful and graceful, her legs leading the eye upward, the setting towering behind her' },
  { id: 'close', label: 'Cận mặt, tựa cằm', text: 'intimate close-up portrait, slightly tilted camera, chin resting on her hand, the setting softly blurred behind her' },
  { id: 'lying', label: 'Nằm nghiêng', text: 'she is lying on her side, camera at eye level close to the ground, petals and details framing her face' },
  { id: 'over', label: 'Nhìn từ trên xuống', text: 'high overhead shot looking down at her, her hair and robes spread out around her like a flower' },
  { id: 'shoulder', label: 'Liếc qua vai', text: 'three-quarter back view, she turns and looks back over her shoulder at the camera, the setting stretching into the distance' },
  { id: 'full', label: 'Toàn thân, dáng ngồi', text: 'full-length seated pose, elegant diagonal composition, one knee raised, hands relaxed' },
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
  { id: '1', label: 'Mức 1 · thanh lịch', text: 'elegant and graceful: a long layered silk gown with an off-shoulder neckline and a high slit, poised pose' },
  { id: '2', label: 'Mức 2 · quyến rũ', text: 'alluring: a fitted silk bodice with bare shoulders and collarbone, a long slit showing one leg, a relaxed languid pose' },
  { id: '3', label: 'Mức 3 · táo bạo', text: 'bold and glamorous: a short embroidered silk top and a low-slung gauzy skirt over an ornate underlayer, an arched confident pose' },
];

// A phone wallpaper: 9:16, subject low, room at the top for the clock and notifications.
export const LAYOUT = 'vertical 9:16 phone wallpaper composition, clear open space in the upper third for the clock, the subject in the lower two thirds, a strong focal point and a clear story, unforgettable wow-factor';

const by = (a: Opt[], id: string) => a.find((x) => x.id === id) || a[0];
export interface Pick { style: string; story: string; angle: string; expr: string; level: string }
export const DEFAULT_PICK: Pick = { style: 'donghua', story: 'bangtuyet', angle: 'low', expr: 'cool', level: '2' };

export function composeScene(p: Pick): string {
  const st = STORIES.find((x) => x.id === p.story) || STORIES[0];
  return `${st.text}. Setting: ${st.setting}. Camera: ${by(ANGLES, p.angle).text}. Expression: ${by(EXPRESSIONS, p.expr).text}. Outfit and pose: ${by(LEVELS, p.level).text}. Style: ${by(STYLES, p.style).text}. ${LAYOUT}.`;
}

const pick = <T,>(a: T[], r: () => number): T => a[Math.floor(r() * a.length) % a.length];
export function randomPick(keep: Partial<Pick> = {}, r: () => number = Math.random): Pick {
  return { style: keep.style ?? pick(STYLES, r).id, story: pick(STORIES, r).id, angle: pick(ANGLES, r).id, expr: pick(EXPRESSIONS, r).id, level: keep.level ?? '2' };
}
