#!/usr/bin/env python3
"""Original background music for the game: solo instruments playing ONE melodic line in a Chinese pentatonic mode (dizi flute, guqin, erhu, guzheng).

Nothing here is sampled or copied: the melodies are composed by this script from a seed (phrases, answers, cadences), and the sound is built by additive synthesis
(plucked strings = decaying harmonics, flute and erhu = a bowed or blown voice with vibrato), then a soft room reverb. So the tracks belong to the project and need no
credit line. Run it again to remake them (same seed, same music):

    python3 scripts/gen-music.py            # writes public/audio/*.m4a and prints a playlist.json fragment
    python3 scripts/gen-music.py van-son    # one track only

Needs numpy, scipy and ffmpeg. The sound is deterministic, but it is a synthesised instrument: listen to it and change TRACKS (seed, tempo, mode) until it pleases you.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy.io import wavfile
from scipy.signal import fftconvolve, lfilter, butter, sosfilt, iirpeak

FS = 32000
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'audio')

# the five modes of the Chinese pentatonic scale, as semitones above the tonic (gong, shang, jue, zhi, yu are the five tonics of one scale)
MODES = {'gong': [0, 2, 4, 7, 9], 'shang': [0, 2, 5, 7, 10], 'jue': [0, 3, 5, 8, 10], 'zhi': [0, 2, 5, 7, 9], 'yu': [0, 3, 5, 7, 10]}


def semis(mode, n):
    s = MODES[mode]
    return s[n % 5] + 12 * (n // 5)


def hz(tonic, mode, n):
    return tonic * 2 ** (semis(mode, n) / 12)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


# ---------------------------------------------------------------- voices (each returns a mono float array, `dur` seconds of tone plus its own tail)
def pluck(f, dur, vel, rng, tau, bright, bend=0.0, slide_from=None):
    """a plucked string: decaying harmonics (the higher ones die sooner), a pluck click, an optional rise in pitch after the pluck (the left hand pressing the string)"""
    n = int((dur + tau * 1.6) * FS)
    t = np.arange(n) / FS
    fr = np.full(n, f)
    if bend:
        fr = fr * 2 ** (bend / 12 * smooth((t - 0.04) / 0.22))
    if slide_from:
        fr = fr * (1 + (slide_from / f - 1) * (1 - smooth(t / 0.09)))
    vib = 1 + 0.004 * np.sin(2 * np.pi * 4.6 * t) * smooth((t - 0.45) / 0.5)
    ph = 2 * np.pi * np.cumsum(fr * vib) / FS
    y = np.zeros(n)
    pos = 0.13 + 0.1 * rng.random()   # where the string is plucked: it removes some harmonics
    for k in range(1, 22):
        if f * k > 9000:
            break
        a = abs(np.sin(np.pi * k * pos)) / k ** (1.05 - 0.35 * bright)
        d = tau / (1 + 0.42 * (k - 1) ** 0.9)
        y += a * np.sin(k * ph + rng.random() * 0.4) * np.exp(-t / d)
    # the pluck: a short burst of filtered noise
    m = int(0.03 * FS)
    c = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.006 * FS))
    c = sosfilt(butter(2, [250, 2600 + 2500 * bright], 'bandpass', fs=FS, output='sos'), c)
    y[:m] += c * (0.55 + 0.4 * bright)
    att = np.minimum(1, t / 0.003)
    return y * att * vel


def blow(f, dur, vel, rng, f_from=None, breath=0.05, vib=0.004):
    """a bamboo flute: odd-leaning harmonics, a small chiff at the start, a breathy noise band, vibrato that grows after the note has settled"""
    rel = 0.2
    n = int((dur + rel) * FS)
    t = np.arange(n) / FS
    fr = np.full(n, f)
    if f_from:
        fr = fr * (1 + (f_from / f - 1) * (1 - smooth(t / 0.07)))
    v = 1 + vib * np.sin(2 * np.pi * (5.0 + 0.6 * rng.random()) * t) * smooth((t - 0.28) / 0.45)
    ph = 2 * np.pi * np.cumsum(fr * v) / FS
    y = np.zeros(n)
    for k, a in enumerate([1, .5, .32, .16, .09, .05, .03], 1):
        y += a * np.sin(k * ph)
    env = smooth(t / 0.06) * (0.9 + 0.1 * np.sin(2 * np.pi * 0.7 * t + rng.random() * 6)) * (1 - smooth((t - dur) / rel))
    noise = sosfilt(butter(2, [1800, 6500], 'bandpass', fs=FS, output='sos'), rng.standard_normal(n))
    y = y * env + noise * (breath * env + 0.14 * np.exp(-t / 0.05)) * 0.9
    return y * vel


def bow(f, dur, vel, rng, f_from=None):
    """an erhu: a bright, slightly nasal bowed tone, strong vibrato, slides in from the previous note"""
    rel = 0.22
    n = int((dur + rel) * FS)
    t = np.arange(n) / FS
    fr = np.full(n, f)
    if f_from:
        fr = fr * (1 + (f_from / f - 1) * (1 - smooth(t / 0.11)))
    v = 1 + (0.007 + 0.002 * rng.random()) * np.sin(2 * np.pi * 5.7 * t) * smooth((t - 0.12) / 0.3)
    ph = 2 * np.pi * np.cumsum(fr * v) / FS
    y = np.zeros(n)
    for k in range(1, 16):
        y += np.sin(k * ph) / k ** 0.85
    for fc, q, g in ((750, 2.0, 1.0), (2100, 2.5, 1.4)):   # the body of the instrument boosts a few bands
        b, a = iirpeak(fc, q, fs=FS)
        y = y + g * lfilter(b, a, y) * 0.5
    env = smooth(t / 0.09) * (1 - smooth((t - dur) / rel)) * (0.92 + 0.08 * np.sin(2 * np.pi * 0.9 * t))
    y = y * env + rng.standard_normal(n) * 0.02 * env
    return y * vel * 0.6


# ---------------------------------------------------------------- composition
RHYTHMS = {   # phrases of 8 beats
    'slow': [[2, 1, 1, 4], [3, 1, 2, 2], [2, 2, 1, 1, 2], [4, 1, 1, 2], [1.5, .5, 1, 1, 4], [2, 1, 1, 1, 1, 2]],
    'song': [[1, 1, 2, 1, 1, 2], [1.5, .5, 1, 1, 1, 3], [1, .5, .5, 1, 1, 4], [2, 1, 1, 2, 2], [1, 1, 1, 1, 1, 1, 2]],
    'flow': [[.5, .5, .5, .5, .5, .5, 1, 1, 1, 2], [.5, .5, 1, .5, .5, 1, .5, .5, 1, 2], [1, .5, .5, .5, .5, 1, 1, 3], [.5, .5, .5, .5, 1, 1, .5, .5, .5, .5, 2]],
}


def phrase(rng, rhythm, start, end, lo, hi, step_bias):
    """one two-bar phrase: a walk on the scale that mostly moves by step, wanders, and arrives on `end`"""
    n = len(rhythm)
    deg = [start]
    for i in range(1, n - 1):
        p = deg[-1]
        moves = [-3, -2, -1, 0, 1, 2, 3]
        w = [0.5, 1.2, 3.0 * step_bias, 0.5, 3.0 * step_bias, 1.2, 0.5]
        # lean towards the target as the phrase runs out
        left = n - 1 - i
        w = [x * (1 + 0.5 * (1 if (m * (end - p) > 0) else 0) * (1 - left / n)) for x, m in zip(w, moves)]
        w = [0 if (p + m < lo or p + m > hi) else x for x, m in zip(w, moves)]
        if len(deg) >= 2 and deg[-1] == deg[-2]:
            w[3] = 0
        s = sum(w)
        r = rng.random() * s
        for m, x in zip(moves, w):
            r -= x
            if r <= 0:
                deg.append(p + m)
                break
        else:
            deg.append(p)
    if n > 1:
        deg.append(end)
        if abs(deg[-2] - end) > 2:   # no big leap into the last note
            deg[-2] = end + (1 if deg[-2] > end else -1) * 1
    return deg[:n]


def compose(seed, mode_len, rhythm_set, lo, hi, home, step_bias=1.0):
    """the whole piece as a list of (degree, beats) with None for a rest: intro, A A', B B', A A', C C', B B', A A', coda"""
    rng = np.random.default_rng(seed)
    pick = lambda: RHYTHMS[rhythm_set][int(rng.integers(len(RHYTHMS[rhythm_set])))]
    # the degrees that feel like an ending: the tonic (home), and the fifth above it (home + 3 in a five-note scale)
    tonic, fifth, upper = home, home + 3, home + 5
    r1, r2, r3, r4 = pick(), pick(), pick(), pick()
    A1 = phrase(rng, r1, home + 1, fifth, lo, hi, step_bias)         # an open question
    A2 = phrase(rng, r1, home + 1, tonic, lo, hi, step_bias)         # its answer: the same shape, closed
    for i in range(2, len(A2) - 1):                                  # the answer wanders a little differently
        if rng.random() < 0.35:
            A2[i] = A1[i] + (1 if rng.random() < 0.5 else -1)
    B1 = phrase(rng, r2, upper, upper + 2, lo, hi, step_bias)        # higher, brighter
    B2 = phrase(rng, r3, upper + 2, fifth, lo, hi, step_bias)
    C1 = phrase(rng, r4, upper + 1, upper + 3, lo, hi, step_bias)    # the high point
    C2 = phrase(rng, r4, upper + 3, fifth, lo, hi, step_bias)
    out = []
    add = lambda deg, rh, rest=0.0: out.extend(list(zip(deg, rh)) + ([(None, rest)] if rest else []))
    out.append((None, 4))                                            # a bar of silence, the room settles
    out.append((tonic, 8))                                           # a long opening note
    for ph in ((A1, r1), (A2, r1), (B1, r2), (B2, r3), (A1, r1), (A2, r1), (C1, r4), (C2, r4), (B1, r2), (B2, r3), (A1, r1), (A2, r1)):
        add(*ph)
        out.append((None, 0.0))
    out.append((tonic, 8))                                           # coda: the last note rings out
    return [x for x in out if x[1] > 0]


TRACKS = {
    # id: (title, mood, instrument, tonic Hz, mode, bpm, seed, rhythm set, low, high, home degree, step bias, gain)
    'van-son': ('Vân Sơn Địch', 'sáo trúc, mây trôi qua núi', 'flute', 587.33, 'gong', 56, 11, 'song', -2, 9, 0, 1.0, 1.0),
    'nguyet-ha': ('Nguyệt Hạ Cầm', 'cổ cầm dưới trăng, từng nốt chậm', 'guqin', 146.83, 'yu', 46, 23, 'slow', -2, 8, 0, 1.2, 1.0),
    'van-hai': ('Vân Hải Hồ Âm', 'nhị hồ, sóng mây dập dờn', 'erhu', 440.0, 'zhi', 54, 37, 'song', -2, 8, 0, 1.0, 1.0),
    'phong-linh': ('Phong Linh Tranh', 'đàn tranh, gió lay chuông ngọc', 'zheng', 293.66, 'shang', 66, 41, 'flow', -3, 10, 0, 1.0, 1.0),
}


def render(tid):
    title, mood, inst, tonic, mode, bpm, seed, rset, lo, hi, home, sb, gain = TRACKS[tid]
    rng = np.random.default_rng(seed + 1000)
    seq = compose(seed, len(MODES[mode]), rset, lo, hi, home, sb)
    beat = 60.0 / bpm
    total = sum(b for _, b in seq) * beat
    buf = np.zeros(int((total + 9) * FS))
    t = 0.0
    prev = None
    for i, (deg, beats) in enumerate(seq):
        dur = beats * beat
        if deg is not None:
            f = hz(tonic, mode, deg)
            vel = 0.7 + 0.3 * rng.random()
            if beats >= 2:
                vel = min(1, vel + 0.1)
            nxt_long = beats >= 2
            if inst == 'flute':
                src = prev if (prev and abs(prev - f) / f < 0.6 and rng.random() < 0.55) else None
                y = blow(f, dur * 0.97, vel, rng, f_from=src, breath=0.045 + 0.02 * rng.random())
            elif inst == 'erhu':
                src = prev if (prev and prev != f) else None
                y = bow(f, dur * 0.98, vel, rng, f_from=src)
            elif inst == 'guqin':
                y = pluck(f, dur, vel, rng, tau=3.2 if f < 260 else 2.4, bright=0.15, bend=(1.0 if (nxt_long and rng.random() < 0.4) else 0.0),
                          slide_from=(f * 2 ** (-2 / 12) if rng.random() < 0.25 else None))
            else:   # zheng
                y = pluck(f, dur, vel, rng, tau=1.9, bright=0.65, bend=(0.8 if (nxt_long and rng.random() < 0.3) else 0.0))
            a = int(t * FS)
            buf[a:a + len(y)] += y[:len(buf) - a]
            prev = f
        else:
            prev = None
        t += dur
    # the room: a soft reverb (two different tails for left and right), a few percent of the dry sound stays in front
    rt = 2.6 if inst in ('guqin', 'flute') else 2.0
    irn = int(3.2 * FS)
    tt = np.arange(irn) / FS
    outs = []
    for side in (0, 1):
        r = np.random.default_rng(900 + side)
        ir = r.standard_normal(irn) * np.exp(-tt * 6.9 / rt)
        lo_ = sosfilt(butter(2, 1400, 'low', fs=FS, output='sos'), ir)
        w = np.exp(-tt / 0.7)
        ir = ir * w + lo_ * (1 - w)
        ir[: int(0.012 * FS)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))
        wet = fftconvolve(buf, ir)[: len(buf)]
        outs.append(0.78 * buf + 0.62 * wet)
    st = np.stack(outs, 1)
    # level: the same loudness for every track, a gentle limiter, a slow fade in and out
    rms = np.sqrt(np.mean(st[: int(total * FS)] ** 2))
    st = st / (rms + 1e-9) * 10 ** (-23 / 20) * gain
    st = np.tanh(st * 1.2) / 1.2
    n = len(st)
    st *= np.minimum(1, np.arange(n) / (1.5 * FS))[:, None]
    end = int((total + 4) * FS)
    st = st[:end]
    st[-int(5 * FS):] *= np.linspace(1, 0, int(5 * FS))[:, None]
    return title, mood, st


def write(tid):
    title, mood, st = render(tid)
    path = os.path.join(OUT, tid + '.m4a')
    with tempfile.TemporaryDirectory() as d:
        w = os.path.join(d, 'a.wav')
        wavfile.write(w, FS, (np.clip(st, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', w, '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', path], check=True)
    return {'id': tid, 'title': title, 'mood': mood, 'seconds': round(len(st) / FS, 1)}


if __name__ == '__main__':
    ids = sys.argv[1:] or list(TRACKS)
    os.makedirs(OUT, exist_ok=True)
    print(json.dumps([write(i) for i in ids], ensure_ascii=False, indent=1))
