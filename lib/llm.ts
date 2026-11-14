import fs from 'node:fs';
import path from 'node:path';

// Server-only Claude client with a hard spend cap and a per-hour call limit. Also keeps the image spend ledger.
const DIR = path.join(process.cwd(), 'data');
const USAGE = path.join(DIR, 'usage.json');
const g = globalThis as any;
const U: { calls: Record<string, number[]> } = g.__tutienLlm || (g.__tutienLlm = { calls: {} });
// USD per million tokens (input, output). Assumed, deliberately on the high side: check your console for real prices.
const PRICE: Record<string, [number, number]> = { 'claude-haiku-5-5': [1, 5], 'claude-sonnet-5-5': [3, 15] };

interface Usage { spentUsd: number; imageUsd: number }
function readUsage(): Usage {
  try { const j = JSON.parse(fs.readFileSync(USAGE, 'utf8')); return { spentUsd: j.spentUsd || 0, imageUsd: j.imageUsd || 0 }; } catch { return { spentUsd: 0, imageUsd: 0 }; }
}
function writeUsage(u: Usage) {
  try { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(USAGE, JSON.stringify({ ...u, updated: new Date().toISOString() })); } catch {}
}
const r4 = (x: number) => Math.round(x * 10000) / 10000;
export const llmEnabled = () => !!process.env.TUTIEN_ONLINE_AI_KEY;
export const budget = () => ({ spentUsd: r4(readUsage().spentUsd), capUsd: Number(process.env.AI_BUDGET_USD || 3) });
export const imageBudget = () => ({ spentUsd: r4(readUsage().imageUsd), capUsd: Number(process.env.IMAGE_BUDGET_USD || 2) });
export function addImageCost(usd: number) { const u = readUsage(); u.imageUsd += usd; writeUsage(u); }

export async function ask(o: { model: string; system?: string; content: any; maxTokens: number; tag: string; maxPerHour: number }): Promise<string> {
  const key = process.env.TUTIEN_ONLINE_AI_KEY;
  if (!key) throw new Error('no-key');
  const b = budget();
  if (b.spentUsd >= b.capUsd) throw new Error('budget');
  const now = Date.now();
  const arr = (U.calls[o.tag] = (U.calls[o.tag] || []).filter((t) => now - t < 3600e3));
  if (arr.length >= o.maxPerHour) throw new Error('rate');
  arr.push(now);
  const send = async (thinking: string) => {
    const body: any = { model: o.model, max_tokens: o.maxTokens, thinking: { type: thinking }, messages: [{ role: 'user', content: o.content }] };
    if (o.system) body.system = o.system;
    const r = await fetch(`${process.env.TUTIEN_AI_BASE || 'https://api.anthropic.com'}/v1/messages`, {
      method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(150000),
    });
    return { r, j: (await r.json().catch(() => ({}))) as any };
  };
  // Newer models want "between_tools" to switch thinking off; learn it once per model.
  const pref: Record<string, string> = (g.__tutienThink = g.__tutienThink || {});
  let { r, j } = await send(pref[o.model] || 'disabled');
  if (!r.ok && String(j?.error?.message || '').includes('between_tools') && !pref[o.model]) { pref[o.model] = 'between_tools'; ({ r, j } = await send('between_tools')); }
  if (!r.ok) throw new Error(`claude ${r.status} ${String(j?.error?.message || '').slice(0, 120)}`);
  const [pi, po] = PRICE[o.model] || [3, 15];
  const u = readUsage(); // several processes share the file: read again before adding
  u.spentUsd += ((j.usage?.input_tokens || 0) * pi + (j.usage?.output_tokens || 0) * po) / 1e6;
  writeUsage(u);
  return (j.content || []).filter((x: any) => x.type === 'text').map((x: any) => x.text).join('');
}
export function parseJson(text: string): any {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no-json');
  return JSON.parse(m[0]);
}
