# Khách Cầu Mua (Phường Thị)

Mỗi ngày có vài tu sĩ đến Phường Thị hỏi mua một món đồ cụ thể. Người chơi có đồ thừa đúng loại thì giao và nhận Linh Thạch gấp nhiều lần giá phân giải, có khi kèm vật phẩm. Đây là cách để đồ thừa có giá trị mà vẫn là một việc người chơi tự chọn, không tự bán.

## Luật

| Loại | Số lượng mỗi ngày | Hỏi gì | Trả |
| --- | --- | --- | --- |
| Khách lẻ (`one`) | 3 | 1 món, hạng Phàm / Hoàng / Huyền. Vũ khí hỏi theo môn (kiếm, thương, cung...), ô khác hỏi theo tên món. Huyền hỏi thêm hệ, ưu tiên hệ của tuần | gấp 3 lần giá phân giải. 25% kèm quà |
| Khách mua cả lô (`set`) | 2 | 3 hoặc 5 món cùng một hình, Phàm hoặc Hoàng, ô không phải vũ khí | gấp 4 lần (3 món) hoặc 6 lần (5 món), luôn kèm quà |
| Khách quý (`vip`) | khoảng nửa số ngày, tối đa 1 | 1 món hạng Địa (90%) hoặc Thiên (10%), chỉ hỏi hệ, ô nào cũng được | gấp 2,5 lần, luôn kèm quà (Khế Ước Phù hạng Địa, Hồi Khí Đan hạng 3, Độ Kiếp Phù, hoặc Phá Cảnh Đan khi cảnh giới còn thấp) |

- "Cùng một hình" là cùng khóa hình của món (`lookKey` trong `lib/orders.ts`, cùng các trường với `itemSpec`): ô, tên gốc, hạng, hệ (chỉ từ Huyền), kiểu hình. Tên món được ghép ngẫu nhiên nên không dùng tên để so.
- Đồ đang mặc và đồ đã khóa không giao được. Đồ trong túi và kho đều dùng được.
- Đơn của ngày cũ biến mất khi qua ngày UTC mới (cùng lúc với nhiệm vụ ngày). Mỗi đơn chỉ giao một lần.
- Giới hạn lượng Linh Thạch kiếm được đến từ cấu trúc: tối đa 6 đến 7 đơn mỗi ngày, mỗi đơn một lần. Không có trần Linh Thạch riêng cho đơn.
- Món tự phân giải theo cài đặt (`dissolveMax`) không vào túi nên không giao được. Giao diện nhắc điều này khi có đơn bị ảnh hưởng.

## Cách chạy

- `lib/orders.ts`: phần thuần (không dùng số ngẫu nhiên có trạng thái). `pickOrders(day, seed, {week, realm})` sinh đơn từ băm ngày + seed, nên cùng ngày và cùng seed luôn ra cùng khách.
- `lib/game.ts`: `ensureOrders` (gọi trong `tick`, lưu vào save lần đầu của ngày) và `fillOrder` (kiểm tra, rút đồ khỏi túi/kho, trả tiền, tặng quà, đánh dấu đã giao).
- `lib/intents.ts`: `fillOrder` là intent thuần, trình duyệt chạy ngay như máy chủ, máy chủ có tiếng nói cuối. `forkState` trong `components/Game.tsx` sao chép cả `orders`.
- `components/Orders.tsx`: tab "Khách cầu mua" trong `ShopPanel` (Phường Thị). Chạm "Chọn món để giao", app chọn sẵn món yếu nhất trước (đồ mạnh hơn đồ đang mặc, đánh dấu ▲, xếp cuối), chạm lại để đổi, rồi "Giao". Thành công không hiện thông báo, chỉ thẻ chuyển sang "Đã giao".
- Test: `tests/orders.test.ts`.

## Chân dung khách

Mỗi loại tu sĩ (`C.NPC_TITLES`, 6 loại) có một ảnh nữ và một ảnh nam, vẽ một lần bằng AI và dùng chung cho mọi người chơi: `public/art/buyers/{loại}_{f|m}.jpg` (12 ảnh, 768×768, bán thân).

- Mô tả từng loại: `C.BUYER_EN` trong `lib/content.ts`. Prompt dựng ở `lib/imageprompt.ts` (spec `buyer`, kiểu `portrait`), spec từ `buyerSpec` trong `lib/avatarSpec.ts`.
- Nhóm `buyers` trong `lib/artjobs.ts`. Vẽ bằng `npm run pregen -- --only buyers` (thử khô: `npx tsx scripts/pregen.ts --dry --only buyers`), hoặc workflow "Draw missing art" trên GitHub. Trang quản trị cũng liệt kê nhóm này là còn thiếu cho đến khi ảnh có mặt.
- Chưa có ảnh thì thẻ khách hiện biểu tượng cuộn giấy thay thế, đơn vẫn dùng được.
