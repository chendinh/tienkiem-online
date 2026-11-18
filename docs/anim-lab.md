# Hoạt ảnh cho Linh Thú (thử nghiệm, 2026-11)
Trang thử: `/lab/linh-thu` (chỉ chủ game, nhập `ADMIN_KEY`). Mục tiêu: khi có loài mới, tự tạo **nhiều ảnh Dị Biến** và **đoạn hoạt ảnh lặp** cho từng ảnh, để làm Linh Thú Viên.

## API chọn: fal.ai, mô hình ảnh sang video
- Dùng chung `FAL_KEY` và cách gọi của `lib/imagegen.ts`; không thêm nhà cung cấp mới.
- **Kling 2.6 Pro** (`fal-ai/kling-video/v2.6/pro/image-to-video`): nhận `start_image_url` và `end_image_url`. Đặt hai ảnh **giống nhau** thì đoạn video kết thúc đúng ở khung đầu, tức là lặp được. Tắt âm thanh: 0,07 USD mỗi giây, mỗi đoạn 5 giây khoảng 0,35 USD. Đầu ra MP4.
- Ảnh biến thể: vẫn là sửa ảnh gốc bằng `FAL_EDIT_MODEL` (FLUX Kontext, khoảng 0,04 USD), cùng cách game đang làm ra bản Ngũ Sắc. Bản Ngũ Sắc dùng lại ảnh của game, không vẽ lại.
- Đổi mô hình: `FAL_ANIM_MODEL`. **Chỉ Kling 2.6 Pro đã đối chiếu tham số với tài liệu**; mô hình khác nhận đầu vào tối giản (`prompt`, `image_url`, `duration`) và có thể cần chỉnh `clipInput` trong `lib/anim.ts`.

| Lựa chọn khác | Giá (không âm thanh) | Ghi chú |
|---|---|---|
| Kling O3 Pro | 0,112 USD/giây | có `end_image_url`; chưa đối chiếu tên tham số ảnh đầu |
| Kling v3 Pro | 0,112 USD/giây | chưa thấy ghi hỗ trợ khung cuối |
| `pixelcut/looping-video` | 0,08 (480p) đến 0,32 (1080p) USD/giây | tự lặp, camera cố định; làm cho ảnh sản phẩm, đắt hơn ở độ phân giải cao |
| Veo 3.1 | 0,20 USD/giây | đắt, không ghi khung cuối |

## Tách nền, đi bộ, chạy và cảnh thử
- Chuyển động mới: **Đi bộ** và **Chạy**, làm *tại chỗ* (như máy chạy bộ, không tiến lên trong khung); trang cảnh tự dời thú trên ảnh nền.
- **Tách nền**: sau mỗi đoạn, gọi `veed/video-background-removal/fast` với `output_codec: h264`, ra **hai video**: hình và ma trận alpha (xám). Lý do: Safari/iPhone không hiện alpha của WebM VP9 (ra nền đen), nên `components/lab/AlphaVideo.tsx` ghép hai video bằng WebGL, alpha lấy từ video thứ hai. Giá khoảng 0,012 USD mỗi 30 khung, tính tối đa 0,06 USD cho đoạn 5 giây.
- Lưu trong `images`: `animcut` (hình) và `animalpha` (alpha), id băm từ đoạn gốc và mô hình.
- Cảnh thử: `/lab/linh-thu/canh` (cùng `ADMIN_KEY`). Chọn nền (ảnh vùng của game, bình minh, đêm, hoặc ảnh từ điện thoại), chọn tối đa 3 thú đã tách nền. Thú nghỉ vài giây, chọn điểm, đi hoặc chạy tới đó (quay mặt theo hướng đi), nhỏ hơn khi ở xa. Có nút lật hướng cho từng loài vì mô hình vẽ thú quay trái hay phải không cố định.
- Thú không có clip nghỉ thì đứng ở khung đầu của clip đi bộ.

