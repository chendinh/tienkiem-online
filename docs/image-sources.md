# Nguồn ảnh cho game (ghi chú thử nghiệm, 2026-11)
Mục tiêu: ảnh nhân vật, quái thú, pháp khí **cùng một nguồn, cùng một phong cách**; nhân vật đổi trang phục theo món đang đeo mà **khuôn mặt không đổi**.

## Kết luận
- Không có bộ nhân vật tiên hiệp đẹp, nhiều lớp, thay trang bị được và có giấy phép thương mại để tải về dùng ngay (xem Phụ lục A.6 của requirements.md). Hướng chọn: **một dịch vụ tạo ảnh qua API, một khối prompt phong cách cố định, seed cố định**. Prompt do máy chủ dựng từ thuộc tính đã kiểm tra (`lib/imageprompt.ts`).
- Chọn **fal.ai** với bốn mô hình: **Nano Banana 2.1** cho nhân vật (ảnh gốc 1K, và ảnh mặc đồ 2K nhận ảnh gốc cùng biểu tượng từng món), **FLUX.1 [dev]** cho quái thú, **FLUX.1 Kontext [pro]** sửa quái thành bản Dị Biến, **FLUX.1 [schnell]** vẽ biểu tượng pháp khí nhỏ.
- Quy tắc để các ảnh không khác nhau: (1) một khối `STYLE` cho mọi ảnh; (2) seed cố định (nhân vật theo seed diện mạo, quái theo tên loài, pháp khí 4242); (3) cùng một chủ thể thì **sửa từ ảnh gốc**, không vẽ lại; (4) luôn vẽ từ ảnh gốc, không vẽ chồng lên ảnh đã vẽ; ảnh mặc đồ được chép từ biểu tượng của từng món chứ không tưởng tượng từ chữ; (5) quái chỉ có hai ảnh mỗi loài, dùng chung cho mọi cá thể.
- Giấy phép: mới đọc phần FLUX.1 [dev] (xem nguồn bên dưới). **Chưa đọc điều khoản thương mại của Nano Banana 2.1, Kontext [pro] và FLUX.1 [schnell]**; làm việc này trước khi phát hành.
- Đã loại: Pollinations (khoảng 45 giây mỗi ảnh, có watermark, bám prompt kém, chưa rõ điều khoản thương mại); `fal-ai/flux-kontext/dev` (chưa thử); Nano Banana Pro (0,15 USD, thử nhưng không hơn rõ rệt, xem bên dưới); Nano Banana đời đầu (đổi mặt và kiểu tóc).

## Kết quả thử thật
| Việc | Mô hình | Giá | Thời gian | Nhận xét |
|---|---|---|---|---|
| Ảnh gốc nhân vật 1K | nano-banana-2.1 | khoảng 0,05 USD | 15 đến 27 giây | Toàn thân, thấy giày, đúng mắt, màu da, tua tóc và hào quang theo hệ. Prompt yêu cầu nhìn thẳng và Claude kiểm hướng mặt. |
| Nhân vật mặc 6 món (ảnh gốc + 6 biểu tượng) | nano-banana-2.1/edit, 1K (mặc định) | khoảng 0,07 USD | 40 giây | Xem bảng so sánh bên dưới (so ở 2K) và mục dáng đứng. Ảnh 848×1264; 2K cho 1696×2528 với khoảng 0,09 USD. |
| Tư thế đứng (sửa từ ảnh gốc) | nano-banana-2.1/edit, 1K | khoảng 0,07 USD | 30 giây | Giữ mặt, áo, nền và khung hình; chỉ đổi dáng, tóc và vạt áo bay theo gió. Claude kiểm: cùng người, thấy đủ người từ đầu đến chân, dáng phải khác ảnh gốc. |
| Quái 960×960 | flux/dev | 0,025 USD | 8 đến 12 giây | Tám loài đồng phong cách. Một loài (Huyền Quy) có ký tự lạ ở góc, vẽ lại bằng seed khác. |
| Quái Dị Biến | flux-pro/kontext | 0,04 USD | 15 đến 20 giây | Cùng dáng, cùng thiết kế, đổi sang màu ngũ sắc và hào quang; nền tối hơn theo ánh sáng mới. |
| Biểu tượng pháp khí 512×512 | flux/schnell | 0,003 USD | 4 đến 6 giây | Nhìn rõ ở cỡ 46 px trong game. Bản flux/dev 768 px nhiều hiệu ứng hơn khi phóng to nhưng tốn gấp 8 lần; ở cỡ 46 px khó thấy khác. |

