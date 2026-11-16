import crypto from 'node:crypto';
import { slug } from './content';

// Stable identity of an item icon. It contains ONLY things that never change for a published item:
// slot, base (as a slug), tier, element and the look number `v`. It must NOT contain the prompt, the model, the provider or the style,
// so rewording a prompt never orphans a picture. The style generation is stored beside it (image_index), not inside it.
// Changing anything here breaks every saved reference: tests/assetkey.test.ts pins the output.
export const ASSET_KEY_VERSION = 1;

export type ItemKeyInput = { slot: string; base: string; tier: number; e?: string; v?: number };

export function itemAssetKey(s: ItemKeyInput): string {
  return ['item', ASSET_KEY_VERSION, s.slot, slug(s.base), s.tier | 0, s.e ? slug(s.e) : '', s.v ? s.v | 0 : 0].join('|');
}
// Short, URL-safe form of the key (20 hex like picture ids).
export const assetKeyHash = (key: string) => crypto.createHash('sha1').update(key).digest('hex').slice(0, 20);
