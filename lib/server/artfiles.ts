// What is shipped in public/art and what is missing from it (no database here, so scripts and tests can use it).
import fs from 'node:fs';
import path from 'node:path';
import { artKey, type ArtJob } from '../artjobs';

// The files shipped in public/art, relative to it ('books/x.jpg'). next.config.mjs reads the folder when the site is built and puts the list in ART_FILES, because a serverless
// function has no public folder to look at. Scripts and tests (no build) read the folder itself.
export function shippedArt(): Set<string> {
  const listed = process.env.ART_FILES;
  if (listed) { try { const a = JSON.parse(listed); if (Array.isArray(a)) return new Set(a.map(String)); } catch {} }
  const out = new Set<string>(), root = path.join(process.cwd(), 'public', 'art');
  const walk = (dir: string, rel: string) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`); else out.add(rel + e.name); } };
  try { walk(root, ''); } catch {}
  return out;
}

export interface ArtStatus { total: number; shipped: number; drawn: number; missing: ArtJob[]; listOk: boolean }
// Pure part: what is missing when `have` files are shipped and `drawn` keys are drawn by the server.
export function missingArt(jobs: ArtJob[], have: Set<string>, drawn: { has(k: string): boolean }): ArtStatus {
  let shipped = 0, done = 0;
  const missing: ArtJob[] = [];
  for (const j of jobs) {
    if (have.has(j.dest.replace(/^\/art\//, ''))) shipped++;
    else if (drawn.has(artKey(j.dest))) done++;
    else missing.push(j);
  }
  // an empty list of shipped files means the list could not be read: then everything would look missing and the button would pay for the whole game
  return { total: jobs.length, shipped, drawn: done, missing, listOk: have.size > 0 };
}

/** Where a fixed picture that is not a shipped file is sent (app/api/art), or null (404: the game shows its stand-in).
 *  `rel` is the path under /art ('books/x.jpg'). A picture the server drew goes to its place in the database. A small copy ('monsters/sm/x.jpg', made by `npm run thumbs`
 *  from a shipped file) that is not there is made from the big picture instead: the one the server drew, as the small copy /api/img makes ('?s=sm'), or the shipped big file.
 *  (The four beasts of Hợp Thể were drawn on the server: they had no small copy, so no picture in a fight, 2026-11-28.) */
export function artTarget(rel: string, drawn: { get(k: string): string | undefined }, shipped: { has(k: string): boolean }): string | null {
  const id = drawn.get(`art|${rel}`);
  if (id) return `/api/img/${id}`;
  const m = /^(.*\/)?sm\/([^/]+)$/.exec(rel);
  if (!m) return null;
  const big = `${m[1] || ''}${m[2]}`, bigId = drawn.get(`art|${big}`);
  if (bigId) return `/api/img/${bigId}?s=sm`;
  return shipped.has(big) ? `/art/${big}` : null;
}