### Cảnh nhiều lớp (cho thú trông như đứng *trong* nền)
Từ xa tới gần: ảnh nền → hạt sáng xa → sương sau → thú → sương trước → lớp che (cỏ hoặc đá, vẽ đè lên chân thú) → hạt sáng gần. Các lớp trượt lệch nhau (parallax) theo nghiêng máy (nút "Bật nghiêng máy", iOS hỏi quyền), con trỏ chuột, hoặc trôi chậm; lớp càng gần càng lệch nhiều.
- **Luật chiều sâu** (`lib/scene.ts`, có test): mỗi nền có một dải mặt đất (`band`) đọc từ ảnh trong `public/art/zones`. Thú càng gần mép dưới càng to, càng rõ; càng xa càng nhạt dần về màu sương của nền (shader trong `AlphaVideo`); màu thú chỉnh theo nền (sáng, độ bão hòa); bóng đổ ngược hướng sáng, đậm hơn khi gần; tốc độ trên màn hình tỉ lệ với cỡ thú để chân không trượt.
- **Lớp che**: mặc định là cỏ vẽ bằng code (SVG, đung đưa, miễn phí). Nút "Vẽ lớp che bằng fal" sửa ảnh vùng chỉ giữ tiền cảnh trên nền trắng (FLUX Kontext) rồi cắt nền (`fal-ai/bria/background/remove`), khoảng 0,06 USD, lưu `animfg`. Phần trên của lớp được làm mờ dần để không che thú. Chỉ có cho màn ngang (ảnh dọc không khớp).
- **Chuyển động**: quay đầu trượt mượt (không lật tức thì), đổi clip bằng mờ chồng 0,3 giây, thỉnh thoảng gầm hoặc dâng hào quang nếu thú có clip đó, bụi bay khi chạy. Mỗi thú có thanh "Bước đi/chạy" để chỉnh tới khi hết trượt chân (lưu trên máy).
- **Nền mặc định của Linh Thú Viên** không theo vùng: biển mây của game (`public/art/scene/dawn.webp` và `night.webp`). Thú đứng trên mây ở giữa tranh, lội trong lớp sương trước nên không vẽ cỏ; lớp che fal (nếu vẽ) sẽ là đá và thông ở hai góc dưới. Cầm dọc điện thoại thì tranh được cắt giữa (tỉ lệ 3:4). Ảnh các vùng chỉ còn là lựa chọn thử.
- **Nền vùng không hợp**: Cửu U, Tinh Hà không có mặt đất (đảo trôi, vũ trụ), Xích Viêm chỉ có đá nham thạch; cảnh sẽ báo. Nền hợp nhất: Thanh Vân, Hàn Nguyệt, Lôi Vân. Muốn đẹp thật nên sinh riêng cho mỗi vùng một "sân" có mặt đất trống rõ ràng (chưa làm).

## Chỗ đứng cố định (hướng chính) · `/lab/linh-thu/vien`
Thú không đi lại nữa mà **đứng ở những chỗ cố định** trên một nền (Thanh Vân), động đậy tại chỗ theo đúng chỗ đó. Bốn chỗ trong `lib/spots.ts`: bờ suối (uống nước), dưới cây thông (hái quả), tảng đá rêu (nghỉ ngơi), rừng tre (ngắm đom đóm).

### Hợp đồng của một chỗ: hai điểm chính xác, giống nhau cho mọi thú
- `stand`: nơi **chân đặt xuống** (đáy của thú). `focus`: **điểm thú làm việc** (mặt nước để uống, quả để hái, hướng nhìn). Tính bằng pixel của ảnh nền (1376×768).
- Thú nào vào chỗ này cũng được đặt theo `frameOf()` (`lib/spots.ts`, có test): phóng cùng một tỉ lệ cho vừa **chỗ cho phép** (`room()`), chân nằm đúng `stand`; thú **với tới** (uống, hái) thì mép trước của khung thú nằm đúng `focus`, nên mõm chạm nước dù là cáo hay rắn. Chỗ uống rộng đúng bằng khoảng cách chân–nước, chỗ hái cao đúng bằng khoảng cách chân–quả, chỗ nghỉ/ngắm dùng `size`.
- **Chấm điểm trên tranh**: nút trên trang cho chạm vào tranh để đặt từng điểm (chấm đỏ = chân, vòng xanh = nước/quả/hướng nhìn, khung vàng = chỗ thú được chiếm). Điểm được lưu ngay (`kv`, khóa `lab.spotpts`, không tốn tiền); thú đã làm dời theo tức thì. Tọa độ mặc định chỉ là đoán từ ảnh, nên điểm "thật" là điểm bạn chấm.
- **Sinh nền mới cho đúng hợp đồng**: nền phải có sẵn chỗ để đặt hai điểm: một mỏm đất/đá **phẳng, vững** cho chân (đủ rộng cho thú nằm hoặc đứng) và, cạnh nó, **mặt nước phẳng** (hay cành thấp để hái quả) trong tầm với của đầu. Nên ghi các chỗ đó vào lời tả khi sinh nền ("a flat mossy ledge at the water's edge in the lower left, calm clear water right in front of it"), rồi chấm điểm lên đúng chỗ ngay sau khi có ảnh.