Điều rút ra:
- Giá tính theo megapixel làm tròn lên. Quái vẽ 960×960 (dưới 1 MP) để không bị tính 2 MP như 1024×1024.
- Tải ảnh từ CDN của fal từng treo một lần (170 giây) sau khi đã bị tính tiền, mất ảnh. Nay tải thử lại tối đa 4 lần, mỗi lần 30 giây; yêu cầu tải lên và vẽ có thời hạn riêng.
- Claude so hai ảnh để chặn nhân vật khác mặt. Bản đầu quá khắt khe (chê khác phong cách vì nền hoàng hôn) làm vẽ lại hai lần vô ích (0,08 USD). Nay chỉ loại khi rõ ràng là người khác (khác giới, khác màu hoặc độ dài tóc, khác tuổi, hai người) và ảnh sửa chỉ vẽ lại một lần.
- Dòng “bỏ qua chữ nhỏ ở mép dưới” trong câu hỏi kiểm ảnh từng che mất ký tự lạ của Huyền Quy; nay chỉ giữ dòng đó cho Pollinations.
- fal cho biết yêu cầu không bị từ chối vì giới hạn đồng thời, nên 403 không phải do gọi song song. Các báo cáo công khai cho thấy 403 “Exhausted balance” là tài khoản bị khóa vì hết số dư (đôi khi nhầm). Game gọi từng ảnh một và dừng 15 phút khi gặp 403.

## Chọn mô hình vẽ nhân vật (thử 2026-11-13)
Cùng một nhân vật (tóc hai búi, mắt xanh băng, da rám nắng) mặc 6 món hạng 2 đến 4 (Hạc Sưởng, Khăn Vân, Phong Ngoa, Phi Y, Ngọc Bội, Phất Trần). Ba mô hình Nano Banana nhận 7 ảnh (ảnh gốc và 6 biểu tượng) với cùng một chỉ dẫn và cùng seed; dòng Kontext là kết quả của cách cũ, từ hôm trước. Giá là số ước tính ghi trong sổ.

| Mô hình | Giá | Thời gian | Kết quả |
|---|---|---|---|
| `fal-ai/nano-banana/edit` (1K) | 0,04 | 20 giây | Đủ 6 món nhưng đổi mặt, kiểu tóc, dáng (đang bước) và nền tối. |
| `google/nano-banana-2.1/edit` (2K) | 0,09 | 33 đến 36 giây | Giữ mặt, mắt xanh, tóc hai búi, dáng đứng và khung hình; đủ 6 món, thêu vàng rõ nét. **Được chọn.** |
| `fal-ai/nano-banana-pro/edit` (2K) | 0,15 | 37 giây | Thêu và phất trần đẹp hơn một chút, nhưng mắt chuyển sang màu tối và không đổi nền. |
| `fal-ai/flux-pro/kontext` (cách cũ: chỉ ảnh gốc và mô tả bằng chữ) | 0,04 | 15 đến 20 giây | Mặt cứng như búp bê, màu mắt đổi, áo thành khối, vũ khí nhỏ. |

Mặc định hạ xuống **1K** để rẻ hơn (khoảng 0,07 USD thay vì 0,09): khung ảnh nhân vật trong game chỉ rộng khoảng 310 px, và ở 1K vẫn thấy rõ thêu vàng, hoa văn mũ, giày và vũ khí. Bảng trên so ở 2K.

