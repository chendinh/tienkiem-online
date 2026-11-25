# Phó Bản

Nhóm Phó Bản trong menu chứa các loại phó bản. Loại đầu tiên là **Trảm Dị Thú**.

## Trảm Dị Thú

Mỗi ngày một Dị Thú. Người chơi chỉ cần tick **Tham gia** (hoặc bật **Tự tham gia mỗi ngày**). Đúng **20:00 giờ Việt Nam**, máy chủ đánh trận một lần cho tất cả, lưu từng đòn vào database. Mọi màn hình chiếu lại cùng một "bộ phim" từ bản ghi đó: các tu sĩ (đúng số người đã ghi danh, tên dưới kiếm) bay lên vây đánh, Dị Thú đáp trả, tung tuyệt kỹ bằng clip riêng, ai gục thì rơi xuống, cuối cùng Dị Thú bị trảm hoặc trốn thoát. Người chơi không cần chạm gì trên màn hình; xem xong thì nhận thưởng.

Mở từ nút tròn có mặt Dị Thú hôm nay ở thanh trên (chấm đỏ nhấp nháy 3 phút đầu khi khai chiến), menu ☰ → nhóm **Phó Bản** → **Trảm Dị Thú**, hoặc lối tắt dưới phần nhân vật. Màn toàn màn hình như Công việc, có địa chỉ `?pho-ban=1` (nút Back đóng màn, tải lại vẫn ở đó).

## Tám Dị Thú (`lib/raid.ts` `BOSSES`)

Mỗi hệ một con, xoay vòng theo ngày: Kim Tinh Bạch Hổ (Kim), Thanh Đằng Cự Viên (Mộc), Cửu Anh Thủy Mãng (Thủy), Xích Diễm Hỏa Kỳ Lân (Hỏa), Huyền Vũ Cự Quy (Thổ), Cửu Thiên Lôi Bằng (Lôi), Hàn Nguyệt Thiên Lang (Âm), Thánh Quang Sư Vương (Dương). Mỗi con có ba đòn: **đánh đơn** (một người, thường nhắm người gây sát thương nhiều), **càn quét** (khoảng 45% người còn đứng), **tuyệt kỹ** (hiệp 3, 7, 11: trúng mọi người, chiếu clip riêng). `at` là chỗ con thú trên ảnh (để đòn đánh trúng đúng thân nó).

## Luật trận (`lib/raid.ts`, tất định theo ngày)

- **Tu sĩ là ảnh chụp chỉ số** lúc ghi danh (Công Kích, Phòng Ngự, Sinh Lực, Tốc Độ, Bạo Kích, chiêu đang trang bị), làm mới mỗi lần mở màn Phó Bản trước giờ đánh. Không có id tài khoản, chỉ có id công khai như Bảng Phong Thần.
- Mỗi hiệp: tu sĩ ra tay theo Tốc Độ (chọn chiêu tấn công mạnh nhất đã hồi; ai có chiêu hồi máu thì cứu đồng đội dưới 50% Sinh Lực; chiêu tăng công, hộ thể, giảm giáp, choáng dùng cho cả đội), rồi Dị Thú đáp trả. Tối đa **14 hiệp**; còn sống sau đó thì Dị Thú **trốn thoát**. Dưới 30% Sinh Lực nó **cuồng nộ** (đòn mạnh thêm 30%).
- **Công bằng giữa cấp thấp và cao.** Tu sĩ đánh bằng Công Kích của chính mình (người mạnh gây nhiều sát thương hơn), nhưng Dị Thú đánh mỗi người theo **phần trăm Sinh Lực của người đó**, giảm theo Phòng Ngự so với Phòng Ngự gốc của cấp đó. Người mới không chết sau một đòn; đồ phòng thủ tốt và chiêu hồi máu giúp đứng lâu hơn.
- **Sinh Lực Dị Thú** = sát thương mỗi hiệp ước tính của chính những người đã ghi danh (theo bộ chiêu, hệ, bạo kích của từng người) × 9 đến 13 hiệp. Nên trận luôn vừa sức nhóm, dù 1 hay 300 người. Mô phỏng trên save thật: một mình thắng khoảng 43%, từ 2 người 79 đến 92%, trận khoảng 12 hiệp, khoảng 1/4 tu sĩ bị gục.
- Số người trúng đòn tỉ lệ với số người còn đứng, và lực đòn chia theo đó, nên mỗi người chịu đòn như nhau dù nhóm đông hay ít.

## Thưởng (`rewardOf`)

- Linh Thạch = cấp × (120 nếu thắng, 50 nếu thua) × (0,7 + 0,3 × phần sát thương so với trung bình, tối đa gấp 3), Công đầu × 1,5.
- Thắng: Khế Ước Phù hạng Huyền ×2, Hồi Khí Đan hạng 2 ×2, nguyên liệu của Dị Thú (3 đến 8 tuỳ phần sát thương). Công đầu chắc chắn nhận một **Bí Kíp** hạng Huyền hoặc Địa đúng hệ Dị Thú (ưu tiên môn của vũ khí người đó); hạng 2 và 3 có 50%.
- Thua: Hồi Khí Đan hạng 1 ×2.
- Thưởng nằm trên dòng `raid_entries` cho tới khi người chơi bấm **Nhận thưởng** (lệnh `raid_claim`). Món nào đầy ô thì đổi ra Linh Thạch theo giá Phường Thị. Thưởng 7 ngày gần nhất chưa nhận vẫn hiện.

