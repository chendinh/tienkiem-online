# Tiên Kiếm — bản thử nghiệm trực quan
Game tu tiên treo máy (Next.js). Bản này để **xem và chơi thử** vòng lặp cốt lõi và hình ảnh. Đặc tả nằm ở `.kiro/specs/tu-tien-idle-game/requirements.md` (đang viết dở).

## Chạy
```bash
npm install
npm run dev      # mở http://localhost:3000
npm run sim      # mô phỏng 12 giờ treo máy ngoài giao diện, kiểm tra tính xác định
npm test         # kiểm thử tự động (engine, tài khoản, kinh tế, idempotency)
npm run check    # kiểm tra Balance_Config và Content_Catalog (CI)
npm run ci       # check + typecheck + test + build
```
**Cần một database Postgres** (biến `DATABASE_URL`). Chưa có thì chạy `npm run db:dev` ở một terminal riêng: lệnh này dựng sẵn một Postgres cục bộ (PGlite, không cần cài gì), lưu trong `data/pg`, rồi in ra hai dòng `DATABASE_URL=...` và `PG_POOL_MAX=1` để dán vào `.env.local`. Các bảng tự được tạo ở lần dùng đầu.
Mở game lần đầu: tạo tài khoản (email + mật khẩu ít nhất 8 ký tự). Tiến trình, ảnh đã vẽ, truyện và sổ chi tiêu lưu **trong database**, nên chạy được trên Vercel (ổ đĩa ở đó không giữ dữ liệu). Liên kết đặt lại mật khẩu được ghi vào bảng `logs` (`name = 'outbox.log'`) và console máy chủ cho tới khi nối dịch vụ email.
Đã có dữ liệu cũ trong thư mục `data/` (bản lưu bằng file)? Chép sang database một lần: `npm run db:migrate` (thêm `-- --dry` để xem trước). Chạy lại nhiều lần vẫn an toàn: dòng nào database đã có thì giữ nguyên, không đè bản save mới bằng bản cũ. Đặt `TUTIEN_TIME_SCALE=20` (chỉ khi dev) để thời gian máy chủ chạy nhanh 20 lần, `TUTIEN_RATES=demo` để đồ hiếm và Dị Biến ra nhiều hơn.
Khóa API đặt trong `.env.local` (không commit, đã có trong `.gitignore`). Mẫu ở `.env.example`. Sau khi đổi `.env.local` hoặc mã phía máy chủ, tắt rồi chạy lại lệnh trên.

