'use client';
import { useEffect, useRef, useState } from 'react';

// Themed replacement for window.confirm / window.prompt. Call askConfirm() or askPrompt() from any handler and await the answer;
// <DialogHost /> (mounted once in the root layout) draws the window. Esc or a click outside cancels.
type Opts = { title: string; body?: string; ok?: string; cancel?: string; danger?: boolean };
type PromptOpts = Opts & { label?: string; password?: boolean };
type Req = ({ kind: 'confirm' } & Opts | { kind: 'prompt' } & PromptOpts) & { resolve: (v: any) => void };

let push: ((r: Req) => void) | null = null;

export function askConfirm(o: Opts): Promise<boolean> {
  return new Promise((resolve) => { if (push) push({ kind: 'confirm', ...o, resolve }); else resolve(false); });
}
export function askPrompt(o: PromptOpts): Promise<string | null> {
  return new Promise((resolve) => { if (push) push({ kind: 'prompt', ...o, resolve }); else resolve(null); });
}

// Floating result notice. <Toast msg={...} /> shows a toast each time `msg` changes to a new object; toast() can also be called directly.
type Note = { id: number; t: string; ok: boolean };
let pushNote: ((t: string, ok: boolean) => void) | null = null;
export function toast(t: string, ok = true) { pushNote?.(t, ok); }
const shown = new WeakSet<object>();   // a message object is announced once, even if a second <Toast> mounts with it later
export function Toast({ msg }: { msg: { t: string; ok: boolean } | null | undefined }) {
  useEffect(() => { if (msg && !shown.has(msg)) { shown.add(msg); toast(msg.t, msg.ok); } }, [msg]);
  return null;
}

function Toasts() {
  const [notes, setNotes] = useState<Note[]>([]);
  const n = useRef(0);
  useEffect(() => {
    pushNote = (t, ok) => {
      const id = ++n.current;
      setNotes((l) => [...l.slice(-3), { id, t, ok }]);
      setTimeout(() => setNotes((l) => l.filter((x) => x.id !== id)), ok ? 3200 : 5000);
    };
    return () => { pushNote = null; };
  }, []);
  if (!notes.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {notes.map((x) => (
        <div key={x.id} className={`toast ${x.ok ? 'ok' : 'err'}`} onClick={() => setNotes((l) => l.filter((y) => y.id !== x.id))}>{x.t}</div>
      ))}
    </div>
  );
}

export function DialogHost() {
  const [queue, setQueue] = useState<Req[]>([]);
  const [val, setVal] = useState('');
  const okRef = useRef<HTMLButtonElement>(null);
  const inRef = useRef<HTMLInputElement>(null);
  useEffect(() => { push = (r) => setQueue((q) => [...q, r]); return () => { push = null; }; }, []);
  const cur = queue[0];
  const done = (v: any) => { if (!cur) return; cur.resolve(v); setVal(''); setQueue((q) => q.slice(1)); };
  const cancel = () => done(cur?.kind === 'prompt' ? null : false);
  useEffect(() => {
    if (!cur) return;
    (cur.kind === 'prompt' ? inRef.current : okRef.current)?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); cur.resolve(cur.kind === 'prompt' ? null : false); setVal(''); setQueue((q) => q.slice(1)); } };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [cur]);
  if (!cur) return <Toasts />;
  const submit = () => done(cur.kind === 'prompt' ? val : true);
  return (
    <><Toasts />
    <div className="modal dlg" onClick={cancel} role="alertdialog" aria-modal="true" aria-label={cur.title}>
      <div className={`modalBody dlgBody ${cur.danger ? 'danger' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h2>{cur.title}</h2>
        {cur.body && <p>{cur.body}</p>}
        {cur.kind === 'prompt' && (
          <label className="field">
            {cur.label}
            <input ref={inRef} className="inp" type={cur.password ? 'password' : 'text'} value={val} autoComplete="off"
              onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && val) submit(); }} />
          </label>
        )}
        <div className="dlgAct">
          <button type="button" className="btn ghost" onClick={cancel}>{cur.cancel || 'Hủy'}</button>
          <button ref={okRef} type="button" className={`btn ${cur.danger ? 'dlgDanger' : ''}`} disabled={cur.kind === 'prompt' && !val} onClick={submit}>{cur.ok || 'Xác nhận'}</button>
        </div>
      </div>
    </div></>
  );
}
