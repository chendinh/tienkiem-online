# Công việc

Mục riêng của game cho những việc người chơi muốn làm thì làm, không bắt buộc, bỏ đó cũng không mất gì. Không phải nhiệm vụ ngày (nhiệm vụ ngày và Nhập Môn giữ nguyên chỗ cũ).

Mở từ nút "Công việc" (thanh trên, menu, Kho báu). Chấm xanh lá (không ghi số) cho biết có việc làm được ngay, cả ở nút ngoài lẫn trên thẻ từng loại việc trong cửa sổ. Mỗi loại việc là một mục trong `JOB_KINDS` ở `components/Jobs.tsx` (tên, một dòng giới thiệu, hàm đếm việc làm được ngay, bảng hiển thị). Thêm loại việc mới là viết bảng của nó rồi thêm một mục vào đó, cửa sổ, tab và chấm vàng tự theo. Khi có từ hai loại trở lên, đầu cửa sổ hiện tab chọn loại.

## Loại 1: Tìm đồ

Vài tu sĩ đến Phường Thị nhờ tìm đồ cụ thể. Người chơi có đồ thừa đúng loại thì giao, nhận Linh Thạch gấp nhiều lần giá phân giải, có khi kèm vật phẩm. Đây là cách để đồ thừa có giá trị mà vẫn là việc người chơi tự chọn, không tự bán.

### Luật

Bảng khách luôn có 6 chỗ: 3 khách gom bộ, 2 khách lẻ, 1 khách quý. **Đồ hạng thấp chỉ được hỏi theo bộ (3 hoặc 5 món). Hỏi một món lẻ thì chỉ có hạng Địa và Thiên, luôn kèm hệ.**

| Loại | Hỏi gì | Trả |
| --- | --- | --- |
| Khách lẻ (`one`) | 1 món hạng Địa (90%) hoặc Thiên (10%), luôn kèm **hệ** (hệ của tuần được hỏi nhiều hơn), và thêm một điều kiện: ô cụ thể (40%), **cấp từ N trở lên** (35%), hoặc không thêm gì (25%) | mỗi món gấp 3 lần giá phân giải, luôn có quà (Khế Ước Phù hạng Hoàng hay Huyền, Hồi Khí Đan hạng 2, Hàn Ngọc Tủy hoặc Hỏa Tinh Thạch) |
| Khách gom bộ (`set`) | 3 hoặc 5 món khác nhau, mỗi ô một món, cùng một hạng (Phàm 45%, Hoàng 45%, hoặc bộ 3 món hạng Huyền 10%), loại món nào cũng được | mỗi món gấp 3 lần ngay lúc giao. Giao đủ thì thưởng thêm gấp 1 lần (bộ 3) hoặc 3 lần (bộ 5) trên tổng, và luôn có quà |
| Khách quý (`vip`) | 1 món hạng Địa (80%) hoặc Thiên (20%), kèm hệ **và cấp từ N trở lên**, thêm ô cụ thể trong 40% | gấp 4 lần, luôn có quà (Khế Ước Phù hạng Địa, Hồi Khí Đan hạng 3, Độ Kiếp Phù, hoặc Phá Cảnh Đan khi còn ở hai cảnh giới đầu) |

- Khách **ở lại đến khi giao đủ**, không đổi theo ngày. Xong một khách thì chỗ đó có khách mới (máy chủ thay ở tick kế tiếp).
- Giao nộp là "có bao nhiêu đưa bấy nhiêu": mỗi món giao được trả ngay và đánh dấu xong phần đó. Dừng giữa chừng không mất gì.
- Nút ✕ trên thẻ là tiễn khách (khách cầu hạng cao mãi không có thì đổi khách khác). Tiền các món đã giao vẫn là của người chơi, chỉ mất phần thưởng đủ bộ và quà. Có hỏi lại nếu đã giao món nào.
- Đồ đang mặc và đồ đã khóa không giao được. Đồ trong túi và kho đều dùng được. Món mạnh hơn đồ đang mặc (▲) không được chọn sẵn.
- Không có trần Linh Thạch riêng cho đơn. Mức kiếm được bị giới hạn bởi việc món rơi ra phải trùng đúng với một phần khách đang cần.

### Chừa đồ cho khách

Đồ khách cần được nhận ra, nhưng việc dọn không bị ép chừa gì:

- **Nhãn trong túi.** Món hợp với một phần khách đang cần có biểu tượng cuộn giấy ở góc ô. Mở món lên có nút "Giao cho khách" (giao ngay, hỏi lại nếu món đó mạnh hơn đồ đang mặc).
- **Tự phân giải** (`dissolveMax`) chừa lại món vừa nhặt nếu khách đang cần và trong túi/kho chưa có món nào hợp phần đó.
- **Dọn túi** và **Bán nhanh các con dư** dọn hết như từ trước đến giờ, không phân biệt đồ hay thú đó có khách chờ hay không, để người không chơi Công việc không phải gánh gì thêm. Ai chơi thì tự khóa món cần giữ.
- Phân giải tay từng món thì không bị chặn.

