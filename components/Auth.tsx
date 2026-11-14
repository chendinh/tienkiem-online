'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { authPost } from '@/lib/client/api';
import { errText } from '@/lib/strings';
import { BALANCE } from '@/lib/balance';
import { Lockup } from './Logo';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

// Sign in, register (with the body template choice), and password reset (Requirement 1, 31.15).
export function AuthScreen({ onDone }: { onDone: (email: string) => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [gender, setGender] = useState<'' | 'f' | 'm'>('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: 'email' | 'password'; text: string } | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('reset');
    if (t) { setToken(t); setMode('reset'); }
  }, []);

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
        if (r.ok && r.user) onDone(r.user.email); else fail(r.code);
      } else if (mode === 'register') {
        const r = await authPost({ action: 'register', email, password: pw, gender: gender || undefined });
        if (r.ok && r.user) onDone(r.user.email); else fail(r.code);
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
        <button className="btn big" disabled={busy} type="submit">{busy ? 'Đang xử lý…' : mode === 'login' ? 'Vào đạo đồ' : mode === 'register' ? 'Tạo tài khoản' : mode === 'forgot' ? 'Gửi liên kết' : 'Lưu mật khẩu'}</button>
        <div className="linkRow">
          {mode !== 'login' && <button type="button" className="link" onClick={() => go('login')}>Đã có tài khoản? Đăng nhập</button>}
          {mode !== 'register' && mode !== 'reset' && <button type="button" className="link" onClick={() => go('register')}>Tạo tài khoản mới</button>}
          {mode === 'login' && <button type="button" className="link" onClick={() => go('forgot')}>Quên mật khẩu</button>}
        </div>
      </form>
    </div>
  );
}