### Dáng đứng
Ảnh mặc đồ đầu tiên chép luôn dáng đứng thẳng, hai tay buông, hai chân khép của ảnh gốc nên trông cứng. Chỉ dẫn vẽ nay nói rõ ảnh gốc chỉ là dáng tham chiếu, không chép dáng, và đưa ra một trong 4 dáng mềm (dồn trọng lượng một chân, xoay ba phần tư, bước chậm, tựa nhẹ), chọn theo seed diện mạo. Thử trên nhân vật nữ ở 1K với hai dáng khác nhau: giữ nguyên mặt, mắt xanh, tóc hai búi và đủ 6 món, người nghiêng và chân dạng tự nhiên, dải lụa và vạt áo bay theo; cả hai đạt Claude ngay lần đầu. Nhân vật nam với bộ đồ khác (mũ, áo choàng, chuông, giày lông, kiếm) cũng đủ món và giữ mặt, nhưng dáng chỉ thư thái nhẹ vì tay cầm kiếm hướng xuống. Chưa thử dáng bước chậm và dáng tựa nhẹ trên nam.

Cho cùng một prompt ảnh gốc, flux/dev làm mất mắt xanh, màu da rám nắng và hào quang nước; nano-banana-2.1 giữ cả ba. Ảnh gốc là chỗ mọi ảnh mặc đồ lấy khuôn mặt, nên đổi cả ảnh gốc sang mô hình này (nhân vật đã có ảnh gốc cũ vẫn dùng ảnh cũ, chỉ ảnh mặc đồ mới được chỉ dẫn giữ đúng mắt, da, tóc). Muốn đổi độ phân giải hay mô hình: `FAL_AVATAR_*`, `FAL_OUTFIT_*` trong `.env.example`.

## Chi phí
| Khoản | Số lượng | Đơn giá | Tổng |
|---|---|---|---|
| Bộ ảnh tĩnh (2 mở đầu, 8 quái thường, 8 quái Dị Biến) | 18 | 0,05; 0,025; 0,04 | khoảng 0,62 USD, một lần |
| Mỗi nhân vật: ảnh gốc | 1 | khoảng 0,05 USD | 0,05 USD |
| Mỗi nhân vật: ảnh tư thế đứng (sửa từ ảnh gốc) | 1 | khoảng 0,07 USD | 0,07 USD |
| Mỗi lần bấm vẽ lại theo trang bị (1K) | n | khoảng 0,07 USD | 0,07 × n USD |
| Biểu tượng pháp khí | tối đa vài trăm | 0,003 USD | dưới 1 USD cho cả danh mục |
| Claude kiểm ảnh | mỗi ảnh | khoảng 0,003 USD | cộng thêm cho mỗi ảnh |

Khi có nhiều người chơi, khoản đáng kể là vẽ lại theo trang bị: 1.000 người, mỗi người 5 lần, khoảng 400 USD. Cần hạn mức vẽ lại theo ngày cho mỗi người, hoặc đổi lượt vẽ lấy giá trị trong game.