### Các bước cho mỗi (thú, dị biến, chỗ)
1. **Vẽ**: `google/nano-banana-2.1/edit` nhận ô nền 512 px (quanh hai điểm) + ảnh thú, vẽ thú đúng **tư thế của chỗ** (`pose`: mõm chạm mặt nước, miệng cắn quả…), hướng về `focus`, sáng như cảnh, khoảng 0,07 USD. Vị trí thú trong ô **không cần chính xác** vì bước sau đo và đặt lại.
2. **Tách và đo** (`spotbox`): Bria tách thú khỏi ảnh (khoảng 0,02 USD), máy chủ đo khung và hai đầu (mõm, đuôi) từ kênh alpha (`alphaMetrics`) và lưu cùng ảnh webp nhỏ có alpha. Từ đây thú đã đứng đúng chỗ (ảnh tĩnh).
3. **Hoạt ảnh** (`spotclip`): Kling 2.6, clip lặp 5 giây, khoảng 0,35 USD. Ảnh đầu đã là tư thế đang uống/đang ăn nên clip chỉ **giữ mõm ở yên chỗ** (nuốt, tai và đuôi động, thỉnh thoảng ngẩng lên chút rồi cúi lại), chân không dịch, kết thúc đúng tư thế ban đầu.
4. **Tách nền hoạt ảnh** (`spotcut`): VEED như các clip khác (khoảng 0,06 USD), hai video H.264 (hình + alpha) vẽ bằng WebGL (`AlphaVideo`) nên chạy cả trên Safari iPhone.
Tổng khoảng **0,50 USD** mỗi (thú, dị biến, chỗ), dùng chung cho mọi người chơi. Trang chỉ tính tiền các bước còn thiếu.
- Thú tách nền được đặt **thẳng lên clip nền** nên không còn ô vuông, không lộ viền sương. Trước khi có clip tách nền, trang dùng ảnh tĩnh đã tách; nếu thiết bị không vẽ nổi alpha (video khác nguồn không có CORS) thì quay về ô vuông mờ viền như cũ.
- Mặt nước gợn **đúng chỗ mõm** (vòng sóng vẽ bằng code tại điểm đã đo), quả hái có ánh sáng và tia lửa rơi, bóng tiếp đất là elip dưới chân; các video chỉ chạy khi đang trong màn hình (chín video cùng lúc là quá nhiều cho điện thoại).
- Không dùng bước kiểm tra của game (`review`) cho ảnh này vì nó chấm "một con thú giữa khung" chứ không phải cả một cảnh.
- Thêm chỗ đứng hay nền khác: thêm phần tử vào `SPOTS` (`kind`, `stand`, `focus`, `size`, `pose`, `action`), không cần sửa code khác.
- Giới hạn: thú đặt theo cùng một tỉ lệ nên con lớn và con nhỏ có cỡ gần như nhau tại một chỗ (muốn khác thì thêm hệ số cỡ theo loài). Thú đã cắt có thể mất bóng/phản chiếu nước của ảnh gốc (bóng được vẽ lại bằng code), và chất lượng tách trên video chưa kiểm với thú thật.

**Nền chuyển động:** nút "Làm nền động" tạo một clip lặp 10 giây của cả tranh nền (nước chảy, sương trôi, tia sáng dịch, lá đung đưa, đom đóm), khoảng 0,70 USD, làm một lần dùng chung cho mọi người. Clip nền chạy bên dưới, clip từng thú đặt lên trên. Thú được tách khỏi nền rồi đặt lên clip nền (xem trên) nên không còn viền ô lộ sương; chỉ khi chưa tách xong thì trang dùng tạm ô vuông mờ viền.

**Hiệu ứng tiên hiệp vẽ bằng code** (`components/lab/Ambient.tsx`, miễn phí, lặp mãi, có nút tắt cho máy yếu): tiên hạc bay ngang trời (vỗ cánh rồi lượn), chuồn chuồn đậu một chỗ rồi lao sang chỗ khác phần lớn quanh con suối, bướm, cánh hoa và lá bay theo gió lúc mạnh lúc nhẹ, đom đóm và linh quang nổi lên, ánh lấp lánh trên mặt nước; thêm sương trôi hai lớp và tia nắng quét từ mặt trời (CSS). Clip nền do AI làm chỉ lo phần "thiên nhiên" (nước chảy, thác đổ, sương cuộn, thông tre đung đưa), còn sinh vật nhỏ do code vẽ để chúng không bị AI biến dạng và lặp mượt. Tọa độ con suối và mặt trời trong `Ambient.tsx` đọc từ ảnh Thanh Vân, nền khác phải chỉnh lại.
- Đổi lời tả clip nền (`bgClipPrompt`) thì id đổi: trang hiện nút "Làm lại nền động" (~0,70 USD) và vẫn dùng clip cũ cho tới khi có clip mới.

