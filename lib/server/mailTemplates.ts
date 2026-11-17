// HTML mails in the look of the game: dark jade and gold, the Tiên Kiếm title on top, a night-sky banner, one big button.
// Table layout and inline styles only, because mail programs ignore most CSS. Pictures are PNG/JPG in /public/mail (mail programs do not show WebP).
import type { Mail } from './mail';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface Parts { origin: string; to: string; subject: string; preheader: string; heading: string; paragraphs: string[]; button: string; link: string; fine: string; code?: string }

function render(p: Parts): Mail {
  const img = (f: string) => `${p.origin}/mail/${f}`;
  const body = p.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#d9e4dc">${esc(t)}</p>`).join('');
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(p.subject)}</title></head>
<body style="margin:0;padding:0;background:#070d0b">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#070d0b">${esc(p.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#070d0b"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#0e1a15;border:1px solid #5a4a22;border-radius:14px;overflow:hidden;font-family:Georgia,'Times New Roman',serif">
<tr><td style="background:#0a1410 url('${img('banner.jpg')}') center/cover no-repeat;padding:34px 20px 26px" align="center">
<img src="${img('lockup.png')}" width="260" alt="Tiên Kiếm" style="display:block;border:0;max-width:100%;height:auto">
</td></tr>
<tr><td style="height:3px;background:linear-gradient(90deg,#0e1a15,#c9a24a,#0e1a15);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td style="padding:30px 32px 8px">
<h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;color:#f0d68c;font-weight:normal">${esc(p.heading)}</h1>
${body}
</td></tr>
${p.code ? `<tr><td align="center" style="padding:2px 32px 6px"><p style="margin:0 0 8px;font-size:13px;color:#8da096">Hoặc nhập mã này trong game:</p><div style="display:inline-block;padding:10px 22px;border:1px dashed #c9a24a;border-radius:10px;background:#0a1410;font-family:'Courier New',monospace;font-size:30px;letter-spacing:8px;color:#f0d68c">${esc(p.code)}</div></td></tr>` : ''}
<tr><td align="center" style="padding:10px 32px 26px">
<a href="${esc(p.link)}" style="display:inline-block;padding:14px 34px;border-radius:999px;background:#e0b85c;background-image:linear-gradient(180deg,#f9e6b6,#c19445);color:#2a1d05;font-size:16px;font-weight:bold;text-decoration:none;font-family:Georgia,serif">${esc(p.button)}</a>
<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8da096">Nút không bấm được? Dán liên kết này vào trình duyệt:<br><a href="${esc(p.link)}" style="color:#7fd1ae;word-break:break-all">${esc(p.link)}</a></p>
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid #23362d" align="center">
<img src="${img('emblem.png')}" width="44" height="44" alt="" style="display:block;border:0;margin:0 auto 10px">
<p style="margin:0;font-size:12px;line-height:1.6;color:#8da096">${esc(p.fine)}</p>
</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${p.heading}\n\n${p.paragraphs.join('\n\n')}\n\n${p.code ? `Mã xác nhận: ${p.code}\n\n` : ''}${p.button}: ${p.link}\n\n${p.fine}`;
  return { to: p.to, subject: p.subject, html, text, link: p.link };
}

export function resetMail(origin: string, to: string, link: string, minutes: number): Mail {
  return render({
    origin, to, link, subject: 'Tiên Kiếm: đặt lại mật khẩu', preheader: 'Liên kết đặt lại mật khẩu, dùng một lần.',
    heading: 'Đặt lại mật khẩu',
    paragraphs: ['Có người (hy vọng là ngươi) vừa xin đặt lại mật khẩu cho đạo đồ gắn với địa chỉ này.', `Liên kết dưới đây dùng được một lần và hết hạn sau ${minutes} phút. Khi ngươi đổi mật khẩu, mọi thiết bị đang đăng nhập sẽ bị đăng xuất.`],
    button: 'Đặt mật khẩu mới',
    fine: 'Nếu không phải ngươi yêu cầu, cứ bỏ qua thư này: mật khẩu hiện tại vẫn nguyên vẹn.',
  });
}

export function linkMail(origin: string, to: string, link: string, minutes: number, code: string): Mail {
  return render({
    origin, to, link, code, subject: 'Tiên Kiếm: xác nhận liên kết email', preheader: 'Bấm để giữ đạo đồ của ngươi an toàn.',
    heading: 'Liên kết email cho đạo đồ',
    paragraphs: ['Ngươi đang chơi bằng tài khoản khách. Bấm nút dưới đây để gắn địa chỉ email này vào đạo đồ.', 'Sau khi xác nhận, ngươi đăng nhập được từ mọi thiết bị bằng email và mật khẩu đã đặt, đổi mật khẩu khi quên, và tiến trình tu luyện không còn phụ thuộc vào trình duyệt này.', `Liên kết hết hạn sau ${minutes} phút và chỉ dùng một lần.`],
    button: 'Xác nhận email',
    fine: 'Nếu không phải ngươi, hãy bỏ qua thư này: không có gì thay đổi.',
  });
}