## Cách ảnh được dùng lại
- Mỗi ảnh có mã băm từ (phiên bản phong cách, nhà cung cấp, mô hình, prompt, prompt sửa, ảnh gốc, kích thước, seed) và nằm trong `data/gen/<loại>/` (avatar, pose, outfit, item, monster, place; loại lạ hoặc ảnh mất file mô tả vào `other/`). Icon vật phẩm chia tiếp theo vị trí: `item/Weapon`, `Headwear`, `Robe`, `Footwear`, `Back`, `Accessory`, `Ring`, `Talisman`, và `item/Misc` cho đan dược, thảo dược, khế ước, phù bán ở Phường Thị cùng một file JSON ghi mô hình, seed, mã yêu cầu, giá. Cùng mô tả thì dùng lại, không vẽ lại và không tốn tiền.
- Địa chỉ ảnh chỉ chứa mã băm (`/api/img/<mã>`), nên đổi thư mục không làm hỏng dữ liệu chơi; server tìm ảnh ở mọi thư mục con, và cả ở `data/gen/` cho file cũ.
- `npm run gen:report` liệt kê số ảnh, dung lượng, chi phí theo từng loại và các file bất thường (không đổi gì). `npm run gen:organize` đưa file lẻ trong `data/gen/` vào đúng thư mục loại, không ghi đè, không xóa; chạy lại bao nhiêu lần cũng an toàn.
- Ảnh tĩnh của game được chép vào `public/art/` bởi `npm run pregen`, kèm `public/art/_manifest.json`.
- Địa chỉ ảnh nhân vật được lưu trong dữ liệu chơi (`player.avatar`). Nếu file bị xóa, game tự lùi về ảnh tư thế, rồi ảnh gốc, hoặc vẽ lại ảnh gốc (cùng seed nên giống ảnh cũ); ảnh tư thế bị mất thì được vẽ lại từ ảnh gốc.

## Nguồn tham khảo
- FLUX.1 Kontext [pro] trên fal: https://fal.ai/models/fal-ai/flux-pro/kontext
- Nano Banana 2.1 (sửa ảnh, tối đa 14 ảnh đầu vào, độ phân giải 1K/2K/4K): https://fal.ai/models/google/nano-banana-2.1/edit
- Giá Nano Banana 2.1 theo token (khoảng 0,04 USD ảnh 1K, 0,13 USD ảnh 4K): https://fal.ai/learn/tools/how-to-use-nano-banana-2-1
- Giá FLUX.1 [dev] theo megapixel: https://fal.ai/learn/tools/how-to-use-flux
- Giới hạn đồng thời của fal: https://fal.ai/docs/documentation/model-apis/concurrency-limits
- Tài khoản bị khóa “Exhausted balance”: https://github.com/fal-ai/fal/issues/1147
- Giấy phép FLUX.1 [dev] (trọng số theo giấy phép phi thương mại; thẻ mô hình nói ảnh tạo ra dùng được cho mục đích cá nhân, khoa học và thương mại): https://huggingface.co/black-forest-labs/FLUX.1-dev
- Trang FLUX.1 [dev] trên fal (ghi dùng được cho cá nhân và thương mại): https://fal.ai/models/fal-ai/flux-1/dev
Giá và điều khoản có thể đổi. Đọc lại điều khoản của từng dịch vụ trước khi phát hành thương mại.

## Phong cách: Fantasy Realistic 3D (thử 2026-11-13)
Chủ dự án chọn **Fantasy Realistic 3D**, bỏ semi-realistic/anime. Một lõi chung cho mọi ảnh, mỗi loại thêm nhãn riêng (nhân vật, trang phục, vũ khí, vật phẩm, linh thú, bối cảnh) để nam, nữ, linh thú và trang bị cùng một phong cách.

| Thử | Kết quả |
|---|---|
| Nhân vật nữ và nam, Nano Banana 2.1 | Đạt: giải phẫu thật, thêu vàng, ánh sáng thể tích, bối cảnh có đình đài. |
| Mặc đồ từ ảnh gốc và 6 biểu tượng | Đạt: chép đúng từng món, cả bộ đồng bộ trắng ngà và vàng. |
| Biểu tượng, vũ khí "Realistic 3D Magical Artifact" | Đạt: thần khí phát sáng, không giống ảnh chụp sản phẩm. |
| Linh thú bằng FLUX dev | **Không đạt**: ra thú bông hoạt hình dù đã ghi "không phải đồ chơi". |
| Linh thú bằng Nano Banana 2.1, cùng prompt | Đạt: giải phẫu và lông thật, chín đuôi bốc lửa. |
| Bản Dị Biến sửa bằng Kontext từ ảnh thật | Đạt: giữ nguyên dáng và bối cảnh, chỉ đổi sang ánh ngũ sắc. |

