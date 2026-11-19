import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../lib/content';
import { assetKeyHash, itemAssetKey } from '../lib/assetKey';
import { thienLookFromKey } from '../lib/assetKeyParse';

// Every base that was ever published, per slot (as slugs). A base may be ADDED here, but never removed or renamed:
// saved games and the picture library refer to it for years. If this test fails after you renamed a base, restore the old name.
const PUBLISHED: Record<string, string[]> = {
  Weapon: ['truong_kiem', 'doan_kiem', 'phat_tran', 'co_cam', 'ngoc_tieu', 'truong_thuong', 'truong_cung', 'linh_cung', 'ty_ba', 'tram_dao', 'lieu_diep_dao', 'quyen_sao', 'ho_trao'],
  Headwear: ['ngoc_quan', 'kim_quan', 'phat_tram', 'dau_lap', 'khan_van'],
  Robe: ['dao_bao', 'vu_y', 'hac_suong', 'phap_bao', 'tien_quan', 'thanh_sam'],
  Footwear: ['van_hai', 'phong_ngoa', 'tuyet_ngoa'],
  Back: ['dau_bong', 'vu_duc', 'kiem_hap', 'phi_y'],
  Accessory: ['ngoc_boi', 'huong_nang', 'linh_an', 'chuong_bac'],
  Ring: ['gioi_chi', 'linh_gioi', 'can_khon_gioi'],
  Talisman: ['ho_phu', 'linh_phu', 'tran_hon_phu'],
};

test('published item bases are never removed or renamed', () => {
  for (const [slot, slugs] of Object.entries(PUBLISHED)) {
    const now = new Set(C.basesOf(slot).map(C.slug));
    for (const s of slugs) assert.ok(now.has(s), `base "${s}" of ${slot} disappeared`);
  }
});

test('slugs of the bases of a slot are unique', () => {
  for (const slot of C.SLOTS) {
    const l = C.basesOf(slot).map(C.slug);
    assert.equal(new Set(l).size, l.length, slot);
  }
});

// Pinned output: if one of these changes, every stored picture reference breaks. Change ASSET_KEY_VERSION on purpose instead.
test('item asset keys are pinned', () => {
  const cases: [Parameters<typeof itemAssetKey>[0], string][] = [
    [{ slot: 'Weapon', base: 'Trường Kiếm', tier: 0 }, 'item|1|Weapon|truong_kiem|0||0'],
    [{ slot: 'Weapon', base: 'Trường Kiếm', tier: 2, e: 'Hỏa' }, 'item|1|Weapon|truong_kiem|2|hoa|0'],
    [{ slot: 'Robe', base: 'Đạo Bào', tier: 3, e: 'Thủy', v: 4 }, 'item|1|Robe|dao_bao|3|thuy|4'],
    [{ slot: 'Ring', base: 'Càn Khôn Giới', tier: 5, e: 'Kim', v: 123456789 }, 'item|1|Ring|can_khon_gioi|5|kim|123456789'],
  ];
  for (const [spec, key] of cases) assert.equal(itemAssetKey(spec), key);
  assert.equal(assetKeyHash('item|1|Weapon|truong_kiem|0||0'), assetKeyHash('item|1|Weapon|truong_kiem|0||0'));
  assert.equal(assetKeyHash(cases[0][1]).length, 20);
});

test('asset key ignores everything but the stable fields', () => {
  const a = itemAssetKey({ slot: 'Weapon', base: 'Trường Kiếm', tier: 3, e: 'Mộc', v: 2 });
  assert.equal(a, itemAssetKey({ slot: 'Weapon', base: 'Trường Kiếm', tier: 3, e: 'Mộc', v: 2, ...({ prompt: 'x', seed: 9 } as object) }));
  assert.notEqual(a, itemAssetKey({ slot: 'Weapon', base: 'Trường Kiếm', tier: 3, e: 'Mộc', v: 3 }));
});

test('a Thiên look is read back from its index key, and only Thiên looks', () => {
  assert.deepEqual(thienLookFromKey(itemAssetKey({ slot: 'Robe', base: 'Đạo Bào', tier: 4, e: 'Thủy', v: 987654 })), { slot: 'Robe', base: 'Đạo Bào', el: 'Thủy', art: 987654 });
  assert.equal(thienLookFromKey(itemAssetKey({ slot: 'Robe', base: 'Đạo Bào', tier: 3, e: 'Thủy', v: 987654 })), null, 'another rarity');
  assert.equal(thienLookFromKey(itemAssetKey({ slot: 'Robe', base: 'Đạo Bào', tier: 5, e: 'Thủy', v: 987654 })), null, 'Tiên is exclusive');
  assert.equal(thienLookFromKey(itemAssetKey({ slot: 'Robe', base: 'Đạo Bào', tier: 4, e: 'Thủy' })), null, 'the plain look has no number');
  assert.equal(thienLookFromKey(itemAssetKey({ slot: 'Robe', base: 'Đạo Bào', tier: 4, e: 'Thủy', v: 5 })), null, 'a shared look number');
  assert.equal(thienLookFromKey('item|1|Robe|khong_co|4|thuy|987654'), null, 'a base the game does not have');
  assert.equal(thienLookFromKey(null), null);
});
