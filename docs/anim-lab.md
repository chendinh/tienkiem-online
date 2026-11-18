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

## Chi phí một loài mới
Ví dụ 3 dị biến và 2 chuyển động: 3 ảnh sửa + (3 + 1 ảnh gốc) × 2 = 8 đoạn × 0,35 USD ≈ **2,9 USD**; có tách nền cộng thêm 8 × 0,06 ≈ 0,5 USD (**3,4 USD**). Mỗi chuyển động thêm cho cả bộ cộng thêm khoảng 1,4 USD. 10 dị biến × 3 chuyển động khoảng 12 USD cho một loài, nên trang luôn hiện mức tối đa trước khi bấm Tạo.
Sổ chi riêng của lab (`kv`, khóa `lab.usd`, trần `LAB_BUDGET_USD`, mặc định 5 USD), tách khỏi `IMAGE_BUDGET_USD` để không làm hết tiền vẽ ảnh cho người chơi.

## Cách chạy
1. Đặt `FAL_KEY`, `IMAGE_PROVIDER=fal`, `ADMIN_KEY` (xem `.env.example`).
2. Mở `/lab/linh-thu`, nhập khóa, chọn loài (loài mới trong ngày có nhãn "mới"), chọn dị biến và chuyển động, bấm **Tạo**.
3. Ảnh và video lưu trong bảng `images` (`kind` là `animvar`, `anim`, `animcut` hoặc `animalpha`, `folder` là `lab`), id là mã băm nên hỏi lại không tốn tiền.

## Giới hạn đã biết
- **Chưa chạy thử với fal thật** (môi trường làm việc không có khóa và không ra được mạng). Cần thử một loài và xem: vòng lặp có khớp khung đầu và cuối không, màu dị biến có giữ qua video không, đoạn 5 giây nặng bao nhiêu MB.
- Khi không tách nền, video là "tranh động" cả khung (ảnh gốc có nền phong cảnh).
- **Chưa kiểm với VEED thật**: thứ tự hai file ra (code chọn file có chữ "alpha" trong tên, không có thì lấy file thứ hai), hình có bị nhân trước alpha không (shader đang nhân), hai video có lệch nhịp không.
- Đi bộ và chạy "tại chỗ" do mô hình vẽ nên có thể bị trượt chân hoặc tiến lên; vòng lặp đi bộ phải đi qua tư thế đứng ở chỗ nối. Hướng mặt của thú khác nhau từng loài.
- Mỗi thú trong cảnh giải mã 2 video: giới hạn 3 con để iPhone không nóng và giật; chưa đo trên máy thật.
- Phần "Claude kiểm" cho ảnh biến thể dùng lại `review` của game (chỉ chạy khi có `TUTIEN_ONLINE_AI_KEY`). Đoạn video chưa có bước kiểm tự động.
- Video lưu trong database (bytea) và phát từng đoạn 1 MB qua `/api/lab/media/<id>` (iPhone Safari bắt buộc trả 206). Dùng ổn cho thử nghiệm; khi có nhiều loài nên chuyển sang kho lưu trữ file có CDN.
- Hoạt ảnh trên Vercel chạy tối đa 300 giây mỗi lệnh, đoạn 5 giây thường làm trong 1 đến 3 phút; trang dừng chờ sau 6 phút.

## Nguồn
- VEED xóa nền video (codec, giá): https://fal.ai/models/veed/video-background-removal/fast
- Kling 2.6 Pro (tham số, giá): https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/llms.txt
- Looping video của Pixelcut: https://fal.ai/models/pixelcut/looping-video/llms.txt
- So sánh các API ảnh sang video và giá (fal): https://fal.ai/learn/tools/best-image-to-video-apis-2026
Giá và tham số có thể đổi; đọc lại trang của từng mô hình trước khi chạy nhiều.
