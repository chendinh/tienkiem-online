// Quick balance and determinism check: npm run sim   (TUTIEN_RATES=demo npm run sim to see rare drops)
import { newGame, settle, levelOf, pstats, ledgerSum } from '../lib/game';
import * as C from '../lib/content';
const T0 = 1_700_000_000_000;
const run = (seed: number, hours = 12) => {
  const st = newGame(seed, undefined, T0);
  Object.assign(st.set, { autoTame: true, autoFight: true, autoBreak: true, autoEquip: true });   // without auto settings the journey waits for the player's answers
  st.inv.trib = 20;
  const rep = settle(st, Math.floor((hours * 3600) / 5));
  return { st, rep };
};
const a = run(12345), b = run(12345);
console.log('deterministic:', JSON.stringify(a.rep) === JSON.stringify(b.rep) && JSON.stringify(a.st.player) === JSON.stringify(b.st.player));
const { st, rep } = a;
const p = st.player;
console.log(p.name, 'linh', p.linh.join(','), 'purity', p.purity);
console.log('level', rep.fromLevel, '->', rep.toLevel, C.REALMS[p.realm], C.SUBS[p.sub], 'cp', Math.round(p.cp));
console.log('enc', rep.encounters, JSON.stringify(rep.enc), 'win', rep.wins, 'lose', rep.losses, 'draw', rep.draws, 'stones', rep.stones, JSON.stringify(rep.stonesBy));
console.log('items by tier', rep.items.join('/'), 'dissolved', rep.dissolved, 'equipped', rep.equipped, 'bag', st.bag.length, 'stash', st.stash.length);
console.log('beasts', st.beasts.length, 'tame tries', rep.tameTry, 'tamed', rep.tamed, 'new species', rep.newSpecies.length);
console.log('highlights:', rep.highlights.map((h) => h.prio + ':' + h.text).join(' | '));
console.log('stats', JSON.stringify(pstats(st)));
console.log('ledger ok (stones = ledger sum minus pending):', st.stones === ledgerSum(st) + Object.values(st.pend).reduce((x, y) => x + y, 0));
for (const [name, mode, autoBreak] of [['retreat', 'retreat', true], ['adventure', 'adventure', true]] as const) {
  const s2 = newGame(777, undefined, T0); Object.assign(s2.set, { autoTame: true, autoFight: true, autoEquip: true }); s2.set.autoBreak = autoBreak; s2.set.mode = mode; s2.inv.trib = 5; s2.inv.hp[0] = 50;
  const r2 = settle(s2, 8640);
  console.log(`${name}+autoBreak 12h: level`, r2.fromLevel, '->', r2.toLevel, 'bt', JSON.stringify(r2.bt), C.REALMS[s2.player.realm]);
}
