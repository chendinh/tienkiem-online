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

## Chi phí một loài mới
Ví dụ 3 dị biến và 2 chuyển động: 3 ảnh sửa + (3 + 1 ảnh gốc) × 2 = 8 đoạn × 0,35 USD ≈ **2,9 USD**. Mỗi chuyển động thêm cho cả bộ cộng thêm khoảng 1,4 USD. 10 dị biến × 3 chuyển động khoảng 12 USD cho một loài, nên trang luôn hiện mức tối đa trước khi bấm Tạo.
Sổ chi riêng của lab (`kv`, khóa `lab.usd`, trần `LAB_BUDGET_USD`, mặc định 5 USD), tách khỏi `IMAGE_BUDGET_USD` để không làm hết tiền vẽ ảnh cho người chơi.

## Cách chạy
1. Đặt `FAL_KEY`, `IMAGE_PROVIDER=fal`, `ADMIN_KEY` (xem `.env.example`).
2. Mở `/lab/linh-thu`, nhập khóa, chọn loài (loài mới trong ngày có nhãn "mới"), chọn dị biến và chuyển động, bấm **Tạo**.
3. Ảnh và video lưu trong bảng `images` (`kind` là `animvar` hoặc `anim`, `folder` là `lab`), id là mã băm nên hỏi lại không tốn tiền.

## Giới hạn đã biết
- **Chưa chạy thử với fal thật** (môi trường làm việc không có khóa và không ra được mạng). Cần thử một loài và xem: vòng lặp có khớp khung đầu và cuối không, màu dị biến có giữ qua video không, đoạn 5 giây nặng bao nhiêu MB.
- Ảnh gốc có nền phong cảnh, nên video là "tranh động" cả khung, chưa tách nền trong suốt.
- Phần "Claude kiểm" cho ảnh biến thể dùng lại `review` của game (chỉ chạy khi có `TUTIEN_ONLINE_AI_KEY`). Đoạn video chưa có bước kiểm tự động.
- Video lưu trong database (bytea) và phát từng đoạn 1 MB qua `/api/lab/media/<id>` (iPhone Safari bắt buộc trả 206). Dùng ổn cho thử nghiệm; khi có nhiều loài nên chuyển sang kho lưu trữ file có CDN.
- Hoạt ảnh trên Vercel chạy tối đa 300 giây mỗi lệnh, đoạn 5 giây thường làm trong 1 đến 3 phút; trang dừng chờ sau 6 phút.

## Nguồn
- Kling 2.6 Pro (tham số, giá): https://fal.ai/models/fal-ai/kling-video/v2.6/pro/image-to-video/llms.txt
- Looping video của Pixelcut: https://fal.ai/models/pixelcut/looping-video/llms.txt
- So sánh các API ảnh sang video và giá (fal): https://fal.ai/learn/tools/best-image-to-video-apis-2026
Giá và tham số có thể đổi; đọc lại trang của từng mô hình trước khi chạy nhiều.
