// Nhập Môn: the six first jobs of a new character. Each one is a plain question about the state ("does the character wear something?"), so nothing has to
// hook into the fights and an old save is judged correctly the first time it is read. A finished job pays once, at the end of the tick that saw it
// (lib/game.ts, starterCheck). Pay is fixed numbers: no random number is drawn, so the result is the same however often the server settles the save.
export interface StarterRef {
  kills: number; eq: Record<string, unknown>; beasts: unknown[]; set: { autoTame: boolean }; player: { realm: number };
  questDone?: number; questDays?: string[];
}
export interface StarterReward { stones?: number; taming?: number; pill?: number }
export interface StarterStep { id: string; title: string; how: string; reward: StarterReward; done: (s: StarterRef) => boolean }

export const STARTER: StarterStep[] = [
  { id: 'kill', title: 'Thắng 5 trận', how: 'Ở chế độ Lịch Luyện nhân vật tự đi săn và giao chiến. Ngươi chỉ cần chờ, xem dòng hành trình bên cạnh.', reward: { taming: 2 }, done: (s) => s.kills >= 5 },
  // a new character already wears two starting items (a weapon and a robe), so the job asks for a third one
  { id: 'equip', title: 'Mặc thêm một pháp khí', how: 'Mở Kho báu, kéo món trong túi thả vào một ô trang bị còn trống (mỗi ô một loại: vũ khí, giáp…). Hoặc bật “Tự mặc đồ mạnh hơn” trong Cài đặt để game tự làm.', reward: { stones: 60 }, done: (s) => Object.values(s.eq).filter(Boolean).length >= 3 },
  { id: 'tame', title: 'Thu phục một linh thú', how: 'Ngươi sẽ gặp linh thú yếu liên tục. Thắng xong, game dừng lại hỏi: bấm nút Khế Ước Phù để thu phục. Lần đầu này chắc chắn thành công (100%) và không bỏ qua được.', reward: { pill: 3 }, done: (s) => s.beasts.length >= 1 },
  { id: 'auto', title: 'Bật tự thu phục', how: 'Mở Cài đặt, bật “Tự thu phục sau khi thắng” rồi chọn một trong bốn kiểu. Nhớ bấm Lưu thay đổi.', reward: { taming: 3 }, done: (s) => s.set.autoTame },
];
export const STARTER_IDS = STARTER.map((s) => s.id);
export const rewardText = (r: StarterReward) => [r.stones ? `${r.stones} linh thạch` : '', r.taming ? `${r.taming} Khế Ước Phù` : '', r.pill ? `${r.pill} Hồi Khí Đan` : ''].filter(Boolean).join(' và ');
