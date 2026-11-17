'use client';
// Passkey calls of the browser. Each returns an error code (or '' when it worked); 'cancel' means the player closed the system dialog.
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { authPost, type AuthUser } from './api';

export const passkeySupported = () => typeof window !== 'undefined' && browserSupportsWebAuthn();
// One message for every player when passkeys cannot be used here (nothing to fix on their side except using another sign-in method or device).
export const PASSKEY_UNSUPPORTED = 'Thiết bị hoặc trình duyệt này chưa dùng được passkey. Ngươi vẫn có thể đăng nhập bằng email hoặc Google.';
const cancelled = (e: any) => e && (e.name === 'NotAllowedError' || e.name === 'AbortError');

export async function addPasskey(): Promise<string> {
  const o = await authPost({ action: 'pk-reg-options' });
  if (!o.ok) return o.code || 'E_SERVER';
  try {
    const response = await startRegistration({ optionsJSON: o.options });
    const r = await authPost({ action: 'pk-reg-verify', cid: o.cid, response });
    return r.ok ? '' : r.code || 'E_SERVER';
  } catch (e) { return cancelled(e) ? 'cancel' : 'E_PASSKEY'; }
}

export async function signInWithPasskey(): Promise<{ user?: AuthUser; code: string }> {
  const o = await authPost({ action: 'pk-login-options' });
  if (!o.ok) return { code: o.code || 'E_SERVER' };
  try {
    const response = await startAuthentication({ optionsJSON: o.options });
    const r = await authPost({ action: 'pk-login-verify', cid: o.cid, response });
    return r.ok && r.user ? { user: r.user, code: '' } : { code: r.code || 'E_SERVER' };
  } catch (e) { return { code: cancelled(e) ? 'cancel' : 'E_PASSKEY' }; }
}
