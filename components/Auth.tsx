'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { authPost, type AuthUser } from '@/lib/client/api';
import { Window } from './Panels';
import { passkeySupported, signInWithPasskey } from '@/lib/client/passkey';
import { errText } from '@/lib/strings';
import { BALANCE } from '@/lib/balance';
import { Lockup } from './Logo';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

// Sign in, register (with the body template choice), and password reset (Requirement 1, 31.15).
const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
);

export function AuthScreen({ onDone, google = false, initialNote = null }: { onDone: (u: AuthUser) => void; google?: boolean; initialNote?: { t: string; ok: boolean } | null }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [gender, setGender] = useState<'' | 'f' | 'm'>('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: 'email' | 'password'; text: string } | null>(null);
  const [note, setNote] = useState(initialNote ? initialNote.t : '');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('reset');
    if (t) { setToken(t); setMode('reset'); }
    if (new URLSearchParams(window.location.search).get('authError')) { setErr({ text: 'Đăng nhập bằng Google không thành công. Hãy thử lại hoặc dùng cách khác.' }); window.history.replaceState(null, '', '/'); }
  }, []);
  const [pk, setPk] = useState(false);
  useEffect(() => { setPk(passkeySupported()); }, []);
  const usePasskey = async () => {
    setErr(null); setNote(''); setBusy(true);
    try { const r = await signInWithPasskey(); if (r.user) onDone(r.user); else if (r.code !== 'cancel') fail(r.code); } finally { setBusy(false); }
  };
  const playGuest = async () => {
    setErr(null); setNote(''); setBusy(true);
    try { const r = await authPost({ action: 'guest' }); if (r.ok && r.user) onDone(r.user); else fail(r.code); } finally { setBusy(false); }
  };

  const fail = (code?: string) => {
    const field = code === 'E_EMAIL' || code === 'E_EMAIL_TAKEN' ? 'email' : code === 'E_PASSWORD' ? 'password' : undefined;
    setErr({ field, text: errText(code || 'E_SERVER') });
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null); setNote(''); setBusy(true);
    try {
      if (mode === 'login') {
        const r = await authPost({ action: 'login', email, password: pw });
        if (r.ok && r.user) onDone(r.user); else fail(r.code);
      } else if (mode === 'register') {
        const r = await authPost({ action: 'register', email, password: pw, gender: gender || undefined });
        if (r.ok && r.user) onDone(r.user); else fail(r.code);
      } else if (mode === 'forgot') {
        const r = await authPost({ action: 'reset-request', email });
        if (r.ok) setNote('Nếu email này đã đăng ký, một liên kết đặt lại mật khẩu đã được gửi (có hiệu lực 1 giờ, dùng một lần).'); else fail(r.code);
      } else {
        const r = await authPost({ action: 'reset-confirm', token, password: pw });
        if (r.ok) { setNote('Đã đổi mật khẩu. Mọi thiết bị đã bị đăng xuất, hãy đăng nhập lại.'); setMode('login'); setPw(''); window.history.replaceState(null, '', '/'); } else fail(r.code);
      }
    } finally { setBusy(false); }
  };
  const title = mode === 'login' ? 'Đăng nhập' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Quên mật khẩu' : 'Đặt mật khẩu mới';
  const go = (m: Mode) => { setMode(m); setErr(null); setNote(''); };
  return (
    <div className="authScreen">
      <form className="authBox form" onSubmit={submit} noValidate>
        <Lockup width={320} />
        <h2>{title}</h2>
        {(mode === 'login' || mode === 'register') && (
          <div className="authQuick">
            <button type="button" className="btn big" disabled={busy} onClick={playGuest}>Chơi ngay, chưa cần tài khoản</button>
            <small className="hint">Liên kết email trong cài đặt</small>
            {pk && <button type="button" className="btn authPasskey" disabled={busy} onClick={usePasskey}>Đăng nhập bằng vân tay / khuôn mặt (passkey)</button>}
            {google && <a className="btn authGoogle" href="/api/auth/google"><GoogleG />Tiếp tục với Google</a>}
            <div className="authOr"><span>hoặc dùng email</span></div>
          </div>
        )}
        {mode !== 'reset' && (
          <label className="field">Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={err?.field === 'email'} aria-describedby={err?.field === 'email' ? 'e-email' : undefined} />
            {err?.field === 'email' && <span className="err" id="e-email" role="alert">{err.text}</span>}
          </label>
        )}
        {mode !== 'forgot' && (
          <label className="field">{mode === 'reset' ? 'Mật khẩu mới' : 'Mật khẩu'}
            <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} required minLength={mode === 'login' ? undefined : BALANCE.passwordMinLength}
              aria-invalid={err?.field === 'password'} aria-describedby={err?.field === 'password' ? 'e-pw' : undefined} />
            {mode !== 'login' && <small className="hint">Ít nhất {BALANCE.passwordMinLength} ký tự.</small>}
            {err?.field === 'password' && <span className="err" id="e-pw" role="alert">{err.text}</span>}
          </label>
        )}
        {mode === 'register' && (
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend>Thân phận (diện mạo chi tiết do Thiên Đạo định)</legend>
            <div className="genderPick">
              {([['f', 'Nữ tu'], ['m', 'Nam tu'], ['', 'Để Thiên Đạo quyết định']] as const).map(([v, label]) => (
                <label key={v || 'any'}><input type="radio" name="gender" checked={gender === v} onChange={() => setGender(v)} />{label}</label>
              ))}
            </div>
          </fieldset>
        )}
        {err && !err.field && <div className="formErr" role="alert">{err.text}</div>}
        {note && <div className="formOk" role="status">{note}</div>}
        <button className={`btn ${mode === 'login' || mode === 'register' ? '' : 'big'}`} disabled={busy} type="submit">{busy ? 'Đang xử lý…' : mode === 'login' ? 'Vào đạo đồ' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Gửi liên kết' : 'Lưu mật khẩu'}</button>
        <div className="linkRow">
          {mode !== 'login' && <button type="button" className="link" onClick={() => go('login')}>Đã có tài khoản? Đăng nhập</button>}
          {mode !== 'register' && mode !== 'reset' && <button type="button" className="link" onClick={() => go('register')}>Tạo tài khoản mới</button>}
          {mode === 'login' && <button type="button" className="link" onClick={() => go('forgot')}>Quên mật khẩu</button>}
        </div>
      </form>
    </div>
  );
}

