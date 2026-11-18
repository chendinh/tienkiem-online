// Linh Thú Viên: the creatures STAND at fixed spots of one background picture and move in place, in a way that fits the spot (drink at the stream, eat fruit
// under the tree). Shared by the page and the server, no imports, so it is tested (tests/spots.test.ts) and the page can price a run before it starts.
// A spot is a square window of the background. For each creature a picture of that window is drawn with the creature standing in it (an edit of the window,
// lit and scaled like the rest), then a short looping clip is made from that picture. The page lays the clip back over the same window with soft edges.

export const BG = { id: 'thanhvan', w: 1376, h: 768 } as const;   // public/art/zones/thanhvan.jpg
export interface Spot {
  id: string;
  name: string;                       // for the owner (Vietnamese)
  box: { x: number; y: number; s: number };   // the window, in pixels of the BG picture: left, top, side
  place: string;                      // where in the window the creature stands, in words the picture editor understands
  action: string;                     // what it does there (the clip), ends where it began
}

const STATIC = 'The camera is completely static and everything in the scene stays in place except what is described.';
export const SPOTS: Spot[] = [
  { id: 'suoi', name: 'Bờ suối · uống nước', box: { x: 430, y: 256, s: 512 },
    place: 'standing on the grassy bank at the left side of the stream, in the lower left half of the image, its front paws at the water edge and the flowing stream in front of it, its body turned towards the water',
    action: 'The creature lowers its head to the stream and drinks, small ripples spread on the water, then it lifts its head, swallows, looks around calmly and settles back into the starting pose.' },
  { id: 'cay', name: 'Dưới cây thông · hái quả', box: { x: 640, y: 256, s: 512 },
    place: 'standing on the grass under the twisted pine tree near the center of the image, with a low branch above it that carries a few glowing golden spirit fruits hanging within its reach',
    action: 'The creature reaches up to the low branch, takes a glowing fruit and eats it, chewing contentedly, then lowers its head and settles back into the starting pose.' },
  { id: 'da', name: 'Tảng đá rêu · nghỉ ngơi', box: { x: 864, y: 256, s: 512 },
    place: 'resting on top of the large mossy boulder in the left half of the image, lying or sitting comfortably as its body allows, with the green rock around it',
    action: 'The creature rests: it breathes slowly, blinks, yawns once, stretches a little, its tail or mane sways, then it settles back into the starting pose.' },
  { id: 'tre', name: 'Rừng tre · ngắm đom đóm', box: { x: 130, y: 256, s: 512 },
    place: 'standing on the mossy ground beside the mossy rocks and the bamboo on the left side of the image, in the lower half, with fireflies glowing around it',
    action: 'The creature looks around curiously, its ears or head turning to follow the glowing fireflies that drift past, it sniffs the air, then it settles back into the starting pose.' },
];
export const spotOf = (id: unknown) => SPOTS.find((s) => s.id === id);

const NEG = 'No text, no watermark, no logo, no border.';
// Image 1 = the window of the background, image 2 = the creature. The result must be the same window with the creature in it.
export const spotPicPrompt = (creature: string, s: Spot) =>
  `Image 1 is a painting of a place. Image 2 is a creature (${creature}). Edit image 1: add the creature from image 2, ${s.place}. Keep the creature's exact design, colors and markings from image 2. ` +
  `Draw it at a natural size for the place and light it like the scene: same light direction, same color of light, soft contact shadow, water and grass touching it as they would. ` +
  `Keep everything else in image 1 exactly as it is: same composition, camera, painting style and background. The creature is fully visible and not cropped. ${NEG}`;
export const spotClipPrompt = (s: Spot) =>
  `${s.action} ${STATIC} The animation loops seamlessly: the last frame returns exactly to the first frame. Keep the creature's design, colors and the background unchanged. Cinematic fantasy realism, smooth natural motion, no cuts, no text.`;

// The square window to crop from the background; clamped so it always lies inside the picture.
export function cropBox(s: Spot, w = BG.w, h = BG.h) {
  const side = Math.min(s.box.s, w, h);
  return { left: Math.round(Math.max(0, Math.min(w - side, s.box.x))), top: Math.round(Math.max(0, Math.min(h - side, s.box.y))), width: side, height: side };
}
// Where the window sits on the stage, as percentages of the stage (which has the background's shape).
export function tileRect(s: Spot, w = BG.w, h = BG.h) {
  const b = cropBox(s, w, h), p = (n: number) => Math.round(n * 10000) / 100;
  return { left: p(b.left / w), top: p(b.top / h), width: p(b.width / w), height: p(b.height / h) };
}
// Rough price of a run: one picture per (creature, spot) and one clip each, optionally minus what exists. Prices are passed in (see lib/anim.ts clipCost).
export const spotRunUsd = (n: number, picUsd: number, clipUsd: number) => Math.round(Math.max(0, n) * (picUsd + clipUsd) * 100) / 100;