Rút ra: câu chữ không đủ để FLUX dev bỏ vẻ hoạt hình; **mô hình quyết định phong cách**, nên linh thú thường dùng cùng mô hình với nhân vật (`FAL_CREATURE_MODEL`). Bộ ảnh tĩnh ước tính 0,82 USD. Giá và điều khoản của Nano Banana chưa được kiểm tra cho mục đích thương mại.

### Khuôn mặt "búp bê CG" (2026-11-13)
Với prompt Fantasy Realistic nguyên văn, Nano Banana 2.1 vẽ mặt kiểu búp bê CGI (mắt to bóng, da nhẵn như nhựa) vì các cụm "3D character rendering / 3D render" kéo ảnh về hướng đồ chơi 3D. So sánh cùng seed: thêm một câu `REAL` trong `lib/imageprompt.ts` (mặt người thật, da có lỗ chân lông và kết cấu tự nhiên, tỉ lệ mắt tự nhiên, "không phải búp bê, không phải đồ chơi CGI") cho khuôn mặt người thật mà vẫn giữ nguyên các chữ của chủ dự án, tông da, mắt, búi tóc và tua rua. Bản bỏ hẳn "3D render" cũng thật nhưng đã đổi hẳn bố cục và nền, nên không chọn. Phiên bản phong cách `ART_V` = 4.

## Diện mạo Trung Hoa và tư thế đứng (thử 2026-11-14)
Yêu cầu: ảnh gốc nữ và nam bị đen, ít phong thái tu tiên; cần cao, thon, đậm chất Trung Hoa, mặt có cá tính; thêm một loại ảnh "tư thế đứng" có thần thái. Nữ eo thon, ngực đầy, hông tròn; nam là thư sinh tuấn tú hoặc vạm vỡ. Nhân vật luôn là người trưởng thành và ăn mặc kín đáo.

| Thay đổi | Cách làm | Kết quả thử thật |
|---|---|---|
| Da sáng hơn | Bốn tông `SKINS` thành "fair jade-white", "porcelain-pale luminous", "warm ivory", "soft peach-ivory"; thêm câu ánh sáng ban ngày trong trẻo (`BRIGHT`) | Đạt. Chữ "sun-kissed tan" cũ làm nhân vật nữ rất sẫm; số tông giữ là 4 nên save cũ vẫn hợp lệ. |
| Cao, thon, Trung Hoa | Tỉ lệ 8 đầu, chân dài, `CHINESE` ("Han Chinese features like a lead of a Chinese xianxia drama"), `BEARING` (phong thái tiên nhân) | Đạt. Ảnh gốc nữ và nam đều cao thon, mặt kiểu phim cổ trang Trung Quốc. |
| Mặt có cá tính | 5 kiểu mặt nữ và 5 kiểu mặt nam (`FACE_F`, `FACE_M`), chọn theo seed | Đạt: mỗi kiểu khác rõ ở dáng mặt, mắt, lông mày và thần thái. |
| Nam hai dáng | Seed chẵn là thư sinh, seed lẻ là vạm vỡ (`buildOf`), kèm trang phục riêng cho dáng vạm vỡ (áo võ ngắn tay, bao tay da) | Đạt. Dáng vạm vỡ phải tả cụ thể (vai rất rộng, tay cơ bắp) và mặc áo ôm người mới thấy rõ. |
| Nữ eo thon, ngực đầy, hông tròn | `FIGURE_F` và hanfu kiểu phim cổ trang: thân áo ôm, đai eo to, váy lót ôm hông dưới lớp váy voan | **Đạt một phần.** Eo thon và ngực đầy thấy rõ. Hông chỉ lộ nhẹ vì váy dài kín đáo: ba lần thử chỉ tả dáng người, váy dài rộng vẫn che hết hông; chỉ đổi kiểu trang phục mới có tác dụng. Muốn hông rõ hơn thì phải chọn váy ôm hơn, đổi lại kém kín đáo. |
| Tư thế đứng | Loại ảnh `pose`: sửa từ ảnh gốc (`POSE_F`, `POSE_M`), tự vẽ ngay sau ảnh gốc, lưu ở `player.avatar.pose` | Đạt cho nữ và cả hai dáng nam. Dáng nữ quay ba phần tư, tay áo bay; dáng nam vạm vỡ khoanh tay mỉm cười. |
| Mặc đồ giữ tư thế | Ảnh mặc đồ lấy ảnh tư thế làm ảnh 1 và có cờ `posed` ("giữ nguyên dáng") | Đạt cho nữ: giữ dáng quay ba phần tư, đủ 6 món. Nam đang khoanh tay mà phải cầm kiếm thì mô hình bỏ khoanh tay để cầm kiếm (chấp nhận được). |

