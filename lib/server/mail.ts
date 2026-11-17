// Outgoing mail. With RESEND_API_KEY and MAIL_FROM set the mail is sent through Resend (plain HTTPS, no package).
// Without them the mail only goes to the logs table (name = 'outbox.log') and the server console, so development works offline.
import { appendLog } from './store';
import { query } from './db';

export interface Mail { to: string; subject: string; html: string; text: string; link?: string }

export const mailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

// The address used inside links and pictures of a mail: SITE_URL when set (production), else where the request came from.
export const siteOrigin = (req: Request) => (process.env.SITE_URL || new URL(req.url).origin).replace(/\/+$/, '');

export async function sendMail(m: Mail, now: number): Promise<void> {
  await appendLog('outbox.log', { at: now, to: m.to, subject: m.subject, link: m.link });
  if (!mailConfigured()) { console.log(`[tutien] thư tới ${m.to} (${m.subject}): ${m.link || ''}`); return; }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [m.to], subject: m.subject, html: m.html, text: m.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.error('[tutien] gửi thư thất bại', r.status, (await r.text().catch(() => '')).slice(0, 200));
  } catch (e) { console.error('[tutien] gửi thư thất bại', e); }
}

// At most 3 mails an hour to one address, so nobody can use the forms to flood a stranger's inbox (or the sending quota).
export async function mailAllowed(to: string, now: number): Promise<boolean> {
  const r = await query<{ n: number }>(`SELECT count(*)::int AS n FROM logs WHERE name = 'outbox.log' AND lower(entry->>'to') = $1 AND (entry->>'at')::bigint > $2`, [to.trim().toLowerCase(), now - 3600000]);
  return r.rows[0].n < 3;
}