### Cách chạy

- `lib/orders.ts`: phần thuần, không dùng số ngẫu nhiên có trạng thái. `Board = { v: 2, n, list }` lưu trong save (`st.orders`). `makeOrder(i, n, seed, others, opt)` sinh khách cho chỗ `i` từ băm của seed và số thứ tự `n`, nên cùng seed luôn ra cùng khách. `others` giúp hai khách đang chờ không hỏi giống nhau. Save của phiên bản đầu (danh sách theo ngày) bị thay bằng bảng mới.
- `lib/game.ts`: `ensureOrders` (gọi trong `tick`, chỉ chạy ở máy chủ vì cần seed; tạo bảng, hoặc thay khách đã xong hay đã rời), `fillOrder`, `dismissOrder`. `giveItem` (xuất ra để test) và `dissolveMany` dùng `keepNew` và `keepIds`.
- `lib/intents.ts`: `fillOrder` và `dismissOrder` là intent thuần, trình duyệt chạy ngay như máy chủ, máy chủ có tiếng nói cuối. Trình duyệt chỉ đánh dấu khách xong, khách mới xuất hiện ở lần cập nhật kế tiếp từ máy chủ. `forkState` trong `components/Game.tsx` sao chép cả `orders`.
- `components/Jobs.tsx`: cửa sổ Công việc và danh sách `JOB_KINDS`.
- `components/Orders.tsx`: bảng của loại Tìm đồ. Mỗi thẻ có các ô cần giao (có dấu ✓ khi đã giao, số món hợp trong túi), "Giao nộp" mở danh sách món hợp từng phần (món yếu nhất, không phải đồ nâng cấp, được chọn sẵn), bấm Giao. Thành công không hiện thông báo.
- `components/Equip.tsx`: nhãn trên ô túi và nút "Giao cho khách" trong cửa sổ món.
- Test: `tests/orders.test.ts`.

### Hiệu ứng khi hoàn thành

Giao món cuối cùng (cả bốn loại việc) thì: một con dấu xanh lá "Hoàn thành" đóng lên thẻ khoảng 3 giây, kèm số Linh Thạch vừa nhận và quà; chuông ngân hai tiếng; một dòng "Hoàn Thành" bay lên trên thẻ (qua `useCue().jobDone`, ở mức hiệu ứng Tắt thì chỉ còn con dấu). Danh sách khóa theo ô chứ không theo khách, nên khách mới của máy chủ vào đúng ô đó và hiện ra khi con dấu mờ đi (`components/JobDone.tsx`). Giao món cuối từ cửa sổ món trong túi thì chỉ có chuông và dòng bay lên, vì cửa sổ Công việc không mở.

Con dấu phải hiện ngay khi bấm, không đợi. Thẻ biết trước mình có đủ hàng hay không (`full`), nên đóng dấu luôn trong cùng lần vẽ với số liệu mới (`useFin().mark`), rồi mới nhận số thật từ luật (`patch`). Nếu luật từ chối thì gỡ dấu (`clear`). Âm thanh và dòng bay lên chờ lần vẽ kế tiếp (`afterPaint`) để việc dựng âm thanh không giữ con dấu lại. Con dấu chỉ dùng chuyển động `transform` và độ mờ, không có bóng mờ (text-shadow, box-shadow) vì chúng bị vẽ lại khi dấu phóng to.

### Mở cửa sổ cho nhanh

- Cửa sổ và các thẻ tab hiện trước, các thẻ khách dựng sau hai khung hình (`useAfterOpen` trong `components/Jobs.tsx`). Bấm đổi tab thì tab sáng lên ngay, thẻ cũ mờ đi đến khi thẻ mới dựng xong (`useDeferredValue`).
- Đội xuất chiến tính một lần cho cả danh sách (`J.partyOf`), không sắp lại cả chuồng cho từng con. Chấm xanh trên tab dùng `fillableCount` và `readyCount`, chỉ hỏi "có món hợp không" nên không sắp xếp, không sao chép.
- Khách mới vẫn tạo ở máy chủ (`tick`), trình duyệt không tạo. Ảnh món trong thẻ Tìm đồ đi qua `/api/image` như mọi pháp khí; Thiên và Địa chưa có ảnh thì máy chủ không vẽ mới (chỉ ghi nhu cầu), nên mở cửa sổ không tốn tiền vẽ.

### Chân dung khách

Mỗi loại tu sĩ (`C.NPC_TITLES`, 6 loại) có một ảnh nữ và một ảnh nam, vẽ một lần bằng AI và dùng chung cho mọi người chơi: `public/art/buyers/{loại}_{f|m}.jpg` (12 ảnh, 768×768, bán thân).