Những điều cần biết:
- Dáng thư sinh lần đầu gần như không khác ảnh gốc. Đã thêm câu "dáng phải KHÁC RÕ so với ảnh 1", ba dáng thư sinh mạnh hơn, và Claude loại ảnh tư thế vẫn đứng thẳng tay buông (tối đa một lần vẽ lại).
- Ảnh tư thế nam vạm vỡ chỉ đổi tay và nét mặt, hai chân vẫn đứng như ảnh gốc. Nữ đổi cả thân người.
- Khi mặc một chiếc đạo bào rộng cùng áo choàng, thân hình vạm vỡ gần như bị che. Prompt có nói áo thắt ở eo để dáng người vẫn thấy, nhưng đạo bào rộng là thiết kế của món đồ nên mô hình giữ đúng món đồ.
- Chạy thật đầu cuối cho một nữ (seed 11) và một nam vạm vỡ (seed 21), mỗi người: ảnh gốc (30 giây), ảnh tư thế (30 giây), ảnh mặc 6 món (40 đến 70 giây). Nữ: cả ba ảnh qua Claude ngay lần đầu, khoảng 0,19 USD. Nam: ảnh mặc đồ bị loại một lần vì thiếu giày (mô hình vẽ giày trắng thêu thay vì giày mây), vẽ lại đạt, khoảng 0,26 USD.
- Hai ảnh chọn nhân vật ở màn mở đầu (`public/art/intro_f.jpg`, `intro_m.jpg`) được vẽ lại bằng `npm run pregen -- --only intro --force`. Ảnh nữ lấy từ bộ nhớ đệm (cùng prompt với nhân vật thử nên không mất tiền), ảnh nam mất 0,05 USD. Ảnh quái thú giữ nguyên.
- Nhân vật cũ không bị vẽ lại tự động: chỉ hiện nút "✨ Vẽ lại" (`ART_V` = 7), khoảng 0,19 USD.

### Hông rõ hơn và lỗi 3 tay (thử 2026-11-14)
Chủ dự án muốn nữ có hông rõ hơn dù mặc áo gì, chấp nhận kém kín đáo hơn (khoe một phần cơ thể trong áo), và báo một ảnh mặc đồ có 3 tay. Nhân vật thử là chính nhân vật của chủ dự án (tóc hai búi, mắt xanh băng, seed 298213527) với đúng 6 món của họ.

**Nguyên nhân 3 tay.** Tư thế của nhân vật là "một tay nâng tay áo lên ngực"; ảnh mặc đồ lại có kiếm "cầm ở tay phải" và chỉ dẫn "giữ y nguyên tư thế". Mô hình giữ bàn tay đang nâng áo và vẽ thêm một bàn tay cầm kiếm. Claude không bắt được lỗi vì câu hỏi cũ không đếm tay (chỉ hỏi chung xem thân hình có méo không).

**Nguyên nhân hông bị che.** Biểu tượng áo là áo rộng treo trên người vô hình, và trang phục gốc là váy dài xòe có lớp voan, nên mô hình chép dáng rộng và che hết hông. Chỉ tả dáng người (đã thử ba lần ở đợt trước) không đủ; phải đổi kiểu cắt may.