## Có gì
- Vòng lặp treo máy: gặp Yêu Thú (8 loài; mỗi cá thể có kích thước cm, tính cách, tư chất, Dị Biến riêng), chiến đấu tự động theo bảng khắc chế 8 hệ, nhặt pháp khí (6 độ hiếm, Affix ngẫu nhiên, Tiên Văn), thu phục Linh Thú, Kỳ Ngộ.
- Tu luyện: Luyện Khí → Trúc Cơ → Kim Đan → Nguyên Anh → Hóa Thần, mỗi cảnh giới 4 tiểu cảnh giới, Bình Cảnh, Đột Phá, Thiên Kiếp, Tâm Ma.
- Thiên Đạo Bảo Hộ (pity) cho Dị Biến và pháp khí hiếm, tỉ lệ thật theo đặc tả (xem màn “Xác suất”).
- **Máy chủ quyết định mọi kết quả.** Trình duyệt chỉ gửi ý định; máy chủ tính giờ, mô phỏng Tick (5 giây), lưu trạng thái. Quay lại sau ít nhất 2 phút (tính tối đa 12 giờ) sẽ có báo cáo ngoại tuyến.
- 5 Khu Vực mở theo cấp, Thiên Địa Dị Tượng (đổi mỗi 3 giờ, chung cho mọi người chơi), Tu Sĩ chặn đường, Tài Nguyên, Kỳ Ngộ.
- Phường Thị (12 mặt hàng), Hồi Khí Đan 3 hạng, Khế Ước Phù 4 hạng, Phá Cảnh Đan, Độ Kiếp Phù, sổ cái Linh Thạch, thả Linh Thú.
- **Hành trình có lựa chọn.** Khi tắt tự động, hành trình dừng ở thanh câu hỏi cuối màn hình (không chặn việc mở túi hay đổi trang bị): thu phục Linh Thú đáng chú ý (Dị Biến, Tinh Anh, quá nhỏ hoặc quá lớn, loài mới), giao chiến hay tránh Tu Sĩ, đột phá khi tới Bình Cảnh. Bật tự thu phục / tự giao chiến / tự đột phá để game tự quyết.
- **Độ khó và kinh tế.** Chỉ khoảng 40% Tick gặp gì đó (còn lại là đi đường), có Tinh Anh, Thương Thế sau khi thua, Kỳ Ngộ có hại, Dị Tượng bất lợi, phí nuôi Linh Thú, Tu Sĩ cướp Linh Thạch khi thắng ngươi. `npm run econ` in báo cáo thu nhập và tỉ lệ thắng.
- Đồ nhặt được mặc định vào túi (không tự mặc, không tự phân giải). Có nút “Dọn túi” và “Bán nhanh các con dư”.
- Ảnh pháp khí có hai bản nhỏ (`?s=sm` 128 px cho danh sách, `?s=md` 320 px cho popup) tạo lúc cần bằng `sharp`, lưu cạnh bản gốc trong bảng `images` của database.
- Cài đặt: ngưỡng nghỉ/quay lại, tự dùng đan, tự thu phục có bộ lọc, tự đột phá (mặc định tắt), tự phân giải theo độ hiếm.
- **Trang bị & Túi Càn Khôn.** Tám ô khuôn (Pháp Khí, Quan, Đạo Bào, Hài, Bối, Bội, Giới Chỉ, Hộ Phù) nằm hai bên ảnh nhân vật; ô trống hiện khuôn khắc biểu tượng vẽ sẵn, ô đầy hiện biểu tượng món đang mặc. Đồ nhặt được mà chưa mặc nằm trong túi (100 món), đầy thì sang Kho Tạm (50 món). **Kéo** một món sang ảnh nhân vật hoặc đúng ô khuôn: chỗ nó được đặt sáng lên trên cơ thể. Trên điện thoại: chạm món rồi chạm ô. Kéo món đang mặc vào túi để tháo. Mũi tên ▲▼ trên mỗi món so sức mạnh với món đang mặc ở ô đó; nhãn Lv đỏ là chưa đủ cấp.
- **Khóa.** Món bạn tự mặc được khóa (🔒): tự mặc (“Tự mặc đồ mạnh hơn”) không thay nó và túi đầy không tự phân giải nó. Mở khóa để game lại tự quyết. Mặc thủ công đúng luật của đặc tả (Requirement 21): đúng ô, đủ cấp; tháo cần túi còn chỗ; HP bị kẹp theo Sinh Lực tối đa mới.
- **Phó Bản.** Mỗi ngày một Dị Thú (8 con, mỗi hệ một con). Tick Tham gia, 20:00 giờ Việt Nam máy chủ đánh một lần cho mọi người và mọi màn hình chiếu lại cùng một trận như phim (tu sĩ bay vây đánh, tên dưới kiếm, Dị Thú tung tuyệt kỹ bằng clip AI). Xem `docs/pho-ban.md`.
- **Sưu Tập (Linh Thú Đồ Giám).** Sổ ghi 8 loài yêu thú đã gặp: số lần gặp, số lần thu phục, kích thước nhỏ nhất đến lớn nhất, số lần gặp Dị Biến; loài chưa gặp hiện bóng đen. Không phải giám định đồ.

