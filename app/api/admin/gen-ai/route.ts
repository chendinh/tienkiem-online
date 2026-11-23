import { ApiError } from '@/lib/server/auth';
import { json, guard, readBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/admin';
import { accountByEmail, bonusOf, grantBonus, listUsers, spentToday, turnsUsed } from '@/lib/server/genaiQuota';
import { UNLIMITED_EMAILS, isUnlimited, turnsLeft } from '@/lib/genai';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Owner only (Authorization: Bearer <ADMIN_KEY>). The picture maker /gen-ai, per account.
// GET                  -> { limit, budget, spent, users: [{ acc, email, total, today, free, bonus, left, last, unlimited }] }
// POST { email, add }  -> add (or, when negative, take away) bonus turns for the account with that e-mail; the bonus is spent after the free turns of the day.
const limitPerDay = () => Math.max(1, Math.floor(Number(process.env.GENAI_DAILY_LIMIT) || 3));
const budgetPerDay = () => Number(process.env.GENAI_DAILY_BUDGET_USD) || 5;
const extra = () => process.env.GENAI_UNLIMITED || '';

export async function GET(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const limit = limitPerDay();
    const users = (await listUsers()).map((u) => {
      const unlimited = isUnlimited(u.email, extra());
      return { acc: u.acc, email: u.email, total: u.n, today: u.today, free: Math.max(0, limit - u.today), bonus: u.bonus, left: unlimited ? null : turnsLeft(limit, u.today, u.bonus), last: u.last, unlimited };
    });
    return json({ ok: true, limit, budget: budgetPerDay(), spent: Math.round((await spentToday()) * 10000) / 10000, owners: UNLIMITED_EMAILS, users });
  });
}

export async function POST(req: Request) {
  return guard(async () => {
    requireAdmin(req);
    const b: any = await readBody(req);
    const add = Number(b?.add);
    if (typeof b?.email !== 'string' || !b.email.includes('@') || !Number.isInteger(add) || add === 0 || Math.abs(add) > 1000) throw new ApiError('E_BAD_REQUEST');
    const acc = await accountByEmail(b.email);
    if (!acc) throw new ApiError('E_GENAI_NOUSER', 404);
    const bonus = await grantBonus(acc.id, acc.email, add);
    const limit = limitPerDay(), today = await turnsUsed(acc.id);
    return json({ ok: true, email: acc.email, bonus, left: turnsLeft(limit, today, await bonusOf(acc.id)) });
  });
}
