import { type Streams, int, next } from './rng';
import * as C from './content';

// Base_Appearance of a cultivator (attributes only; the picture is generated from them).
export interface Look { g: 'f' | 'm'; hc: number; hs: number; ey: number; sk: number; mk: number; seed: number }

// Build, face and pose are derived from the seed of the look, so no random draw is added and nothing else in the game changes.
// build: men 0 = handsome scholar, 1 = muscular; women always 0. face: 0-4 picks one of the face descriptions. pose: picks the standing pose.
export const buildOf = (L: { g: string; seed: number }) => (L.g === 'm' ? L.seed % 2 : 0);
export const faceOf = (L: { seed: number }) => Math.floor(L.seed / 2) % 5;
export const poseOf = (L: { seed: number }) => Math.floor(L.seed / 10) % 12;

export function makeLook(s: Streams, gender?: 'f' | 'm'): Look {
  const g = gender || (next(s, 'gen') < 0.5 ? 'f' : 'm');
  const styles = g === 'f' ? C.HAIR_STYLES_F : C.HAIR_STYLES_M;
  return { g, hc: int(s, 'gen', 0, C.HAIR_COLORS.length - 1), hs: int(s, 'gen', 0, styles.length - 1), ey: int(s, 'gen', 0, C.EYES.length - 1), sk: int(s, 'gen', 0, C.SKINS.length - 1), mk: int(s, 'gen', 0, C.MARKS.length - 1), seed: int(s, 'gen', 1, 2 ** 30) };
}
