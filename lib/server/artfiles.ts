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
