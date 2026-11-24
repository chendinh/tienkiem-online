# Công việc

Mục riêng của game cho những việc người chơi muốn làm thì làm, không bắt buộc, bỏ đó cũng không mất gì. Không phải nhiệm vụ ngày (nhiệm vụ ngày và Nhập Môn giữ nguyên chỗ cũ).

Mở từ nút "Công việc" (thanh trên, menu, Kho báu). Chấm vàng cho biết có bao nhiêu việc làm được ngay. Mỗi loại việc là một mục trong `JOB_KINDS` ở `components/Jobs.tsx` (tên, một dòng giới thiệu, hàm đếm việc làm được ngay, bảng hiển thị). Thêm loại việc mới là viết bảng của nó rồi thêm một mục vào đó, cửa sổ, tab và chấm vàng tự theo. Khi có từ hai loại trở lên, đầu cửa sổ hiện tab chọn loại.

## Loại 1: Tìm đồ

Vài tu sĩ đến Phường Thị nhờ tìm đồ cụ thể. Người chơi có đồ thừa đúng loại thì giao, nhận Linh Thạch gấp nhiều lần giá phân giải, có khi kèm vật phẩm. Đây là cách để đồ thừa có giá trị mà vẫn là việc người chơi tự chọn, không tự bán.

### Luật

Bảng khách luôn có 6 chỗ: 3 khách lẻ, 2 khách gom bộ, 1 khách quý.

| Loại | Hỏi gì | Trả |
| --- | --- | --- |
| Khách lẻ (`one`) | 1 món hạng Phàm (40%), Hoàng (50%) hoặc Huyền (10%). Phàm và Hoàng hỏi đúng tên món (vũ khí thì hỏi theo môn). Huyền hỏi theo ô và hệ, không hỏi tên món (hệ của tuần được hỏi nhiều hơn) | gấp 3 lần giá phân giải. 25% kèm quà |
| Khách gom bộ (`set`) | 3 hoặc 5 món khác nhau, mỗi ô một món, cùng một hạng (Phàm 60%, Hoàng 40%), loại món nào cũng được | mỗi món gấp 3 lần ngay lúc giao. Giao đủ thì thưởng thêm gấp 1 lần (bộ 3) hoặc 3 lần (bộ 5) trên tổng, và luôn có quà |
| Khách quý (`vip`) | 1 món hạng Địa (90%) hoặc Thiên (10%), chỉ hỏi hệ, ô nào cũng được | gấp 2,5 lần, luôn có quà (Khế Ước Phù hạng Địa, Hồi Khí Đan hạng 3, Độ Kiếp Phù, hoặc Phá Cảnh Đan khi cảnh giới còn thấp) |

- Khách **ở lại đến khi giao đủ**, không đổi theo ngày. Xong một khách thì chỗ đó có khách mới (máy chủ thay ở tick kế tiếp).
- Giao nộp là "có bao nhiêu đưa bấy nhiêu": mỗi món giao được trả ngay và đánh dấu xong phần đó. Dừng giữa chừng không mất gì.
- Nút ✕ trên thẻ là tiễn khách (khách cầu hạng cao mãi không có thì đổi khách khác). Tiền các món đã giao vẫn là của người chơi, chỉ mất phần thưởng đủ bộ và quà. Có hỏi lại nếu đã giao món nào.
- Đồ đang mặc và đồ đã khóa không giao được. Đồ trong túi và kho đều dùng được. Món mạnh hơn đồ đang mặc (▲) không được chọn sẵn.
- Không có trần Linh Thạch riêng cho đơn. Mức kiếm được bị giới hạn bởi việc món rơi ra phải trùng đúng với một phần khách đang cần.

### Chừa đồ cho khách

Đồ khách cần không bị phân giải mất:

- **Nhãn trong túi.** Món hợp với một phần khách đang cần có biểu tượng cuộn giấy ở góc ô. Mở món lên có nút "Giao cho khách" (giao ngay, hỏi lại nếu món đó mạnh hơn đồ đang mặc).
- **Tự phân giải** (`dissolveMax`) chừa lại món vừa nhặt nếu khách đang cần và trong túi/kho chưa có món nào hợp phần đó.
- **Dọn túi** chừa lại món yếu nhất hợp với mỗi phần khách đang cần (`keepIds` trong `lib/orders.ts`), và thông báo "giữ lại N món công việc Tìm đồ đang cần".
- Phân giải tay từng món thì không bị chặn.

### Cách chạy

- `lib/orders.ts`: phần thuần, không dùng số ngẫu nhiên có trạng thái. `Board = { v: 2, n, list }` lưu trong save (`st.orders`). `makeOrder(i, n, seed, others, opt)` sinh khách cho chỗ `i` từ băm của seed và số thứ tự `n`, nên cùng seed luôn ra cùng khách. `others` giúp hai khách đang chờ không hỏi giống nhau. Save của phiên bản đầu (danh sách theo ngày) bị thay bằng bảng mới.
- `lib/game.ts`: `ensureOrders` (gọi trong `tick`, chỉ chạy ở máy chủ vì cần seed; tạo bảng, hoặc thay khách đã xong hay đã rời), `fillOrder`, `dismissOrder`. `giveItem` (xuất ra để test) và `dissolveMany` dùng `keepNew` và `keepIds`.
- `lib/intents.ts`: `fillOrder` và `dismissOrder` là intent thuần, trình duyệt chạy ngay như máy chủ, máy chủ có tiếng nói cuối. Trình duyệt chỉ đánh dấu khách xong, khách mới xuất hiện ở lần cập nhật kế tiếp từ máy chủ. `forkState` trong `components/Game.tsx` sao chép cả `orders`.
- `components/Jobs.tsx`: cửa sổ Công việc và danh sách `JOB_KINDS`.
- `components/Orders.tsx`: bảng của loại Tìm đồ. Mỗi thẻ có các ô cần giao (có dấu ✓ khi đã giao, số món hợp trong túi), "Giao nộp" mở danh sách món hợp từng phần (món yếu nhất, không phải đồ nâng cấp, được chọn sẵn), bấm Giao. Thành công không hiện thông báo.
- `components/Equip.tsx`: nhãn trên ô túi, nút "Giao cho khách" trong cửa sổ món, và `Dọn túi` chừa món khách cần.
- Test: `tests/orders.test.ts`.

### Chân dung khách

Mỗi loại tu sĩ (`C.NPC_TITLES`, 6 loại) có một ảnh nữ và một ảnh nam, vẽ một lần bằng AI và dùng chung cho mọi người chơi: `public/art/buyers/{loại}_{f|m}.jpg` (12 ảnh, 768×768, bán thân).

- Mô tả từng loại: `C.BUYER_EN` trong `lib/content.ts`. Prompt dựng ở `lib/imageprompt.ts` (spec `buyer`, kiểu `portrait`), spec từ `buyerSpec` trong `lib/avatarSpec.ts`.
- Nhóm `buyers` trong `lib/artjobs.ts`. Vẽ bằng `npm run pregen -- --only buyers` (thử khô: `npx tsx scripts/pregen.ts --dry --only buyers`), hoặc workflow "Draw missing art" trên GitHub. Trang quản trị cũng liệt kê nhóm này là còn thiếu cho đến khi ảnh có mặt.
- Chưa có ảnh thì thẻ khách hiện biểu tượng cuộn giấy thay thế, đơn vẫn dùng được.