- Mô tả từng loại: `C.BUYER_EN` trong `lib/content.ts`. Prompt dựng ở `lib/imageprompt.ts` (spec `buyer`, kiểu `portrait`), spec từ `buyerSpec` trong `lib/avatarSpec.ts`.
- Nhóm `buyers` trong `lib/artjobs.ts`. Vẽ bằng `npm run pregen -- --only buyers` (thử khô: `npx tsx scripts/pregen.ts --dry --only buyers`), hoặc workflow "Draw missing art" trên GitHub. Trang quản trị cũng liệt kê nhóm này là còn thiếu cho đến khi ảnh có mặt.
- Chưa có ảnh thì thẻ khách hiện biểu tượng cuộn giấy thay thế, đơn vẫn dùng được.

## Loại 2, 3, 4: Tìm thú, Đặt đan, Nguyên liệu

Ba loại việc hỏi **một số lượng** của một thứ (khác Tìm đồ hỏi từng món). Luật chung giống Tìm đồ: khách ở lại đến khi giao đủ, "có bao nhiêu đưa bấy nhiêu", mỗi đơn vị giao được trả ngay, đủ hàng thì thưởng thêm và tặng quà, ✕ để tiễn khách, xong thì máy chủ thay khách mới ở tick kế tiếp. Bảng riêng `st.jobs = { v: 1, n, list }`, 6 chỗ theo `J.LAYOUT`: 2 khách thú, 2 khách đan, 2 khách nguyên liệu. Khách và chân dung dùng cùng cách đặt tên và bộ ảnh với Tìm đồ.

| Loại | Hỏi gì | Trả |
| --- | --- | --- |
| Tìm thú (`beast`) | Một loài 1 đến 3 con (55%), một con cỡ Lớn trở lên của một loài (20%), hoặc 3 con cùng một hệ, loài nào cũng được (25%). Chỉ loài và hệ có ở các vùng người chơi đã mở | mỗi con gấp 2 lần giá bán ở chuồng (`releaseValue`). Khách cần từ 2 con trở lên thưởng thêm gấp 1 lần tổng giá, và tặng Khế Ước Phù hạng Phàm hoặc Hoàng, hoặc Hồi Khí Đan hạng 1 |
| Đặt đan (`pill`) | Hồi Khí Đan hạng 1 (60%, 5 đến 10 viên), hạng 2 (30%, 3 đến 6), hạng 3 (10%, 2 đến 4); chỉ hạng mà người chơi đã gom được nguyên liệu để luyện | mỗi viên gấp 1,5 lần giá thu mua của tiệm (tức 75% giá tiệm bán), không thưởng thêm. Quà chỉ là nguyên liệu |
| Nguyên liệu (`mat`) | Một loại nguyên liệu của các vùng đã mở, số lượng sao cho tổng giá tiệm khoảng 40 đến 80 Linh Thạch (từ 3 đến 50 cái) | mỗi cái gấp 2 lần giá tiệm, đủ hàng thưởng thêm 50% tổng giá, và tặng Hồi Khí Đan hạng 1 hoặc 2, hoặc Khế Ước Phù hạng Phàm |

- **Linh Thú Dị Biến không bao giờ được hỏi và không giao được** (`E_MUTANT`). Con đang xuất chiến hoặc đang treo trong khung không được chọn sẵn, nếu chọn thì hỏi lại. Giao con nào thì con đó rời chuồng.
- Trong Chuồng, con khách đang cần có nhãn vàng ở góc. "Bán nhanh các con dư" vẫn bán hết như thường.
- **Không để việc đan thành chỗ kiếm lời từ tiệm.** Đan mua được ở tiệm, nên giá trả luôn thấp hơn giá tiệm bán (75%), không có thưởng đủ hàng bằng Linh Thạch, và quà chỉ là nguyên liệu rẻ. `tests/jobs.test.ts` kiểm tra với mọi khách sinh ra rằng mua đan ở tiệm để giao luôn lỗ. Thú và nguyên liệu không mua được ở tiệm nên trả cao hơn giá bán.
- Giao đan và nguyên liệu bằng một nút (giao hết số có, tối đa số còn thiếu). Giao thú thì chọn từng con, con dư được chọn sẵn.

### Bậc (Đặt đan và Nguyên liệu)

Làm mãi một vòng "gom nguyên liệu, luyện đan, giao đan" mà đơn cứ nhỏ như nhau thì chán, nên hai loại này có **bậc** riêng, đếm số khách đã giao đủ (`board.done`). Bỏ khách đi không được tính. Bậc 1 đến 6: Tập Sự (0 việc), Học Việc (3), Thạo Việc (8), Lão Luyện (15), Đại Sư (25), Tông Sư (40). Khách mới của loại đó lớn dần theo bậc (`J.QTY` = 1, 1,5, 2,2, 3,2, 4,5, 6 lần cỡ đơn bậc đầu):

| | Bậc 1 | Bậc 6 |
| --- | --- | --- |
| Đặt đan | đa số hỏi đan hạng 1, 5 đến 10 viên (hạng 2: 3 đến 6, hạng 3: 2 đến 4) | hỏi đan hạng cao nhiều hơn rất nhiều, gấp 6 lần số viên (tối đa 80); quà nguyên liệu hiếm hơn và nhiều hơn |
| Nguyên liệu | nguyên liệu nào cũng như nhau, tổng giá tiệm khoảng 40 đến 80 | ưu tiên nguyên liệu đắt (hiếm), tổng giá gấp 6 lần; trả gấp 2,6 lần giá tiệm (bậc 1: 2 lần), thưởng đủ hàng 100% (bậc 1: 50%), quà tốt và nhiều hơn |