### Kho Blob (không tốn transfer Neon)
Video lưu ở **Vercel Blob** khi có `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob → nối vào project): hàng trong `images` chỉ giữ `meta.blob.url`, video phát từ CDN. Không có token thì video nằm trong Postgres như cũ. Lý do: Neon Free chỉ cho 5 GB egress/tháng, và trình duyệt điện thoại xin video theo từng đoạn (Range) nên CDN trước hàm không cache, mỗi đoạn đều đọc từ database. Hobby có 1 GB Blob và 10 GB transfer/tháng; trang xưởng hiện dung lượng đã dùng. `/api/lab/media/<id>` với clip ở Blob chỉ trả 302 sang URL Blob.
- `@vercel/blob` được thêm vào `package.json` nhưng `package-lock.json` chưa cập nhật (không có mạng): chạy `npm install` rồi commit lock; workflow `art.yml` tạm dùng `npm ci || npm install`.

## Chi phí một loài mới
Ví dụ 3 dị biến và 2 chuyển động: 3 ảnh sửa + (3 + 1 ảnh gốc) × 2 = 8 đoạn × 0,35 USD ≈ **2,9 USD**; có tách nền cộng thêm 8 × 0,06 ≈ 0,5 USD (**3,4 USD**). Mỗi chuyển động thêm cho cả bộ cộng thêm khoảng 1,4 USD. 10 dị biến × 3 chuyển động khoảng 12 USD cho một loài, nên trang luôn hiện mức tối đa trước khi bấm Tạo.
Sổ chi riêng của lab (`kv`, khóa `lab.usd`, trần `LAB_BUDGET_USD`, mặc định 5 USD), tách khỏi `IMAGE_BUDGET_USD` để không làm hết tiền vẽ ảnh cho người chơi.

## Cách chạy
1. Đặt `FAL_KEY`, `IMAGE_PROVIDER=fal`, `ADMIN_KEY` (xem `.env.example`).
2. Mở `/lab/linh-thu`, nhập khóa, chọn loài (loài mới trong ngày có nhãn "mới"), chọn dị biến và chuyển động, bấm **Tạo**.
3. Ảnh và video lưu trong bảng `images` (`kind` là `animvar`, `anim`, `animcut`, `animalpha` hoặc `animfg`, `folder` là `lab`), id là mã băm nên hỏi lại không tốn tiền.

## Giới hạn đã biết
- **Chưa chạy thử với fal thật** (môi trường làm việc không có khóa và không ra được mạng). Cần thử một loài và xem: vòng lặp có khớp khung đầu và cuối không, màu dị biến có giữ qua video không, đoạn 5 giây nặng bao nhiêu MB.
- Khi không tách nền, video là "tranh động" cả khung (ảnh gốc có nền phong cảnh).
- **Chưa kiểm với VEED thật**: thứ tự hai file ra (code chọn file có chữ "alpha" trong tên, không có thì lấy file thứ hai), hình có bị nhân trước alpha không (shader đang nhân), hai video có lệch nhịp không.
- Đi bộ và chạy "tại chỗ" do mô hình vẽ nên có thể bị trượt chân hoặc tiến lên; vòng lặp đi bộ phải đi qua tư thế đứng ở chỗ nối. Hướng mặt của thú khác nhau từng loài.
- Lớp che bằng fal chưa kiểm: Kontext có thể giữ lại quá nhiều hoặc quá ít tiền cảnh, Bria có thể cắt lẹm viền; chưa thử cắt lớp theo độ sâu (depth) cho nền có sẵn.
- Mỗi thú trong cảnh giải mã 2 video (4 trong 0,3 giây khi đổi clip): giới hạn 3 con để iPhone không nóng và giật; chưa đo trên máy thật.
- Phần "Claude kiểm" cho ảnh biến thể dùng lại `review` của game (chỉ chạy khi có `TUTIEN_ONLINE_AI_KEY`). Đoạn video chưa có bước kiểm tự động.
- Video lưu trong database (bytea) và phát từng đoạn 1 MB qua `/api/lab/media/<id>` (iPhone Safari bắt buộc trả 206). Dùng ổn cho thử nghiệm; khi có nhiều loài nên chuyển sang kho lưu trữ file có CDN.
- Hoạt ảnh trên Vercel chạy tối đa 300 giây mỗi lệnh, đoạn 5 giây thường làm trong 1 đến 3 phút; trang dừng chờ sau 6 phút.

## Nguồn
- Bria xóa nền ảnh: https://fal.ai/models/fal-ai/bria/background/remove
- VEED xóa nền video (codec, giá): https://fal.ai/models/veed/video-background-removal/fast
- Kling 2.6 Pro (tham số, giá): https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/llms.txt
- Looping video của Pixelcut: https://fal.ai/models/pixelcut/looping-video/llms.txt
- So sánh các API ảnh sang video và giá (fal): https://fal.ai/learn/tools/best-image-to-video-apis-2026
Giá và tham số có thể đổi; đọc lại trang của từng mô hình trước khi chạy nhiều.
