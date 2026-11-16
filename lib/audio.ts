// Sound for the whole game, client side only.
//  - Background music: tracks listed in public/audio/playlist.json, two <audio> elements that cross-fade, volume and on/off remembered.
//    Browsers only allow sound after a first click or key press, so playback starts on the first gesture.
//  - Interface sounds: small bells, plucks, gongs and thunder synthesised with the Web Audio API (no sound files, nothing to license).
import { useSyncExternalStore } from 'react';

export interface Track { id: string; title: string; artist: string; src: string; license: string; licenseUrl?: string; sourceUrl?: string; credit?: string; mood?: string; gain?: number }
export interface AudioState { ready: boolean; music: boolean; playing: boolean; vol: number; sfx: boolean; track: Track | null; tracks: Track[] }
export type Sfx = 'tick' | 'equip' | 'levelup' | 'chime' | 'rare' | 'gong' | 'thunder' | 'whoosh' | 'fail' | 'tame' | 'open';

const KEY = 'tutien-audio';
const XFADE = 3200;
const PENTA = [293.66, 329.63, 369.99, 440, 493.88, 587.33, 659.26, 739.99, 880, 987.77, 1174.66]; // D major pentatonic

class Engine {
  private prefs = { music: true, vol: 0.35, sfx: true };
  private tracks: Track[] = [];
  private idx = -1;
  private els: HTMLAudioElement[] = [];
  private cur = 0;
  private timers = new Map<HTMLAudioElement, number>();
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private subs = new Set<() => void>();
  private unlocked = false;
  private loading = false;
  private fading = false;
  snap: AudioState = { ready: false, music: true, playing: false, vol: 0.35, sfx: true, track: null, tracks: [] };

  constructor() {
    try { Object.assign(this.prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
    this.els = [new Audio(), new Audio()];
    this.els.forEach((a, i) => {
      a.preload = 'auto'; a.volume = 0;
      a.addEventListener('timeupdate', () => { if (i === this.cur && a.duration && a.duration - a.currentTime < XFADE / 1000 + 0.4 && !this.fading && this.tracks.length > 1) this.next(); });
      a.addEventListener('ended', () => { if (i === this.cur) this.next(); });
      a.addEventListener('error', () => { if (i === this.cur && this.snap.playing) this.skipBad(); });
    });
    this.refresh();
    const first = () => { window.removeEventListener('pointerdown', first, true); window.removeEventListener('keydown', first, true); this.unlock(); };
    window.addEventListener('pointerdown', first, true); window.addEventListener('keydown', first, true);
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend?.(); else if (this.snap.sfx || this.snap.music) this.ctx.resume?.(); });
    this.load();
  }