## Cách chạy

- `lib/raid.ts`: Dị Thú, ngày (giờ Việt Nam), `fight`, `rewardOf`. `lib/raidplay.ts`: đội hình (24 chỗ so le dưới chân Dị Thú, người xem luôn ở chỗ đẹp nhất), đường bay, dòng thời gian của phim, `stateAt` (mọi con số ở một thời điểm, để bắt đầu phim giữa chừng).
- `lib/server/raid.ts`: bảng `raids` (một dòng mỗi ngày, có `film` là toàn bộ bản ghi), `raid_entries`, `raid_auto`. Trận được đánh **một lần** dưới khoá `raid:<ngày>` bởi yêu cầu đầu tiên sau giờ đánh: lượt hỏi trạng thái game (tối đa 20 giây một lần mỗi máy chủ), `GET /api/raid`, hoặc cron hằng ngày. Ngày bị lỡ (không ai ghé) được đánh bù trong 2 ngày. Trận không ghi vào save nào, nên không khoá tài khoản ai.
- Lệnh của người chơi (`/api/game`, cùng khoá và idempotency như mọi lệnh): `raid_join`, `raid_leave` (rút tên hôm nay, tắt luôn tự tham gia), `raid_auto`, `raid_claim`. Sau giờ đánh không ghi danh hay rút được (`E_RAID_CLOSED`).
- `components/Raid.tsx`: màn hình, đếm ngược theo đồng hồ máy chủ, tự gọi lại lúc khai chiến. Phim đang chạy thì **chiếu trực tiếp** từ đúng giây hiện tại (ai mở cùng lúc thấy cùng một đòn); xong rồi thì chiếu từ đầu, có nút Bỏ qua và Xem lại. Tab bị ẩn rồi quay lại thì phim nhảy tới đúng chỗ. Giảm chuyển động hoặc tắt hiệu ứng thì vào thẳng kết quả.
- `components/RaidScene.tsx`: sân khấu 9:16. Mọi chuyển động là Web Animation hoặc nút DOM tự xoá (React không vẽ từng khung). Mỗi lượt tu sĩ là một **chuyến bay cong** lên Dị Thú (cận chiến lao vào thân, tầm xa bay tới điểm thi pháp), ra chiêu bằng hiệu ứng Thần Thông sẵn có (`components/fx/SkillFx.ts`), vòng về chỗ theo đường khác. Màn đông (trên 14 người) hoặc máy yếu: một nửa đòn chỉ vẽ vệt sáng. Người ngoài 24 chỗ vẫn đánh, mỗi hiệp một chùm vệt sáng từ dưới và một con số chung.
- Tuyệt kỹ: clip `ult.mp4` phủ cả sân khấu. Clip bắt đầu đúng khung của ảnh Dị Thú nên chuyển cảnh không lộ. Không phát được clip thì loé sáng và rung mạnh thay.
- Kết thúc: thắng thì clip Dị Thú cháy sáng rồi tan, lộ ra hang trống (`bg.jpg`, cùng khung hình); thua thì nó mờ dần vào sương.
- `app/ds/raid.css`. Test: `tests/raid.test.ts`.

## Ảnh và clip AI (`scripts/gen-raid.ts`)

Mỗi Dị Thú 4 file trong `public/art/raid/<id>/`, vẽ một lần, giá và prompt ghi ở `public/art/raid/_manifest.json`:

| File | Cách vẽ | Giá |
|---|---|---|
| `bg.jpg` | hang trống 9:16, `google/nano-banana-2.1` 1K | khoảng 0,05 USD |
| `boss.jpg` | sửa từ `bg.jpg`, thêm Dị Thú (`nano-banana-2.1/edit`) | khoảng 0,07 USD |
| `loop.mp4` | Dị Thú thở, quay đầu, khung đầu = khung cuối (Kling 2.6 Pro, 5 giây) | 0,35 USD |
| `ult.mp4` | tuyệt kỹ lao về phía màn hình, bắt đầu từ `boss.jpg` (Kling 2.6 Pro, 5 giây) | 0,35 USD |

Cả bộ 8 con: **6,25 USD**, 18 MB. Clip nén lại bằng ffmpeg (720 px, H.264, không tiếng, faststart): 0,2 đến 0,4 MB mỗi vòng lặp, 1,3 đến 2,3 MB mỗi tuyệt kỹ. Vẽ lại một con: xoá file rồi `FFMPEG=<đường dẫn ffmpeg> npx tsx scripts/gen-raid.ts --only <id>` (`--dry` xem giá, `--step bg,boss` chỉ vẽ ảnh). Không có clip thì sân khấu dùng ảnh tĩnh có nhịp thở bằng CSS.

## Chạy thử

- `RAID_FIGHT_MINUTE=<phút sau nửa đêm, giờ VN>` dời giờ đánh của ngày mới (ví dụ `1215` là 20:15), `RAID_BOSS=<id>` chọn Dị Thú cho ngày mới. Giờ và Dị Thú được ghi vào dòng `raids` lúc tạo ngày, nên đổi biến sau đó không ảnh hưởng ngày đang chạy.
- Chromium tự build (Playwright) không phát được H.264; Chrome, Edge, Safari, Firefox thật thì được. Khi thử bằng Playwright, sân khấu tự dùng ảnh tĩnh và loé sáng thay clip.
