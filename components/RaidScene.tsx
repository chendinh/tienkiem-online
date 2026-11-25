'use client';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import * as C from '@/lib/content';
import * as R from '@/lib/raid';
import * as P from '@/lib/raidplay';
import { fxOf, fxColor, type SkillFx } from '@/lib/skillfx';
import { sfx } from '@/lib/audio';
import { shortNum } from '@/lib/shortnum';
import { hash32 } from '@/lib/orders';
import { Cultivator, lookOf } from './Cultivator';
import { ElIcon } from './Icons';
import { useFx } from './fx/FxProvider';
import { playSkill, warmFx, loadTex } from './fx/SkillFx';

// Phó Bản, the stage: the Dị Thú alive in its lair (a looping clip drawn by AI, scripts/gen-raid.ts), the cultivators who signed up flying on their swords around it, each with
// their name under the sword, and the film of the fight (lib/raidplay.ts). Nothing stops: every cultivator flies loops around its spot and keeps firing qi bolts at the Dị Thú,
// dashes in to release its technique (components/fx/SkillFx.ts, drawn large), the Dị Thú's Sinh Lực drains bolt by bolt; the Dị Thú pours out a barrage of bullets in patterns
// (rings, spirals, aimed fans, a rain from above, heavy bolts of its own techniques) and its aimed blows of the record land on their targets; the fallen drop to the ground and lie
// there; its great attack is a clip of its own over the whole stage; at the end it dies (the clip dissolves into the empty lair) or flees into the mist.
// Nothing here decides anything: the record came from the server. Everything is a function of the film's clock: one requestAnimationFrame loop moves the cultivators (a transform
// each), draws every bullet on one canvas, and fires the moments (numbers, banners, techniques) as the clock passes them, so a film started in the middle shows the same thing.
export interface FilmView { day: string; boss: string; at: number; win: boolean; max: number; fighters: R.Fighter[]; rounds: R.Round[]; dmg: number[]; ko: number[]; mvp: number; me: number }
type Props =
  | { mode: 'lobby'; boss: R.Boss; crowd: R.Fighter[]; meId: string | null; caption: string }
  | { mode: 'film'; boss: R.Boss; film: FilmView; from: number /* ms into the film to start at */; live: boolean; onEnd: () => void };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// techniques that fly from the caster (SkillFx plays them from the cultivator); the others appear on the Dị Thú, so a glowing orb carries them there first
