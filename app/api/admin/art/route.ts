import { after } from 'next/server';
import { idFromUrl, info, provider, request, estimateCost } from '@/lib/imagegen';
import { indexImage } from '@/lib/server/imageindex';
import { artStatus, forgetDrawnArt } from '@/lib/server/artstatus';
import { artKey, ART_GROUPS, ART_BATCH, type ArtJob } from '@/lib/artjobs';
import { STYLE_VERSION } from '@/lib/imageprompt';
import { json, readBody, guard } from '@/lib/server/http';
import { ApiError } from '@/lib/server/auth';
import { requireAdmin } from '@/lib/server/admin';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;   // pictures are drawn after the answer is sent: the function must stay alive until they are saved

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r2 = (n: number) => Math.round(n * 100) / 100;

// The fixed pictures (public/art) that are still missing, what drawing them would cost, and the money left.
async function status() {
  const s = await artStatus(true), P = provider(), i = await info();
  const by: Record<string, number> = {};
  for (const j of s.missing) by[j.group] = (by[j.group] || 0) + 1;
  const batch = s.missing.slice(0, ART_BATCH);
  return {
    total: s.total, shipped: s.shipped, drawn: s.drawn, missing: s.missing.length, listOk: s.listOk,
    groups: ART_GROUPS.filter((g) => by[g]).map((g) => ({ group: g, missing: by[g] })),
    names: s.missing.slice(0, 6).map((j) => j.dest.replace(/^\/art\//, '')),
    batch: batch.length, batchCost: r2(batch.reduce((a, j) => a + estimateCost(j.spec), 0)), totalCost: r2(s.missing.reduce((a, j) => a + estimateCost(j.spec), 0)),
    provider: { name: P.name, enabled: P.enabled, paid: P.paid, ...(i.locked ? { locked: String(i.locked).slice(0, 120) } : {}) },
    budget: i.budget ? { spent: r2(i.budget.spentUsd), cap: r2(i.budget.capUsd) } : null,
    queued: i.queued, running: i.running,
  };
}

export async function GET(req: Request) {
  return guard(async () => { requireAdmin(req); return json({ ok: true, ...(await status()) }); });
}

// Draws the next missing pictures (ART_BATCH at most). Pictures the database already has are only linked (free), the others are queued and drawn by the image service;
// each one is remembered under its file path when it is saved (lib/imagegen.ts), and app/api/art serves it wherever the game asks for that file.
export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    let body: any = {};
    try { body = await readBody(req); } catch { body = {}; }
    const P = provider();
    if (!P.enabled) throw new ApiError('E_IMAGE_OFF', 409);
    const s = await artStatus(true);
    if (!s.listOk) throw new ApiError('E_NO_ART_LIST', 409);   // the list of shipped files could not be read: drawing now could pay for pictures that already exist
    const want = Math.max(1, Math.min(ART_BATCH, Math.floor(Number(body && body.count)) || ART_BATCH));
    const out = { linked: 0, started: 0, limited: 0, failed: 0 }, live: ArtJob[] = [];
    for (const j of s.missing.slice(0, want)) {
      const res = await request(j.spec);
      if (res.status === 'ready' && res.url) { try { await indexImage(artKey(j.dest), idFromUrl(res.url), STYLE_VERSION); out.linked++; } catch { out.failed++; } }
      else if (res.status === 'pending') { out.started++; live.push(j); }
      else if (res.status === 'limited' || res.status === 'disabled') { out.limited++; break; }   // no credit, a locked provider or the hourly cap: the rest would be refused too
      else out.failed++;
    }
    forgetDrawnArt();
    // Serverless hosting freezes the function once the answer is sent: keep it running until the queued pictures are drawn and saved. The queue forgets a picture nobody has asked
    // about for 90 seconds (its page is gone), and the pictures wait one behind the other, so each one is asked about again every 15 seconds until it is finished.
    if (live.length) after(async () => {
      const end = Date.now() + 270000;
      let left = live;
      while (left.length && Date.now() < end) {
        await sleep(15000);
        const next: ArtJob[] = [];
        for (const j of left) {
          const r = await request(j.spec).catch(() => null);
          if (r && r.status === 'pending') next.push(j);
          else if (r && r.status === 'ready' && r.url) await indexImage(artKey(j.dest), idFromUrl(r.url), STYLE_VERSION).catch(() => {});
        }
        left = next;
      }
      forgetDrawnArt();
    });
    return json({ ok: true, ...out });
  });
}