## Kiểm thử đã làm cho màn Trang bị
Chạy trong Chromium thật (Playwright) với ảnh AI tắt, nên không tốn tiền: bố cục, sáng ô khi kéo, mặc đúng ô, thả vào ảnh nhân vật, từ chối sai ô / thiếu cấp / túi đầy, tháo bằng cách kéo vào túi, chạm để chọn, khóa, phân giải, Escape, màn hình 390 px. Luật túi đồ (`equipFromBag`, `unequip`, `toggleLock`, `dissolveBagItem` trong `lib/game.ts`) được thử riêng và `npm run sim` cho kết quả y hệt trước khi sửa. Bộ kiểm thử tự động nằm ở `tests/` (`npm test`); giao diện chưa có kiểm thử tự động.

## Giới hạn của bản này
- Lưu trữ bằng tệp JSON trên một tiến trình máy chủ (chưa có cơ sở dữ liệu). Cần thay khi chạy nhiều tiến trình.
- Chưa làm: Công Pháp và Thần Thông tự chọn, chọn Party thủ công, tỉ lệ hoàn thành Đồ Giám, Combat_Log lưu riêng từng trận, Diversity_Report, Art_Pipeline và kiểm tra giấy phép asset, bảng chuỗi cho toàn bộ giao diện (mới có cho mã lỗi).
- Ảnh do AI tạo (fal.ai, họ FLUX), **chưa kiểm tra giấy phép thương mại**. Prompt, seed, mô hình và mã yêu cầu của ảnh tĩnh nằm ở `public/art/_manifest.json`.
- Linh Thú chưa lên cấp và chưa có trùm. Nhịp tu luyện theo Phụ lục B.2 (Level 20 sau khoảng 16 ngày), nên khi thử hãy dùng `TUTIEN_TIME_SCALE`.

## Hệ thống ảnh
Mọi ảnh dùng **một hướng nghệ thuật: Fantasy Realistic 3D** (không dùng semi-realistic/anime), nằm ở `lib/imageprompt.ts` và theo quy chuẩn: nhân vật *Fantasy Realistic*, trang phục *Ornate Chinese Fantasy*, vũ khí *Realistic 3D Magical Artifact*, linh thú *Fantasy Realistic Creature*, vật phẩm *Premium 3D RPG Item Render*, bối cảnh *Cinematic Xianxia Environment*. Nhân vật nam, nữ, linh thú và trang bị giữ cùng một phong cách để vũ khí không giống ảnh chụp sản phẩm. Seed cố định. Đổi phong cách thì tăng `ART_V` trong `lib/avatarSpec.ts`: nhân vật vẽ theo phong cách cũ hiện nút “✨ Vẽ lại” (ảnh gốc mới, tư thế đứng, rồi mặc lại đồ đang đeo; `ART_V` hiện là 7). Máy chủ tự dựng prompt từ vài thuộc tính đã kiểm tra, trình duyệt không gửi được prompt tùy ý. Thứ gì phải là *cùng một chủ thể* (nhân vật đổi trang bị, quái Dị Biến) thì **sửa từ ảnh gốc**, không vẽ lại từ đầu.

