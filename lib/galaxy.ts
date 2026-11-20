import data from '../content/galaxies.json';

// Vạn Giới Tinh Đồ: the star chart of galaxies. Texts and positions live in content/galaxies.json (scripts/art/galaxy_art.py reads the same file to draw the pictures).
export interface GalaxyFact { k: 'rank' | 'beast' | 'weapon' | 'board' | 'rule'; title: string; text: string }
export interface Galaxy {
  id: string; name: string; epithet: string; status: 'open' | 'soon'; element: string; accent: string; glow: string;
  pos: [number, number]; posM: [number, number]; size: number; tagline: string; story: string[]; facts: GalaxyFact[];
}
export const FEATURE = data.feature as { name: string; short: string; tagline: string; intro: string[]; rule: string };
export const GALAXIES = data.galaxies as Galaxy[];
export const galaxyOf = (id: string | null | undefined) => GALAXIES.find((g) => g.id === id) || null;

// Pictures: `name_2k.webp` (2560x1440, PC) and `name_1k.webp` (1080x1920, phone upright); `name_t.webp` is a small round thumbnail.
export const GX_DIR = '/art/galaxy';
export const gxPic = (name: string, size: '2k' | '1k' | 't') => `${GX_DIR}/${name}_${size}.webp`;
