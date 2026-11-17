// The real credit balance of the fal account, for the report page. fal exposes it at GET /v1/account/billing?expand=credits, but only to a key that has the
// billing:usage:read permission (the BILLING, READONLY and FULL presets on fal.ai/dashboard/keys); an inference-only key gets HTTP 403.
// FAL_BILLING_KEY is used when set (a separate read-only key, so the key that draws pictures never needs billing rights), otherwise FAL_KEY is tried.
export interface FalBalance { configured: boolean; balance: number | null; currency: string; error: string | null; at: number }
const g = globalThis as any;
const CACHE: { v: FalBalance | null } = g.__tutienFalBalance || (g.__tutienFalBalance = { v: null });
const TTL = 5 * 60_000;

export const falBillingKey = () => process.env.FAL_BILLING_KEY || process.env.FAL_KEY || '';

export function parseBalance(j: any): { balance: number; currency: string } | null {
  const c = j && j.credits;
  const raw = c && c.current_balance;
  const n = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;   // never turn a missing balance into zero
  return { balance: n, currency: typeof c.currency === 'string' && /^[A-Za-z]{3}$/.test(c.currency) ? c.currency.toUpperCase() : 'USD' };
}

export async function falBalance(now = Date.now(), fetchImpl: typeof fetch = fetch): Promise<FalBalance> {
  const key = falBillingKey();
  if (!key) return { configured: false, balance: null, currency: 'USD', error: null, at: now };
  if (CACHE.v && now - CACHE.v.at < TTL && fetchImpl === fetch) return CACHE.v;
  const out: FalBalance = { configured: true, balance: null, currency: 'USD', error: null, at: now };
  try {
    const r = await fetchImpl('https://api.fal.ai/v1/account/billing?expand=credits', { headers: { Authorization: `Key ${key}` }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (r.status === 401 || r.status === 403) out.error = 'Khóa fal không có quyền đọc số dư (cần quyền billing:usage:read, ví dụ bộ quyền BILLING). Tạo thêm một khóa mới và đặt vào FAL_BILLING_KEY.';
    else if (!r.ok) out.error = `fal trả lỗi ${r.status}.`;
    else {
      const p = parseBalance(await r.json().catch(() => null));
      if (p) { out.balance = p.balance; out.currency = p.currency; } else out.error = 'fal không trả về số dư.';
    }
  } catch { out.error = 'Không gọi được fal.'; }
  if (fetchImpl === fetch) CACHE.v = out;
  return out;
}

// ---- what fal really charged: GET /v1/models/usage (same key rights as the balance: billing:usage:read, i.e. the BILLING preset).
// One row per day and model with the amount charged after discounts (cost_total). Unlike the game's own ledger it includes everything fal billed,
// pictures that were drawn and then thrown away by the picture check, and calls made by scripts on another machine with the same account.
export interface FalUsage { ok: boolean; error: string | null; at: number; from: string; to: string; total: number; days: { day: string; usd: number }[]; byModel: { endpoint: string; usd: number; qty: number; unit: string }[] }
const UCACHE: { v: FalUsage | null } = g.__tutienFalUsage || (g.__tutienFalUsage = { v: null });

export function parseUsage(pages: any[]): { days: Map<string, number>; byModel: Map<string, { usd: number; qty: number; unit: string }> } | null {
  const days = new Map<string, number>(), byModel = new Map<string, { usd: number; qty: number; unit: string }>();
  let seen = false;
  for (const j of pages) {
    if (!j || !Array.isArray(j.time_series)) continue;
    for (const b of j.time_series) {
      if (!b || typeof b.bucket !== 'string' || !Array.isArray(b.results)) continue;
      seen = true;
      const day = b.bucket.slice(0, 10);
      for (const r of b.results) {
        const c = Number(r && (r.cost_total ?? r.cost));
        if (!Number.isFinite(c) || c < 0) continue;
        days.set(day, (days.get(day) || 0) + c);
        const k = String(r.endpoint_id || '?'), m = byModel.get(k) || { usd: 0, qty: 0, unit: String(r.unit || '') };
        m.usd += c; m.qty += Number(r.quantity) || 0; byModel.set(k, m);
      }
    }
  }
  return seen ? { days, byModel } : null;
}

// The last `n` days (UTC), today included. Follows next_cursor, at most 20 pages.
export async function falUsage(now = Date.now(), n = 60, fetchImpl: typeof fetch = fetch): Promise<FalUsage | null> {
  const key = falBillingKey();
  if (!key) return null;
  if (UCACHE.v && now - UCACHE.v.at < TTL && fetchImpl === fetch) return UCACHE.v;
  const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const from = dayOf(now - (n - 1) * 86400_000), to = dayOf(now + 86400_000);   // end is exclusive
  const out: FalUsage = { ok: false, error: null, at: now, from, to, total: 0, days: [], byModel: [] };
  try {
    const pages: any[] = [];
    let cursor = '';
    for (let i = 0; i < 20; i++) {
      const q = new URLSearchParams({ start: from, end: to, timeframe: 'day', timezone: 'UTC', expand: 'time_series', ...(cursor ? { cursor } : {}) });
      const r = await fetchImpl(`https://api.fal.ai/v1/models/usage?${q}`, { headers: { Authorization: `Key ${key}` }, signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (r.status === 401 || r.status === 403) { out.error = 'Khóa fal không có quyền đọc mức dùng (cần quyền billing:usage:read, bộ quyền BILLING).'; break; }
      if (r.status === 429) { out.error = 'fal đang giới hạn tốc độ, thử lại sau.'; break; }
      if (!r.ok) { out.error = `fal trả lỗi ${r.status}.`; break; }
      const j = await r.json().catch(() => null);
      pages.push(j);
      if (!j || !j.next_cursor || j.has_more === false) break;
      cursor = String(j.next_cursor);
    }
    if (!out.error) {
      const p = parseUsage(pages);
      if (!p) out.error = 'fal không trả về dữ liệu mức dùng.';
      else {
        out.ok = true;
        const all = Array.from({ length: n }, (_, i) => dayOf(now - (n - 1 - i) * 86400_000));
        out.days = all.map((day) => ({ day, usd: Math.round((p.days.get(day) || 0) * 10000) / 10000 }));
        out.total = Math.round(out.days.reduce((a, d) => a + d.usd, 0) * 10000) / 10000;
        out.byModel = [...p.byModel.entries()].map(([endpoint, v]) => ({ endpoint, usd: Math.round(v.usd * 10000) / 10000, qty: Math.round(v.qty * 100) / 100, unit: v.unit })).sort((a, b) => b.usd - a.usd);
      }
    }
  } catch { out.error = 'Không gọi được fal.'; }
  if (fetchImpl === fetch) UCACHE.v = out;
  return out;
}