| Ảnh | Cách vẽ (fal) | Khi nào | Lưu ở |
|---|---|---|---|
| Hai ảnh chọn nữ/nam ở màn mở đầu | `google/nano-banana-2.1`, 1K | một lần, `npm run pregen` | `public/art/intro_f.jpg`, `intro_m.jpg` |
| Quái thú, bản thường (8 loài) | `google/nano-banana-2.1`, 1K (FLUX dev vẽ ra thú bông, không đạt Fantasy Realistic) | một lần, `npm run pregen` | `public/art/monsters/{loài}.jpg` |
| Quái thú, bản Dị Biến (8 loài) | `fal-ai/flux-pro/kontext` sửa bản thường | một lần, `npm run pregen` | `public/art/monsters/{loài}_mut.jpg` |
| Nhân vật, ảnh gốc (áo trắng trơn, tay không) | `google/nano-banana-2.1`, 1K, seed là seed diện mạo | một lần cho mỗi nhân vật, tự vẽ lúc bắt đầu | bảng `images`, địa chỉ lưu trong dữ liệu chơi |
| Nhân vật, tư thế đứng | `google/nano-banana-2.1/edit`, 1K: sửa từ ảnh gốc, chỉ đổi dáng đứng và gió | tự vẽ ngay sau ảnh gốc | bảng `images`, địa chỉ lưu ở `player.avatar.pose` |
| Nhân vật, mặc trang bị | `google/nano-banana-2.1/edit`, 1K: nhận ảnh tư thế đứng (chưa có thì ảnh gốc) và biểu tượng của từng món đang mặc | khi người chơi bấm nút 🎨 | bảng `images` |
| Biểu tượng pháp khí (ô, loại, hạng) | `fal-ai/flux/schnell`, 512 px | lần đầu gặp, sau đó dùng lại | bảng `images` |

**Nhân vật.** Nút **🎨 Vẽ lại theo trang bị** đưa cho mô hình ảnh gốc của nhân vật cùng biểu tượng của từng món đang mặc (tối đa 6 ô nhìn thấy được: Pháp Khí, Quan, Đạo Bào, Hài, Bối, Bội; Giới Chỉ và Hộ Phù quá nhỏ nên không vẽ), nên avatar được chép từ biểu tượng chứ không tưởng tượng từ chữ. Vì vậy biểu tượng quyết định tất cả: **một hạng một bảng màu chung (trắng ngà và vàng từ hạng Huyền), màu hệ chỉ ở điểm nhấn** (viền, ngọc, tua rua) để cả bộ trang bị đồng bộ như một bộ thiết kế; mô tả món phải cụ thể kiểu cổ trang (“cloud shoes” từng bị vẽ thành giày thể thao). Áo/áo choàng được vẽ dạng “người vô hình” không giá đỡ để làm ảnh tham chiếu sạch. Ảnh mặc đồ và ảnh gốc luôn là người trưởng thành, tỉ lệ cân đối (khoảng 8 đầu, cao và thon), dễ thương và hơi quyến rũ ở mức thanh lịch; Claude loại ảnh méo, kiểu chibi hoặc thiếu món. Avatar cũ vẽ theo cách chữ sẽ hiện “Trang bị đã đổi” một lần để vẽ lại theo biểu tượng. Nền đổi theo hạng của Đạo Bào. Luôn vẽ từ **ảnh gốc**, không vẽ chồng lên ảnh đã vẽ, nên khuôn mặt không trôi dần. Nút **không bao giờ bị khóa** vì đã khớp hay vì thời gian chờ (không còn chờ 30 giây). Nó sáng màu khi trang bị khác với ảnh đang hiện; khi đã khớp thì thành **Vẽ bản khác** và vẽ lại cùng trang bị ra một bản khác (tham số `v` đổi seed, khoảng 0,07 USD mỗi lần). Khi không mặc món nào nhìn thấy được, lần bấm đầu về ảnh tư thế (miễn phí), lần sau vẽ lại tư thế. Nút chỉ chờ khi AI đang vẽ, hoặc khi AI tắt. Vẽ lỗi hoặc chạm giới hạn thì ảnh cũ được giữ nguyên. Ảnh mặc đồ được vẽ từ ảnh tư thế đứng nên giữ nguyên dáng đó (nhân vật chưa có ảnh tư thế thì dùng một trong 4 dáng mềm mại: dồn trọng lượng một chân, xoay ba phần tư, bước chậm, tựa nhẹ, chọn theo seed). Mỗi lần vẽ mất khoảng 40 giây.

