# Linh Sủng

Nhánh riêng, tách khỏi Linh Thú bắt được (Linh Thú vẫn thu phục và xuất trận như cũ). Linh Sủng đi theo chủ, **không gây sát thương**, chỉ giúp chủ mạnh hơn bằng một thiên phú. Hướng dễ thương, nhẹ đầu.

## Chơi thế nào
- Ô **Linh Sủng** trong màn Trang bị (chỗ ô "Cơ duyên" cũ). Chỉ 1 con đi theo mỗi lúc. Chạm ô để mở popup: thiên phú, cấp, kinh nghiệm, dạng kế tiếp, Sủng Các (đổi con) và Linh Noãn đang ấp. Đổi con và Cho nghỉ hiện ngay, không có thông báo.
- **Linh Noãn**: mỗi nhân vật (cả nhân vật cũ) được tặng 1 quả. Thắng trận có lúc nhặt thêm (tối đa 3 quả chờ ấp). Ấp 2 giờ thời gian game thì nở; con đầu tiên tự đi theo.
- Nở ra loài đã có thì không thêm bản sao: linh khí của nó cộng kinh nghiệm cho con cùng loài.
- **Lớn lên**: con đang đi theo nhận kinh nghiệm sau mỗi trận thắng, không bao giờ vượt cấp chủ ("thú không vượt chủ").
- **3 dạng**: Ấu Thể (Lv1), Thành Thể (Lv9, chủ Kim Đan), Linh Thể (Lv17, chủ Hóa Thần). Mỗi dạng làm thiên phú mạnh hơn.
- Không đói, không mất gì khi vắng mặt.

## Loài (bản đầu)
| Loài | Thiên phú | Tác dụng |
|---|---|---|
| Thỏ Ngọc | Hộ Thể | Sinh Lực tối đa +% |
| Mèo Mây | Ngộ Đạo | Tốc độ tu luyện +% |
| Cá Chép Vàng | Phúc Vận | May Mắn + |

Số liệu ở `lib/pets.ts` (`PET_SPECIES`, `PET`, `STAGES`). Thêm loài: thêm một dòng vào `PET_SPECIES` rồi vẽ ảnh.

## Ảnh
Bộ cố định, mọi người chơi dùng chung, không tốn tiền theo từng người: `npm run pregen -- --only pets` vẽ `public/art/pets/egg.jpg` và `{loài}_{0|1|2}.jpg`. Hai dạng lớn là bản sửa từ ảnh Ấu Thể nên giữ đúng một con. Chưa có ảnh thì game hiện quầng sáng màu của loài.

## Kỹ thuật
- Dữ liệu: `GameState.pets` (`list`, `on`, `eggs`). Lưu cũ được tặng trứng trong `upgrade()` (lib/server/service.ts).
- Trứng rơi và loài nở dùng `hash01` theo seed, không rút số từ các luồng ngẫu nhiên của hành trình: lưu không có Linh Sủng chơi y như trước.
- Hành động `petOn`, `petOff` là pure intents (lib/intents.ts): màn hình đổi ngay.
- Test: `tests/pets.test.ts`.

## Chưa làm (bước sau)
Cho ăn Linh Quả, phụ kiện đeo lên con thú (điểm neo trên từng ảnh), kỹ năng mở theo mốc (chọn 1 trong 2), thêm loài, Linh Sủng đứng cạnh nhân vật và có biểu cảm trong trận.