  private refresh(patch: Partial<AudioState> = {}) {
    const t = this.idx >= 0 ? this.tracks[this.idx] || null : null;
    this.snap = { ...this.snap, ready: this.tracks.length > 0, music: this.prefs.music, vol: this.prefs.vol, sfx: this.prefs.sfx, track: t, tracks: this.tracks, ...patch };
    this.subs.forEach((f) => f());
  }
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.prefs)); } catch {} }
  subscribe = (f: () => void) => { this.subs.add(f); return () => { this.subs.delete(f); }; };

  private async load() {
    if (this.loading || this.tracks.length) return; this.loading = true;
    try {
      const j = await (await fetch('/audio/playlist.json', { cache: 'no-cache' })).json();
      this.tracks = (j.tracks || []) as Track[]; this.idx = this.tracks.length ? Math.floor(Math.random() * this.tracks.length) : -1;
    } catch { this.tracks = []; }
    this.loading = false; this.refresh();
    if (this.unlocked && this.prefs.music) this.play();
  }

  // ---- gesture unlock: creates the audio context and starts the music
  unlock() {
    if (this.unlocked) return; this.unlocked = true;
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext; this.ctx = new AC(); this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination);
      const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.noise = b;
    } catch {}
    if (this.prefs.music) this.play();
  }

  // ---- music
  private ramp(a: HTMLAudioElement, to: number, ms: number, done?: () => void) {
    const old = this.timers.get(a); if (old) cancelAnimationFrame(old);
    const from = a.volume, t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms); a.volume = Math.max(0, Math.min(1, from + (to - from) * (k * k * (3 - 2 * k))));
      if (k < 1) this.timers.set(a, requestAnimationFrame(step)); else { this.timers.delete(a); done?.(); }
    };
    this.timers.set(a, requestAnimationFrame(step));
  }
  private level() { const t = this.tracks[this.idx]; return Math.min(1, this.prefs.vol * (t?.gain ?? 1)); }
  private async play(fade = 2600) {
    if (!this.tracks.length || this.idx < 0 || this.prefs.vol <= 0) return;
    const a = this.els[this.cur], t = this.tracks[this.idx];
    if (!a.src || !a.src.endsWith(t.src)) a.src = t.src;
    try { await a.play(); this.ramp(a, this.level(), fade); this.refresh({ playing: true }); } catch { this.refresh({ playing: false }); }
  }
  private skipBad() { if (this.tracks.length > 1) this.next(); else this.refresh({ playing: false }); }
  next(dir = 1) {
    if (!this.tracks.length) return;
    this.fading = true; const old = this.els[this.cur]; this.cur = 1 - this.cur; this.idx = (this.idx + dir + this.tracks.length) % this.tracks.length;
    const a = this.els[this.cur], t = this.tracks[this.idx]; a.src = t.src; a.currentTime = 0; a.volume = 0;
    this.refresh();
    if (this.prefs.music && this.prefs.vol > 0 && this.unlocked) { a.play().then(() => { this.ramp(a, this.level(), XFADE); this.refresh({ playing: true }); }).catch(() => this.refresh({ playing: false })); }
    this.ramp(old, 0, XFADE, () => { old.pause(); this.fading = false; });
  }
  prev() { this.next(-1); }
  setMusic(on: boolean) {
    this.prefs.music = on; this.save();
    if (on) { this.unlock(); this.ctx?.resume?.(); this.play(); this.refresh(); }
    else { const a = this.els[this.cur]; this.ramp(a, 0, 700, () => a.pause()); this.refresh({ playing: false }); }
  }
  // The slider is the master volume: at 0 nothing plays at all (both music players are stopped and the interface sounds are skipped), not just very quietly.
  setVol(v: number) {
    this.prefs.vol = Math.max(0, Math.min(1, v)); this.save();
    if (this.prefs.vol <= 0) {
      this.els.forEach((a) => { const o = this.timers.get(a); if (o) cancelAnimationFrame(o); this.timers.delete(a); a.volume = 0; a.pause(); });
      this.fading = false; this.refresh({ playing: false }); return;
    }
    const a = this.els[this.cur];
    if (this.snap.playing) { const o = this.timers.get(a); if (o) cancelAnimationFrame(o); a.volume = this.level(); }
    else if (this.prefs.music && this.unlocked) { this.play(600); }
    this.refresh();
  }
  setSfx(on: boolean) { this.prefs.sfx = on; this.save(); this.refresh(); if (on) { this.unlock(); this.sfx('chime'); } }

  // ---- interface sounds
  private tone(f: number, at: number, o: { dur?: number; gain?: number; type?: OscillatorType; partials?: number[]; attack?: number; lp?: number } = {}) {
    const c = this.ctx!, out = this.out!; const dur = o.dur ?? 1.4, gain = o.gain ?? 0.18, t0 = c.currentTime + at;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + (o.attack ?? 0.006)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let dest: AudioNode = g; if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; g.connect(lp); dest = lp; }
    dest.connect(out);
    (o.partials || [1]).forEach((m, i) => { const os = c.createOscillator(); os.type = o.type || 'sine'; os.frequency.value = f * m; const pg = c.createGain(); pg.gain.value = 1 / (1 + i * 1.6); os.connect(pg); pg.connect(g); os.start(t0); os.stop(t0 + dur + 0.05); });
  }
  private hiss(at: number, dur: number, o: { from: number; to: number; q?: number; gain?: number; type?: BiquadFilterType }) {
    const c = this.ctx!, t0 = c.currentTime + at; if (!this.noise) return;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true; const f = c.createBiquadFilter(); f.type = o.type || 'bandpass'; f.Q.value = o.q ?? 1.2;
    f.frequency.setValueAtTime(o.from, t0); f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain ?? 0.2, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.out!); s.start(t0); s.stop(t0 + dur + 0.05);
  }
  private lastSfx: Record<string, number> = {};
  sfx(name: Sfx) {
    if (!this.prefs.sfx || this.prefs.vol <= 0 || !this.ctx || !this.out) return;
    const now = performance.now(), gap = name === 'tick' ? 60 : 280; if (now - (this.lastSfx[name] || 0) < gap) return; this.lastSfx[name] = now;
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    const bell = [1, 2.76, 5.4, 8.93], pl = { type: 'triangle' as const, lp: 2600, attack: 0.003 };
    switch (name) {
      case 'tick': this.tone(520, 0, { dur: 0.09, gain: 0.05, type: 'triangle', lp: 1800 }); break;
      case 'open': this.hiss(0, 0.5, { from: 400, to: 2400, gain: 0.05 }); this.tone(PENTA[5], 0.08, { dur: 1, gain: 0.06, partials: bell }); break;
      case 'chime': this.tone(PENTA[6], 0, { dur: 1.6, gain: 0.1, partials: bell }); break;
      case 'tame': this.tone(PENTA[5], 0, { dur: 1.4, gain: 0.09, partials: bell }); this.tone(PENTA[8], 0.12, { dur: 1.6, gain: 0.08, partials: bell }); break;
      case 'equip': this.tone(PENTA[3], 0, { dur: 0.9, gain: 0.16, ...pl }); this.tone(PENTA[6], 0.09, { dur: 1.2, gain: 0.14, ...pl }); this.hiss(0, 0.28, { from: 900, to: 3200, gain: 0.04 }); break;
      case 'levelup': [3, 4, 5, 6, 8].forEach((n, i) => this.tone(PENTA[n], i * 0.1, { dur: 1.3, gain: 0.15, ...pl })); this.tone(PENTA[8], 0.5, { dur: 2.2, gain: 0.07, partials: bell }); break;
      case 'rare': [5, 7, 9, 10].forEach((n, i) => this.tone(PENTA[n], i * 0.08, { dur: 2, gain: 0.09, partials: bell })); this.hiss(0, 0.9, { from: 1500, to: 7000, q: 0.8, gain: 0.05 }); break;
      case 'gong': this.tone(98, 0, { dur: 3.6, gain: 0.26, partials: [1, 1.5, 2.1, 2.76, 3.9], lp: 1500, attack: 0.012 }); this.hiss(0, 0.35, { from: 3000, to: 800, gain: 0.05 }); break;
      case 'whoosh': this.hiss(0, 0.7, { from: 300, to: 3000, gain: 0.14 }); break;
      case 'thunder': this.hiss(0, 2.2, { from: 420, to: 90, q: 0.6, gain: 0.5, type: 'lowpass' }); this.hiss(0, 0.18, { from: 6000, to: 1500, gain: 0.3 }); this.tone(58, 0, { dur: 1.8, gain: 0.3, lp: 220 }); break;
      case 'fail': this.tone(PENTA[2], 0, { dur: 1.4, gain: 0.12, ...pl }); this.tone(PENTA[0], 0.16, { dur: 1.8, gain: 0.13, ...pl }); this.tone(73.4, 0.2, { dur: 1.6, gain: 0.18, lp: 400 }); break;
    }
  }
}

let engine: Engine | null = null;
export const getAudio = (): Engine | null => { if (typeof window === 'undefined') return null; return engine || (engine = new Engine()); };
const SERVER: AudioState = { ready: false, music: true, playing: false, vol: 0.35, sfx: true, track: null, tracks: [] };
export function useAudio(): AudioState {
  return useSyncExternalStore((f) => getAudio()?.subscribe(f) || (() => {}), () => getAudio()?.snap || SERVER, () => SERVER);
}
export const sfx = (n: Sfx) => getAudio()?.sfx(n);