**Diện mạo và tư thế đứng.** Ảnh gốc nhắm tới nhân vật tiên hiệp Trung Hoa: cao khoảng 8 đầu, da sáng (bốn tông `SKINS` đều là da trắng ngọc đến ngà ấm, không còn da rám nắng), ánh sáng ban ngày trong trẻo, và mỗi nhân vật có một kiểu mặt riêng chọn từ 5 kiểu (`FACE_F`, `FACE_M` trong `lib/content.ts`). Nữ: eo thon, ngực đầy, hông rộng và tròn. Trang phục là hanfu cải tiến ôm sát người kiểu phim cổ trang: vai trần, cổ chữ V sâu, ô voan xuyên thấy ở eo, tay áo voan, váy đuôi cá bó như da ở hông và đùi, xẻ tà tới đùi. Là người trưởng thành, quyến rũ nhưng không khỏa thân; đây là mức hở tối đa của game (chỉnh ở `PLAIN_WEAR_F` và `FIT_F` trong `lib/imageprompt.ts`). Khi mặc đồ, quy tắc `FIT_F` trong `lib/imageprompt.ts` bắt món áo được may bó theo người ở eo, hông và đùi dù là áo gì (giữ nguyên màu, hoa văn, trang sức); chỉ tay áo, áo choàng và lớp ngoài để rộng. Các dáng đứng của nữ đều đẩy hông ra một bên. Nam có hai dáng: thư sinh (tuấn tú, mảnh) hoặc vạm vỡ (vai rộng, tay cơ bắp, áo võ ngắn tay có bao tay da). Dáng nam, kiểu mặt và kiểu tư thế đều suy ra từ seed diện mạo (`buildOf`, `faceOf`, `poseOf` trong `lib/look.ts`, seed chẵn là thư sinh, seed lẻ là vạm vỡ), không thêm lần rút ngẫu nhiên nào nên kết quả mô phỏng của game không đổi. Ngay sau ảnh gốc, game tự vẽ **ảnh tư thế đứng**: sửa từ chính ảnh gốc (cùng mặt, cùng áo, cùng nền, cùng khung hình) và chỉ đổi dáng, tóc và vạt áo bay theo gió. Có 4 dáng cho nữ và 3 dáng cho mỗi dáng người nam (`POSE_F`, `POSE_M`). Ảnh tư thế thay ảnh trơn làm ảnh hiện ra khi chưa mặc gì; không mặc món nào nhìn thấy được thì nút 🎨 chỉ đổi về ảnh tư thế, không vẽ và không mất tiền. Nhân vật cũ (`art` nhỏ hơn 5) không bị tự vẽ gì, chỉ hiện nút “✨ Vẽ lại”: ảnh gốc mới, rồi tư thế, rồi mặc lại đồ đang đeo, khoảng 0,19 USD (0,12 USD nếu chưa mặc gì). Nhân vật mới tốn thêm khoảng 0,07 USD cho ảnh tư thế.

**Quái thú.** Mọi cá thể cùng loài dùng đúng hai ảnh (thường và Dị Biến); kích thước thể hiện bằng tỉ lệ thu phóng. Nếu một ảnh bị lỗi (ví dụ ký tự lạ), đổi seed của loài đó trong bảng `REROLL` ở `lib/imageprompt.ts` rồi chạy `npm run pregen -- --force` (ảnh không đổi lấy từ bộ nhớ đệm, không tốn tiền).

