# Vạn Giới Tinh Đồ (`/tinh-ha`)

Bản đồ các tinh hà. Một trang riêng như Linh Thú Viên (game không chạy ở đó nên máy dồn hết sức cho trang này). Nút mở nằm ở header (`.nav.pic.galaxy`) và trong menu Tùy chọn → Tìm hiểu.

## Gồm những gì
- `content/galaxies.json`: tên tính năng, lời giới thiệu, và mọi tinh hà (tên, câu chuyện, điểm đặc biệt, màu, vị trí trên bản đồ `pos` cho PC và `posM` cho điện thoại dọc). Script vẽ ảnh và giao diện cùng đọc file này.
- `lib/galaxy.ts`: kiểu dữ liệu và đường dẫn ảnh.
- `components/galaxy/Galaxy.tsx` + `app/tinh-ha/galaxy.css`: giao diện. Camera là một `transform` trên lớp bản đồ; chỉ animate `transform` và `opacity`.
- `public/art/galaxy/`: `map_*`, `<id>_*`, `<id>_t.webp` (thumbnail tròn). `_2k` là 2560x1440 (PC), `_1k` là 1080x1920 (điện thoại dọc).
- `public/art/ui/nav/galaxy.png`: icon nút header (176x176, cùng cỡ các icon khác).

## Vẽ lại ảnh
`python3 scripts/art/galaxy_art.py` (cần numpy, scipy, opencv, pillow; không cần mạng). `SCALE=0.3` để xem nhanh, ảnh ra `/tmp/galaxy-preview`. Sau khi vẽ lại cảnh nào, chạy `python3 scripts/art/galaxy_art.py thumbs`.

## Thay bằng ảnh do AI vẽ
Chỉ cần ghi đè đúng tên file (`thienhuyen_2k.webp`, `thienhuyen_1k.webp`, …). Giao diện không phụ thuộc nội dung ảnh, trừ `map_*`: các nút tinh hà được đặt theo `pos`/`posM`, nên ảnh bản đồ mới phải có tinh hà ở đúng các vị trí đó (hoặc sửa `pos`/`posM` cho khớp).

## Thêm một tinh hà
Thêm một mục vào `galaxies` (đủ `id`, `pos`, `posM`, `accent`, `glow`, `status`…), thêm bảng màu `PAL[id]` và một hàm `scene_<id>` trong `galaxy_art.py` (hoặc tự cung cấp ảnh `<id>_2k/_1k/_t.webp`), rồi vẽ lại `map`.
