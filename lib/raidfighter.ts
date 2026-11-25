// A player's fighting numbers for Phó Bản (lib/raid.ts Fighter), taken from the save. Shared by the server (lib/server/raid.ts) and the demo stage (lib/raiddemo.ts).
import * as G from './game';
import * as R from './raid';

/** A player's fighting numbers, taken from the save (lib/raid.ts Fighter). `pid` is the public id, never the account id. */
export function fighterOf(st: G.GameState, pid: string): R.Fighter {
  const p = st.player, S = G.pstats(st), cls = G.classOf(st), el = G.auraElement(st);
  return {
    pid, name: p.name, g: p.look.g, arch: R.archOf(cls, el), hair: parseInt(pid.slice(0, 6), 16) || 0, level: G.levelOf(p), realm: p.realm, sub: p.sub, el, cls,
    skills: G.playerSkills(st), atk: S.atk, def: S.def, spd: S.spd, hp: S.maxHp, crit: S.crit, critdmg: S.critdmg, power: G.combatPower(st), ...(p.avatar && p.avatar.url ? { av: p.avatar.url } : {}),
  };
}