- Hỏi gì vẫn bị giới hạn bởi cấp người chơi (vùng đã mở), nên không bao giờ hỏi thứ chưa tìm được.
- Đặt đan vẫn giữ luật chống lách: mỗi viên trả 75% giá tiệm và quà chỉ là nguyên liệu trị giá tối đa 40% phần chênh, ở **mọi bậc**. Phần thưởng tăng theo số lượng và độ hiếm của quà chứ không tăng giá mỗi viên (`tests/jobs.test.ts` kiểm với mọi bậc).
- Lên bậc thì thông báo ngay trên con dấu "Hoàn thành". Đầu cửa sổ của hai loại này có thanh bậc, thẻ khách ghi "Đơn bậc N".
- Tìm thú không có bậc (nó đã theo cấp người chơi).

### Cách chạy

- `lib/jobs.ts`: phần thuần. `makeJob(i, n, seed, others, { level })`, `newBoard`, `beastMatches`, `keepBeastIds`, `beastWantedBy`, `askText/askShort/askArt`. Hỏi gì phụ thuộc cấp người chơi (`speciesAt`, `matsAt`, `gradesAt`, theo các vùng đã mở), nên khách luôn hỏi thứ tìm được.
- `lib/game.ts`: `ensureJobs` (trong `tick`, chỉ ở máy chủ), `fillJob(st, id, { ids | n })`, `dismissJob`.
- `lib/intents.ts`: `fillJob` và `dismissJob` là intent thuần, chạy ngay ở trình duyệt. `forkState` trong `components/Game.tsx` sao chép `jobs`.
- `components/JobCards.tsx`: thẻ khách chung cho cả ba loại, ba bảng `BeastJobs`, `PillJobs`, `MatJobs` (đăng ký trong `JOB_KINDS`), `readyCount` cho chấm vàng.
- Test: `tests/jobs.test.ts`.

## Loại 5: Triển lãm

Chỗ duy nhất trong Công việc để **ngắm**. Người chơi bày 3 đến 6 món của mình (pháp khí trong túi và kho, hoặc Linh Thú trong chuồng) lên các bệ giữa ba tầng mây. Khách tu sĩ đạp kiếm bay ngang qua, ghé từng bệ xem, hiện mặt cảm xúc trên đầu (không có chữ), ai mê thì để quà vào hòm. Người chơi không bao giờ mất gì: món bày vẫn là của họ, chỉ bị khóa để các lệnh dọn không đụng tới (và trả lại đúng trạng thái khóa cũ khi gỡ xuống). Linh Thú vẫn ở chuồng, không bị đem đi giao khách ở Tìm thú, không bị Thả hàng loạt.

### Luật (`lib/expo.ts`, không bốc số ngẫu nhiên)

- Mở cửa khi có từ 3 bệ có đồ. Cứ khoảng 5 giây có một khách (5,5 / 5 / 4,5 / 4 giây với 3 / 4 / 5 / 6 bệ, mỗi lần lệch 0,6 đến 1,4 lần), nên trên sân khấu thường có 2 đến 3 khách cùng lúc. Khách đầu tiên đến 5 giây sau khi đủ 3 bệ. Một tick của máy chủ (5 giây) tạo tối đa 4 khách. Offline tính tối đa 12 giờ như phần còn lại, khoảng 10.000 khách mà vòng lặp vẫn chỉ mất vài trăm mili giây.
- Khách đông không làm giàu thêm: mỗi khách trả `payScale` lần số cũ (nhịp mới chia nhịp 56 đến 90 giây ban đầu), lấy tròn theo xác suất để tổng không lệch, và xác suất quà cũng nhân như vậy. Thu nhập mỗi giờ và số quà mỗi giờ giữ nguyên như khi khách thưa.
- Khách sinh từ `seed` và số thứ tự (`visitorOf`): loại tu sĩ (6 loại như khách Tìm đồ), tên, hệ ưa thích, độ khó tính (`bar`).
- Mỗi khách xem 1 đến 3 bệ (`routeOf`), từ tầng trên xuống, theo hướng khách vào. Điểm = hạng món trừ độ khó tính cộng 3, cộng 1 nếu đúng hệ, cộng phần ưa riêng của loại khách (Kiếm Tu thích vũ khí, Thể Tu thích giáp, Phù Sư thích bùa và nhẫn, Đan Sư thích Linh Thú, Ma Tu thích Dị Biến), ± 1 may rủi. Từ 5 điểm: mê, 4: ngạc nhiên, 3: thích, 2: lặng thinh, 1: thất vọng, 0 trở xuống: chê. Linh Thú tính hạng theo cỡ (Dị Biến hơn một bậc).
- Mê, ngạc nhiên, thích để Linh Thạch bằng 2%, 1,2%, 0,5% giá trị món (giá phân giải với đồ, giá thả với thú), gấp 10 lần lúc đầu (`STONE_BP`, `STONE_MIN`). Thất vọng và chê không lấy gì.
- Quà (mỗi khách tối đa một): chỉ khi mê (3,5%) hoặc ngạc nhiên (1%). Kiếm Tu và Thể Tu tặng pháp khí vũ khí (hòm chứa tối đa 3), Đan Sư và Tán Tu tặng đan (tối đa 20 mỗi bậc), Phù Sư và Ma Tu tặng Bí Công hợp hệ khách, đủ cấp (tối đa 8 loại). Hòm đầy thì khách giữ lại quà.
- Thu nhập sau khi nhân 10: bày 6 món ở cấp 10 được khoảng 990 Linh Thạch mỗi giờ với hạng Huyền, 1.800 với Địa, 4.800 với Thiên, 25.600 với Tiên (chưa tính quà và chưa tính lời đề nghị mua); đã đo cho 5 save khác nhau, chênh dưới 2%. Món không bị dùng hết nên vẫn là thu nhập đều đặn, nhưng không còn là khoản nhỏ: hạng Thiên mỗi giờ về gần nửa giá phân giải của cả hàng. Bộ lọc nằm ở `tests/expo.test.ts` (mục thu nhập: tăng theo hạng, và không quá 60% giá trị hạng Thiên mỗi giờ).

