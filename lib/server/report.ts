// The report page (app/admin): what the game costs and how it is played. Read only: nothing here changes a save, and it is shown to the owner alone (lib/server/admin.ts).
// It reads every account once (the saves are compressed JSON, so this is the heavy part) and keeps the answer for a minute in each server instance.
import * as G from '../game';
import * as C from '../content';
import * as D from '../daily';
import { BALANCE as B } from '../balance';
import { info as imageInfo } from '../imagegen';
import { dayKey } from '../daily';
import { query } from './db';
import { decodeState } from './store';
import { ensureDaily } from './dailystore';
import { falBalance, falUsage, type FalBalance, type FalUsage } from './falbalance';

const DAY = 86400_000;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 10000) / 10000;
const daysBack = (now: number, n: number) => Array.from({ length: n }, (_, i) => dayKey(now - (n - 1 - i) * DAY));
const fullEmail = (e: string) => (e.includes('@') ? e : '(khách)');   // the report is for the owner only, so the whole address is shown

export interface Money { spent: number; cap: number; remaining: number; pct: number }
export interface Report {
  at: number; day: string; note: string[];
  ai: {
    provider: string; enabled: boolean; locked: string | null; queued: number; running: number;
    image: Money; text: Money;
    avgPerDay: number; avg7: number; daysLeft: number | null; firstDay: string | null; spentToday: number;
    fal: (FalBalance & { daysLeft: number | null; usage: FalUsage | null }) | null;
    source: 'fal' | 'game';   // where the daily chart and the averages come from: fal's own usage report, or the game's ledger   // the real balance of the fal account (null when pictures do not come from fal)
    days: { day: string; image: number; text: number; estimated: boolean }[];
    byKind: { kind: string; n: number; cost: number }[]; pictures: number; storedCost: number;
  };
  players: {
    real: number; registered: number; guests: number; active24h: number; active7d: number; withCharacter: number;
    newByDay: { day: string; n: number }[]; levels: number[]; realms: { name: string; n: number }[]; zones: { name: string; n: number }[];
    auto: { autoTame: number; autoFight: number; autoBreak: number; retreat: number };
  };
  online: {
    since: string | null; totalHours: number; players: number; avgHoursPerPlayer: number; avgMinPerActiveDay: number; todayHours: number; todayPlayers: number;
    byDay: { day: string; hours: number; players: number }[];
    tz: string;   // the clock the hours below are shown in
    hours: { hour: number; players: number; peak: number; minutes: number }[];   // per hour of the day: players there on an average day, most on one day, total minutes
    heat: { day: string; cells: number[] }[];                                      // the last 14 days (local date) by hour: how many different players were there
    peak: { hour: number; players: number }[];                                     // the three busiest hours
    daysCounted: number;
    buckets: { label: string; n: number }[];
    top: { name: string; email: string; kind: string; hours: number; days: number }[];
  };
  items: { names: string[]; colors: string[]; dropped: number[]; held: number[]; since: string; accountsCounted: number;
    byDay: { day: string; n: number[] }[]; trackedSince: string | null;     // real players only: items found per UTC day by rarity, counted from the day this was added
    content: { day: string; beasts: number; weapons: number; pictures: number }[] };   // what the game itself gained per day: new creatures, new weapons, new pictures drawn
  beasts: {
    total: number; avgPerPlayer: number; maxPerPlayer: number; mutants: number; tamedEver: number; mutTamedEver: number;
    speciesInGame: number; speciesTamed: number; sizes: { name: string; n: number }[]; species: { id: string; name: string; n: number }[];
  };
  quest: {
    day: string; creature: string | null; need: number; activeToday: number; done: number; inProgress: number; notStarted: number; everDone: number;
    byDay: { day: string; done: number }[];
  };
}

