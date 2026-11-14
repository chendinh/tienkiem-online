// The state the browser receives from the server (no seeds, no RNG positions). Type only: nothing from lib/server is bundled.
import type { GameView, Out } from '../server/service';
export type GS = GameView;
export type ServerOut = Out;