### Lời đề nghị (`offerOf`, `expoDeal`)

Khoảng 5% khách (500 trên 10.000 lượt, rút từ `seed` và số thứ tự nên cùng save luôn có cùng lời đề nghị) hỏi **món họ thích nhất** trong lượt đó (mê, ngạc nhiên hoặc thích). Chỉ hỏi pháp khí, không bao giờ hỏi Linh Thú. Ba kiểu:

| Kiểu | Tỉ lệ | Điều khách đưa ra |
|---|---|---|
| Mua (`buy`) | 50% | trả 4 đến 6 lần giá phân giải của món |
| Đổi (`swap`) | 40% | một món ngẫu nhiên **cùng hạng, cùng loại ô** (cấp theo người chơi), tạo lúc người chơi nhận lời, từ dòng số riêng nên không đụng dòng số của hành trình |
| Bí Công (`book`) | 10% (chỉ khi món bày hạng Địa trở lên) | một Bí Công hạng Địa (cho món Địa) hoặc hạng Thiên (cho món Thiên, Tiên), thuộc hệ ưa thích của khách, trong tầm học tới cấp hiện tại cộng 5 |

- Máy chủ tạo lời đề nghị cùng lượt khách (`runExpo`), giữ tối đa 3 lời (mỗi món một lời) trong 90 giây (`OFFER_KEEP_MS`), cũ hơn thì bỏ. `expoDeal` (intent thuần, chạy ngay ở trình duyệt) nhận lời theo số thứ tự khách: món rời bệ (bán thì mất món và được Linh Thạch, đổi thì món mới đứng đúng bệ đó, khóa như các món khác, Bí Công vào kho), lời đề nghị đó biến mất. Gỡ hoặc đổi món trên bệ thì lời đề nghị cho món cũ cũng bỏ. Món đã gỡ hoặc đang mặc thì trả `E_OFFER_GONE`.
- **Chỉ hiện khi cửa sổ Công việc đang mở.** Màn hình ghi lại số thứ tự khách lúc mở (`openedAt`) và chỉ hiện lời đề nghị của khách đến sau đó (`liveOffer`). Tắt cửa sổ thì Triển lãm không có giao dịch nào chờ, và mở lại cũng không thấy những lời cũ.
- Thẻ nằm đè lên khoảng trời trống phía trên sân khấu (cao khoảng 46px, không đè bệ): dòng nhỏ là ai hỏi món nào (cắt được), dòng chính là lời đề nghị (không bị cắt), một nút Bán hoặc Đổi, một nút từ chối. Tự biến sau 25 giây. Không có toast khi nhận lời.

### Cách chạy