interface Row { id: string; email: string; created: number; state: string | null; guest: boolean }
async function* eachAccount(): AsyncGenerator<{ id: string; email: string; created: number; guest: boolean; st: G.GameState | null }> {
  let after = '';
  for (;;) {
    const rows = (await query<Row>(
      `SELECT a.id, a.email, a.created, a.state, COALESCE(u.guest, false) AS guest FROM accounts a LEFT JOIN acct_auth u ON u.id = a.id WHERE a.id > $1 ORDER BY a.id LIMIT 40`, [after])).rows;
    if (!rows.length) return;
    for (const r of rows) {
      let st: G.GameState | null = null;
      try { st = r.state ? decodeState(r.state) : null; } catch { st = null; }
      yield { id: r.id, email: r.email, created: Number(r.created), guest: !!r.guest, st };
    }
    after = rows[rows.length - 1].id;
  }
}

async function money(spent: number, cap: number): Promise<Money> {
  return { spent: r4(spent), cap, remaining: r4(Math.max(0, cap - spent)), pct: cap > 0 ? Math.min(100, r2((spent / cap) * 100)) : 0 };
}

async function aiSection(now: number): Promise<Report['ai']> {
  const today = dayKey(now), days30 = daysBack(now, 30);
  const kv = (await query<{ key: string; value: any }>(`SELECT key, value FROM kv WHERE key = 'usage' OR key LIKE 'usage.%'`)).rows;
  const total = kv.find((r) => r.key === 'usage')?.value || {};
  const perDay = new Map<string, { image: number; text: number }>();
  for (const r of kv) if (r.key.startsWith('usage.')) perDay.set(r.key.slice(6), { image: Number(r.value?.imageUsd) || 0, text: Number(r.value?.spentUsd) || 0 });
  // the cost written on each stored picture: the only history there is for the days before the per-day rows existed
  const stored = (await query<{ d: string; cost: number; n: number }>(
    `SELECT left(COALESCE(meta->>'date', created::text), 10) AS d, COALESCE(sum(CASE WHEN meta->>'cost' ~ '^[0-9.]+$' THEN (meta->>'cost')::float8 END), 0)::float8 AS cost, count(*)::int AS n FROM images GROUP BY 1`)).rows;
  const estimate = new Map(stored.map((r) => [r.d, Number(r.cost) || 0]));
  const i: any = await imageInfo().catch(() => ({}));
  // what fal really charged (needs a key with billing rights); when it answers, it replaces the game's own figures below
  const usage = i.provider === 'fal' ? await falUsage(now) : null;
  const real = usage && usage.ok ? new Map(usage.days.map((d) => [d.day, d.usd])) : null;
  const days = days30.map((day) => {
    const k = perDay.get(day);
    if (real) return { day, image: r4(real.get(day) || 0), text: k ? r4(k.text) : 0, estimated: false };
    return k ? { day, image: r4(k.image), text: r4(k.text), estimated: false } : { day, image: r4(estimate.get(day) || 0), text: 0, estimated: true };
  });
  const byKind = (await query<{ kind: string; n: number; cost: number }>(
    `SELECT kind, count(*)::int AS n, COALESCE(sum(CASE WHEN meta->>'cost' ~ '^[0-9.]+$' THEN (meta->>'cost')::float8 END), 0)::float8 AS cost FROM images GROUP BY kind ORDER BY 3 DESC`)).rows
    .map((r) => ({ kind: r.kind, n: r.n, cost: r4(Number(r.cost)) }));
  const allDays = [...new Set([...perDay.keys(), ...stored.filter((r) => /^\d{4}-\d\d-\d\d$/.test(r.d) && r.cost > 0).map((r) => r.d)])].sort();
  const firstDay = real && usage ? (usage.days.find((d) => d.usd > 0)?.day || null) : (allDays[0] || null);
  const ledgerSpent = Number(total.imageUsd) || 0, textSpent = Number(total.spentUsd) || 0;
  const spentForAverage = real && usage ? usage.total : ledgerSpent;   // fal's figure when it is there
  const image = await money(ledgerSpent, Number(process.env.IMAGE_BUDGET_USD || 2));
  const text = await money(textSpent, Number(process.env.AI_BUDGET_USD || 3));
  const span = firstDay ? Math.max(1, Math.round((Date.parse(today) - Date.parse(firstDay)) / DAY) + 1) : 1;
  const avgPerDay = r4(spentForAverage / span);
  const last7 = days.slice(-7).reduce((a, d) => a + d.image, 0), avg7 = r4(last7 / 7);
  const rate = avg7 > 0 ? avg7 : avgPerDay;
  const fb = i.provider === 'fal' ? await falBalance(Date.now()) : null;
  const fal = fb ? { ...fb, daysLeft: fb.balance !== null && rate > 0 ? Math.floor(fb.balance / rate) : null, usage } : null;
  return {
    provider: String(i.provider || ''), enabled: !!i.enabled, locked: i.locked ? String(i.locked) : null, queued: i.queued || 0, running: i.running || 0,
    image, text, avgPerDay, avg7, daysLeft: rate > 0 ? Math.floor(image.remaining / rate) : null, firstDay, spentToday: days[days.length - 1]?.image || 0, fal, source: real ? 'fal' : 'game',
    days, byKind, pictures: byKind.reduce((a, k) => a + k.n, 0), storedCost: r4(byKind.reduce((a, k) => a + k.cost, 0)),
  };
}

