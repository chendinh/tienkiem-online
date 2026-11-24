import { after } from 'next/server';
import { idFromUrl, info, provider, request, estimateCost } from '@/lib/imagegen';
import { indexImage } from '@/lib/server/imageindex';
import { drawStatus, forgetDrawnArt } from '@/lib/server/artstatus';
import { artKey, ART_GROUPS, DRAW_POINTS, takeBatch, pointsOf, blockedBy, type Blocked, type Todo, type TodoGroup } from '@/lib/artjobs';
import { STYLE_VERSION } from '@/lib/imageprompt';
import { json, readBody, guard } from '@/lib/server/http';
import { ApiError } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // pictures are drawn after the answer is sent: the function must stay alive until they are saved

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r2 = (n: number) => Math.round(n * 100) / 100;
// An item icon is asked for like the script does (lowest priority, so a player's own request goes first); a fixed picture exactly as pregen asks.
const specOf = (t: Todo) => (t.group === 'looks' ? { ...t.spec, pri: 3 } : t.spec);
// A fixed picture is remembered under its file path once it exists; an item icon is indexed by its look when it is saved (lib/imagegen.ts) and needs nothing more.
const link = async (t: Todo, url: string) => { if (t.dest) await indexImage(artKey(t.dest), idFromUrl(url), STYLE_VERSION); };

// What is still missing (item icons and fixed pictures), what drawing it would cost, and the money left.
async function status() {
  const s = await drawStatus(true), P = provider(), i = await info();
  const by: Record<string, number> = {};
  for (const t of s.todo) by[t.group] = (by[t.group] || 0) + 1;
  const batch = takeBatch(s.todo);
  const cost = (l: Todo[]) => r2(l.reduce((a, t) => a + estimateCost(specOf(t)), 0));
  const names = [...new Set(s.todo.map((t) => t.label))].slice(0, 6);
  return {
    missing: s.todo.length, looks: s.looks, total: s.art.total, shipped: s.art.shipped, drawn: s.art.drawn, listOk: s.art.listOk,
    groups: (['looks', ...ART_GROUPS] as TodoGroup[]).filter((g) => by[g]).map((g) => ({ group: g, missing: by[g] })),
    names, batch: batch.length, batchCost: cost(batch), totalCost: cost(s.todo),
    provider: { name: P.name, enabled: P.enabled, paid: P.paid, ...(i.locked ? { locked: String(i.locked).slice(0, 120) } : {}) },
    budget: i.budget ? { spent: r2(i.budget.spentUsd), cap: r2(i.budget.capUsd) } : null,
    queued: i.queued, running: i.running, hour: i.hour, blocked: blockedBy(P, i),
  };
}

export async function GET(req: Request) {
  return guard(async () => { requireAdmin(req); return json({ ok: true, ...(await status()) }); });
}

// Draws the next missing pictures (DRAW_POINTS worth). Pictures the database already has are only linked (free), the others are queued and drawn by the image service; each one is
// remembered when it is saved (lib/imagegen.ts): an item icon by its look, a fixed picture by its file path, which app/api/art serves wherever the game asks for that file.
export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const P = provider();
    if (!P.enabled) throw new ApiError('E_IMAGE_OFF', 409);
    const s = await drawStatus(true);
    // the list of shipped files could not be read: drawing the fixed pictures now could pay for pictures that already exist (item icons do not depend on it)
    const todo = s.art.listOk ? s.todo : s.todo.filter((t) => t.group === 'looks');
    if (!todo.length && !s.art.listOk) throw new ApiError('E_NO_ART_LIST', 409);
    // Walk down the list until enough pictures are really queued. A picture that cannot be drawn now (it already exists, another instance holds it, it only has a stand-in,
    // it failed) is skipped and does not use up the batch: otherwise the same few at the head of the list would block every press.
    const out = { linked: 0, started: 0, near: 0, held: 0, limited: 0, failed: 0, looked: 0 }, live: Todo[] = [];
    let reason: Blocked = null, used = 0;
    const t0 = Date.now();
    for (const t of todo) {
      if (used + pointsOf(t) > DRAW_POINTS || Date.now() - t0 > 30000) break;
      out.looked++;
      const res = await request(specOf(t));
      if (res.status === 'ready' && res.url) {
        if (res.near) {   // only a stand-in exists and none is drawn now: find out why (no credit, locked, hourly cap) and stop if every other one would be refused too
          reason = blockedBy(P, await info());
          if (reason) break;
          out.near++; continue;
        }
        try { await link(t, res.url); out.linked++; } catch { out.failed++; }
      }
      else if (res.status === 'pending') { if (res.held) { out.held++; continue; } out.started++; used += pointsOf(t); live.push(t); }
      else if (res.status === 'limited' || res.status === 'disabled') { out.limited++; reason = blockedBy(P, await info()) || { why: 'hour' }; break; }
      else out.failed++;
    }
    console.log('[admin/art]', JSON.stringify({ ...out, reason, todo: todo.length, ms: Date.now() - t0 }));
    forgetDrawnArt();
    // Serverless hosting freezes the function once the answer is sent: keep it running until the queued pictures are drawn and saved. The queue forgets a picture nobody has asked
    // about for 90 seconds (its page is gone), and the pictures wait one behind the other, so each one is asked about again every 15 seconds until it is finished.
    if (live.length) after(async () => {
      const end = Date.now() + 270000;
      let left = live;
      while (left.length && Date.now() < end) {
        await sleep(15000);
        const next: Todo[] = [];
        for (const t of left) {
          const r = await request(specOf(t)).catch(() => null);
          if (r && r.status === 'pending') next.push(t);
          else if (r && r.status === 'ready' && r.url && !r.near) await link(t, r.url).catch(() => {});
        }
        left = next;
      }
      forgetDrawnArt();
    });
    return json({ ok: true, ...out, reason, points: DRAW_POINTS });
  });
}
