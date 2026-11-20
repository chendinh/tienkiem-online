import { GALAXIES } from './galaxy';

// The prompts the owner's tool (/admin → Ảnh Tinh Hà) sends to the image model. One scene per galaxy, drawn twice: wide for PC, tall for a phone held upright.
export const GX_ART_NAMES = ['map', ...GALAXIES.map((g) => g.id)];
export const GX_ART_LABEL: Record<string, string> = { map: 'Bản đồ tổng', ...Object.fromEntries(GALAXIES.map((g) => [g.id, g.name])) };

const STYLE = 'Ultra detailed high-end Chinese xianxia (cultivation fantasy) concept art, cinematic epic scale, painterly with photoreal volumetric light, rich saturated colour, razor-sharp fine detail everywhere, crisp stars, premium AAA game key art, 8k. Absolutely no text, no letters, no calligraphy, no seal stamps, no watermark, no logo, no UI, no people and no faces.';

const SCENE: Record<string, string> = {
  thienhuyen: 'A magnificent jade-teal and gold cosmic sky seen from a floating sacred mountain realm. A huge luminous spiral galaxy with a blazing golden core and fine star dust dominates the upper sky, with a river of broken stars flowing across it and rays of golden light. Nine ancient mountain peaks float in a sea of silvery clouds, crowned with many-tiered Chinese pagodas and pavilions with upturned eaves and warm lantern windows, twisted pines, a thin waterfall of light falling from the largest island into the clouds. A pale jade moon and a few shooting stars. Serene, majestic, the gentle first world.',
  huyenminh: 'A haunting violet-indigo cosmos. A colossal dark ringed planet-moon with a glowing icy ring fills the sky, casting pale blue light. A silvery river of souls flows upward from the bottom of the picture into the sky. A ruined Chinese ghost gate (pailou) stands on a lonely floating island with bare dead trees, hundreds of cyan soul lanterns float like fireflies, low purple mist. Eerie, melancholic, beautiful, cold cyan highlights on deep purple.',
  xichdiem: 'A fiery crimson and amber cosmos. A gigantic ancient Chinese bronze cauldron (ding) with three legs and two ears stands on a floating volcanic island, a towering column of golden-white flame rising from it into the sky, lava veins glowing under the rock, ancient swords stuck in the stone, rain of embers and sparks. A huge orange spiral galaxy glows behind, smoke and fire clouds below. Forge of the stars, intense heat, dramatic rim light.',
  thanhde: 'An emerald and cyan cosmos dominated by a colossal World Tree that grows through the sky: a massive gnarled trunk with huge roots rising from a sea of glowing mist, a vast crown of bioluminescent leaves like a cloud of green-gold light, small spiral galaxies hanging in the crown like fruit, floating lotus islands, thousands of fireflies. Serene, alive, magical, soft aurora greens.',
  tutieu: 'An electric violet and blue-white cosmos in a never-ending storm. A tall many-tiered Chinese pagoda tower pierces the eye of a giant storm of purple thunderclouds; around it hundreds of luminous flying swords turn in concentric rings; forked lightning bolts crack across the sky and light the clouds from within. Powerful, dramatic, crackling energy, glowing blade edges.',
  hondon: 'A golden and black primordial cosmos, the birth of Yin and Yang. At the centre a vast luminous swirling vortex of gold dust shaped like a taiji (yin-yang) symbol made of light and void, ringed by thin broken golden celestial rings and drifting shards of a shattered celestial sphere, gold dust and rare stars on near-black space. Mysterious, sacred, minimal and awe-inspiring.',
};

export function galaxyPrompt(name: string, portrait: boolean): string {
  const g = GALAXIES.find((x) => x.id === name);
  if (!g) throw new Error('unknown picture');
  const frame = portrait
    ? 'Tall vertical 9:16 composition for a phone: the main subject sits in the upper two thirds, the lower third is calmer and darker (a text panel will cover it).'
    : 'Wide 16:9 composition: the main subject sits left of centre, the right third is calmer and darker (a text panel will cover it).';
  return `${SCENE[g.id]} ${frame} ${STYLE}`;
}

// The star chart is repainted FROM the bundled chart, so every galaxy stays exactly where the page's buttons are.
export function mapPrompt(portrait: boolean): string {
  return `Repaint this star chart as a breathtaking, ultra-detailed, photoreal-painterly deep-space image. Keep the EXACT same layout: the six galaxies must stay at exactly the same positions, with the same size, tilt and spiral shape and the same colours (a bright golden-white one with a small floating pagoda island beside it, a violet one, an orange one, a teal one, a lavender one and a gold-cream one), keep the dashed golden route lines joining them and the faint golden ring arcs and constellation lines. Add far more detail: fine star dust in the spiral arms, glowing cores, luminous nebula filaments, thousands of crisp stars, subtle depth. ${portrait ? 'Vertical 9:16.' : 'Wide 16:9.'} Absolutely no text, no letters, no watermark, no people.`;
}