const BUCKETS: [string, number][] = [['dưới 10 phút', 10], ['10 đến 30 phút', 30], ['30 phút đến 1 giờ', 60], ['1 đến 3 giờ', 180], ['3 đến 10 giờ', 600], ['trên 10 giờ', Infinity]];

export async function buildReport(now = Date.now()): Promise<Report> {
  await ensureDaily().catch(() => {});
  const today = dayKey(now), startToday = Date.parse(today + 'T00:00:00Z');
  const d14 = daysBack(now, 14);
  const ai = await aiSection(now);

  const sess = new Map((await query<{ acc: string; t: string }>(`SELECT acc, max(last_at)::text AS t FROM sessions GROUP BY acc`)).rows.map((r) => [r.acc, Number(r.t)]));
  const presRaw = (await query<{ acc: string; day: string; bits: string }>(`SELECT acc, day, bits::text AS bits FROM presence WHERE day >= $1`, [dayKey(now - 90 * DAY)])).rows;
  const pres = presRaw.map((r) => ({ acc: r.acc, day: r.day, bits: r.bits, mins: r.bits.split('1').length - 1 }));
  const presAcc = new Map<string, { mins: number; days: number }>();
  const presDay = new Map<string, { mins: number; accs: Set<string> }>();
  for (const r of pres) {
    const a = presAcc.get(r.acc) || { mins: 0, days: 0 }; a.mins += r.mins; a.days++; presAcc.set(r.acc, a);
    const d = presDay.get(r.day) || { mins: 0, accs: new Set() }; d.mins += r.mins; d.accs.add(r.acc); presDay.set(r.day, d);
  }
  const todayAccs = presDay.get(today)?.accs || new Set<string>();

  const picDay = new Map((await query<{ d: string; n: number }>(`SELECT left(COALESCE(meta->>'date', created::text), 10) AS d, count(*)::int AS n FROM images GROUP BY 1`)).rows.map((r) => [r.d, r.n] as [string, number]));
  // ---- one pass over every account
  const P = { real: 0, registered: 0, guests: 0, active24h: 0, active7d: 0, withCharacter: 0 };
  const newBy = new Map<string, number>(d14.map((d) => [d, 0]));
  const levels = Array(B.playableLevelCap).fill(0), realms = Array(C.REALMS.length).fill(0), zones = new Map<string, number>();
  const auto = { autoTame: 0, autoFight: 0, autoBreak: 0, retreat: 0 };
  const dropped = Array(6).fill(0), held = Array(6).fill(0);
  const d30 = daysBack(now, 30), dropBy = new Map<string, number[]>(d30.map((d) => [d, Array(6).fill(0)])); let dropFirst: string | null = null;
  let counted = 0;
  const bt = { total: 0, maxPer: 0, mut: 0, tamedEver: 0, mutEver: 0, sizes: Array(5).fill(0), sp: new Map<string, number>(), tamedSp: new Set<string>() };
  const q = { activeToday: 0, done: 0, inProgress: 0, everDone: 0, byDay: new Map<string, number>(d14.map((d) => [d, 0])) };
  const names = new Map<string, { name: string; email: string; guest: boolean }>();
  const realIds = new Set<string>();
  for await (const a of eachAccount()) {
    const st = a.st;
    P.real++; realIds.add(a.id); if (a.guest) P.guests++; else P.registered++;
    if (st) names.set(a.id, { name: st.player.name, email: a.email, guest: a.guest });
    {
      const day = dayKey(a.created); if (newBy.has(day)) newBy.set(day, newBy.get(day)! + 1);
      const seen = sess.get(a.id) || 0;
      if (now - seen < DAY) P.active24h++;
      if (now - seen < 7 * DAY) P.active7d++;
    }
    if (!st || !st.player) continue;
    P.withCharacter++;
    const tot = st.tot?.items;
    {
      counted++;
      if (tot) tot.forEach((n, i) => { dropped[i] += n || 0; });
      for (const [d, arr] of Object.entries(st.tot?.byDay || {})) { const row = dropBy.get(d); if (row) arr.forEach((n, i) => { row[i] += n || 0; }); if (!dropFirst || d < dropFirst) dropFirst = d; }
      for (const it of [...(st.bag || []), ...(st.stash || []), ...Object.values(st.eq || {}).filter((x): x is G.Item => !!x)]) held[it.tier] = (held[it.tier] || 0) + 1;
    }
    // beasts
    const nb = (st.beasts || []).length;
    bt.total += nb; bt.maxPer = Math.max(bt.maxPer, nb);
    for (const m of st.beasts || []) {
      if (m.mut) bt.mut++;
      bt.sizes[m.cls] = (bt.sizes[m.cls] || 0) + 1;
      bt.sp.set(m.sp, (bt.sp.get(m.sp) || 0) + 1);
    }
    for (const [sp, b] of Object.entries(st.best || {})) { if (b.tamed > 0) { bt.tamedEver += b.tamed; bt.tamedSp.add(sp); } bt.mutEver += b.mutTamed || 0; }
    // world
    const L = G.levelOf(st.player); levels[Math.min(levels.length, Math.max(1, L)) - 1]++;
    realms[Math.min(realms.length - 1, st.player.realm)]++;
    const zn = C.ZONE(st.zone).name; zones.set(zn, (zones.get(zn) || 0) + 1);
    if (st.set.autoTame) auto.autoTame++; if (st.set.autoFight) auto.autoFight++; if (st.set.autoBreak) auto.autoBreak++; if (st.set.mode === 'retreat') auto.retreat++;
    // the daily quest
    const days = new Set(st.questDays || []);
    if (st.quest && st.quest.done) days.add(st.quest.day);
    if (days.size) q.everDone++;
    for (const d of d14) if (days.has(d)) q.byDay.set(d, q.byDay.get(d)! + 1);
    const active = todayAccs.has(a.id) || (sess.get(a.id) || 0) >= startToday;
    if (active) q.activeToday++;
    if (days.has(today)) q.done++; else if (st.quest && st.quest.day === today && st.quest.n > 0) q.inProgress++;
  }

  // ---- online time (real players only)
  let totalMins = 0, accDays = 0; const perAcc: { acc: string; mins: number; days: number }[] = [];
  for (const [acc, v] of presAcc) if (realIds.has(acc)) { totalMins += v.mins; accDays += v.days; perAcc.push({ acc, ...v }); }
  const bucketN = BUCKETS.map(() => 0);
  for (const p of perAcc) bucketN[BUCKETS.findIndex(([, max]) => p.mins < max)]++;
  const presDays = [...presDay.keys()].sort();
  const todayReal = [...todayAccs].filter((x) => realIds.has(x));
  const online: Report['online'] = {
    since: presDays[0] || null,
    totalHours: r2(totalMins / 60), players: perAcc.length,
    avgHoursPerPlayer: perAcc.length ? r2(totalMins / 60 / perAcc.length) : 0,
    avgMinPerActiveDay: accDays ? Math.round(totalMins / accDays) : 0,
    todayHours: r2(todayReal.reduce((s, x) => s + (pres.find((r) => r.acc === x && r.day === today)?.mins || 0), 0) / 60), todayPlayers: todayReal.length,
    byDay: d14.map((day) => { const accs = [...(presDay.get(day)?.accs || [])].filter((x) => realIds.has(x)); return { day, hours: r2(pres.filter((r) => r.day === day && realIds.has(r.acc)).reduce((s, r) => s + r.mins, 0) / 60), players: accs.length }; }),
    tz: '', hours: [], heat: [], peak: [], daysCounted: 0,
    buckets: BUCKETS.map(([label], i) => ({ label, n: bucketN[i] })),
    top: perAcc.sort((x, y) => y.mins - x.mins).slice(0, 10).map((p) => { const n = names.get(p.acc); return { name: n?.name || '(chưa có nhân vật)', email: n ? fullEmail(n.email) : '', kind: n?.guest ? 'khách' : 'đã đăng ký', hours: r2(p.mins / 60), days: p.days }; }),
  };

  // ---- which hours of the day (Việt Nam time, UTC+7) players are there. Bit m of a day (UTC) is the minute m; a player counts in an hour when at least one minute of it is marked.
  const TZ_MIN = 420, TZ_MS = TZ_MIN * 60000;
  const local = (ms: number) => { const t = new Date(ms + TZ_MS); return { day: t.toISOString().slice(0, 10), hour: t.getUTCHours() }; };
  const perHour = new Map<string, Set<string>>(), minsByHour = Array(24).fill(0);   // 'localDay|hour' -> players
  let firstMs = Infinity;
  for (const r of pres) {
    if (!realIds.has(r.acc)) continue;
    const base = Date.parse(r.day + 'T00:00:00Z');
    for (let h = 0; h < 24; h++) {
      // the 60 minutes of UTC hour h belong to one local hour (the offset is a whole number of hours)
      const seg = r.bits.slice(h * 60, h * 60 + 60), n = seg.split('1').length - 1;
      if (!n) continue;
      const at = base + h * 3600000, l = local(at), k = `${l.day}|${l.hour}`;
      (perHour.get(k) || perHour.set(k, new Set()).get(k)!).add(r.acc);
      minsByHour[l.hour] += n; firstMs = Math.min(firstMs, at);
    }
  }
  // days that can be averaged: from the first hour with data up to now. An hour that has not happened yet today is not counted as "nobody came".
  const hoursOut: Report['online']['hours'] = [];
  for (let h = 0; h < 24; h++) {
    let sum = 0, peak = 0, days = 0;
    if (firstMs !== Infinity) {
      const startDay = local(firstMs).day;
      for (let d = Date.parse(startDay + 'T00:00:00Z'); d <= Date.parse(local(now).day + 'T00:00:00Z'); d += DAY) {
        const hourStartMs = d + h * 3600000 - TZ_MS;
        if (hourStartMs > now || hourStartMs + 3600000 <= firstMs) continue;
        days++; const c = perHour.get(`${new Date(d).toISOString().slice(0, 10)}|${h}`)?.size || 0; sum += c; peak = Math.max(peak, c);
      }
    }
    hoursOut.push({ hour: h, players: days ? r2(sum / days) : 0, peak, minutes: minsByHour[h] });
  }
  const localDays14 = Array.from({ length: 14 }, (_, i) => local(now - (13 - i) * DAY).day);
  const heat = localDays14.map((day) => ({ day, cells: Array.from({ length: 24 }, (_, h) => perHour.get(`${day}|${h}`)?.size || 0) }));
  online.tz = 'giờ Việt Nam (UTC+7)'; online.hours = hoursOut; online.heat = heat;
  online.peak = [...hoursOut].filter((x) => x.players > 0).sort((a, b) => b.players - a.players || b.minutes - a.minutes).slice(0, 3).map((x) => ({ hour: x.hour, players: x.players }));
  online.daysCounted = new Set([...perHour.keys()].map((k) => k.split('|')[0])).size;

  const pack = D.packOn(today);
  const speciesInGame = D.allSpecies().length;
  return {
    at: now, day: today,
    note: [
      'Thời gian online tính theo số phút mà trang game còn mở và đang hiện (biểu đồ theo giờ dùng giờ Việt Nam): mỗi phút có ít nhất một lần hỏi trạng thái thì tính là 1 phút. Số liệu bắt đầu ghi từ lúc bản này chạy.',
      'Số vật phẩm đã rơi chỉ đếm từ lúc bản này chạy. Số vật phẩm đang giữ là số thật trong túi, kho tạm và đang mặc.',
      'Chi phí theo ngày trước khi có sổ theo ngày được ước tính từ giá ghi trên các ảnh đã lưu (không gồm ảnh bị loại).',
      'Khách là tài khoản chưa liên kết email.',
    ],
    ai,
    players: {
      ...P, newByDay: d14.map((day) => ({ day, n: newBy.get(day) || 0 })), levels,
      realms: realms.map((n, i) => ({ name: C.REALMS[i], n })).filter((x) => x.n > 0 || x.name === C.REALMS[0]),
      zones: [...zones.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n), auto,
    },
    online,
    items: { names: C.RARITY, colors: C.RCOLOR, dropped, held, since: 'lúc bản báo cáo này chạy', accountsCounted: counted,
      byDay: d30.map((day) => ({ day, n: dropBy.get(day)! })), trackedSince: dropFirst,
      content: d30.map((day) => { const pk = D.dailyPacks().find((x) => x.day === day); return { day, beasts: pk?.beast ? 1 : 0, weapons: pk?.weapon ? 1 : 0, pictures: picDay.get(day) || 0 }; }) },
    beasts: {
      total: bt.total, avgPerPlayer: P.withCharacter ? r2(bt.total / P.withCharacter) : 0, maxPerPlayer: bt.maxPer, mutants: bt.mut, tamedEver: bt.tamedEver, mutTamedEver: bt.mutEver,
      speciesInGame, speciesTamed: bt.tamedSp.size,
      sizes: C.SIZE_CLASS.map((name, i) => ({ name, n: bt.sizes[i] || 0 })),
      species: [...bt.sp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, n]) => ({ id, name: G.SP(id).name, n })),
    },
    quest: {
      day: today, creature: pack && pack.beast ? pack.beast.name : null, need: B.questTame, activeToday: q.activeToday, done: q.done, inProgress: q.inProgress,
      notStarted: Math.max(0, q.activeToday - q.done - q.inProgress), everDone: q.everDone, byDay: d14.map((day) => ({ day, done: q.byDay.get(day) || 0 })),
    },
  };
}

// The answer is kept for a minute in each server instance: the page may be refreshed often and the scan reads every save.
const g = globalThis as any;
const CACHE: { at: number; v: Report | null; p: Promise<Report> | null } = g.__tutienReport || (g.__tutienReport = { at: 0, v: null, p: null });
export async function cachedReport(now = Date.now(), fresh = false): Promise<Report> {
  if (!fresh && CACHE.v && now - CACHE.at < 60_000) return CACHE.v;
  if (CACHE.p) return CACHE.p;
  CACHE.p = buildReport(now).then((v) => { CACHE.v = v; CACHE.at = Date.now(); return v; }).finally(() => { CACHE.p = null; });
  return CACHE.p;
}