**Lệnh.**
- `npm run pregen` vẽ phần còn thiếu của 18 ảnh tĩnh. `-- --dry` chỉ liệt kê và ước tính tiền, `-- --only intro` hoặc `-- --only monsters` vẽ một nhóm, `-- --force` vẽ lại cả khi file đã có.
- Không có máy tính: trang báo cáo của chủ game (`/admin`) có mục «Ảnh còn thiếu» với nút «Vẽ … ảnh còn thiếu». Máy chủ vẽ trước các biểu tượng vũ khí và trang bị chưa có hình (mọi dáng thường gặp của mỗi mẫu, như `scripts/draw-wanted.ts`; Địa và Thiên chỉ khi bật `DRAW_DIA_ART`, `DRAW_THIEN_ART`), rồi tới ảnh cố định. Mỗi lần bấm vẽ khoảng 36 biểu tượng hoặc 18 ảnh lớn (bỏ qua ảnh đã có sẵn hoặc đang bị lượt vẽ khác giữ, không tính vào lượt), lưu vào database và game hiện chúng thay cho file còn thiếu trong `public/art` (`/art/...` chuyển sang `/api/art/...` chỉ khi file không có, xem `next.config.mjs`). Tiền tính vào `IMAGE_BUDGET_USD`. Về sau `npm run pregen` đổi chúng thành file thật mà không tốn tiền (ảnh đã vẽ được lấy từ database).
- `npx tsx scripts/sample-outfit.ts f 3` vẽ thử một bộ trang bị hạng 3 cho nhân vật nữ mở đầu và lưu ảnh gốc, ảnh mặc đồ vào `data/samples/` để so khuôn mặt.

**Kiểm tra bằng Claude.** Sau mỗi ảnh, Claude xem lại: pháp khí không có người, quái thú không có người, nhân vật nhìn thẳng và thấy cả người. **Không ảnh nào được có chữ**: nhân vật và quái không có chữ hay con dấu, còn biểu tượng pháp khí bị loại cả khi chỉ có nét giống chữ Hán, ký hiệu rune hay dải khắc ký tự. Ảnh sửa còn được so với ảnh gốc (cùng một người, cùng một loài); ảnh mặc đồ còn được đối chiếu với biểu tượng từng món; ảnh tư thế phải đúng người cũ mà dáng khác hẳn ảnh gốc. Claude còn đếm tay và bàn tay: nhiều hơn 2 thì loại và vẽ lại (một lần). Lỗi “3 tay” từng xảy ra khi tư thế có một tay bận (nâng tay áo lên ngực) mà nhân vật lại phải cầm kiếm: mô hình giữ tay cũ và vẽ thêm một tay cầm kiếm. Nay mọi prompt sửa ảnh ghi rõ đúng 2 tay (`ANATOMY`), và khi có vũ khí thì quy tắc `HANDS` bắt một tay chuyển sang cầm vũ khí thay cho việc nó đang làm. Ảnh sai bị vẽ lại (tối đa 2 lần; biểu tượng pháp khí 3 lần; ảnh sửa 1 lần). Pháp khí và quái vẫn sai thì hiện ô ký hiệu thay vì ảnh sai; nhân vật thì nhận ảnh cuối. Tắt bằng `IMAGE_QA=0`.

**Biểu tượng không có chữ.** Mô hình vẽ biểu tượng hay bịa ký tự giả lên bùa, ấn, vòng và dải khắc, nhất là khi prompt có chữ “Chinese”. Vì avatar chép từ biểu tượng nên lỗi lan sang ảnh nhân vật. Prompt biểu tượng (`lib/imageprompt.ts`) vì vậy bỏ chữ “Chinese” và các từ “runes”, “engravings”, “black lacquer”; bùa và ấn là tấm ngọc có hoa văn nổi trừu tượng (`BASE_EN` trong `lib/content.ts`); kiếm có lưỡi trơn; và một câu cấm chữ nằm ngay trong prompt. Claude loại ảnh còn nét giống chữ rồi vẽ lại.

**Chi phí** (giá fal, tính theo megapixel làm tròn lên). Bộ ảnh tĩnh: 18 ảnh, khoảng 0,82 USD. Mỗi nhân vật: khoảng 0,05 USD cho ảnh gốc, khoảng 0,07 USD cho ảnh tư thế đứng, khoảng 0,07 USD mỗi lần bấm vẽ lại hoặc vẽ bản khác (1K, 7 ảnh đầu vào; 2K khoảng 0,09; giá trong sổ là ước tính làm tròn lên). Mỗi biểu tượng pháp khí: 0,003 USD. Claude kiểm ảnh: khoảng 0,003 USD mỗi ảnh. Sổ chi tiêu ước tính nằm trong bảng `kv` của database (khoá `usage`).