- `lib/expo.ts`: luật thuần (khách, điểm, phản ứng, quà, tuyến đi). `lib/game.ts`: `expoSet`, `expoClear`, `expoCollect` (intent thuần, chạy ngay ở trình duyệt), `expoView`, `runExpo` (gọi trong `tick` trước `ensureOrders`, chỉ ở máy chủ). Nhật ký 6 khách gần nhất nằm trong `st.expo.log`, máy khách chỉ xem lại.
- `lib/expofly.ts`: **đường bay** của một khách, chỉ là số (không DOM): bay vào từ bên nào, lượn tới từng bệ và đứng bên cạnh, quay mặt nhìn bệ, nghiêng theo lúc lên xuống, rồi bay ra. Quà và Linh Thạch bay thành vòng cung vào hòm (`arcAt`).
- `components/ExpoScene.tsx`: sân khấu. Khách là một **Web Animation** duy nhất trên `transform` và `opacity` (chạy trên compositor, React không vẽ khung nào); mặt cảm xúc, vòng sáng, tia lửa, đồng xu, quà đều là animation ngắn có `delay`. `prefers-reduced-motion` hoặc hiệu ứng tắt thì không có khách bay, chỉ còn sân khấu tĩnh với số đếm dưới mỗi bệ. Mở tab thì chiếu lại khách gần nhất cho có không khí, khách mới do máy chủ tạo thì bay vào khi tin về, cách nhau chừng 1,5 giây nếu đến cùng lúc (tối đa 4 khách cùng lúc).
- `components/Cultivator.tsx`: tu sĩ đạp kiếm vẽ bằng SVG, đổi màu theo loại khách, tóc, tay áo, dải lưng và phù lắc theo CSS. `components/ReactIcon.tsx`: mặt cảm xúc.
- `components/Expo.tsx`: phần quanh sân khấu (dòng trạng thái, hòm quà, tổng số phản ứng, tờ chọn món cho một bệ dính đáy cửa sổ). Chạm bệ để chọn, chạm hòm hoặc nút Thu quà để nhận, không có toast. Hòm hiện số món quà (chấm vàng) và số Linh Thạch; tab Triển lãm không có chấm xanh vì đây là chỗ để xem chứ không phải việc phải làm.
- `app/ds/expo.css`: giao diện sân khấu, mây, sương, khí. Các khách đi xa mờ chạy bằng CSS không dừng (rút ngẫu nhiên lúc mở tab), mọi vòng lặp tắt theo `data-fx='off'`.
- Test: `tests/expo.test.ts` (luật, thu nhập, khóa món, đường bay, lời đề nghị: tỉ lệ khoảng 5%, ba kiểu và hạng, nhận lời, hết hạn, chỉ hiện khi cửa sổ mở).

### Năm biểu cảm (vẽ bằng code) và hình vẽ AI (của riêng game)

Năm biểu cảm là emoji đơn giản vẽ bằng SVG trong `components/ReactIcon.tsx`, không có ảnh nào để vẽ hay tải, nhìn rõ cả ở cỡ 18 px. Mỗi biểu cảm một hình khác hẳn nhau, và màu đỏ chỉ dành cho mặt ghét:

| Biểu cảm | Hình | Khi nào |
|---|---|---|
| Mê (`love`) | trái tim hồng | từ 5 điểm, trả nhiều Linh Thạch nhất và có thể tặng quà |
| Ngạc nhiên (`wow`) | mặt vàng mắt sao, cười toe | 4 điểm, trả Linh Thạch và có thể tặng quà |
| Bình thường (`like`) | mặt vàng cười nhẹ | 3 điểm, trả ít Linh Thạch |
| Nhăn mặt (`sad`) | mặt vàng nhắm tịt mắt, mếu, một giọt mồ hôi | 1 điểm, không trả gì |
| Ghét (`angry`) | mặt đỏ cau mày | 0 điểm trở xuống, không trả gì |

Khách được đúng 2 điểm thì lặng thinh, không hiện gì.

Các con số được giữ gọn để vừa màn hình điện thoại 320 px (`lib/shortnum.ts`: 950, 1,2k, 12k, 1,2tr, tối đa 5 ký tự, số đầy đủ nằm trong `title`):

- **Tổng cả phiên**: một thanh gồm 5 ô đều nhau, mặt cảm xúc ở trên, số rút gọn ở dưới, luôn đủ năm mặt từ tốt đến xấu (mặt chưa có lần nào thì mờ), nên không bao giờ xuống dòng hay tràn, số lớn lên cũng không làm lệch bố cục, và cũng là bảng chú giải. Cùng thanh này hiện trong cửa sổ chọn món, cho riêng món ở bệ đó.
- **Dưới mỗi bệ trên sân khấu**: chỉ một viên thuốc nhỏ với biểu cảm nhiều nhất của món đó (bằng nhau thì lấy biểu cảm tốt hơn, `topReaction`) và số rút gọn. Viên này là con của sân khấu chứ không phải của bệ, nằm trên cả bệ, hòm quà và khách bay nên không bao giờ bị che. Chạm vào bệ để xem đủ năm biểu cảm. Mặt cảm xúc hiện trên đầu khách luôn nằm trong sân khấu, kể cả ở hàng bệ trên cùng (không bị cắt ở mép).
- Vòng sáng và tia lửa lúc khách phản ứng lấy đúng màu của biểu cảm (`RCOL` trong `ExpoScene.tsx`).

Hai hình còn lại do AI vẽ, đều là `ui_*` trong `PROP_EN` (`lib/content.ts`), cùng nhóm ảnh cố định `shop`, vẽ trên nền đen:

- `ui_expo_slab`: bệ đá dưới mỗi món bày. Là một phiến đá granite xám nhạt thật, tròn và mỏng (cao chỉ bằng khoảng một phần năm bề ngang), không vàng, không kim loại (mây phía sau bệ vẽ bằng CSS). Trên màn hình bệ rộng 52 px, ngay dưới món, để không che gì xung quanh. Đặt tên `slab` (không phải `stand`) để bệ cũ, nếu máy chủ đã vẽ rồi, không che mất ảnh mới: ảnh mới luôn nằm trong danh sách còn thiếu.
- `ui_expo_chest`: hòm quà.

Cách vẽ, chọn một:

- **Nút vẽ ảnh còn thiếu ở trang quản trị**: hai ảnh này nằm đầu danh sách (hình giao diện vẽ trước, rồi icon đồ, rồi các ảnh cố định khác; `drawOrder` trong `lib/artjobs.ts`), khoảng 4 điểm trong 36 điểm một lần bấm, khoảng 0,1 USD. Máy chủ giữ ảnh trong cơ sở dữ liệu và gửi ra đúng địa chỉ `/art/ui/expo_slab.jpg`.
- Hoặc vẽ ra file bằng `npm run pregen -- --only shop` hay workflow "Draw missing art". Sau khi vẽ nó chạy `npm run thumbs`, cắt nền đen thành `public/art/ui/cut/{id}.png` (bệ và hòm 288 px).

Màn hình (`components/CutImg.tsx`) lấy ảnh theo thứ tự: file đã cắt `cut/{id}.png` nếu có; không có (ảnh do máy chủ vẽ chỉ có bản gốc nền đen) thì tải ảnh gốc `/art/ui/{id}.jpg` rồi **cắt nền đen ngay trong trình duyệt** (`lib/cutbrowser.ts`, cùng cách loang từ mép như thumbs, nằm ở `lib/cutout.ts`, làm một lần mỗi lần mở trang), nên ảnh máy chủ vẽ hiện đúng mà không cần chạy thumbs hay commit file. Chưa có ảnh nào thì tự vẽ hình tạm: bệ đá mỏng bằng CSS, hòm bằng biểu tượng, nên tính năng chạy được ngay.

### Khách bay (cảm giác)

Mỗi chuyến tự khác nhau nhưng cùng một chuyến thì luôn bay y hệt (số rút từ số thứ tự khách): tốc độ 0,85 đến 1,4 lần, độ cao lúc vào, nửa số chuyến lượn ngang qua sân khấu rồi quay lại, 30% có đường vòng giữa hai bệ, mỗi lần ngắm 0,95 đến 1,5 giây, đôi khi quay đầu bay ra phía bên kia. Ba bệ khoảng 7 giây. Năm đến bảy khách đi xa mờ bay ngang nền, mỗi lần mở tab được rút ngẫu nhiên lại (độ cao, cỡ, tốc độ 6 đến 16 giây, hướng).

## Loại 6: Thú đi làm

Người chơi cử Linh Thú của mình đi làm thuê. Thú làm theo **thời gian thật** (cả lúc người chơi không mở game, tối đa như phần offline 12 giờ), xong thì người chơi nhận thưởng. Thú không bao giờ mất: nó vẫn là của người chơi, chỉ **bận** từ lúc cử đến lúc nhận thưởng (không bán, không thả, không giao cho khách Tìm thú, không bày ở Triển lãm, không đi làm hai việc cùng lúc). **Thú đang làm vẫn ra trận cùng đội xuất chiến**, việc làm thuê không rút gì khỏi hành trình. Muốn thú đi làm rút khỏi đội thì sửa `bestParty` (và chỗ chọn đội ở `components/Panels.tsx`, `components/JobCards.tsx`, `lib/server/ranking.ts`).

### Hệ có phụ thuộc loài không?

**Có.** Mỗi loài có đúng một hệ (68 loài, 8 hệ, mỗi hệ 8 đến 9 loài, không loài nào hai hệ; `tests/work.test.ts` kiểm). Nên "đúng hệ" là hỏi **một trong 8 đến 9 loài**, "đúng loài" là hỏi một loài. Hỏi cả hai thì thừa, nên không có việc nào hỏi đủ hai thứ: hệ thì rộng (dễ), loài thì hẹp (khó hơn), loài kèm cấp thì hẹp hơn nữa.

### Luật (`lib/work.ts`, không bốc số ngẫu nhiên)

Bảng luôn có 6 chỗ giữ nguyên độ khó, lưu trong `st.work`. Việc sinh từ `seed` và số thứ tự nên cùng save luôn có cùng việc; thưởng và thời gian chốt lúc sinh.