const FLYING = new Set(['bolt', 'arc', 'sweep', 'beam']);
// How large the cultivators' blows are drawn where they land on the Dị Thú (the sparks, the techniques that appear on it): twice the size they were (2026-11-26).
// What flies to it (the bolts, the techniques that fly) keeps its size.
const HIT_FX = 2;
const DIRECTIONAL = new Set(['thrust', 'arrow', 'blade_wave', 'sound', 'phoenix', 'dragon', 'moon', 'shadow']);
const fxOfSkill = (f: R.Fighter, k: number): { fx: SkillFx; color: string; s: ReturnType<typeof R.skillOfFighter> } => {
  const s = R.skillOfFighter(f, k);
  return { fx: fxOf(s.name, s.fx?.kind, s.el || f.el), color: fxColor(s.el || f.el, s.fx?.kind), s };
};
const lookFor = (f: R.Fighter) => lookOf(f.arch, f.g, f.hair, f.cls);
const TAU = Math.PI * 2;
const unit = (h: number, shift: number) => ((h >>> shift) % 1000) / 1000;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// the second colour of the barrage: the element's colour turned round the colour wheel, bright, so the two kinds of bullets read apart on any lair
function opposite(hex: string): string {
  if (!/^#[0-9a-f]{6}/i.test(hex)) return '#ff6a8a';
  const n = parseInt(hex.slice(1, 7), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 180 + 360) % 360;
  const sat = 0.95, li = 0.62, c = (1 - Math.abs(2 * li - 1)) * sat, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = li - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`;
}
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1, 7), 16); return /^#[0-9a-f]{6}/i.test(hex) ? `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` : hex; };

// ---- the sprites of the canvas, drawn once per colour
const spriteCache = new Map<string, HTMLCanvasElement>();
/** A bullet of the barrage: a white-hot core, a solid rim of the colour and a thin dark edge, so it reads on a bright lair as well as on a dark one. */
function orbSprite(color: string): HTMLCanvasElement {
  const key = `o|${color}`, had = spriteCache.get(key); if (had) return had;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.2, '#ffffff'); gr.addColorStop(0.36, color); gr.addColorStop(0.56, color);
  gr.addColorStop(0.66, 'rgba(8,4,16,0.5)'); gr.addColorStop(0.8, rgba(color, 0.18)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  spriteCache.set(key, c); return c;
}
/** Light only (bolts, trails, flashes), drawn added onto what is behind. */
function glowSprite(color: string): HTMLCanvasElement {
  const key = `g|${color}`, had = spriteCache.get(key); if (had) return had;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.16, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.34, rgba(color, 0.85)); gr.addColorStop(0.62, rgba(color, 0.28)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  spriteCache.set(key, c); return c;
}
/** A puff of smoke or dust: a few soft lumps of one tone, drawn painted over (not added), so it darkens a bright lair and veils what is behind. */
function puffSprite(tone: string): HTMLCanvasElement {
  const key = `p|${tone}`, had = spriteCache.get(key); if (had) return had;
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d')!;
  for (const [x, y, r, a] of [[48, 50, 36, 0.8], [30, 46, 22, 0.7], [66, 44, 24, 0.7], [40, 64, 22, 0.6], [60, 64, 21, 0.6], [48, 30, 21, 0.6]]) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(tone, a)); gr.addColorStop(0.5, rgba(tone, a * 0.7)); gr.addColorStop(1, rgba(tone, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  spriteCache.set(key, c); return c;
}
/** The upper jaw of the bite (the lower one is it upside down): a dark arch of a beast's jaw with a rim of the element's colour, the gum line curving up to the corners
 *  of the mouth, a row of teeth with two long fangs. 256 x 150; the gum line is at JAW_GUM of its height in the middle. */
const JAW_W = 256, JAW_H = 150, JAW_GUM = 92 / 150;
function jawSprite(rim: string): HTMLCanvasElement {
  const key = `jaw|${rim}`, had = spriteCache.get(key); if (had) return had;
  const c = document.createElement('canvas'); c.width = JAW_W; c.height = JAW_H;
  const g = c.getContext('2d')!, gum = (x: number) => 92 - 26 * ((x - 128) / 110) ** 2;
  const arch = () => { g.beginPath(); g.moveTo(16, gum(16)); g.bezierCurveTo(30, 4, 226, 4, 240, gum(240)); for (let x = 240; x >= 16; x -= 8) g.lineTo(x, gum(x)); g.closePath(); };
  // a glow round it, the jaw, its rim
  g.save(); arch(); g.lineWidth = 16; g.strokeStyle = rgba(rim, 0.25); g.stroke(); g.restore();
  arch(); const fill = g.createLinearGradient(0, 4, 0, 92); fill.addColorStop(0, '#2b1420'); fill.addColorStop(0.7, '#170a10'); fill.addColorStop(1, '#3d1219'); g.fillStyle = fill; g.fill();
  g.lineWidth = 4; g.strokeStyle = rgba(rim, 0.95); g.stroke();
  // scales on its back
  g.strokeStyle = rgba(rim, 0.35); g.lineWidth = 2;
  for (let k = 0; k < 7; k++) { const x = 52 + k * 25; g.beginPath(); g.arc(x, 34 + Math.abs(k - 3) * 6, 11, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
  // the gum
  g.beginPath(); for (let x = 16; x <= 240; x += 8) (x === 16 ? g.moveTo(x, gum(x)) : g.lineTo(x, gum(x))); g.lineWidth = 7; g.strokeStyle = '#7d1d2b'; g.stroke();
  // the teeth: two fangs near the corners, the others shorter towards the middle
  const N = 11;
  for (let k = 0; k < N; k++) {
    const x = 30 + (k * 196) / (N - 1), y = gum(x) - 1, fang = k === 1 || k === N - 2, mid = Math.abs(k - (N - 1) / 2) / ((N - 1) / 2);
    const len = fang ? 50 : 18 + 10 * mid, w = fang ? 17 : 12, lean = (x - 128) * 0.04;
    const tg = g.createLinearGradient(0, y, 0, y + len); tg.addColorStop(0, '#fffaf0'); tg.addColorStop(1, '#cbbd98');
    g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w * 0.3 + lean * 0.5, y + len * 0.6, x + lean, y + len); g.quadraticCurveTo(x + w * 0.3 + lean * 0.5, y + len * 0.6, x + w / 2, y); g.closePath();
    g.fillStyle = tg; g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(40,20,14,0.7)'; g.stroke();
  }
  spriteCache.set(key, c); return c;
}
/** A little star of a dazed head: four points, white-hot in the middle, gold, with a dark edge and a halo. */
function starSprite(): HTMLCanvasElement {
  const had = spriteCache.get('star'); if (had) return had;
  const c = document.createElement('canvas'); c.width = c.height = 48;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
  gr.addColorStop(0, 'rgba(255,236,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
  const pts = [[24, 5], [28.5, 19.5], [43, 24], [28.5, 28.5], [24, 43], [19.5, 28.5], [5, 24], [19.5, 19.5]];
  g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
  const f = g.createRadialGradient(24, 24, 0, 24, 24, 18); f.addColorStop(0, '#ffffff'); f.addColorStop(0.35, '#fff2b0'); f.addColorStop(1, '#ffc93a');
  g.fillStyle = f; g.fill(); g.lineWidth = 1.4; g.strokeStyle = 'rgba(90,55,0,0.7)'; g.stroke();
  spriteCache.set('star', c); return c;
}
const SMOKE = '#77707f', DUST = '#d9c49c', BOLT = '#a9c4ff';

// the pictures of the techniques (tinted by SkillFx.loadTex) as images the canvas can draw
const imgCache = new Map<string, HTMLImageElement>();
async function texImg(id: string, color: string): Promise<HTMLImageElement | null> {
  const key = `${id}|${color}`, had = imgCache.get(key); if (had) return had;
  const t = await loadTex(id, color); if (!t) return null;
  const im = new Image(); im.src = t.url;
  try { await im.decode(); } catch { return null; }
  imgCache.set(key, im); return im;
}

/** Whether the clip of a Dị Thú can be played (the file exists and the browser can decode it). */
function useClip(src: string): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(false);
    const v = document.createElement('video');
    v.muted = true; v.preload = 'metadata'; v.src = src;
    const on = () => setOk(true), off = () => setOk(false);
    v.addEventListener('loadedmetadata', on); v.addEventListener('error', off);
    return () => { v.removeAttribute('src'); v.load(); };
  }, [src]);
  return ok;
}

export function RaidScene(p: Props) {
  const fx = useFx(), boss = p.boss;
  const calm = fx.level === 'off';
  const stage = useRef<HTMLDivElement>(null), layer = useRef<HTMLDivElement>(null), cvs = useRef<HTMLCanvasElement>(null), loop = useRef<HTMLVideoElement>(null), ult = useRef<HTMLVideoElement>(null);
  const bossBar = useRef<HTMLElement>(null), bossLag = useRef<HTMLElement>(null), bossNum = useRef<HTMLElement>(null), glow = useRef<HTMLDivElement>(null), tint = useRef<HTMLDivElement>(null);
  // the camera (everything on the stage but the HUD: it shakes and reels), the dark sky (behind the cultivators, and a little over them), the glare (over all)
  const cam = useRef<HTMLDivElement>(null), bg = useRef<HTMLImageElement>(null), dark = useRef<HTMLDivElement>(null), dim = useRef<HTMLDivElement>(null), glare = useRef<HTMLDivElement>(null);
  const loopOk = useClip(R.raidArt(boss.id, 'loop')), ultOk = useClip(R.raidArt(boss.id, 'ult'));
  const ultReady = useRef(false); ultReady.current = ultOk;   // read when the great attack comes, so a clip that loads late does not restart the film
  const [banner, setBanner] = useState<{ k: number; text: string; sub?: string; cls: string } | null>(null);
  const [title, setTitle] = useState(false);
  const [rage, setRage] = useState(false);
  const [over, setOver] = useState<null | 'win' | 'flee'>(null);

  // the cast: who is drawn, where each one's spot is
  const fighters = p.mode === 'film' ? p.film.fighters : p.crowd;
  const me = p.mode === 'film' ? p.film.me : p.crowd.findIndex((f) => f.pid === p.meId);
  const shown = useMemo(() => P.shownOf(fighters, me), [fighters, me]);
  const home = useMemo(() => P.formation(boss, shown.map((i) => fighters[i].pid)), [boss, shown, fighters]);
  const slotOf = useMemo(() => { const m = new Map<number, number>(); shown.forEach((i, s) => m.set(i, s)); return m; }, [shown]);
  const body = useRef<(HTMLDivElement | null)[]>([]), fig = useRef<(HTMLDivElement | null)[]>([]), hpBar = useRef<(HTMLElement | null)[]>([]), card = useRef<(HTMLDivElement | null)[]>([]);

  // ---- the film
  useEffect(() => {
    if (p.mode !== 'film') return;
    const film = p.film, from = Math.max(0, p.from), onEnd = p.onEnd;
    const tl = P.timelineOf(film.rounds, shown);
    const low = fx.level === 'low', crowd = shown.length > 14, lvl: 'low' | 'mid' | 'high' = low ? 'low' : fx.level === 'high' ? 'high' : 'mid';
    const elColor = C.EL[boss.el]?.color || '#ffd36e', accent = opposite(elColor), rageColor = '#ff4a3a';
    const keys = film.fighters.map((f) => f.pid);
    let dead = false, raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, f: () => void) => timers.push(setTimeout(() => { if (!dead) f(); }, ms));

    // ---- the size of the stage (it changes when the stage goes full screen)
    let W = P.REF_W, H = P.REF_H, sc = 1, dpr = 1, cardH = 60;
    const aimC = new Map<number, { x: number; y: number }>(), srcC = new Map<number, { x: number; y: number }>();   // per shot, for the size of the stage
    const impC = new Map<number, { x: number; y: number }>(), boltC = new Map<object, { main: number[]; br: number[]; end: { x: number; y: number } }>();
    const ctx = cvs.current?.getContext('2d') || null;
    const measure = () => {
      const st = stage.current; if (!st) return;
      W = st.clientWidth || P.REF_W; H = st.clientHeight || P.REF_H; sc = W / P.REF_W;
      dpr = Math.min(window.devicePixelRatio || 1, low ? 1.25 : 2);
      const c = cvs.current; if (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      const c0 = card.current.find((x) => x); if (c0) cardH = c0.offsetHeight || cardH;
      aimC.clear(); srcC.clear(); impC.clear(); boltC.clear();
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null;
    if (ro && stage.current) ro.observe(stage.current);

    // ---- where things are (pixels of the stage), all from the film's clock
    const bossC = () => ({ x: (boss.at.x / 100) * W, y: (boss.at.y / 100) * H + (boss.at.r / 100) * W * 0.12 });
    const bossR = () => (boss.at.r / 100) * W;
    const aimOf = (q: number) => {
      let a = aimC.get(q);
      if (!a) { const h = hash32(`aim|${q}`), c = bossC(), r = bossR(); a = { x: c.x + (unit(h, 0) - 0.5) * r * 0.9, y: c.y + (unit(h, 10) - 0.5) * r * 0.6 }; aimC.set(q, a); }
      return a;
    };
    const homePx = (s: number) => ({ x: (home[s].x / 100) * W, y: (home[s].y / 100) * H });
    const face = (s: number) => (home[s].x < boss.at.x ? 1 : -1);
    // hit: thrown back hard (KB: how far, a share of the stage's width, for the Dị Thú's strike, sweep, great attack; each missile of a volley before the last pushes a little),
    // tumbling the way it is thrown; then it reels, dazed, stars round its head (DIZZY ms)
    const KB = [0.2, 0.15, 0.27], KB_PELT = 0.055, KB_MAX = 0.34, KB_MS = 1400, DIZZY = [1500, 1100, 2100];
    const bigT = new Map<number, number[]>(), hurtT = new Map<number, [number, number][]>(), dizT = new Map<number, [number, number][]>(), koT = new Map<number, number>();
    const biteT = new Map<number, number>();   // the bitten: when the jaws close on them (they are swallowed, they do not fall)
    const push = <T,>(m: Map<number, T[]>, k: number, v: T) => { let l = m.get(k); if (!l) m.set(k, (l = [])); l.push(v); };
    for (const s of tl.shots) if (s.big && s.i >= 0) push(bigT, s.i, s.t);
    for (const e of tl.events) {
      if (e.k === 'bite') { if (slotOf.has(e.j)) { koT.set(e.j, e.t); biteT.set(e.j, e.t); } continue; }
      if ((e.k !== 'hurt' && e.k !== 'pelt') || !slotOf.has(e.j)) continue;
      push(hurtT, e.j, [e.t, e.k === 'pelt' ? KB_PELT : KB[e.s]]);
      if (e.k === 'hurt') { if (e.ko) koT.set(e.j, e.t); else push(dizT, e.j, [e.t, DIZZY[e.s]]); }
    }
    const knock = (dt: number) => (dt < 0 || dt >= KB_MS ? 0 : dt < 130 ? 1 - (1 - dt / 130) ** 3 : (1 - (dt - 130) / (KB_MS - 130)) ** 2);
    const alive = (i: number, t: number) => { const k = koT.get(i); return k === undefined || k >= t; };
    const near = (list: number[] | undefined, t: number, before: number, after: number, f: (dt: number) => void) => { if (list) for (const x of list) { const dt = t - x; if (dt > -before && dt < after) f(dt); } };
    const enterAt = (s: number) => 1300 + s * Math.min(70, 1800 / Math.max(1, shown.length));
    // a flying cultivator: its loop, surging in at the Dị Thú and falling back at its own pace, a dash as its technique leaves, thrown back when hit;
    // during the clip of the great attack it holds its ground, battered (shaking harder and pushed back as the blast grows), then thrown back as the blow lands
    const novaWin = P.novasOf(tl);
    const surge = new Map<number, [number, number, number, number]>();
    const braceAt = (t: number) => { let w = 0; for (const [a, h] of novaWin) { if (t < a - 300 || t > h + 900) continue; w = Math.max(w, t < a ? (t - a + 300) / 300 : t <= h ? 1 : 1 - (t - h) / 900); } return clamp(w, 0, 1); };
    const flyPx = (s: number, i: number, t: number) => {
      const q = P.flyAt(home[s], keys[i], t);
      let x = (q.x / 100) * W, y = (q.y / 100) * H;
      const c = bossC(), dx = c.x - x, dy = c.y - y, d = Math.hypot(dx, dy) || 1;
      let sg = surge.get(i);
      if (!sg) { const h = hash32(`surge|${keys[i]}`); sg = [2400 + unit(h, 0) * 2000, unit(h, 10) * TAU, unit(h, 20) * TAU, unit(h, 3) * TAU]; surge.set(i, sg); }
      const brace = braceAt(t), wave = Math.sin((TAU * t) / sg[0] + sg[1]);
      const in_ = (wave > 0 ? wave ** 1.4 : wave * 0.55) * W * 0.1 * (1 - brace);   // further in than out
      x += (dx / d) * in_; y += (dy / d) * in_;
      near(bigT.get(i), t, 700, 700, (dt) => { const w = Math.exp(-(((dt - 40) / 230) ** 2)) * W * 0.15; x += (dx / d) * w; y += (dy / d) * w; });
      const hs = hurtT.get(i);
      if (hs) {
        let kb = 0; for (const [h0, amp] of hs) kb += amp * knock(t - h0);
        if (kb > 0) { const k = KB_MAX * Math.tanh(kb / KB_MAX) * W, sd = ((hash32(`kb|${keys[i]}`) & 1) ? 0.35 : -0.35); x -= ((dx - dy * sd) / d) * k; y -= ((dy + dx * sd) / d) * k; }
      }
      if (brace > 0) {
        let u = 0; for (const [a, h] of novaWin) if (t >= a - 300 && t <= h + 900) u = clamp((t - a) / (h - a), 0, 1) * (t > h ? 1 - (t - h) / 900 : 1);
        const back = W * (0.025 + 0.05 * u * u) * brace, amp = W * (0.003 + 0.011 * u) * brace;
        x -= (dx / d) * back; y -= (dy / d) * back;
        x += amp * (Math.sin(t * 0.071 + sg[2]) + 0.6 * Math.sin(t * 0.173 + sg[3]));
        y += amp * 0.7 * (Math.sin(t * 0.089 + sg[3]) + 0.6 * Math.sin(t * 0.211 + sg[2]));
      }
      return { x: clamp(x, W * 0.03, W * 0.97), y: clamp(y, H * 0.2, H * 0.965) };
    };
    // the whole pose at a moment: where, tilt, size, how visible (the fall of the fallen included)
    const poseOf = (s: number, i: number, t: number) => {
      const ko = koT.get(i), tt = ko !== undefined ? Math.min(t, ko) : t;
      const a = flyPx(s, i, tt), b = flyPx(s, i, tt + 50);
      let x = a.x, y = a.y, rot = clamp((b.x - a.x) * 0.9, -18, 18), scale = 1, op = 1;
      const hs = hurtT.get(i), dz = dizT.get(i), sp = -face(s);
      if (hs) for (const [h0, amp] of hs) { const dt = tt - h0; if (dt >= 0 && dt < 900) rot += sp * amp * 170 * Math.sin((Math.PI * dt) / 900); }
      if (dz) for (const [h0, ms] of dz) { const dt = tt - h0; if (dt > 250 && dt < ms) rot += Math.sin((dt - 250) * 0.0125) * 13 * (1 - dt / ms); }
      rot = clamp(rot, -70, 70);
      const e0 = enterAt(s);
      if (t < e0 + 950) {
        const u = clamp((t - e0) / 950, 0, 1), e = 1 - (1 - u) ** 3;
        x += (1 - e) * (home[s].x < 50 ? -40 : 40); y += (1 - e) * H * 0.6; scale = 0.6 + 0.4 * e; op = Math.min(1, u * 2.2);
      }
      const bt = biteT.get(i);
      if (bt !== undefined && t > bt - P.BITE_MS) {
        // drawn in by the Dị Thú (off the edges, a little towards it, so the jaws fit on the stage), trembling in the open jaws; then held where the jaws close
        const u = clamp((Math.min(t, bt) - bt + P.BITE_MS) / P.BITE_MS, 0, 1), e = u < 0.6 ? 0.5 - 0.5 * Math.cos((Math.PI * u) / 0.6) : 1, bc = bossC();
        const tx = clamp(x, W * 0.3, W * 0.7) + (bc.x - x) * 0.12, ty = clamp(y, H * 0.36, H * 0.82);
        x += (tx - x) * e; y += (ty - y) * e;
        if (t <= bt) { x += Math.sin(t * 0.11) * 2.6 * sc * u; y += Math.sin(t * 0.083) * 1.6 * sc * u; }
        else { const v = clamp((t - bt) / 380, 0, 1); scale *= 1 - 0.7 * v; op = 1 - v; rot += 40 * v * -face(s); }   // swallowed
      } else if (ko !== undefined && t > ko) {
        const u = clamp((t - ko) / 850, 0, 1), fy = H * (0.885 + unit(hash32(`floor|${keys[i]}`), 3) * 0.05), f = face(s);
        x += f * W * 0.04 * u; y += (fy - y) * u * u;
        const after = t - ko - 850; if (after > 0 && after < 300) y -= Math.sin((Math.PI * after) / 300) * H * 0.012;
        rot = -f * 96 * (1 - (1 - u) ** 2); op = 1 - 0.15 * u;
      } else if (film.win && t > tl.outro + 700) {
        const u = clamp((t - tl.outro - 700) / 1500, 0, 1); y -= H * 0.05 * (1 - (1 - u) ** 2);
      }
      return { x, y, rot, scale, op };
    };
    // where a cultivator's chest is (for this frame's time it is worked out once: move() fills it)
    let nowT = NaN; const nowC = new Map<number, { x: number; y: number }>();
    const chestAt = (i: number, t: number) => {
      const s = slotOf.get(i); if (s === undefined) return null;
      if (t === nowT) { const c = nowC.get(i); if (c) return c; }
      const q = poseOf(s, i, t), c = { x: q.x, y: q.y - cardH * 0.42 };
      if (t === nowT) nowC.set(i, c);
      return c;
    };

    // ---- the numbers, banners, hits (DOM)
    // the screen shakes: random jolts that die away (steady: a rumble that keeps its strength); a weaker shake does not cut into a stronger one still running
    let shakeTill = 0, shakeAmp = 0, swayTill = 0;
    const still = calm || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const shake = (amp: number, ms = 360, steady = false) => {
      const st = cam.current; if (low || still || !st) return;
      const now = performance.now(); if (now < shakeTill && amp < shakeAmp * 0.8) return;
      shakeTill = now + ms * 0.6; shakeAmp = amp;
      const n = Math.max(5, Math.round(ms / 50)), kf: Keyframe[] = [];
      for (let k = 0; k <= n; k++) {
        const u = k / n, a = k === 0 || k === n ? 0 : amp * (steady ? 0.75 + 0.25 * Math.random() : (1 - u) ** 1.3 + 0.06), ang = Math.random() * TAU;
        kf.push({ transform: `translate(${(Math.cos(ang) * a).toFixed(1)}px, ${(Math.sin(ang) * a * 0.8).toFixed(1)}px) rotate(${((Math.random() - 0.5) * a * 0.06).toFixed(2)}deg) scale(${(1 + a / Math.max(200, W)).toFixed(3)})` });
      }
      st.animate(kf, { duration: ms, easing: 'linear' });
    };
    // dazed: the whole view reels (tilts one way, then the other, drifting, a little larger so no edge shows) and the lair blurs and its colours swim
    const sway = (ms: number, deg: number) => {
      const c = cam.current; if (low || still || !c) return;
      const now = performance.now(); if (now < swayTill) return; swayTill = now + ms * 0.7;
      const n = 8, kf: Keyframe[] = [];
      for (let k = 0; k <= n; k++) {
        const u = k / n, e = k === 0 || k === n ? 0 : Math.sin(u * Math.PI) ** 0.6, sd = k % 2 ? 1 : -1;
        kf.push({ rotate: `${(sd * deg * e * (0.7 + 0.3 * Math.random())).toFixed(2)}deg`, translate: `${(-sd * 1.6 * e).toFixed(2)}% ${(Math.sin(u * TAU * 1.5) * 0.9 * e).toFixed(2)}%`, scale: `${(1 + 0.07 * e).toFixed(3)}` });
      }
      c.animate(kf, { duration: ms, easing: 'ease-in-out' });
      const swim: Keyframe[] = [{ filter: 'blur(0px) saturate(1) hue-rotate(0deg)' }, { filter: `blur(${(deg * 1.3).toFixed(1)}px) saturate(1.6) hue-rotate(-16deg)`, offset: 0.22 }, { filter: 'blur(0.8px) saturate(1.25) hue-rotate(8deg)', offset: 0.6 }, { filter: 'blur(0px) saturate(1) hue-rotate(0deg)' }];
      for (const el of [bg.current, loop.current]) el?.animate(swim, { duration: ms * 0.85, easing: 'ease-out' });
    };
    const pop = (text: string, q: { x: number; y: number }, cls: string, color: string) => {
      const l = layer.current; if (!l) return;
      const el = document.createElement('span');
      el.className = `rdNum ${cls}`; el.textContent = text; el.style.left = `${q.x}px`; el.style.top = `${q.y}px`; el.style.setProperty('--c', color);
      l.appendChild(el);
      const dx = (Math.random() - 0.5) * 40, big = cls.includes('crit') ? 1.3 : cls.includes('big') ? 1.4 : cls.includes('tiny') ? 0.7 : 1;
      const a = el.animate([
        { opacity: 0, transform: 'translate(-50%, 6px) scale(0.5)' },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.2}px), -12px) scale(${1.15 * big})`, offset: 0.15 },
        { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.7}px), -34px) scale(${big})`, offset: 0.62 },
        { opacity: 0, transform: `translate(calc(-50% + ${dx}px), -48px) scale(${0.9 * big})` },
      ], { duration: cls.includes('tiny') ? 800 : cls.includes('big') ? 1900 : 1150, easing: 'ease-out' });
      a.onfinish = () => el.remove(); a.oncancel = () => el.remove();
    };
    const bossHit = (color: string, crit: boolean) => {
      const g = glow.current; if (!g) return;
      g.style.setProperty('--c', color);
      g.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.6)' }, { opacity: crit ? 0.9 : 0.5, transform: 'translate(-50%,-50%) scale(1)', offset: 0.2 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.25)' }], { duration: 420, easing: 'ease-out' });
      if (loop.current && !low) loop.current.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${crit ? 9 : 4}px,${crit ? -3 : -1}px)` }, { transform: `translate(${crit ? -5 : -2}px,1px)` }, { transform: 'translate(0,0)' }], { duration: crit ? 220 : 160 });
    };
    const say = (text: string, cls: string, sub?: string) => setBanner({ k: Math.random(), text, cls, sub });

    // ---- the state at the start, and the moments still to come
    const s0 = P.stateAt(film.max, film.fighters, tl, from);
    let hp = s0.hp, lag = s0.hp, shownHp = -1, numAt = 0;
    const fhp = s0.fhp.slice(), down = s0.down.slice();
    const setF = (i: number, v: number) => {
      fhp[i] = Math.max(0, v);
      const s = slotOf.get(i); if (s === undefined) return;
      const el = hpBar.current[s]; if (el) el.style.width = `${(fhp[i] / Math.max(1, film.fighters[i].hp)) * 100}%`;
    };
    film.fighters.forEach((_, i) => setF(i, fhp[i]));
    shown.forEach((i, s) => { card.current[s]?.classList.toggle('ko', down[i]); card.current[s]?.classList.toggle('eaten', (biteT.get(i) ?? Infinity) <= from); });
    if (bossBar.current) bossBar.current.style.transition = 'none';
    if (bossLag.current) bossLag.current.style.transition = 'none';
    setRage(s0.rage); setTitle(from < P.INTRO_MS - 900); setOver(null);
    if (loop.current) { loop.current.style.opacity = ''; loop.current.style.filter = ''; }
    if (from >= tl.outro) { if (loop.current) loop.current.style.opacity = '0'; setOver(film.win ? 'win' : 'flee'); }
    const after = <T extends { t: number }>(list: T[], key: (x: T) => number) => { let n = 0; while (n < list.length && key(list[n]) <= from) n++; return n; };
    let ei = after(tl.events, (e) => e.t), si = after(tl.shots, (s) => s.t);
    const bigLand = tl.shots.filter((s) => s.big && s.i >= 0).sort((a, b) => a.land - b.land);
    let bi = after(bigLand, (s) => s.land);
    let firstHurt = -1, novaAt = -1e9, titleOff = from >= P.INTRO_MS - 900, outroDone = from >= tl.outro, ended = false;
    // with many on the stage (or effects set low) only some techniques get their full picture; the others are the glowing orb only. The same ones on every screen.
    const plain = (s: P.Shot) => (low || crowd) && s.i !== film.me && s.q % (low ? 3 : 2) !== 0;

    const apply = (e: P.FilmEvent, live: boolean) => {
      switch (e.k) {
        case 'hit': {
          hp = Math.max(0, hp - e.d);
          if (!live) break;
          const f = film.fighters[e.i], mine = e.i === film.me;
          if (e.big) {
            const color = fxOfSkill(f, 0).color, c = bossC(), r = bossR(), j = { x: c.x + (Math.random() - 0.5) * r * 0.9, y: c.y + (Math.random() - 0.5) * r * 0.4 };
            pop(e.c ? `Bạo kích ${shortNum(e.d)}` : shortNum(e.d), j, `blow ${e.c ? 'crit ' : ''}${mine ? 'mine' : ''}`, mine ? '#ffe08a' : C.EL[f.el]?.color || color);
            bossHit(C.EL[f.el]?.color || color, !!e.c);
            shake(e.c ? 8 : 3, e.c ? 340 : 200);
          } else if (mine && e.d > 0) { const c = bossC(), r = bossR(); pop(shortNum(e.d), { x: c.x + (Math.random() - 0.5) * r, y: c.y + (Math.random() - 0.2) * r * 0.5 }, 'tiny mine', '#ffe08a'); }
          break;
        }
        case 'off': {
          hp = Math.max(0, hp - e.d);
          if (live && e.sum !== undefined) { const c = bossC(); pop(`${e.n} tu sĩ khác  ${shortNum(e.sum)}`, { x: c.x, y: c.y + bossR() * 0.55 }, 'off', '#f1e3b0'); }
          break;
        }
        case 'cast': {
          if (!live || down[e.i]) break;
          const f = film.fighters[e.i], { fx: rec, color, s } = fxOfSkill(f, e.a.k), q = chestAt(e.i, e.t), l = layer.current; if (!q || !l) break;
          const tgt = e.a.t !== undefined ? chestAt(e.a.t, e.t + P.HEAL_MS) || q : e.a.f === 'stun' || e.a.f === 'atkDown' || e.a.f === 'defDown' ? bossC() : q;
          playSkill({ layer: l, fx: rec, color, from: q, to: tgt, k: 1, level: lvl, crit: false, scale: 1.5 });
          if (e.a.f !== 'heal') later(P.HEAL_MS, () => pop(s.name, tgt, 'buff', color));
          break;
        }
        case 'heal': {
          const gain = e.h - fhp[e.j]; setF(e.j, e.h);
          if (live && gain > 0) { const q = chestAt(e.j, e.t); if (q) pop(`+${shortNum(gain)}`, q, 'heal', '#8ee6a8'); }
          break;
        }
        case 'hurt': {
          setF(e.j, e.h);
          const s = slotOf.get(e.j);
          if (e.ko) { down[e.j] = true; if (s !== undefined) card.current[s]?.classList.add('ko'); }
          if (!live || s === undefined) break;
          const q = chestAt(e.j, e.t);
          if (q) pop(shortNum(e.d), { x: q.x, y: q.y - cardH * 0.25 }, `hurt${e.j === film.me ? ' mine' : ''}`, '#ff6a5c');
          fig.current[s]?.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.8) saturate(0.3)', offset: 0.15 }, { filter: 'brightness(1)' }], { duration: 380, easing: 'ease-out' });
          if (firstHurt !== e.t && e.t - firstHurt > 900) { firstHurt = e.t; shake(e.s === 2 ? 26 : e.s === 1 ? 15 : 12, e.s === 2 ? 1300 : e.s === 1 ? 640 : 500); }
          if (e.s === 2 && e.t - novaAt > 3000) { novaAt = e.t; sway(2600, 2.4); sfx('thunder'); }
          else if (e.j === film.me && !e.ko) sway(1500, 1.4);
          if (e.ko && e.j === film.me) sfx('fail');
          break;
        }
        case 'pelt': {
          setF(e.j, Math.min(fhp[e.j], e.h));
          const s = slotOf.get(e.j);
          if (live && s !== undefined && !crowd) fig.current[s]?.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(2.1) saturate(0.5)', offset: 0.2 }, { filter: 'brightness(1)' }], { duration: 220, easing: 'ease-out' });
          break;
        }
        case 'tele': {
          if (!live) break;
          const sk = boss.skills[e.s];
          if (!e.rage) say(sk.name, e.s === 2 ? 'ult' : 'skill');
          const g = glow.current;
          if (g) { g.style.setProperty('--c', elColor); g.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(0.4)' }, { opacity: 0.85, transform: 'translate(-50%,-50%) scale(1.15)', offset: 0.85 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.4)' }], { duration: 1100, easing: 'ease-in' }); }
          tint.current?.animate([{ opacity: 0 }, { opacity: 0.5, offset: 0.7 }, { opacity: 0 }], { duration: 1500, easing: 'ease-in-out' });
          sfx(e.s === 2 ? 'thunder' : 'whoosh');
          if (e.g) later(1000, () => pop('Hộ thể', bossC(), 'buff', '#9ad0ff'));
          break;
        }
        case 'ult': {
          // its own clip over the whole stage (it starts on the very picture of the loop, so the cut is invisible); without it, a flash and a hard shake
          if (!live) break;
          const v = ult.current;
          shake(5, P.ULT_MS - 300, true);   // the ground rumbles under the clip
          if (!v || !ultReady.current || low) { fx.flash('gold'); shake(14, 800); break; }
          v.currentTime = 0; void v.play().catch(() => {});
          v.animate([{ opacity: 0 }, { opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.92 }, { opacity: 0 }], { duration: P.ULT_MS + 400, fill: 'both' });
          break;
        }
        case 'rage': {
          setRage(true);
          if (live) { say(`${boss.name} cuồng nộ!`, 'rage', 'Đạn dày hơn, sát thương tăng mạnh'); sfx('thunder'); shake(18, 1000); sway(1900, 1.5); }
          break;
        }
        case 'bite': {
          setF(e.j, 0); down[e.j] = true;
          const s = slotOf.get(e.j), f = film.fighters[e.j], mine = e.j === film.me;
          if (s !== undefined) card.current[s]?.classList.add('ko', 'eaten');
          if (!live) break;
          const q = s !== undefined ? chestAt(e.j, e.t) : null;
          // the banner on the other half of the stage from the jaws
          say(`${boss.name} cạp chết ${f.name}`, `bite ${q && q.y < H * 0.55 ? 'lo' : 'hi'}`, mine ? 'Bạn bị nuốt chửng trong một ngụm' : 'Một ngụm, không kịp trở tay');
          shake(26, 900); sway(1400, 1.8); sfx('gong'); if (mine) sfx('fail');
          if (q) pop('CẠP!', { x: q.x, y: q.y - cardH * 0.55 }, 'bite', '#ff3b30');
          break;
        }
        case 'stun': {
          if (!live) break;
          say(`${boss.name} choáng váng`, 'stun', 'Ngừng xả đạn một lúc');
          const l = layer.current; if (l) playSkill({ layer: l, fx: { m: 'aura', tex: 'swirl', size: 160 }, color: '#ffe27a', from: bossC(), to: bossC(), k: 1.2, level: 'mid', crit: false, scale: 1.4 });
          break;
        }
      }
    };
    // a technique leaves (from a cultivator: those that fly) or lands (those that appear on the Dị Thú)
    const release = (s: P.Shot, landing: boolean) => {
      const f = film.fighters[s.i], { fx: rec, color } = fxOfSkill(f, s.k), l = layer.current, slot = slotOf.get(s.i);
      if (!landing && slot !== undefined) { const c0 = card.current[slot]; c0?.classList.add('act'); later(650, () => c0?.classList.remove('act')); }
      if (!l || plain(s) || FLYING.has(rec.m) === landing) return;
      const to = aimOf(s.q), from0 = landing ? to : chestAt(s.i, s.t) || to;
      playSkill({ layer: l, fx: rec, color, from: from0, to, k: 0.85, level: lvl, crit: !!s.c, scale: (s.c ? 1.3 : 1.75) * (FLYING.has(rec.m) ? 1 : HIT_FX) });
    };
    const outro = (live: boolean) => {
      const v = loop.current;
      if (!live) { if (v) v.style.opacity = '0'; setOver(film.win ? 'win' : 'flee'); return; }
      if (film.win) {
        hp = 0; sfx('levelup'); shake(22, 1500);
        const a = bossC(), sr = stage.current?.getBoundingClientRect();
        if (sr) { const x = sr.left + a.x, y = sr.top + a.y; fx.ring({ x, y, color: '#fff3c4', size: 200 }); fx.burst({ x, y, kind: 'gold', count: 40 }); later(600, () => fx.burst({ x, y, kind: 'qi', color: elColor, count: 30 })); }
        v?.animate([{ filter: 'brightness(1) blur(0)', opacity: 1 }, { filter: 'brightness(2.6) blur(0)', opacity: 1, offset: 0.35 }, { filter: 'brightness(3.2) blur(6px)', opacity: 0 }], { duration: 2600, easing: 'ease-in', fill: 'forwards' });
        later(1400, () => { setOver('win'); say('Đại thắng', 'win', `${boss.name} đã bị trảm`); });
      } else {
        sfx('fail');
        v?.animate([{ opacity: 1, transform: 'translateY(0) scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'translateY(-6%) scale(0.92)', filter: 'blur(8px)' }], { duration: 2800, easing: 'ease-in', fill: 'forwards' });
        later(1200, () => { setOver('flee'); say(`${boss.name} trốn thoát`, 'flee', 'Hẹn trận sau'); });
      }
    };

    // ---- the pictures every bullet and technique needs (one that is late is drawn as a plain orb)
    const tex: Record<string, HTMLImageElement | null> = {};
    const want = (key: string, id: string, color: string) => { void texImg(id, color).then((im) => { tex[key] = im; }); };
    boss.skills.forEach((s, n) => want(`b${n}`, s.fx.tex, elColor));
    want('star', 'burst_star', elColor); want('ring', 'shock_ring', elColor);
    const recs = new Map<string, Promise<unknown>>();
    for (const i of shown) film.fighters[i].skills.forEach((_, k) => { const { fx: r, color } = fxOfSkill(film.fighters[i], k); const key = `${r.tex}|${color}`; if (!recs.has(key)) recs.set(key, warmFx(r, color)); });
    void Promise.race([Promise.all(recs.values()), sleep(2500)]);
    const novas = tl.rounds.filter((r) => r.ult !== null && r.hits).map((r) => r.hits![0]);
    const colorOf = new Map<number, string>();
    const shotColor = (s: P.Shot) => { if (s.i < 0) return '#f1e3b0'; const key = s.i * 16 + s.k; let c = colorOf.get(key); if (!c) { c = fxOfSkill(film.fighters[s.i], s.k).color; colorOf.set(key, c); } return c; };

    // ---- the sky of the fight: when the Dị Thú gathers a technique the sky goes dark and smoke swirls round it, lightning strikes (round it, on the ones its blows hit,
    // all over the stage under its great attack, now and then once it rages), blows blind the eye with glare. All of it from the film's clock, like the rest.
    type Beat = { s: 0 | 1 | 2; tele: number; a: number; b: number /* its blows land from a to b */ };
    type Bolt = { t: number; h: number; x0: number; to: { x: number; y: number } | number /* a point (shares of the stage) or a fighter */ };
    const beats: Beat[] = [], bolts: Bolt[] = [], flashes: [number, number, number][] = [], darkW: [number, number, number][] = [];
    const BOLT_MS = 300, rnd = (k: string) => unit(hash32(k), 0);
    const ground = (k: string) => ({ x: 0.06 + rnd(`gx|${k}`) * 0.88, y: 0.6 + rnd(`gy|${k}`) * 0.34 });
    const nearBoss = (k: string) => ({ x: (boss.at.x + (rnd(`nx|${k}`) - 0.5) * boss.at.r * 1.3) / 100, y: (boss.at.y + (rnd(`ny|${k}`) - 0.3) * boss.at.r * 0.6) / 100 });
    const strike = (t: number, k: string, to: Bolt['to']) => bolts.push({ t: Math.round(t), h: hash32(`bolt|${k}`), x0: 0.08 + rnd(`bx|${k}`) * 0.84, to });
    for (const seg of tl.rounds) {
      if (seg.tele === null || !seg.hits) continue;
      const te = tl.events.find((e) => e.k === 'tele' && e.t === seg.tele);
      if (te && te.k === 'tele') beats.push({ s: te.s, tele: seg.tele, a: seg.hits[0], b: seg.hits[1] });
    }
    for (const bt of beats) {
      const nova = bt.s === 2;
      darkW.push([bt.tele, bt.b + 500, nova ? 0.8 : 0.66]);
      strike(bt.tele + 140, `t1|${bt.tele}`, nearBoss(`a|${bt.tele}`)); strike(bt.tele + 520, `t2|${bt.tele}`, nearBoss(`b|${bt.tele}`));
      if (nova) {
        for (let x = bt.tele + 950, k = 0; x < bt.a - 150; x += 340, k++) strike(x + rnd(`nj|${bt.tele}|${k}`) * 120, `n|${bt.tele}|${k}`, ground(`n|${bt.tele}|${k}`));
        shown.filter((i) => alive(i, bt.a)).slice(0, 6).forEach((i, k) => strike(bt.a + k * 70, `nh|${bt.tele}|${i}`, i));
        flashes.push([bt.a, 0.95, 1200]);
      } else {
        tl.bshots.filter((x) => x.last && x.land >= bt.a && x.land <= bt.b).slice(0, bt.s === 0 ? 6 : 3).forEach((x) => strike(x.land - 40, `h|${x.land}|${x.j}`, x.j));
        flashes.push([bt.a, bt.s === 0 ? 0.3 : 0.38, 320]);
      }
    }
    if (tl.rageAt !== null) {
      const r0 = tl.rageAt;
      darkW.push([r0, tl.outro, 0.3]); flashes.push([r0, 0.6, 600]);
      for (let k = 0; k < 4; k++) strike(r0 + k * 170, `r|${k}`, ground(`r|${k}`));
      for (let x = r0 + 1800, k = 0; x < tl.outro - 300; x += 2000 + rnd(`ra|${k}`) * 1600, k++) strike(x, `ra|${k}`, ground(`ra|${k}`));
    }
    for (const e of tl.events) if (e.k === 'hurt' && e.j === film.me) flashes.push([e.t, 0.32, 260]);
    if (film.win) flashes.push([tl.outro, 0.9, 1700]);
    bolts.sort((a, b) => a.t - b.t);
    // lightning flickers: on, off, on again, fading
    const flick = (v: number) => (v < 0.22 || (v > 0.36 && v < 0.6) || (v > 0.74 && v < 0.84) ? 1 : 0.15) * (1 - v * 0.4);
    let boltFrom = 0, bsFrom = 0, darkShown = -1, dimShown = -1, glareShown = -1;
    const setOp = (el: HTMLElement | null, v: number, was: number) => { if (el && Math.abs(v - was) > 0.008) { el.style.opacity = v < 0.01 ? '0' : v.toFixed(3); return v; } return was; };
    const sky = (t: number) => {
      let dk = 0, gl = 0, lit = 0;
      for (const [a, b, l] of darkW) if (t >= a && t <= b + 800) dk = Math.max(dk, l * (t < a + 500 ? (t - a) / 500 : t <= b ? 1 : 1 - (t - b) / 800));
      for (const [a, peak, ms] of flashes) { const v = (t - a) / ms; if (v >= 0 && v < 1) gl += peak * (1 - v) ** 2; }
      while (boltFrom < bolts.length && bolts[boltFrom].t + BOLT_MS < t) boltFrom++;
      for (let n = boltFrom; n < bolts.length && bolts[n].t <= t; n++) { const f = flick((t - bolts[n].t) / BOLT_MS); lit = Math.max(lit, f); gl += 0.2 * f; }
      dk *= 1 - 0.7 * lit;
      if (t > tl.outro) dk *= clamp(1 - (t - tl.outro) / 900, 0, 1);
      darkShown = setOp(dark.current, dk, darkShown); dimShown = setOp(dim.current, dk * 0.42, dimShown);
      glareShown = setOp(glare.current, still ? 0 : Math.min(0.96, gl), glareShown);
    };
    // where a missile hit its target (fixed once it has landed)
    const impactOf = (n: number) => { let q = impC.get(n); if (!q) { const b = tl.bshots[n], c = chestAt(b.j, b.land); if (!c) return null; q = c; impC.set(n, q); } return q; };
    // a homing missile of the Dị Thú: it leaves thrown out to one side (some back over the Dị Thú), then turns and runs its target down: a curve that ends wherever the target is
    const swing = new Map<P.BossShot, [number, number]>();
    const missileAt = (b: P.BossShot, u: number, dst: { x: number; y: number }) => {
      let m = swing.get(b);
      if (!m) { const h = hash32(`ms|${b.land}|${b.j}|${b.v}`); m = [((h & 1) ? 1 : -1) * (0.3 + unit(h, 3) * 0.75), unit(h, 13) * 0.45]; swing.set(b, m); }
      const c = bossC(), dx = dst.x - c.x, dy = dst.y - c.y;
      const px = c.x - dx * m[1] - dy * m[0] * 0.8, py = c.y - dy * m[1] + dx * m[0] * 0.8;
      const e = u ** 1.3, o = 1 - e;
      return { x: o * o * c.x + 2 * o * e * px + e * e * dst.x, y: o * o * c.y + 2 * o * e * py + e * e * dst.y };
    };
    const boltOf = (b: Bolt) => {
      let p = boltC.get(b); if (p) return p;
      const end = typeof b.to === 'number' ? chestAt(b.to, b.t) || bossC() : { x: b.to.x * W, y: b.to.y * H };
      const x0 = b.x0 * W, y0 = -0.03 * H, n = 10, main: number[] = [], br: number[] = [];
      for (let k = 0; k <= n; k++) { const u = k / n, j = k === 0 || k === n ? 0 : (unit(hash32(`${b.h}|${k}`), 0) - 0.5) * W * 0.09; main.push(x0 + (end.x - x0) * u + j, y0 + (end.y - y0) * u); }
      const kb = 3 + (b.h % 4), side = (b.h >>> 4) & 1 ? 1 : -1;
      let bx = main[kb * 2], by = main[kb * 2 + 1]; br.push(bx, by);
      for (let k = 1; k <= 4; k++) { const h = hash32(`${b.h}|br|${k}`); bx += side * (0.02 + unit(h, 0) * 0.035) * W; by += (0.03 + unit(h, 10) * 0.03) * H; br.push(bx, by); }
      p = { main, br, end }; boltC.set(b, p); return p;
    };
    const line = (pts: number[]) => { if (!ctx) return; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.stroke(); };

    // ---- the canvas: one frame
    const put = (img: CanvasImageSource, x: number, y: number, ang: number, w: number, h: number) => {
      if (!ctx || x < -w || x > W + w || y < -w || y > H + w) return;
      const c = Math.cos(ang) * dpr, s = Math.sin(ang) * dpr;
      ctx.setTransform(c, s, -s, c, x * dpr, y * dpr);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    };
    const WAVE0 = P.INTRO_MS - 600, LIFE = 4600;
    const draw = (t: number) => {
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      const c = bossC(), r = bossR(), fade = t > tl.outro ? clamp(1 - (t - tl.outro) / 500, 0, 1) : 1;
      // ---- light (added): the cultivators' bolts, the carriers of their techniques, the trails of the Dị Thú's blows, the flashes
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      // the cultivators' bolts (the shots list is in leaving order; a bolt flies at most ~0.6 s)
      let n0 = si; while (n0 > 0 && tl.shots[n0 - 1].t > t - 900) n0--;
      for (let n = n0; n < tl.shots.length; n++) {
        const s = tl.shots[n]; if (s.t > t) break;
        if (s.t > tl.outro) break;
        const big = !!s.big && s.i >= 0;
        if (big && FLYING.has(fxOfSkill(film.fighters[s.i], s.k).fx.m) && !plain(s)) continue;   // SkillFx draws it
        const color = shotColor(s), g = glowSprite(color), dst = aimOf(s.q);
        if (t > s.land) {   // the spark on the Dị Thú
          const v = (t - s.land) / (big ? 320 : 200); if (v >= 1) continue;
          ctx.globalAlpha = (1 - v) * 0.9; const z = (big ? 40 + 90 * v : 14 + 34 * v) * sc * HIT_FX; put(g, dst.x, dst.y, 0, z, z); ctx.globalAlpha = 1;
          continue;
        }
        let src = srcC.get(s.q);
        if (!src) { src = s.i >= 0 ? (chestAt(s.i, s.t) || dst) : { x: (0.06 + unit(hash32(`off|${s.q}`), 0) * 0.88) * W, y: H * 1.04 }; srcC.set(s.q, src); }
        const u = (t - s.t) / (s.land - s.t), dx = dst.x - src.x, dy = dst.y - src.y, d = Math.hypot(dx, dy) || 1;
        const side = ((s.q & 1) ? 1 : -1) * (big ? 34 : 16) * sc * Math.sin(Math.PI * u);
        const x = src.x + dx * u + (-dy / d) * side, y = src.y + dy * u + (dx / d) * side, ang = Math.atan2(dy, dx);
        if (big) {
          for (let k = 4; k >= 1; k--) { const uu = Math.max(0, u - k * 0.05), sd = ((s.q & 1) ? 1 : -1) * 34 * sc * Math.sin(Math.PI * uu); ctx.globalAlpha = 0.5 - k * 0.1; const z = (40 - k * 5) * sc; put(g, src.x + dx * uu + (-dy / d) * sd, src.y + dy * uu + (dx / d) * sd, 0, z, z); }
          ctx.globalAlpha = 1; put(g, x, y, 0, 56 * sc, 56 * sc); put(g, x, y, 0, 26 * sc, 26 * sc);
        } else {
          const mine = s.i === film.me, len = (mine ? 40 : 32) * sc, wid = (mine ? 12 : 10) * sc;
          put(g, x - Math.cos(ang) * len * 0.45, y - Math.sin(ang) * len * 0.45, ang, len * 1.6, wid * 0.8);   // the trail
          put(mine ? glowSprite('#ffe08a') : g, x, y, ang, len, wid);
        }
      }
      if (srcC.size > 400) srcC.clear();
      // the muzzle of the Dị Thú flashes with each wave
      const wNow = Math.floor((t - WAVE0) / P.WAVE_MS), teNow = WAVE0 + wNow * P.WAVE_MS;
      if (wNow >= 0 && teNow <= tl.outro && !P.pausedAt(tl, teNow) && t - teNow < 220) { ctx.globalAlpha = (1 - (t - teNow) / 220) * 0.8 * fade; const z = r * 1.1; put(glowSprite(elColor), c.x, c.y, 0, z, z); ctx.globalAlpha = 1; }
      // the great attack lands: a ring of force sweeps the whole stage
      for (const nt of novas) { const v = (t - nt) / 750; if (v < 0 || v >= 1) continue; const z = (0.3 + v * 2.6) * W; ctx.globalAlpha = 1 - v; const im = tex.ring; if (im) put(im, c.x, c.y, 0, z, z); else put(glowSprite(elColor), c.x, c.y, 0, z * 0.6, z * 0.6); ctx.globalAlpha = 1; }
      // the clip of the great attack: its power swirls round every cultivator still standing, stronger as the blast grows
      for (const [a, hh] of novaWin) {
        if (t < a || t > hh + 250) continue;
        const u = clamp((t - a) / (hh - a), 0, 1), g = glowSprite(elColor), g2 = glowSprite(accent), b = Math.floor(t / 90);
        for (let s = 0; s < shown.length; s++) {
          const i = shown[s], k = koT.get(i); if (k !== undefined && k <= t) continue;
          const q = chestAt(i, t); if (!q) continue;
          const h = hash32(`eng|${s}|${b}`), z = (42 + 70 * u + unit(h, 0) * 22) * sc;
          ctx.globalAlpha = (0.3 + 0.6 * u) * (0.75 + unit(h, 10) * 0.25);
          put(g, q.x + (unit(h, 3) - 0.5) * 16 * sc, q.y + (unit(h, 13) - 0.5) * 22 * sc, 0, z, z);
          if ((!low && !crowd) || (s & 1) === 0) { ctx.globalAlpha *= 0.8; put(g2, q.x + (unit(h, 6) - 0.5) * 26 * sc, q.y + cardH * 0.2 + (unit(h, 16) - 0.5) * 18 * sc, 0, z * 0.55, z * 0.55); }
          if (u > 0.45 && tex.star && (unit(h, 8) < u - 0.3)) { ctx.globalAlpha = 0.55 * u; put(tex.star, q.x + (unit(h, 9) - 0.5) * 20 * sc, q.y + (unit(h, 19) - 0.5) * 24 * sc, unit(h, 4) * TAU, z * 0.8, z * 0.8); }   // the blast already bites
        }
        ctx.globalAlpha = 1;
      }
      // a fallen cultivator hits the ground: a puff of dust
      for (const [i, k] of koT) {
        if (biteT.has(i)) continue;
        const v = (t - k - 820) / 520; if (v < 0 || v >= 1) continue;
        const s = slotOf.get(i); if (s === undefined) continue;
        const q = poseOf(s, i, k + 850), z = (50 + 70 * v) * sc;
        ctx.globalAlpha = (1 - v) * 0.55; put(glowSprite('#d8dde6'), q.x, q.y - cardH * 0.1, 0, z * 1.6, z * 0.55); ctx.globalAlpha = 1;
      }
      // the Dị Thú's homing missiles: their trails of light, and their flashes on the targets (the last of a volley bursts in a star)
      while (bsFrom < tl.bshots.length && tl.bshots[bsFrom].t + 2800 < t) bsFrom++;
      for (let n = bsFrom; n < tl.bshots.length; n++) {
        const b = tl.bshots[n]; if (b.t > t) break;
        const big = !!b.last, g = glowSprite(b.s === 2 ? accent : elColor);
        if (t > b.land) {
          const v = (t - b.land) / (big ? 380 : 240); if (v >= 1) continue;
          const q = impactOf(n); if (!q) continue;
          ctx.globalAlpha = 1 - v;
          if (big) { const z = (78 + 90 * v) * sc, im = tex.star; if (im) put(im, q.x, q.y, v * 0.6, z, z); else put(g, q.x, q.y, 0, z, z); }
          else { const z = (34 + 50 * v) * sc; put(g, q.x, q.y, 0, z, z); }
          continue;
        }
        const dst = chestAt(b.j, t); if (!dst) continue;
        const u = (t - b.t) / (b.land - b.t), nT = big ? 5 : low ? 1 : 3;
        for (let k = nT; k >= 1; k--) { const q = missileAt(b, Math.max(0, u - k * 0.045), dst); ctx.globalAlpha = big ? 0.55 - k * 0.09 : 0.5 - k * 0.13; const z = (big ? 46 - k * 5 : 28 - k * 4) * sc; put(g, q.x, q.y, 0, z, z); }
        if (!big) { const q = missileAt(b, u, dst); ctx.globalAlpha = 0.9; put(g, q.x, q.y, 0, 32 * sc, 32 * sc); }
      }
      ctx.globalAlpha = 1;
      // lightning: a jagged bolt from above with a fork, three strokes (a wide glow, the bolt, a white-hot core), flickering; a burst of light where it strikes
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let n = boltFrom; n < bolts.length; n++) {
        const b = bolts[n]; if (b.t > t) break;
        const v = (t - b.t) / BOLT_MS; if (v >= 1 || v < 0) continue;
        const f = flick(v), p = boltOf(b);
        for (const [w, col, a] of [[11, rgba(BOLT, 0.3), 1], [4.4, rgba(BOLT, 0.85), 1], [1.8, '#ffffff', 1]] as [number, string, number][]) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = a * f; ctx.strokeStyle = col;
          ctx.lineWidth = w * sc; line(p.main); ctx.lineWidth = w * sc * 0.55; line(p.br);
        }
        ctx.globalAlpha = f * 0.9; const z = (120 - 40 * v) * sc; put(glowSprite(BOLT), p.end.x, p.end.y, 0, z, z * 0.75);
      }
      ctx.globalAlpha = 1;
      // ---- smoke and dust (painted over)
      ctx.globalCompositeOperation = 'source-over';
      const smoke = puffSprite(SMOKE), dust = puffSprite(DUST), few = low || crowd;
      // the Dị Thú gathers a technique: dark smoke swirls in round it
      for (const bt of beats) {
        if (t < bt.tele || t > bt.a + 400) continue;
        const u = clamp((t - bt.tele) / Math.max(1, bt.a - bt.tele), 0, 1), fa = Math.min(1, (t - bt.tele) / 300) * (t > bt.a ? 1 - (t - bt.a) / 400 : 1);
        for (let k = 0; k < (low ? 5 : 9); k++) {
          const h = hash32(`ts|${bt.tele}|${k}`), a = unit(h, 0) * TAU + (t - bt.tele) * 0.0011 * (k & 1 ? 1 : -1), rr = r * (1.05 - 0.4 * u) * (0.75 + unit(h, 10) * 0.4), z = (80 + unit(h, 20) * 60) * sc;
          ctx.globalAlpha = 0.5 * fa; put(smoke, c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.7, a, z, z * 0.8);
        }
      }
      for (let n = bsFrom; n < tl.bshots.length; n++) {
        const b = tl.bshots[n]; if (b.t > t) break;
        if (t <= b.land) {   // a missile in flight leaves a trail of smoke
          if (low) continue;
          const dst = chestAt(b.j, t); if (!dst) continue;
          const u = (t - b.t) / (b.land - b.t);
          for (let k = 1; k <= (few ? 2 : 4); k++) { const q = missileAt(b, Math.max(0, u - k * 0.07), dst); ctx.globalAlpha = 0.42 * (1 - k / 5) * Math.min(1, u * 5); const z = ((b.last ? 16 : 10) + k * 8) * sc; put(smoke, q.x, q.y, k, z, z); }
          continue;
        }
        // where it hit: smoke billows up; the last of a volley also kicks up dust where the cultivator is thrown, and grit flies
        const age = t - b.land, life = b.last ? 1500 : 900; if (age >= life || (!b.last && few)) continue;
        const q = impactOf(n); if (!q) continue;
        const v = age / life;
        for (let k = 0; k < (b.last ? (few ? 2 : 3) : 1); k++) {
          const hk = hash32(`im|${b.land}|${b.j}|${k}`), z = ((b.last ? 28 : 16) + (b.last ? 96 : 50) * v) * sc;
          ctx.globalAlpha = (b.last ? 0.72 : 0.5) * (1 - v) ** 1.3;
          put(smoke, q.x + (unit(hk, 0) - 0.5) * 34 * sc * (0.4 + v), q.y - (20 + unit(hk, 10) * 40) * sc * v, unit(hk, 20) * TAU, z, z);
        }
        if (!b.last) continue;
        const dv = age / 1100; if (dv >= 1) continue;
        const fy = q.y + cardH * 0.5;
        for (const sd of [-1, 1]) { const w = (50 + 110 * dv) * sc; ctx.globalAlpha = 0.7 * (1 - dv) ** 1.2; put(dust, q.x + sd * (12 + 58 * dv) * sc, fy - 10 * sc * dv, 0, w, w * 0.5); }
        if (!few) for (let k = 0; k < 6; k++) {
          const hk = hash32(`gr|${b.land}|${b.j}|${k}`), a = -Math.PI / 2 + (unit(hk, 0) - 0.5) * 2.6, dd = (60 + unit(hk, 10) * 60) * sc * dv ** 0.6, z = (4 + unit(hk, 20) * 5) * sc;
          ctx.globalAlpha = 0.9 * (1 - dv); put(dust, q.x + Math.cos(a) * dd, q.y + cardH * 0.2 + Math.sin(a) * dd + 70 * sc * dv * dv, 0, z, z);
        }
      }
      // a sweep or the great attack lands: a wall of dust rolls out along the ground
      for (const bt of beats) {
        if (bt.s === 0) continue;
        const v = (t - bt.a) / 2600; if (v < 0 || v >= 1) continue;
        const e = 1 - (1 - v) ** 2;
        for (let k = 0; k < 10; k++) { const sd = k & 1 ? 1 : -1, idx = k >> 1, w = (170 + 150 * v) * sc * (1 - idx * 0.08); ctx.globalAlpha = (bt.s === 2 ? 0.8 : 0.6) * (1 - v) ** 1.1; put(dust, W / 2 + sd * (0.04 + idx * 0.13) * W * (0.3 + 0.7 * e), H * (0.97 - (idx % 3) * 0.05) - 34 * sc * v, 0, w, w * 0.5); }
      }
      // the great attack shakes the lair: dust and grit rain down from above
      for (const [a, hh] of novaWin) {
        if (t < a || t > hh + 900) continue;
        const fa = Math.min(1, (t - a) / 400) * (t > hh ? 1 - (t - hh) / 900 : 1);
        for (let k = 0; k < (few ? 14 : 28); k++) {
          const h = hash32(`grit|${a}|${k}`), spd = (0.22 + unit(h, 0) * 0.4) * H, y = ((((t - a) / 1000) * spd + unit(h, 10) * H) % (H * 1.08)) - H * 0.04, z = (3 + unit(h, 20) * 6) * sc;
          ctx.globalAlpha = 0.8 * fa; put(dust, unit(h, 3) * W + Math.sin((t - a) * 0.002 + k) * 6 * sc, y, 0, z, z * 1.4);
        }
      }
      ctx.globalAlpha = 1;
      // ---- bullets (painted over): the barrage, and the heads of the aimed blows
      if (fade > 0) {
        ctx.globalAlpha = fade;
        const wLast = Math.floor((Math.min(t, tl.outro) - WAVE0) / P.WAVE_MS), wFirst = Math.max(0, Math.floor((t - LIFE - WAVE0) / P.WAVE_MS));
        for (let w = wFirst; w <= wLast; w++) {
          const te = WAVE0 + w * P.WAVE_MS;
          if (te > tl.outro || P.pausedAt(tl, te)) continue;
          const h = hash32(`bw|${film.day}|${w}`), kind = h % 7, rg = tl.rageAt !== null && te >= tl.rageAt, rm = rg ? 1.5 : 1, vm = rg ? 1.15 : 1;
          const a0 = unit(h, 8) * TAU, dir = (h >>> 3) & 1 ? 1 : -1, age0 = (t - te) / 1000;
          const c1 = rg && (h >>> 5) % 3 === 0 ? rageColor : elColor;
          const orb1 = orbSprite(c1), orb2 = orbSprite(accent);
          const skip = (q: number) => low && (q & 1) === 1;
          if (kind === 0) {   // a ring
            const n = Math.round(16 * rm), d = 135 * vm * age0 * sc, z = 15 * sc;
            for (let q = 0; q < n; q++) { if (skip(q)) continue; const a = a0 + (TAU * q) / n; put(orb1, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 0, z, z); }
          } else if (kind === 1) {   // a spiral of three arms
            for (let st = 0; st < 7; st++) for (let arm = 0; arm < 3; arm++) {
              const age = age0 - st * 0.07; if (age < 0 || skip(st)) continue;
              const a = a0 + (TAU * arm) / 3 + dir * st * 0.34, d = 175 * vm * age * sc;
              put(orb1, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, a, 30 * sc, 12 * sc);
            }
          } else if (kind === 2) {   // a fan aimed at someone
            const s = (h >>> 5) % Math.max(1, shown.length), tq = flyPx(s, shown[s] ?? 0, te), base = Math.atan2(tq.y - c.y, tq.x - c.x);
            const n = 2 * Math.round(3 * rm) + 1, d = 240 * vm * age0 * sc;
            for (let q = 0; q < n; q++) { if (skip(q)) continue; const a = base + (q - (n - 1) / 2) * 0.11; put(orb2, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, a, 34 * sc, 12 * sc); }
          } else if (kind === 3) {   // two rings, one fast, one slow
            const n = Math.round(12 * rm);
            for (let q = 0; q < n * 2; q++) { if (skip(q)) continue; const fast = q & 1, a = a0 + (TAU * (q >> 1)) / n + (fast ? Math.PI / n : 0), d = (fast ? 185 : 115) * vm * age0 * sc, z = (fast ? 11 : 15) * sc; put(fast ? orb2 : orb1, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 0, z, z); }
          } else if (kind === 4) {   // a flower: the ring turns as it opens
            const n = Math.round(10 * rm), d = 125 * vm * age0 * sc;
            for (let q = 0; q < n; q++) { if (skip(q)) continue; const a = a0 + (TAU * q) / n + dir * 1.15 * age0; put(orb1, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, a + dir * 0.9, 28 * sc, 12 * sc); }
          } else if (kind === 5) {   // heavy bolts of its own techniques, down at the cultivators
            const n = 3 + ((h >>> 9) % 3), im = tex[`b${(h >>> 11) % 2}`], d = (95 * vm * age0 + 35 * age0 * age0) * sc, z = 52 * sc;
            for (let q = 0; q < n; q++) {
              const a = Math.PI / 2 + (q - (n - 1) / 2) * 0.55 + (unit(h, 14) - 0.5) * 0.4, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
              put(orb1, x, y, 0, z * 0.55, z * 0.55);
              if (im) put(im, x, y, age0 * 3 * dir, z, (z * im.naturalHeight) / im.naturalWidth);
            }
          } else {   // a rain from above
            const n = Math.round(9 * rm);
            for (let q = 0; q < n; q++) {
              if (skip(q)) continue;
              const hq = hash32(`rn|${w}|${q}`), x0 = ((q + 0.5 + (unit(hq, 0) - 0.5) * 0.7) / n) * W, age = age0 - unit(hq, 10) * 0.35; if (age < 0) continue;
              const a = Math.PI / 2 + dir * 0.18, d = 265 * vm * age * sc;
              put(orb2, x0 + Math.cos(a) * d, -20 * sc + Math.sin(a) * d, a, 36 * sc, 11 * sc);
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      for (let n = bsFrom; n < tl.bshots.length; n++) {
        const b = tl.bshots[n]; if (b.t > t) break;
        if (t > b.land) continue;
        const dst = chestAt(b.j, t); if (!dst) continue;
        const u = (t - b.t) / (b.land - b.t), q = missileAt(b, u, dst), p = missileAt(b, Math.max(0, u - 0.04), dst), ang = Math.atan2(q.y - p.y, q.x - p.x), color = b.s === 2 ? accent : elColor;
        if (!b.last) { put(orbSprite(color), q.x, q.y, ang, 28 * sc, 14 * sc); continue; }
        const z = (b.s === 2 ? 74 : 62) * sc, im = tex[`b${b.s}`];
        put(orbSprite(color), q.x, q.y, 0, z * 0.5, z * 0.5);
        if (im) put(im, q.x, q.y, DIRECTIONAL.has(boss.skills[b.s].fx.tex) ? ang : u * 7, z, (z * im.naturalHeight) / im.naturalWidth);
      }
      // the dazed: stars wheel round their heads
      const star = starSprite();
      for (const [i, list] of dizT) {
        for (const [h0, ms] of list) {
          const dt = t - h0; if (dt < 200 || dt > ms || !alive(i, t)) continue;
          const q = chestAt(i, t); if (!q) continue;
          const fa = Math.min(1, (dt - 200) / 200) * Math.min(1, (ms - dt) / 300), hy = q.y - cardH * 0.36;
          for (let k = 0; k < 3; k++) { const a = dt * 0.0095 + (k * TAU) / 3, front = Math.sin(a), z = (12 + 3 * front) * sc; ctx.globalAlpha = fa * (0.7 + 0.3 * front); put(star, q.x + Math.cos(a) * 19 * sc, hy + front * 5 * sc, dt * 0.004, z, z); }
        }
      }
      // the bite: a pair of giant jaws opens round a cultivator (wider and wider as it trembles), snaps shut, chews, and pulls back to the Dị Thú
      for (const [i, bt] of biteT) {
        const t0 = bt - P.BITE_MS; if (t < t0 || t > bt + 700) continue;
        const q = poseOf(slotOf.get(i)!, i, Math.min(t, bt)), cy = q.y - cardH * 0.42, S = cardH * 1.25, jw = S * 2.3, jh = (jw * JAW_H) / JAW_W;
        const p = (t - t0) / P.BITE_MS, ease = (v: number) => v * v * v;
        // how far apart the gum lines are: opening wider, then the snap; then closed (teeth past each other), chewing
        const gap = p < 0.62 ? S * (1.2 + 0.55 * (p / 0.62)) : p < 1 ? S * (1.75 - 2.07 * ease((p - 0.62) / 0.38)) : -S * 0.32 + Math.sin((t - bt) * 0.045) * S * 0.05;
        const back = t > bt + 300 ? ((t - bt - 300) / 400) ** 2 : 0, fa = Math.min(1, p / 0.22) * (1 - back);
        const jx = q.x + (c.x - q.x) * back * 0.5, jy = cy + (c.y - cy) * back * 0.5, js = 1 - 0.45 * back;
        // the dark of its maw, and the light of its power round it
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * fa; put(glowSprite(elColor), jx, jy, 0, jw * 1.3 * js, jw * 0.9 * js);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6 * fa * clamp(1 - gap / (S * 1.9), 0, 1); put(puffSprite('#07030a'), jx, jy, 0, jw * 0.8 * js, Math.max(8, gap + S * 0.5) * js);
        ctx.globalAlpha = fa;
        const jaw = jawSprite(elColor);
        ctx.setTransform(dpr * js, 0, 0, dpr * js, jx * dpr, (jy - (gap / 2) * js) * dpr); ctx.drawImage(jaw, -jw / 2, -JAW_GUM * jh, jw, jh);
        ctx.setTransform(dpr * js * 0.92, 0, 0, -dpr * js * 0.92, jx * dpr, (jy + (gap / 2) * js) * dpr); ctx.drawImage(jaw, -jw / 2, -JAW_GUM * jh, jw, jh);
        // the snap: a flash and sparks flying off the teeth
        const ds = t - bt;
        if (ds >= 0 && ds < 420) {
          const v = ds / 420;
          ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - v) * 0.95; put(glowSprite('#ffffff'), jx, jy, 0, jw * (0.6 + 0.8 * v), jw * (0.35 + 0.5 * v));
          ctx.globalCompositeOperation = 'source-over';
          for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.3, d = (0.25 + 0.9 * v) * jw * 0.5, z = (16 - 8 * v) * sc; ctx.globalAlpha = 1 - v; put(star, jx + Math.cos(a) * d, jy + Math.sin(a) * d * 0.6, v * 3, z, z); }
        }
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    // ---- the cultivators: one transform each per frame
    const move = (t: number) => {
      nowT = t; nowC.clear();
      for (let s = 0; s < shown.length; s++) {
        const c0 = card.current[s], b0 = body.current[s]; if (!c0 || !b0) continue;
        const q = poseOf(s, shown[s], t), h = homePx(s);
        nowC.set(shown[s], { x: q.x, y: q.y - cardH * 0.42 });
        c0.style.transform = `translate(-50%, -82%) translate3d(${(q.x - h.x).toFixed(1)}px, ${(q.y - h.y).toFixed(1)}px, 0)`;
        b0.style.transform = `rotate(${q.rot.toFixed(1)}deg) scale(${q.scale.toFixed(3)})`;
        b0.style.opacity = q.op >= 0.999 ? '' : q.op.toFixed(2);
      }
    };
    const bars = (dt: number, now: number) => {
      lag = Math.max(hp, lag - (lag - hp) * Math.min(1, dt / 520));
      if (Math.abs(hp - shownHp) > 0 || lag > hp) {
        const pct = (v: number) => `${(v / Math.max(1, film.max)) * 100}%`;
        if (bossBar.current) bossBar.current.style.width = pct(hp);
        if (bossLag.current) bossLag.current.style.width = pct(lag);
        if (hp !== shownHp && now - numAt > 110) { if (bossNum.current) bossNum.current.textContent = `${shortNum(hp)} / ${shortNum(film.max)}`; shownHp = hp; numAt = now; }
      }
    };

    // ---- the loop: the film's clock is the time since it started plus where it started
    const wall0 = performance.now();
    let last = from, lastWall = wall0, frame = 0;
    const tick = (now: number) => {
      if (dead) return;
      const t = from + (now - wall0), live = t - last < 700;
      while (ei < tl.events.length && tl.events[ei].t <= t) { const e = tl.events[ei++]; apply(e, live && t - e.t < 500); }
      while (si < tl.shots.length && tl.shots[si].t <= t) { const s = tl.shots[si++]; if (s.big && s.i >= 0 && live && t - s.t < 250) release(s, false); }
      while (bi < bigLand.length && bigLand[bi].land <= t) { const s = bigLand[bi++]; if (live && t - s.land < 250) release(s, true); }
      if (!titleOff && t >= P.INTRO_MS - 900) { titleOff = true; setTitle(false); }
      if (!outroDone && t >= tl.outro) { outroDone = true; outro(live); }
      if (!ended && t >= tl.total) { ended = true; onEnd(); }
      move(t);
      sky(t);
      bars(now - lastWall, now);
      if (!low || (frame++ & 1) === 0) draw(t);
      last = t; lastWall = now;
      if (!ended) raf = requestAnimationFrame(tick);
    };
    if (from < 1300) { sfx('gong'); setTitle(true); }
    if (from < 1300) later(1300, () => sfx('whoosh'));
    move(from); sky(from); bars(0, wall0); draw(from);
    if (from >= tl.total) { ended = true; later(0, onEnd); }
    else raf = requestAnimationFrame(tick);

    return () => {
      dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); ro?.disconnect();
      layer.current?.replaceChildren();
      loop.current?.getAnimations().forEach((a) => a.cancel());
      for (const el of [dark.current, dim.current, glare.current]) if (el) el.style.opacity = '0';
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
      setBanner(null);
    };
  }, [p.mode === 'film' ? `${p.film.day}|${p.from}` : 'lobby', shown.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  // in the lobby: the boss bar is full, and a cultivator who has just signed up flies in
  const prevCrowd = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (p.mode !== 'lobby') return;
    if (bossBar.current) bossBar.current.style.width = '100%';
    if (bossLag.current) bossLag.current.style.width = '100%';
    const before = prevCrowd.current, now = new Set(p.crowd.map((f) => f.pid));
    if (before.size || p.crowd.length) shown.forEach((i, s) => {
      const f = p.crowd[i]; if (!f || before.has(f.pid) || !before.size && f.pid !== p.meId) return;
      const el = body.current[s]; if (!el) return;
      el.animate([{ transform: `translate(0, ${(stage.current?.clientHeight || 600) * 0.5}px) scale(0.5)`, opacity: 0 }, { transform: 'translate(0,-12px) scale(1.1)', opacity: 1, offset: 0.7 }, { transform: 'translate(0,0) scale(1)', opacity: 1 }], { duration: 1100, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'backwards' });
      if (f.pid === p.meId) { sfx('whoosh'); const r = el.getBoundingClientRect(); setTimeout(() => fx.ring({ x: r.left + r.width / 2, y: r.top + r.height / 2, color: '#ffe08a', size: 90 }), 900); }
    });
    prevCrowd.current = now;
  }, [p.mode === 'lobby' ? p.crowd.map((f) => f.pid).join(',') : '']);   // eslint-disable-line react-hooks/exhaustive-deps

  const elColor = C.EL[boss.el]?.color || '#ffd36e';
  const film = p.mode === 'film' ? p.film : null;
  return (
    <div className={`rdStage${rage ? ' rage' : ''}${over ? ` over ${over}` : ''}${calm ? ' calm' : ''}${film ? ' film' : ''}`} ref={stage} style={{ '--el': elColor, '--fw': `${P.sizeFor(shown.length)}cqw` } as CSSProperties} role="img" aria-label={film ? `Trận ${boss.name}: ${film.win ? 'thắng' : 'Dị Thú trốn thoát'}` : `${boss.name} đang chờ khai chiến`}>
      <div className="rdCam" ref={cam}>
      <img className="rdBg" ref={bg} src={R.raidArt(boss.id, 'bg')} alt="" draggable={false} />
      {loopOk && !calm
        ? <video ref={loop} className="rdLoop" src={R.raidArt(boss.id, 'loop')} poster={R.raidArt(boss.id, 'boss')} muted loop autoPlay playsInline preload="auto" aria-hidden="true" />
        : <img ref={loop as any} className="rdLoop still" src={R.raidArt(boss.id, 'boss')} alt="" draggable={false} />}
      <div className="rdDark" ref={dark} />
      <div className="rdTint" ref={tint} />
      <div className="rdRage" />
      <div className="rdGlow" ref={glow} style={{ left: `${boss.at.x}%`, top: `${boss.at.y}%`, width: `${boss.at.r * 2.4}%` }} />
      <div className="rdMist" aria-hidden="true"><i /><i /></div>

      <div className="rdCast">
        {shown.map((i, s) => {
          const f = fighters[i], h = home[s], mine = i === me, face = h.x < boss.at.x ? 1 : -1;
          return (
            <div key={f.pid} ref={(el) => { card.current[s] = el; }} className={`rdF${mine ? ' me' : ''}${i === film?.mvp && film && over ? ' mvp' : ''}`} style={{ left: `${h.x}%`, top: `${h.y}%`, '--fc': C.EL[f.el]?.color || '#f1e3b0', '--ph': `${-((f.hair % 97) / 97) * 4}s`, '--dur': `${3.2 + (f.hair % 13) / 7}s`, zIndex: Math.round(h.y) } as CSSProperties}>
              <div className="rdFbody" ref={(el) => { body.current[s] = el; }}>
                <div className="rdFbob">
                  <i className="rdFhp"><b ref={(el) => { hpBar.current[s] = el; }} /></i>
                  <div className="rdFfig" ref={(el) => { fig.current[s] = el; }} style={{ transform: face < 0 ? 'scaleX(-1)' : undefined }}><Cultivator look={lookFor(f)} /></div>
                </div>
              </div>
              <span className="rdFname" title={`${f.name} · cấp ${f.level}`}>{f.name}</span>
            </div>
          );
        })}
      </div>

      <div className="rdDim" ref={dim} />
      <canvas className="rdShots" ref={cvs} aria-hidden="true" />
      <div className="rdFx" ref={layer} aria-hidden="true" />
      {film && <video ref={ult} className="rdUlt" src={R.raidArt(boss.id, 'ult')} muted playsInline preload="auto" aria-hidden="true" />}
      </div>
      <div className="rdGlare" ref={glare} style={{ '--gx': `${boss.at.x}%`, '--gy': `${boss.at.y}%` } as CSSProperties} />

      <div className="rdHud">
        <div className="rdBoss">
          <div className="rdBossNm"><ElIcon el={boss.el} size={14} /><b>{boss.name}</b>{p.mode === 'film' && p.live && !over && <span className="rdLive">Trực tiếp</span>}</div>
          <div className="rdBossBar"><i className="lag" ref={bossLag} /><i className="cur" ref={bossBar} /></div>
          <small className="rdBossNum" ref={bossNum}>{p.mode === 'lobby' ? p.caption : ''}</small>
        </div>
      </div>
      {title && <div className="rdTitle" key="title"><small>{boss.title}</small><h3>{boss.name}</h3><span>{fighters.length} tu sĩ xuất chiến</span></div>}
      {banner && <div key={banner.k} className={`rdBanner ${banner.cls}`}><b>{banner.text}</b>{banner.sub && <small>{banner.sub}</small>}</div>}
    </div>
  );
}
