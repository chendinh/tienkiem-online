// File store: JSON files written atomically (temp file + rename) and a per-key lock so that requests of one account run one at a time.
// Single server process assumed (a database replaces this when the game scales past one process).
import { promises as fs } from 'node:fs';
import path from 'node:path';

const g = globalThis as any;
const locks: Map<string, Promise<unknown>> = g.__tutienLocks || (g.__tutienLocks = new Map());

export const dataDir = () => process.env.TUTIEN_DATA_DIR || path.join(process.cwd(), 'data');

export async function readJson<T>(file: string, fallback: T): Promise<T> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as T; } catch (e: any) { if (e && e.code === 'ENOENT') return fallback; throw e; }
}
export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value), { mode: 0o600 });
  await fs.rename(tmp, file);
}
export async function removeFile(file: string) { try { await fs.unlink(file); } catch (e: any) { if (!e || e.code !== 'ENOENT') throw e; } }
export async function appendLog(name: string, entry: unknown) {
  const file = path.join(dataDir(), name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, JSON.stringify(entry) + '\n', { mode: 0o600 });
}

// Run `fn` after every earlier call with the same key has finished (one order for concurrent requests, Requirement 2.9).
export function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) || Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.then(() => undefined, () => undefined);
  locks.set(key, tail);
  tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
  return run;
}

export const accountFile = (id: string) => path.join(dataDir(), 'accounts', `${id}.json`);
export const authFile = () => path.join(dataDir(), 'auth.json');