| Độ khó | Số chỗ | Hỏi gì | Thời gian | Lương mỗi giờ | Quà |
|---|---|---|---|---|---|
| Dễ | 2 | **đúng hệ**, loài nào của hệ đó cũng được | khoảng 20 phút | 1 lần | 35%: Hồi Khí Đan hạng 1 ×2 hoặc Khế Ước Phù hạng Hoàng |
| Vừa | 2 | **đúng loài** | khoảng 1 giờ | 1,4 lần | luôn có một món (Khế Ước Phù Hoàng ×2, đan hạng 1 ×4 hoặc đan hạng 2) |
| Khó | 1 | **đúng loài và cấp** từ cấp người chơi trừ 3 đến cấp người chơi trở lên; loài phải gặp được ở vùng người chơi đã mở với cấp đó | khoảng 3 giờ | 2 lần | luôn có một món cỡ Huyền (Khế Ước Phù Huyền ×2, đan hạng 2 ×3 hoặc Khế Ước Phù Hoàng ×5) |
| Đặc biệt | 1 | **chỉ Dị Biến**, đúng hệ (65%) hoặc đúng loài (35%) | khoảng 6 giờ | 4 lần | luôn có hai món: Khế Ước Phù Địa ×2 hoặc Huyền ×5, và đan hạng 3 ×2, đan hạng 2 ×6 hoặc Độ Kiếp Phù |

- Mỗi việc dài 80% đến 120% thời gian trên. Lương = `RATE` (30) × cấp người chơi × hệ số × số giờ, tròn đến 5 Linh Thạch. Ở cấp 12: Dễ khoảng 120 Linh Thạch (20 phút), Vừa 504 (1 giờ), Khó 2.160 (3 giờ), Đặc biệt 8.640 (6 giờ) kèm quà. Nếu cả 6 chỗ luôn có thú làm và luôn được thay ngay thì tối đa khoảng 3.900 Linh Thạch mỗi giờ ở cấp 12 (hành trình bình thường khoảng 2.300), nên dùng thật thì thấp hơn nhiều: phải có đúng thú, phải vào nhận và cử lại.
- Dị Biến cũng làm được việc thường (nó vẫn là thú của loài đó), nhưng chỉ Dị Biến mới làm được việc Đặc biệt.
- Hai chỗ cùng độ khó không bao giờ hỏi giống nhau. Việc không bị hết hạn: nằm trên bảng đến khi làm xong hoặc người chơi từ chối (✕).
- Ba lệnh của người chơi đều là intent thuần, chạy ngay ở trình duyệt, máy chủ có tiếng nói cuối: `workSend` (cử một thú hợp, lưu `beast`, `start`, `end` theo `st.clock`), `workCollect` (chỉ khi `st.clock >= end`; trả Linh Thạch và quà, thú rảnh), `workDismiss` (từ chối việc chưa cử, hoặc gọi thú về giữa chừng thì không nhận gì; việc đã xong thì phải nhận, không từ chối được). Chỗ đã xong hoặc đã từ chối được máy chủ thay việc mới ở tick kế tiếp (`ensureWork`).
- Thú bận được bảo vệ ở mọi chỗ thú rời chuồng: `releaseBeast`, `releaseMany` (giữ lại), `fillJob` của Tìm thú, và `expoSet` (mã lỗi `E_BEAST_BUSY`).

### Cách chạy

- `lib/work.ts`: luật thuần (`makePost`, `newBoard`, `fits`, `candidates`, `stageOf`, `payFor`, chữ). `lib/game.ts`: `ensureWork` (trong `tick`, chỉ ở máy chủ), `workSend`, `workCollect`, `workDismiss`. `lib/intents.ts`: ba intent. `components/Game.tsx` `forkState` sao chép `work`.
- `components/Work.tsx`: bảng và thẻ việc. Thẻ dùng lại giao diện của các loại khác (`ordCard`, con dấu "Hoàn thành" `useFin`/`DoneSeal`), thêm thẻ độ khó (sao và màu: xanh lá, xanh dương, tím, vàng), thú đang làm kèm thanh tiến độ và "còn N phút". Thời gian còn lại đếm tiếp từ `st.clock` của lần cập nhật gần nhất bằng đồng hồ máy (`useGameNow`), nên máy lệch giờ cũng không sai; nút Nhận chỉ hiện khi `st.clock` của máy chủ đã quá `end`. `app/ds/work.css`: phần riêng của loại này.
- Chấm xanh trên tab: có việc đã xong chờ nhận, hoặc có việc trống và có thú hợp đang rảnh (`workReady`).
- Cử thú (`workSend`) chờ máy chủ xác nhận, không làm trước trên màn hình (`SERVER_FIRST` trong `lib/intents.ts`; nhận thưởng và gọi về vẫn làm ngay). Thẻ hiện thú "Đang lên đường…" ngay lúc bấm (kèm hiệu ứng bước vào và vòng sáng), con thú đứng yên trên thẻ cho tới khi máy chủ trả lời; nếu bị từ chối thì thẻ về trạng thái trống và lý do hiện trên đầu bảng. Việc đang cử và lý do từ chối nằm ngoài thẻ nên đổi tag hay đóng cửa sổ giữa chừng vẫn không mất. Thú đang làm thì nhún nhẹ và có ánh sáng chạy trên thanh tiến độ (chỉ `transform`, tắt khi chọn hiệu ứng thấp, tắt hẳn hoặc giảm chuyển động).
- Mọi lệnh gửi lên máy chủ dùng `keepalive`, nên iPhone cất trang đi ngay sau khi bấm thì lệnh vẫn tới nơi.
- Test: `tests/work.test.ts`.
