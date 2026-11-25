// The player's actions that need no dice: the same rules run on the server (the real thing) and in the browser (what the screen shows at once,
// before the server has answered). Both sides call exactly these handlers, so they cannot disagree. Actions with chance (taming, fighting,
// breakthrough) or tables outside the save (Chợ Đêm) are not here: they wait for the server.
import * as G from './game';

export type PureHandler = (st: G.GameState, b: any) => G.Res;
const int = (x: any) => Number.isInteger(x);
const bad = () => G.fail('E_BAD_REQUEST');

/** Actions the screen does not do ahead of the server: the player waits for the answer (the card shows it on its way) and is told the reason when it is refused.
 *  For what sends something away for a long time (a creature sent to work): a refusal must never look like the creature just vanished. The server runs the same handler from PURE_INTENTS. */
// expoDeal (a deal of Triển Lãm): a swap makes a random piece or creature, and the pictures and relics that roll uses are known only on the server, so the browser would show a piece
// the save never gets. The screen shows the server's piece instead.
export const SERVER_FIRST: ReadonlySet<string> = new Set(['workSend', 'expoDeal']);

export const PURE_INTENTS: Record<string, PureHandler> = {
  mode: (st, b) => G.setMode(st, b.mode),
  zone: (st, b) => G.setZone(st, b.zone),
  settings: (st, b) => G.setSettings(st, b.patch),
  equip: (st, b) => (int(b.id) ? G.equipFromBag(st, b.id) : bad()),
  unequip: (st, b) => (typeof b.slot === 'string' && b.slot in st.eq ? G.unequip(st, b.slot) : bad()),
  unstash: (st, b) => (int(b.id) ? G.unstash(st, b.id) : bad()),
  lock: (st, b) => (int(b.id) ? G.toggleLock(st, b.id) : bad()),
  dissolve: (st, b) => (int(b.id) ? G.dissolveBagItem(st, b.id) : bad()),
  dissolveMany: (st, b) => G.dissolveMany(st, b.maxTier),
  releaseMany: (st) => G.releaseMany(st),
  release: (st, b) => (int(b.id) ? G.releaseBeast(st, b.id) : bad()),
  buy: (st, b) => (typeof b.item === 'string' ? G.buy(st, b.item, b.qty) : bad()),
  fillOrder: (st, b) => (typeof b.id === 'string' && Array.isArray(b.items) && b.items.length <= 10 ? G.fillOrder(st, b.id, b.items) : bad()),
  fillJob: (st, b) => (typeof b.id === 'string' ? G.fillJob(st, b.id, { ids: b.ids, n: b.n }) : bad()),
  expoSet: (st, b) => G.expoSet(st, b && b.slot, b && b.kind, b && b.id),
  expoClear: (st, b) => G.expoClear(st, b && b.slot),
  expoCollect: (st) => G.expoCollect(st),
  expoDeal: (st, b) => G.expoDeal(st, b && b.n),
  expoPrice: (st, b) => G.expoPrice(st, b && b.slot, b && b.extra),
  workSend: (st, b) => G.workSend(st, b && b.id, b && b.beast),
  workCollect: (st, b) => G.workCollect(st, b && b.id),
  sell: (st, b) => (typeof b.item === 'string' ? G.sell(st, b.item, b.qty) : bad()),
  pill: (st, b) => G.useHpPill(st, b.grade),
  craft: (st, b) => G.craft(st, b.id, b.qty),
  learn: (st, b) => G.learnBook(st, b.name),
  loadout: (st, b) => G.setLoadout(st, b.cls, b.names),
  method: (st, b) => G.setMethod(st, b.name),
  showcase: (st, b) => G.setShowcase(st, b && b.kind, b && b.id),
};
// Answering the question the journey waits for: only the answers without chance can be shown at once.
export const decideIsPure = (b: any) => !!b && (b.choice === 'skip' || b.choice === 'avoid' || b.choice === 'later');