| Thay đổi | Kết quả thử thật (nhân vật của chủ dự án) |
|---|---|
| Ảnh gốc: hanfu cải tiến ôm sát, cổ chữ V sâu, váy đuôi cá bó hông và đùi, xẻ tà cao, `FIGURE_F` "hông rộng tròn, đùi đầy đặn" | Đạt ngay lần đầu: eo thon, hông và đùi hiện rõ, thấy một đoạn chân qua xẻ tà. |
| Ảnh tư thế: các dáng nữ đều đẩy hông ra một bên, câu "hông và đùi vẫn rõ trong dáng mới" | Đạt sau một lần Claude loại (lý do ghi không rõ). Đúng 2 tay, hông rõ. |
| Mặc 6 món: quy tắc `FIT_F` (áo may bó theo người ở eo, hông, đùi; chỉ tay áo và áo choàng để rộng) và quy tắc `HANDS` (tay phải cầm kiếm thay cho việc tay đó đang làm) | Đạt sau một lần Claude loại vì thiếu khăn lụa: đúng 2 tay, đủ 6 món, hông rõ qua đạo bào bó, thấy chân qua xẻ tà. Mô hình cầm kiếm bằng tay còn lại (không theo "tay phải") nhưng vẫn đúng 2 tay. |
| Bộ đồ khởi đầu (Vũ Y, Ngọc Tiêu) | Đạt ngay lần đầu: hông rõ, 2 tay, sáo cầm ở một tay. |
| Nam vạm vỡ, dáng khoanh tay, mặc 6 món có kiếm | Đạt ngay lần đầu: bỏ khoanh tay để cầm kiếm, đúng 2 tay. |
| Claude đếm số tay và bàn tay (ảnh gốc, tư thế, mặc đồ) | Chưa gặp ảnh 3 tay thật nào để thử bộ đếm; hai lần Claude loại ở trên không ghi lý do về tay. |

Chi phí đợt này khoảng 0,53 USD: ảnh gốc 0,05; tư thế 0,14 (vẽ hai lần); mặc đồ 0,14 (hai lần); bộ đồ khởi đầu 0,07; nam 0,07; ảnh chọn Nữ tu ở màn mở đầu vẽ lại 0,05 (ảnh Nam tu lấy từ bộ nhớ đệm). Mỗi lần Claude loại tốn thêm 0,07 USD cho lần vẽ lại.

Nút vẽ lại không còn khóa: khi ảnh đã khớp trang bị nó thành "Vẽ bản khác" và vẽ lại với seed khác (tham số `v` của đặc tả tư thế và mặc đồ), nên một ảnh xấu (3 tay, mất món) vẽ lại được ngay. `ART_V` tăng lên 6: nhân vật vẽ ở bản 5 (ví dụ tạo trong ngày hôm nay) thấy nút "✨ Vẽ lại" để nhận ảnh gốc mới với trang phục ôm người.

### Kém kín hơn (thử 2026-11-14, sau yêu cầu "game này con trai chơi nhiều, làm thu hút hơn")
Trang phục nữ chuyển từ "ôm sát, hé chân" sang quyến rũ hơn: vai trần, cổ chữ V sâu, ô voan xuyên thấy ở eo, tay áo voan, váy đuôi cá bó như da và xẻ tà tới đùi (`ART_V` = 7). Lần thử đầu cho váy xòe nên hông mờ đi; câu "bó như da, chỉ voan ở tay áo và đuôi sau, không lớp váy xòe phía trước" sửa được. Thử thật với nhân vật của chủ dự án (0,05 USD ảnh gốc, 0,07 tư thế, 0,14 mặc đồ vì Claude loại một lần): hông và đùi rõ, đúng 2 tay. Khi mặc 6 món, áo cổ khoét sâu tới ngực và xẻ cao lộ đùi; đây là mức hở tối đa, không đi xa hơn.

