# Linh Sủng

Nhánh riêng, tách khỏi Linh Thú bắt được (Linh Thú vẫn thu phục và xuất trận như cũ). Linh Sủng đi theo chủ, **không gây sát thương và không cộng vào chỉ số của chủ**. Nó có **chỉ số riêng**, và chỉ số đó chỉ làm **kỹ năng hỗ trợ** của nó mạnh lên. Hướng dễ thương, nhẹ đầu, cân bằng.

## Chơi thế nào
- Ô **Linh Sủng** trong màn Trang bị (chỗ ô "Cơ duyên" cũ). Chỉ 1 con đi theo mỗi lúc. Chạm ô để mở con đang đi theo; khi chưa có con nào đi theo, chạm ô sẽ mở tab Linh Sủng.
- **Túi Càn Khôn có 2 tab** dưới hình nhân: **Vật phẩm** (túi đồ như cũ, có nút Dọn túi) và **Linh Sủng** (ổ ấp và các thẻ Linh Sủng). Kéo một món đang mặc về túi thì luôn hiện tab Vật phẩm để thả vào.
- Tab Linh Sủng: ổ ấp ở trên cùng, rồi các thẻ (tranh, tên, cấp, dạng, tên kỹ năng, Linh Lực, Linh Mẫn); con đang đi theo đứng đầu. Chạm thẻ để mở popup: chỉ số, kỹ năng ghi rõ số, kinh nghiệm, dạng kế tiếp, nút **Cho đi theo** / **Cho nghỉ**. Đổi con hiện ngay, không có thông báo.
- **Linh Noãn**: mỗi nhân vật (cả nhân vật cũ) được tặng 1 quả. **Mỗi lần chỉ ấp 1 quả**: khi ổ đang có trứng thì không nhặt thêm. Ổ trống thì thắng trận có lúc nhặt được. Ấp 2 giờ thời gian game thì nở; con đầu tiên tự đi theo.
- Nở ra loài đã có thì không thêm bản sao: linh khí của nó cộng kinh nghiệm cho con cùng loài.
- **Lớn lên**: con đang đi theo nhận kinh nghiệm sau mỗi trận thắng, không bao giờ vượt cấp chủ ("thú không vượt chủ").
- **3 dạng**: Ấu Thể (Lv1), Thành Thể (Lv9, chủ Kim Đan), Linh Thể (Lv17, chủ Hóa Thần). Mỗi dạng nhân chỉ số lên (x1, x1.2, x1.45).
- Không đói, không mất gì khi vắng mặt.

## Chỉ số riêng
- **Linh Lực**: kỹ năng mạnh cỡ nào.
- **Linh Mẫn**: % cơ hội kỹ năng ra tay sau mỗi trận thắng (tối đa 75%).
Cả hai chỉ đến từ loài, cấp và dạng, không có số ngẫu nhiên trên con vật.

## Loài và kỹ năng
| Loài | Kỹ năng | Sau một trận thắng, với cơ hội = Linh Mẫn | Lv1 (Lực / Mẫn) |
|---|---|---|---|
| Thỏ Ngọc | Hồi Xuân | hồi cho chủ Linh Lực % Sinh Lực tối đa | 4 / 25% |
| Mèo Mây | Ngộ Đạo | thêm Linh Lực % Tu Vi của trận đó | 15 / 25% |
| Cá Chép Vàng | Chiêu Tài | thêm Linh Lực % Linh Thạch của trận đó | 15 / 22% |

Mỗi lần kỹ năng ra tay có một dòng nhỏ trong nhật ký trận (vd "Mèo Mây ngộ đạo +1.200 Tu Vi"). Linh Thạch từ Chiêu Tài nằm ở mục `pet` của báo cáo.

**Cân bằng** (giả lập 10 nhân vật, mỗi nhân vật chơi 1 ngày, Linh Sủng Lv7): mỗi con giúp khoảng 3–4% ở mảng của nó. Thỏ Ngọc thêm khoảng 4% số trận thắng vì chủ ít phải Bế Quan dưỡng thương, Mèo Mây thêm khoảng 3% Tu Vi, Cá Chép Vàng thêm khoảng 3% Linh Thạch. Lên Linh Thể thì mạnh hơn rõ.

Số liệu ở `lib/pets.ts` (`PET_SPECIES`, `PET`, `STAGES`, `petStats`). Thêm loài: thêm một dòng vào `PET_SPECIES` (kiểu kỹ năng `heal`, `cult` hoặc `stones`) rồi vẽ ảnh.

## Ảnh: tranh thủy mặc
Linh Sủng không tồn tại ở thế giới thật, nó nằm trong tâm niệm của chủ, nên ảnh của nó là **một bức tranh thủy mặc trên giấy Tuyên**, đối lập hẳn với Linh Thú (3D tả thực). Tranh lớn lên cùng nó: Ấu Thể chỉ vài nét mực thưa, Thành Thể nét đầy và màu loãng, Linh Thể là bức tranh hoàn chỉnh có chút nhũ vàng và mây mực. Không có thư pháp, con dấu đỏ hay chữ nào trên tranh.
Ảnh Linh Sủng vẽ độc lập: không vẽ theo nhân vật hay vật phẩm, và ảnh nhân vật chính không vẽ Linh Sủng.
Bộ cố định, mọi người chơi dùng chung, không tốn tiền theo từng người: `npm run pregen -- --only pets` vẽ `public/art/pets/egg.jpg` và `{loài}_{0|1|2}.jpg`. Hai dạng lớn là bản sửa từ ảnh Ấu Thể nên giữ đúng một con. Chưa có ảnh thì game hiện nền giấy với nét mực.

## Kỹ thuật
- Dữ liệu: `GameState.pets` (`list`, `on`, `eggs`). Chỉ quả đầu của `eggs` nằm trong ổ; lưu cũ có nhiều quả thì nở lần lượt, mỗi quả đủ 2 giờ. Lưu cũ được tặng trứng trong `upgrade()` (lib/server/service.ts).
- Kỹ năng chạy trong `petAfterWin` (lib/game.ts), sau phần thưởng của trận. Ra tay hay không, trứng rơi và loài nở đều dùng `hash01` theo seed, không rút số từ các luồng ngẫu nhiên của hành trình: lưu không có Linh Sủng chơi y như trước.
- `pstats` không đọc Linh Sủng.
- Hành động `petOn`, `petOff` là pure intents (lib/intents.ts): màn hình đổi ngay.
- Test: `tests/pets.test.ts`.

## Chưa làm (bước sau)
Cho ăn Linh Quả, phụ kiện (không vẽ lên tranh Linh Sủng), kỹ năng thứ hai mở theo mốc (chọn 1 trong 2), thêm loài, Linh Sủng đứng cạnh nhân vật và có biểu cảm trong trận.