**Giới hạn an toàn.** `IMAGE_BUDGET_USD` (cộng dồn, mặc định 2), `IMAGE_MAX_PER_HOUR` (40 ảnh lớn mỗi giờ), `IMAGE_ITEM_MAX_PER_HOUR` (150 biểu tượng mỗi giờ). Các lệnh gọi fal chạy lần lượt từng cái một. Nếu fal trả 403 (thường là hết credit), game dừng gửi lệnh vẽ trong 15 phút và không thử lại; lý do hiện khi rê chuột lên dòng trạng thái AI ở đầu trang. Nạp credit: https://fal.ai/dashboard/usage-billing/credits.

## Logo
Tên game là **Tiên Kiếm**. Logo do AI vẽ trên fal: dòng chữ bằng `fal-ai/nano-banana-pro`, huy hiệu vòng ngọc bằng `google/nano-banana-2.1`. Chữ vàng khảm ngọc, ngọc trai thay dấu chấm chữ i, thanh kiếm ngọc có tua xanh phía dưới. Hai ảnh gốc nền đen nằm ở `docs/brand/` (`logo_source.png`, `emblem_source.png`).

`python3 scripts/build-brand.py` (cần Pillow và numpy) tách nền đen theo độ sáng rồi tạo `public/brand/lockup.webp` (đầu trang, màn chào, màn tải), `public/brand/emblem.webp` (ô chờ ảnh nhân vật) và biểu tượng tab `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico`. Muốn đổi logo thì thay hai ảnh gốc rồi chạy lại lệnh này.

## Cấu hình ảnh (`.env.local`)
```
FAL_KEY=...
IMAGE_PROVIDER=fal
IMAGE_BUDGET_USD=5            # tùy chọn
# FAL_AVATAR_MODEL / FAL_AVATAR_RES (ảnh gốc nhân vật), FAL_OUTFIT_MODEL / FAL_OUTFIT_RES (mặc đồ và tư thế đứng),
# FAL_MODEL, FAL_EDIT_MODEL, FAL_ITEM_MODEL, FAL_THINKING: xem .env.example
```
Nguồn khác (Cloudflare Workers AI, Together, OpenAI, Pollinations) vẫn cắm sẵn trong `lib/imagegen.ts`, xem `.env.example`. Các nguồn này không nhận nhiều ảnh đầu vào, nên ảnh mặc đồ được vẽ lại từ mô tả bằng chữ và khuôn mặt có thể đổi. So sánh nguồn ảnh và kết quả thử: `docs/image-sources.md`.

## AI viết truyện (Claude)
Khóa Claude đặt trong `.env.local`: `TUTIEN_ONLINE_AI_KEY=...`. Claude không tạo được ảnh; game dùng nó cho:
- **Cốt truyện chung** (`content/lore.json`, tạo một lần bằng `npm run lore`): Thiên Huyền Đại Lục, mối họa, thế lực, vùng đất, truyền thuyết 8 Linh Thú.
- **Tiểu sử từng nhân vật** (tạo khi bắt đầu, lưu cùng dữ liệu) và **một đoạn nhật ký mỗi lần lên cảnh giới**. Máy chủ cache vào bảng `story_cache`.
- **Kiểm duyệt ảnh bằng thị giác** (mô tả ở trên).
Giới hạn chi tiêu: `AI_BUDGET_USD` (mặc định 3), `STORY_MAX_PER_HOUR` (60), `QA_MAX_PER_HOUR` (200). Khóa chỉ dùng phía máy chủ, không gửi xuống trình duyệt.
# tienkiem-online