// Guest -> real account: ask for an e-mail and a password, send the confirmation mail, wait for the click.
export function LinkEmailModal({ onClose, onLinked }: { onClose: () => void; onLinked: (email: string) => void }) {
  const [code, setCode] = useState(''), [codeErr, setCodeErr] = useState('');
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: 'email' | 'password'; text: string } | null>(null);
  const [sent, setSent] = useState('');
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const r = await authPost({ action: 'link-request', email, password: pw });
      if (r.ok) setSent(email.trim());
      else setErr({ field: r.code === 'E_EMAIL' || r.code === 'E_EMAIL_TAKEN' ? 'email' : r.code === 'E_PASSWORD' ? 'password' : undefined, text: errText(r.code || 'E_SERVER') });
    } finally { setBusy(false); }
  };
  return (
    <Window title="Liên kết email" icon="scroll" sub="Giữ đạo đồ, đăng nhập mọi thiết bị, đổi mật khẩu khi cần" onClose={onClose}>
      {sent ? (
        <div className="linkSent" role="status">
          <img src="/mail/emblem.png" width={64} height={64} alt="" draggable={false} />
          <h3>Thư xác nhận đã được gửi</h3>
          <p>Mở hộp thư của <b>{sent}</b> và bấm nút <b>Xác nhận email</b>. Liên kết có hiệu lực 1 giờ. Chưa thấy thư thì xem cả mục thư rác.</p>
          <form className="codeRow" onSubmit={async (e) => { e.preventDefault(); setCodeErr(''); setBusy(true); try { const r = await authPost({ action: 'link-code', code }); if (r.ok && r.user) onLinked(r.user.email); else setCodeErr(errText(r.code || 'E_SERVER')); } finally { setBusy(false); } }}>
            <label className="field">Hoặc nhập mã 6 số trong thư
              <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-invalid={!!codeErr} />
              {codeErr && <span className="err" role="alert">{codeErr}</span>}
            </label>
            <button className="btn" disabled={busy || code.length !== 6} type="submit">Xác nhận</button>
          </form>
          <button className="btn ghost sm" onClick={onClose}>Để sau</button>
        </div>
      ) : (
        <form className="form" onSubmit={submit} noValidate>
          <p className="tag">Tài khoản khách chỉ nằm trong trình duyệt này. Sau khi xác nhận email, ngươi vào lại được từ bất kỳ máy nào, và dùng "Quên mật khẩu" khi cần.</p>
          <label className="field">Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={err?.field === 'email'} />
            {err?.field === 'email' && <span className="err" role="alert">{err.text}</span>}
          </label>
          <label className="field">Mật khẩu
            <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={BALANCE.passwordMinLength} aria-invalid={err?.field === 'password'} />
            <small className="hint">Ít nhất {BALANCE.passwordMinLength} ký tự.</small>
            {err?.field === 'password' && <span className="err" role="alert">{err.text}</span>}
          </label>
          {err && !err.field && <div className="formErr" role="alert">{err.text}</div>}
          <button className="btn big" disabled={busy} type="submit">{busy ? 'Đang gửi…' : 'Gửi thư xác nhận'}</button>
        </form>
      )}
    </Window>
  );
}
