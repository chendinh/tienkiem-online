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

## Vườn thú: kéo thả vào nền · `/lab/linh-thu/vien` (hướng chính)
Hướng "mỗi chỗ đứng một ảnh và một clip riêng" (vẽ thú vào ô nền, 0,50 USD mỗi chỗ) đã bỏ vì tốn: số clip nhân theo số chỗ. Giờ **mỗi thú chỉ một clip đứng yên**, làm một lần, dùng cho mọi nền.
- **Một thú** = ảnh gốc (hoặc dị biến) → clip `idle` 5 giây (Kling 2.6: thân dao động nhẹ, thở, lông, bờm và đuôi mượt, chân không dịch, lặp liền mạch) → tách nền (VEED, hai video H.264 vẽ bằng WebGL nên chạy cả trên Safari iPhone). Khoảng **0,41 USD** (thêm khoảng 0,04 USD vẽ dị biến nếu là dị biến). Nút "Tạo thú" trong trang, hiện giá trước, chỉ cho một (thú, dị biến) mỗi lần.
- **Nền đẹp có sẵn các bệ đứng.** Nền là một cảnh tiên hiệp đẹp, trong đó có vài **bệ đứng** (`Perch`: điểm đặt chân `x,y`, bề rộng chỗ phẳng `w`, cỡ thú `s`): đỉnh tảng đá, mỏm đá, phiến đá, bậc đá. Thả thú chỗ nào thì nó đi tới bệ gần nhất (đo theo khoảng cách trên màn hình), đứng trong bề rộng bệ, và to nhỏ theo bệ (bệ xa thì nhỏ). Nút "Chỉnh bệ đứng": chạm tranh để thêm bệ, kéo chấm vàng để dời, thanh trượt đổi bề rộng và cỡ, xóa bệ; thú trên bệ bị dời/xóa tự chuyển sang bệ gần nhất. Nút "AI gợi ý bệ đứng" cho Claude xem nền (có lưới đánh số) và chấm sẵn các bệ, chỉ tốn vài xu và chủ nền chỉnh lại sau; cần khóa `TUTIEN_ONLINE_AI_KEY` (mô hình đổi bằng `PERCH_MODEL`).
- **Sinh nền mới** (`THEMES` trong `lib/garden.ts`, khoảng 0,05 USD một nền, nano-banana): lời tả đòi một cảnh nhiều lớp thật đẹp, có NHIỀU chỗ phẳng nhỏ tự nhiên vừa một con chó hay con nai đứng (đỉnh tảng đá phủ rêu, phiến đá bên nước, mỏm đá nhô ra), nhìn rõ, phía trên mỗi chỗ để trống, không có thú hay người. Sáu chủ đề (sơn thủy, hồ sen, đỉnh mây, đào viên, trăng bạc, hang tiên). Nền có sẵn của game cũng dùng được: Thanh Vân và biển mây sáng/đêm đã đặt tay sẵn các bệ (`DEFAULT_PERCHES`). Sau khi sinh nền, bấm "AI gợi ý bệ đứng" rồi chỉnh tay.
- **Chân đứng đúng điểm thả.** Mỗi clip có lề trống khác nhau, nên khi video đầu tiên được vẽ, trang đo khung thú từ kênh alpha (`alphaBox`, đọc từ canvas WebGL) và đặt sao cho đáy giữa khung thú nằm đúng điểm thả (`frameOf`, có test). Quay mặt lật quanh giữa thú. Thú chỉ hiện sau khi đo xong.
- **Kéo thả**: kéo từ khay xuống nền (hoặc chạm một lần để thả vào bệ đang ít thú nhất), kéo thú trên nền để dời, chọn để quay mặt, đổi cỡ (0,5 đến 2 lần so với cỡ của bệ), xóa. Mỗi nền tối đa 12 thú (mỗi thú là hai video và một canvas WebGL), video chỉ chạy khi đang trong màn hình. Chỗ đặt lưu ở máy chủ (`kv`, khóa `lab.garden`, theo từng nền) nên mở ở máy nào cũng thấy.
- **Nền động** (tùy chọn, mỗi nền một lần, khoảng 0,70 USD): một clip lặp 10 giây của cả nền (nước chảy, sương trôi, cây đung đưa, tia sáng), mặt đất giữ yên. Thú đặt lên trên.
- **Hiệu ứng vẽ bằng code** (`Ambient.tsx`, miễn phí, có nút tắt): hạc, bướm, chuồn chuồn, cánh hoa, linh quang, và ánh lấp lánh trên suối chỉ khi nền là Thanh Vân.
- Giới hạn chưa kiểm với thú thật: chất lượng tách nền video, độ mượt của lông, và hiệu năng iPhone khi nhiều thú. Thú đã tách không còn bóng/phản chiếu của ảnh gốc: bóng tiếp đất là elip vẽ bằng code dưới chân.

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
