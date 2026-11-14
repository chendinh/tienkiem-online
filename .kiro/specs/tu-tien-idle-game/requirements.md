# Requirements Document

## Introduction

**Tu Tiên Idle** (tên làm việc, thư mục dự án `tutien-online`) là game tu tiên chơi trên trình duyệt, xây dựng bằng Next.js, theo lối chơi treo máy (idle/AFK). Người chơi chọn một khu vực lịch luyện. Máy chủ tự động cho nhân vật gặp quái, chiến đấu, thu phục Linh Thú, nhặt pháp khí và tích lũy Tu Vi, kể cả khi người chơi đã đóng trình duyệt. Khi quay lại, người chơi nhận một báo cáo về những gì đã xảy ra, kèm các khoảnh khắc bất ngờ như Linh Thú Dị Biến hoặc pháp khí hiếm.

Vòng lặp cốt lõi mượn từ các game bắt Pokémon dạng idle (xem Phụ lục A.1) và được chuyển sang chủ đề tu tiên:

| Game bắt Pokémon dạng idle | Tu Tiên Idle |
|---|---|
| Tuyến đường / khu săn | Khu Vực lịch luyện (Zone) |
| Gặp sinh vật hoang dã ngẫu nhiên | Chạm trán Yêu Thú, Tu Sĩ, Tài Nguyên, Kỳ Ngộ |
| Bóng bắt (vật phẩm tiêu hao) | Khế Ước Phù (vật phẩm tiêu hao) |
| Pokédex | Linh Thú Đồ Giám |
| Biến thể shiny | Dị Biến |
| Cơ chế chống xui | Thiên Đạo Bảo Hộ |
| Săn offline có trần giờ | Lịch Luyện / Bế Quan ngoại tuyến có trần giờ |
| Thời tiết, ngày đêm | Thiên Địa Dị Tượng |
| Chặng kiểm tra, trùm | Đột Phá và Thiên Kiếp |

### Năm trụ cột sản phẩm

1. **Treo máy do máy chủ quyết định**: mọi kết quả ngẫu nhiên được sinh và lưu trên máy chủ, nên tiến trình ngoại tuyến công bằng và không thể sửa từ trình duyệt.
2. **Ngẫu nhiên có kiểm soát ở mọi tầng**: quái, nhân vật, kích thước, tính cách, kỹ năng, pháp khí, kỳ ngộ, tên gọi đều được sinh từ seed, để không lặp lại nhưng vẫn kiểm thử được.
3. **Tu tiên theo tiểu thuyết**: Linh Căn, Công Pháp, Tu Vi, Cảnh Giới từ Luyện Khí đến Độ Kiếp, Đột Phá, Thiên Kiếp, Bế Quan, Đan Dược, Linh Thạch.
4. **Hệ thuộc tính riêng**: tám hệ gồm Ngũ Hành cộng ba dị hệ, có bảng khắc chế riêng của game.
5. **Hình ảnh đẹp, không pixel**: nhân vật minh họa mơ mộng theo phong cách tiên hiệp, ghép theo lớp để diện mạo đổi theo trang bị đang mặc.

### Phạm vi tài liệu

| Phạm vi | Nội dung | Nơi mô tả |
|---|---|---|
| **MVP (đặc tả trong tài liệu này)** | Tài khoản, vòng lặp treo máy do máy chủ quyết định, ngoại tuyến, chạm trán, chiến đấu tự động, thu phục, Đồ Giám, Dị Biến, Thiên Đạo Bảo Hộ, sinh ngẫu nhiên (nhân vật, Linh Thú, kích thước, kỹ năng, pháp khí), Cảnh Giới Luyện Khí đến Hóa Thần, Đột Phá và Thiên Kiếp, kinh tế cơ bản, hiển thị nhân vật theo trang bị, quy trình tạo ảnh và giấy phép, giao diện, hiệu năng, bảo mật | Requirement 1 đến 35 |
| **Lộ trình sau MVP (không đặc tả)** | Đồng hành và tiến giai Linh Thú, chế tác, Bí Cảnh và trùm, Cảnh Giới Luyện Hư đến Độ Kiếp, Chuyển Thế và Phi Thăng, thông báo đẩy, Luận Kiếm (PvP), Tông Môn, giao dịch giữa người chơi, sự kiện toàn máy chủ, animation nâng cao (Spine hoặc Live2D) | Phụ lục D |

Chỉ phần MVP có yêu cầu chính thức. Các ý tưởng sau MVP được liệt kê ngắn gọn thành lộ trình ở Phụ lục D để người dùng cân nhắc. Người dùng chưa yêu cầu chúng, nên tài liệu này không đặc tả chúng. Khi người dùng chọn làm một mục, mục đó sẽ được viết thành yêu cầu riêng ở một vòng đặc tả sau.

### Giả định quan trọng cần xác nhận

Các giả định dưới đây được đặt ra vì yêu cầu gốc còn mơ hồ. Người dùng có thể sửa bất kỳ giả định nào trước khi sang giai đoạn thiết kế.

- **A1. "PokeCatch" không xác định được một game duy nhất.** Tên này trùng với nhiều dự án không liên quan (bot Discord, game crypto, game terminal, minigame React). Giả định người dùng muốn thể loại game bắt Pokémon dạng idle. PokéClicker và Idle Pokémoon/PokeIdle được dùng làm tham chiếu cơ chế. Nếu người dùng có đường dẫn hoặc ảnh chụp game cụ thể, cần đối chiếu lại Phụ lục A.1.
- **A2. "Cũ khí" được hiểu là "pháp khí"** (trang bị và bảo vật có chỉ số). Pháp khí có hai trục: **Level** (cấp độ) và **Rarity_Tier** (độ hiếm).
- **A3. Thang cảnh giới** gồm 9 Cảnh Giới theo mô hình phổ biến trong tiên hiệp (Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp), mỗi Cảnh Giới có 4 Tiểu Cảnh Giới (Sơ Kỳ, Trung Kỳ, Hậu Kỳ, Đỉnh Phong). MVP chỉ cho chơi đến Hóa Thần (Level 20). Các Cảnh Giới cao hơn được định nghĩa trong Realm_Ladder nhưng chưa chơi được. Việc mở khóa chúng và Phi Thăng nằm trong lộ trình ở Phụ lục D.
- **A4. "Hệ riêng"** nghĩa là tám Element: Kim, Mộc, Thủy, Hỏa, Thổ, Lôi, Âm, Dương. Bảng khắc chế giữ nguyên Tương Khắc cổ điển của Ngũ Hành và thêm quan hệ cho ba dị hệ. Bảng chi tiết được chốt ở giai đoạn thiết kế.
- **A5. Mỗi Account có một Player_Character.** Linh Thú đã thu phục là đồng đội chiến đấu. Tu Sĩ NPC xuất hiện như một loại chạm trán và không chiêu mộ được. Việc chiêu mộ làm đồng hành nằm trong lộ trình ở Phụ lục D.
- **A6. Không có cái chết vĩnh viễn và không mất vật phẩm khi thua.** Hình phạt chỉ gồm thời gian hồi phục, và mất một phần Tu Vi khi Đột Phá thất bại.
- **A7. Mọi hằng số số học** (xác suất, trần, ngưỡng, ngân sách hiệu năng) là giá trị khởi điểm nằm trong Balance_Config, được tập hợp ở Phụ lục B và chỉnh được mà không đổi hành vi đã định nghĩa.
- **A8. Quy mô mục tiêu** là 20.000 Account đăng ký và 2.000 Account trực tuyến đồng thời. Người dùng chưa nêu con số này.
- **A9. Nền tảng** là web responsive ưu tiên điện thoại, không làm ứng dụng native ở MVP. Ngôn ngữ giao diện mặc định là tiếng Việt, và cấu trúc chuỗi văn bản cho phép thêm ngôn ngữ khác sau.
- **A10. Mô hình kinh doanh chưa được nêu.** Tài liệu không có thanh toán trong game. Nếu thêm sau, các yêu cầu pháp lý và minh bạch xác suất (Requirement 31) phải được xem lại.
- **A11. Tài liệu này không tạo ảnh.** Việc gen ảnh thực tế thuộc giai đoạn thực thi và cần người dùng cung cấp tài khoản dịch vụ, khóa API hoặc GPU. Trước đó, game dùng Placeholder_Asset không phải pixel. Trong vòng nghiên cứu này không tìm thấy bộ nhân vật tiên hiệp nhiều lớp, đổi trang bị được và đẹp, có sẵn để dùng thẳng (xem Phụ lục A.6).
- **A12. Bản quyền ảnh AI** chưa chắc được bảo hộ. Game giả định dùng ảnh AI kết hợp chỉnh sửa của con người và cần tư vấn pháp lý trước khi ra mắt thương mại.
- **A13. Dữ liệu cá nhân** áp dụng Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực từ 01/01/2026). Thời hạn xử lý yêu cầu xóa dữ liệu 72 giờ là giá trị do dự án chọn, cần xác nhận với tư vấn pháp lý.
- **A14. Chỉ có một loại tiền tệ** (Linh Thạch hạ phẩm) ở MVP. Các hạng Linh Thạch cao hơn nằm trong lộ trình ở Phụ lục D.
- **A15. Mốc nghiên cứu là 2026-11-11.** Nguồn trên web có thể thay đổi, nên mọi giấy phép phải được đọc lại từ văn bản gốc tại thời điểm triển khai.

### Quy ước đọc tài liệu

- Từ khóa EARS (WHEN, WHILE, IF, THEN, WHERE, THE, SHALL) và các nhãn User Story, Acceptance Criteria được giữ nguyên tiếng Anh. Phần còn lại viết tiếng Việt.
- Tên thành phần và thực thể viết bằng định danh tiếng Anh có gạch dưới (ví dụ `Item_Generator`) và được định nghĩa trong Glossary kèm tên Hán Việt.
- Câu có dạng `FOR ALL ...` là thuộc tính kiểm thử, dùng trực tiếp làm property-based test.
- Nguồn nghiên cứu nằm ở Phụ lục A, tham số mặc định ở Phụ lục B, bảng truy vết yêu cầu gốc ở Phụ lục C, điều chỉnh, gợi ý và lộ trình sau MVP ở Phụ lục D.

## Glossary

### A. Thành phần hệ thống

- **Game_Client**: Ứng dụng web Next.js chạy trong trình duyệt của người chơi, hiển thị giao diện và gửi ý định (intent) của người chơi lên Game_Server.
- **Game_Server**: Phần máy chủ (phía server của Next.js và các tiến trình nền khi cần) giữ Game_State chuẩn và là nơi duy nhất sinh kết quả ngẫu nhiên.
- **Account_Service**: Thành phần quản lý Account, xác thực, Session và dữ liệu cá nhân.
- **Idle_Engine**: Thành phần mô phỏng tiến trình treo máy theo Tick và thực hiện Settlement cho khoảng thời gian đã trôi qua.
- **Encounter_Generator**: Thành phần chọn loại Encounter và sinh nội dung Encounter cho mỗi Tick.
- **Combat_Engine**: Thành phần giải quyết chiến đấu tự động và Tribulation.
- **Taming_Service**: Thành phần tính xác suất và thực hiện thu phục Monster_Instance.
- **Pity_Tracker**: Thành phần lưu và áp dụng các Pity_Counter.
- **Monster_Generator**: Thành phần sinh Monster_Instance từ Monster_Species.
- **Cultivator_Generator**: Thành phần sinh Cultivator cho Player_Character và NPC_Cultivator.
- **Item_Generator**: Thành phần chọn Rarity_Tier và sinh Item_Instance.
- **Cultivation_Service**: Thành phần quản lý Cultivation_Points, Realm, Sub_Stage và Breakthrough.
- **Inventory_Service**: Thành phần quản lý Storage_Bag, Overflow_Stash, trang bị và tổng hợp chỉ số.
- **Economy_Service**: Thành phần quản lý Spirit_Stone, cửa hàng và giá trị phân giải.
- **Bestiary_Service**: Thành phần quản lý Bestiary.
- **Seeded_RNG**: Bộ sinh số giả ngẫu nhiên có seed và có phiên bản, cung cấp các dòng ngẫu nhiên độc lập theo miền.
- **Character_Renderer**: Thành phần trong Game_Client ghép các Art_Layer thành hình nhân vật.
- **Art_Pipeline**: Quy trình và công cụ tạo, kiểm duyệt và xuất Art_Layer cùng các asset hình ảnh khác.
- **Asset_Registry**: Kho đăng ký mọi asset hình ảnh kèm License_Record.
- **Asset_Validator**: Công cụ kiểm tra asset và License_Record trong lúc build.
- **State_Serializer**: Thành phần tuần tự hóa, giải tuần tự hóa và in chuẩn dữ liệu JSON.
- **Audit_Log**: Nhật ký chỉ ghi thêm (append-only) của các sự kiện quan trọng.
- **Content_Catalog**: Tập dữ liệu nội dung cố định của game (Element, Monster_Species, Skill, Zone, Item_Template, Affix, Event_Template, Personality, Origin, Realm_Ladder, Tiên_Văn).
- **Balance_Config**: Tập tham số cân bằng có phiên bản; giá trị mặc định nằm ở Phụ lục B.
- **CI_Pipeline**: Quy trình tích hợp liên tục chạy tự động trên mỗi thay đổi của mã nguồn, Content_Catalog, Balance_Config và asset; gồm build, kiểm thử tự động và kiểm tra dữ liệu nội dung, và báo lỗi bản build khi một kiểm tra không đạt.

### B. Thuật ngữ tu tiên và lối chơi

- **Account**: Tài khoản người chơi, sở hữu một Game_State.
- **Session**: Phiên đăng nhập đã xác thực của một Account trên một thiết bị.
- **Game_State**: Toàn bộ trạng thái chuẩn của một Account trên máy chủ (nhân vật, kho, Linh Thú, Đồ Giám, bộ đếm, thời điểm Settlement gần nhất).
- **Player_Character**: Nhân vật tu sĩ chính của Account.
- **Cultivator (Tu Sĩ)**: Nhân vật người, gồm Player_Character và NPC_Cultivator, có Linh_Can, Personality, Skill, Origin và Base_Appearance.
- **NPC_Cultivator**: Tu Sĩ do máy chủ sinh ra làm đối tượng chạm trán, dùng cùng Cultivator_Generator với Player_Character.
- **Linh_Can (Linh Căn)**: Tư chất thiên phú của Cultivator, gồm tập từ 1 đến 5 Element và độ thuần (purity) trong khoảng [0.5, 1.0]. Số Element càng ít thì hệ số tốc độ tu luyện càng cao. Độ thuần cũng nhân vào tốc độ tu luyện (xem Linh_Can_Multiplier).
- **Linh_Can_Speed_Factor**: Hệ số nhân tốc độ tu luyện do Linh_Can mang lại, tra từ tham số Linh_Can_Speed_By_Count theo số Element của Linh_Can.
- **Linh_Can_Multiplier**: Hệ số nhân lên Cultivation_Points mỗi Tick do Linh_Can mang lại, bằng Linh_Can_Speed_Factor nhân độ thuần (purity) của Linh_Can (Requirement 22 tiêu chí 3 và 4).
- **Personality (Tính Cách)**: Đặc điểm của Cultivator hoặc Monster_Instance, gồm độ lệch chỉ số, hồ sơ ưu tiên kỹ năng khi chiến đấu, hệ số thu phục và lời thoại nhỏ để hiển thị.
- **Origin (Xuất Thân)**: Bối cảnh của Cultivator (ví dụ Tán Tu, Thế Gia Đệ Tử), cho một phần thưởng khởi đầu nhỏ.
- **Đạo_Hiệu (Đạo Hiệu)**: Biệt hiệu tùy chọn của Cultivator, đặt sau tên (ví dụ "Thanh Vân Tử").
- **Base_Appearance**: Bộ đặc điểm ngoại hình nền của Cultivator (khuôn thân, khuôn mặt, kiểu tóc, màu tóc, màu mắt, sắc da) trước khi mặc trang bị.
- **Realm (Cảnh Giới)**: Bậc lớn trong thang tu luyện, đánh số từ 1 (Luyện Khí) đến 9 (Độ Kiếp).
- **Sub_Stage (Tiểu Cảnh Giới)**: Một trong bốn bậc nhỏ của mỗi Realm, theo thứ tự Sơ Kỳ, Trung Kỳ, Hậu Kỳ, Đỉnh Phong, đánh số 1 đến 4.
- **Realm_Ladder**: Dãy có thứ tự gồm 9 Realm, mỗi Realm có 4 Sub_Stage.
- **Level (Cấp Độ)**: Số nguyên từ 1 đến 36, bằng 4 × (chỉ số Realm − 1) + chỉ số Sub_Stage. Level dùng chung để gán độ mạnh cho Zone, Monster_Instance và Item_Instance.
- **Cultivation_Points (Tu Vi)**: Điểm tích lũy để thăng Sub_Stage.
- **Breakthrough (Đột Phá)**: Hành động vượt từ Đỉnh Phong của một Realm lên Sơ Kỳ của Realm kế tiếp.
- **Breakthrough_Attempt**: Một lần thử Breakthrough, do người chơi yêu cầu hoặc do Auto_Breakthrough bắt đầu. Gồm một lần tung theo Breakthrough_Probability và, khi lần tung thành công vào một Realm thuộc Tribulation_Realms, một Tribulation. Thành công khi lần tung thành công và, nếu có Tribulation, mọi Tribulation_Wave đều được vượt qua; ngược lại là thất bại (Requirement 23).
- **Breakthrough_Probability**: Xác suất lần tung của một Breakthrough_Attempt thành công, nằm trong khoảng từ Breakthrough_Probability_Min đến Breakthrough_Probability_Max. Tính từ Realm đích, độ thuần của Linh_Can và việc có dùng Breakthrough_Pill hay không (Requirement 23 tiêu chí 3).
- **Breakthrough_Pill (Phá Cảnh Đan)**: Loại Pill mà người chơi chọn dùng cho một Breakthrough_Attempt do mình yêu cầu, tối đa một viên cho mỗi lần thử, để cộng Breakthrough_Pill_Bonus vào Breakthrough_Probability (Requirement 23 tiêu chí 1 và 3). Auto_Breakthrough không dùng Breakthrough_Pill.
- **Tribulation (Thiên Kiếp)**: Thử thách nhiều đợt (wave) sấm sét mà Combat_Engine giải quyết khi Breakthrough vào một Realm có Thiên Kiếp. Danh sách Realm có Thiên Kiếp nằm trong Balance_Config (mặc định từ Kim Đan trở lên).
- **Tribulation_Wave**: Một đợt (wave) của Tribulation, là một trận chiến do Combat_Engine giải quyết giữa riêng Player_Character và một kẻ địch có Element Lôi (Requirement 23 tiêu chí 5 và 6). Tribulation_Wave không phải Encounter.
- **Heart_Demon (Tâm Ma)**: Trạng thái suy yếu tạm thời làm giảm tốc độ nhận Cultivation_Points sau khi Breakthrough thất bại.
- **Heart_Demon_Factor**: Hệ số nhân lên Cultivation_Points mỗi Tick, nằm trong khoảng (0, 1]. Bằng Heart_Demon_Cultivation_Factor khi Player_Character có Heart_Demon, và bằng 1 khi Player_Character không có Heart_Demon (Requirement 23 tiêu chí 11).
- **Heart_Demon_Cultivation_Factor**: Tham số Balance_Config. Giá trị của Heart_Demon_Factor trong thời gian Player_Character có Heart_Demon, nằm trong khoảng (0, 1].
- **Bình_Cảnh**: Trạng thái của Player_Character ở Đỉnh Phong khi đã đủ Cultivation_Points và cần Breakthrough để tiến tiếp.
- **Cultivation_Method (Công Pháp)**: Phương pháp tu luyện bị động, quyết định hệ số tốc độ tu luyện và hướng tăng chỉ số.
- **Method_Speed_Factor**: Hệ số nhân lên Cultivation_Points mỗi Tick do Cultivation_Method đang dùng mang lại, bằng hệ số tốc độ của Cultivation_Method, nhân thêm (1 + Method_Affinity_Bonus) khi Element của Cultivation_Method thuộc Linh_Can của Cultivator (Requirement 18 tiêu chí 6).
- **Skill (Thần Thông)**: Kỹ năng chiến đấu có Element hoặc trung tính, thuộc một trong các nhóm Tấn Công, Phòng Thủ, Hồi Phục, Cường Hóa, Suy Yếu, Khống Chế.
- **Element (Hệ)**: Một trong 8 hệ thuộc tính: Kim, Mộc, Thủy, Hỏa, Thổ, Lôi, Âm, Dương.
- **Element_Matrix**: Bảng quan hệ khắc chế giữa các Element, mỗi cặp (hệ tấn công, hệ phòng thủ) có đúng một trong ba giá trị Strong, Neutral, Weak.
- **Element_Multiplier**: Hệ số nhân sát thương do quan hệ Element giữa Skill của bên tấn công và các Element của mục tiêu, tính theo Requirement 14 từ các tham số Strong_Multiplier, Neutral_Multiplier và Weak_Multiplier.
- **Monster_Species**: Mẫu loài Yêu Thú trong Content_Catalog.
- **Monster_Instance**: Một cá thể Yêu Thú cụ thể được sinh ra từ Monster_Species, có Size_Scale, Personality, Aptitude, Skill và Generation_Seed riêng.
- **Spirit_Beast (Linh Thú)**: Monster_Instance đã được người chơi thu phục và có thể xuất chiến cùng Player_Character.
- **Spirit_Beast_Pen**: Nơi chứa Linh Thú, có sức chứa tối đa.
- **Aptitude (Tư Chất)**: Hệ số nhân bẩm sinh cho từng chỉ số chính của một Monster_Instance.
- **Aptitude_Total**: Trung bình cộng của năm hệ số Aptitude của một Monster_Instance (cho Max_HP, Max_Spirit, Attack, Defense, Speed).
- **Monster_Skill_Count**: Số Skill của một Monster_Instance, chọn đều trong các số nguyên từ Monster_Skill_Count_Min đến Monster_Skill_Count_Max (Requirement 16 tiêu chí 9).
- **Mutation (Dị Biến)**: Biến thể hiếm của Monster_Instance, có bảng màu riêng, hào quang riêng và cộng thêm chỉ số.
- **Size_Scale**: Hệ số kích thước của một Monster_Instance so với kích thước cơ sở của loài.
- **Size_Class**: Nhãn phân hạng kích thước theo Size_Scale: Tí Hon, Nhỏ, Vừa, Lớn, Khổng Lồ.
- **Zone (Khu Vực)**: Địa điểm lịch luyện với bảng xuất hiện quái, mật độ linh khí và khoảng Level riêng.
- **Spirit_Qi_Density (Mật Độ Linh Khí)**: Hệ số của một Zone, nhân vào Cultivation_Points mà Player_Character nhận được ở mỗi Tick trong Zone đó.
- **Zone_Phenomenon (Thiên Địa Dị Tượng)**: Hiện tượng tạm thời của một Zone (ví dụ Nguyệt Thực, Linh Khí Bộc Phát) làm thay đổi trọng số xuất hiện, tốc độ tu luyện hoặc may mắn rơi đồ.
- **World_Seed**: Seed toàn máy chủ, nằm trong Balance_Config, dùng để sinh lịch Zone_Phenomenon. Mọi Account thấy cùng một lịch.
- **Encounter**: Một sự kiện xảy ra trong một Tick của Adventure_Mode.
- **Encounter_Type**: Loại Encounter, gồm Monster, NPC_Cultivator, Resource và Kỳ_Ngộ.
- **Event_Template**: Mẫu Kỳ Ngộ (cơ duyên bất ngờ) trong Content_Catalog, kèm bảng kết quả có trọng số.
- **Adventure_Mode (Lịch Luyện)**: Chế độ nhân vật đi săn, gặp Encounter và nhận phần thưởng, có rủi ro bị thương.
- **Retreat_Mode (Bế Quan)**: Chế độ nhân vật tu luyện an toàn, chỉ nhận Cultivation_Points và Đốn_Ngộ, không gặp Encounter.
- **Đốn_Ngộ**: Biến cố ngẫu nhiên trong Retreat_Mode. Mỗi Tick trong Retreat_Mode có xác suất Epiphany_Probability xảy ra Đốn_Ngộ, khi đó Cultivation_Points của Tick đó được nhân với Epiphany_Multiplier.
- **Epiphany_Probability**: Tham số Balance_Config. Xác suất mà một Tick trong Retreat_Mode xảy ra Đốn_Ngộ, nằm trong khoảng [0, 1].
- **Epiphany_Multiplier**: Tham số Balance_Config. Hệ số nhân (lớn hơn 1) áp lên Cultivation_Points của Tick có Đốn_Ngộ.
- **Recovery_State (Điều Tức)**: Trạng thái nhân vật tạm dừng lịch luyện để hồi sinh lực.
- **HP và Spirit**: Giá trị hiện tại của sinh lực và linh lực của một đối tượng chiến đấu, luôn nằm trong khoảng từ 0 đến Max_HP và Max_Spirit tương ứng. Skill tiêu hao Spirit.
- **Tick**: Đơn vị mô phỏng có độ dài cố định Tick_Interval.
- **Settlement**: Việc mô phỏng và ghi nhận kết quả cho một khoảng thời gian đã trôi qua của một Account, có mã định danh duy nhất.
- **Offline_Report**: Báo cáo tổng hợp kết quả của một Settlement ngoại tuyến.
- **Offline_Cap**: Số giờ tối đa được tính cho một lần vắng mặt.
- **Highlight**: Mục nổi bật trong Offline_Report: một sự kiện hiếm hoặc đáng chú ý của Settlement (xem Requirement 4), được chọn và xếp ưu tiên theo Balance_Config, kèm mã tham chiếu đến Combat_Log nếu sự kiện đến từ một trận chiến.
- **Combat_Log**: Bản ghi có thứ tự của một trận chiến do Combat_Engine tạo ra, gồm mỗi hành động (hiệp, bên hành động, Skill, mục tiêu, sát thương hoặc hồi phục, cờ bạo kích, quan hệ Element, thay đổi trạng thái) và Battle_Outcome. Cùng dữ liệu đầu vào và cùng Generation_Seed của trận thì cho cùng Combat_Log.
- **Battle_Outcome**: Kết quả của một trận chiến, là một trong ba giá trị: Victory (bên kẻ địch hết HP), Defeat (Player_Character hết HP), Draw (đạt giới hạn Max_Combat_Rounds hiệp mà chưa bên nào thắng).
- **Party (Đội Hình)**: Player_Character cùng các Spirit_Beast được người chơi chọn xuất chiến, tối đa Max_Party_Beasts Spirit_Beast.
- **Spirit_Stone (Linh Thạch)**: Tiền tệ cơ bản của game.
- **Pill (Đan Dược)**: Vật phẩm tiêu hao, gồm hai loại: HP_Pill (hồi HP) và Breakthrough_Pill (tăng Breakthrough_Probability). Từ Pill đứng một mình chỉ cả hai loại.
- **HP_Pill (Hồi Khí Đan)**: Loại Pill hồi HP cho Player_Character, có ba hạng; hạng và giá được định nghĩa ở Requirement 24. Auto_Pill chỉ dùng HP_Pill.
- **Taming_Talisman (Khế Ước Phù)**: Vật phẩm tiêu hao dùng cho mỗi lần thử thu phục, có hạng Hoàng, Huyền, Địa, Thiên.
- **Tribulation_Talisman (Độ Kiếp Phù)**: Vật phẩm tiêu hao dùng trước một Breakthrough có Tribulation, tối đa một lá cho mỗi lần Breakthrough, làm giảm sát thương mà Player_Character nhận từ các wave của Tribulation theo mức do Balance_Config quy định (xem Requirement 23).
- **Phường_Thị (Phường Thị)**: Cửa hàng của game do Economy_Service quản lý. Phường_Thị bán không giới hạn tồn kho mười hai mặt hàng (Taming_Talisman, HP_Pill, Breakthrough_Pill và Tribulation_Talisman) bằng Spirit_Stone theo Shop_Prices và mua lại các mặt hàng đó theo Sell_Back_Ratio (Requirement 24 tiêu chí 9 và 10).
- **Economy_Ledger (Sổ Cái Linh Thạch)**: Sổ chỉ ghi thêm của một Account về mọi thay đổi của Spirit_Stone. Mỗi dòng ghi gồm số tiền là số nguyên có dấu, mã lý do, mã nguồn (mã định danh Settlement hoặc Request_Id) và thời điểm ghi, và mỗi cặp (mã nguồn, mã lý do) có tối đa một dòng ghi. Economy_Ledger còn có số dư kiểm tra (ban đầu bằng 0) và các dòng tổng hợp theo ngày (ngày, mã lý do, tổng số tiền, số dòng ghi đã gộp) do việc gộp dòng ghi cũ tạo ra, trong đó tổng số tiền của mọi dòng tổng hợp bằng số dư kiểm tra (Requirement 24 tiêu chí 3, 4 và 15).
- **Spirit_Stone_Max**: Tham số Balance_Config. Số Spirit_Stone tối đa mà một Account được giữ; phần thu vượt mức này bị bỏ (Requirement 24 tiêu chí 2).
- **Stack_Max**: Tham số Balance_Config. Số lượng tối đa của một loại vật phẩm xếp chồng trong Storage_Bag mà một yêu cầu mua ở Phường_Thị được tạo ra (Requirement 24 tiêu chí 11 và 13); phần thưởng cấp ngoài yêu cầu mua vẫn cộng dồn theo Requirement 21 tiêu chí 1.
- **Storage_Bag (Túi Càn Khôn)**: Kho chứa vật phẩm của Player_Character, có số ô tối đa là Bag_Capacity. Mỗi Item_Instance chiếm một ô, còn vật phẩm xếp chồng không chiếm ô (Requirement 21 tiêu chí 1).
- **Bestiary (Linh Thú Đồ Giám)**: Sổ ghi nhận các loài đã gặp và đã thu phục cùng các kỷ lục.
- **Bestiary_Entry**: Bản ghi của Bestiary cho một Monster_Species của một Account, gồm cờ và số lần đã gặp, đã thu phục, các kỷ lục và bản ghi Mutation (xem Requirement 12).
- **Pity_Counter**: Bộ đếm số lần thử liên tiếp không thành công, dùng cho cơ chế Thiên Đạo Bảo Hộ.
- **Thiên_Đạo_Bảo_Hộ**: Cơ chế chống xui, tăng dần xác suất khi Pity_Counter tăng (soft pity) và bảo đảm thành công tại ngưỡng cuối (hard pity).
- **Mutation_Pity_Counter**: Pity_Counter của một Account, đếm số Monster_Instance được sinh liên tiếp mà không có Mutation.
- **Item_Pity_Counter**: Pity_Counter của một Account, đếm số lần rơi Item_Instance liên tiếp mà Rarity_Tier thấp hơn Thiên.
- **Pity_Probability**: Xác suất thành công của một lần rút có Thiên_Đạo_Bảo_Hộ, tính từ giá trị Pity_Counter ngay trước lần rút theo công thức ở Requirement 10.
- **Kỳ_Ngộ (Kỳ Ngộ)**: Encounter_Type bất ngờ (cơ duyên, gặp người lạ, bí tàng) được chọn từ Event_Template và tự phân giải mà không cần người chơi nhập liệu.
- **Kỳ_Ngộ hiếm**: Kỳ_Ngộ được chọn từ một Event_Template mang cờ "hiếm" do Content_Catalog gắn. Highlight_Priority dùng cờ này để xếp ưu tiên Highlight (Phụ lục B).
- **Skill_Slot**: Ô kỹ năng chủ động mà Player_Character đang trang bị; số ô tăng theo Realm.
- **Skill_Power**: Giá trị gốc của sát thương (Skill nhóm Tấn Công) hoặc của lượng hồi phục (Skill nhóm Hồi Phục), bằng hệ số công suất của Skill nhân Attack của bên dùng, nhân thêm Off_Element_Penalty khi Skill lệch Element của bên dùng (Requirement 18 tiêu chí 2).
- **Size_Cm**: Kích thước thực của Monster_Instance tính bằng centimét, bằng kích thước cơ sở của loài nhân Size_Scale.
- **Retreat_Threshold và Resume_Threshold**: Hai ngưỡng phần trăm HP do người chơi đặt. Khi HP xuống dưới Retreat_Threshold thì nhân vật vào Recovery_State; khi HP hồi đến Resume_Threshold thì nhân vật quay lại Adventure_Mode.
- **Auto_Tame**: Cài đặt cho phép Taming_Service tự thử thu phục theo bộ lọc của người chơi.
- **Auto_Pill**: Cài đặt cho phép tự dùng HP_Pill khi HP xuống dưới Retreat_Threshold, theo thứ tự hạng thấp nhất đang có trước, nên HP_Pill rẻ nhất được dùng trước (Requirement 3 tiêu chí 10). Auto_Pill không dùng Breakthrough_Pill.
- **Auto_Breakthrough**: Cài đặt cho phép Cultivation_Service tự thực hiện Breakthrough trong Settlement khi Player_Character đã ở Bình_Cảnh và thỏa các điều kiện an toàn nêu ở Requirement 23. Mặc định tắt, vì Breakthrough thất bại làm mất một phần Cultivation_Points.
- **Auto_Equip**: Cài đặt cho phép Inventory_Service tự mặc một Item_Instance mới vào Equipment_Slot đang trống, hoặc đang mặc Item_Instance không bị khóa có Item_Power_Score thấp hơn, khi Level của Item_Instance mới không lớn hơn Level của Player_Character (Requirement 21 tiêu chí 3). Mặc định bật, để nhân vật mới được mặc đồ ngay cả khi người chơi vắng mặt. Thay đổi cài đặt có hiệu lực theo Requirement 3 tiêu chí 7.
- **Auto_Dissolve_Max_Rarity**: Cài đặt nhận một Rarity_Tier hoặc giá trị "tắt". Item_Instance chưa được mặc, không bị khóa, có Rarity_Tier thấp hơn hoặc bằng giá trị này và có Equipment_Slot đang mặc một Item_Instance khác sẽ bị tự động phân giải thành Spirit_Stone (Requirement 21 tiêu chí 4). Thay đổi cài đặt có hiệu lực theo Requirement 3 tiêu chí 7.
- **Operator**: Người vận hành có vai trò quản trị, được dùng công cụ hỗ trợ.
- **Tham số Balance_Config**: Giá trị số có tên nằm trong Balance_Config, ví dụ Tick_Interval, Offline_Cap, Min_Offline_Seconds. Mọi tham số mà một yêu cầu nhắc đến bằng tên đều có một dòng ở Phụ lục B ghi đơn vị và giá trị mặc định. Yêu cầu chỉ tham chiếu tên tham số và không lặp lại giá trị.

### C. Thuật ngữ về pháp khí và sinh ngẫu nhiên

- **Item_Template**: Mẫu loại pháp khí trong Content_Catalog (ví dụ Trường Kiếm, Đạo Bào), gắn với một Equipment_Slot.
- **Item_Instance (Pháp Khí)**: Một vật phẩm cụ thể sinh ra từ Item_Template, có Level, Rarity_Tier, Implicit_Stat, danh sách Affix, tên, Appearance_Descriptor và Generation_Seed riêng.
- **Equipment_Slot**: Ô trang bị. Các ô nhìn thấy được gồm Weapon, Headwear, Robe, Footwear, Back, Accessory. Các ô không hiển thị hình gồm Ring và Talisman.
- **Rarity_Tier (Độ Hiếm)**: Một trong sáu bậc theo thứ tự tăng dần: Phàm, Hoàng, Huyền, Địa, Thiên, Tiên.
- **Tiên_Văn (Tiên Văn)**: Dấu ấn riêng chỉ có trên Item_Instance hạng Tiên. Mỗi Item_Instance hạng Tiên có đúng một Tiên_Văn, chọn từ danh sách Tiên_Văn trong Content_Catalog. Tiên_Văn mang một hiệu ứng riêng ngoài các Affix thông thường và một Effect_Overlay riêng. Item_Instance thuộc các hạng khác không có Tiên_Văn.
- **Affix**: Dòng chỉ số ngẫu nhiên trên Item_Instance (ví dụ Công Kích, Bạo Kích, Tốc Độ Tu Luyện), có khoảng giá trị phụ thuộc Level.
- **Affix_Group**: Nhóm các Affix loại trừ nhau; một Item_Instance chỉ có tối đa một Affix mỗi Affix_Group.
- **Implicit_Stat**: Chỉ số cố định theo loại của Item_Template, giá trị lăn trong khoảng theo Level.
- **Roll_Floor**: Tỷ lệ phần trăm tối thiểu của khoảng giá trị Affix mà một Rarity_Tier bảo đảm.
- **Item_Power_Score**: Điểm sức mạnh quy đổi của Item_Instance, tính từ Implicit_Stat, Affix và hiệu ứng của Tiên_Văn (nếu có) theo trọng số trong Balance_Config (Requirement 19 tiêu chí 9).
- **Material (Nguyên Liệu)**: Linh Thảo hoặc khoáng vật thu được từ Encounter có Encounter_Type là Resource, dùng để bán lấy Spirit_Stone.
- **Overflow_Stash (Kho Tạm)**: Vùng chứa phụ của Inventory_Service, có sức chứa Overflow_Capacity, nhận Item_Instance mới khi Storage_Bag đầy để vật phẩm không bị mất. Quy tắc khi cả hai nơi đều đầy nằm ở Requirement 21.
- **Skill_Book (Ngọc Giản)**: Vật phẩm tiêu hao cho phép Cultivator học một Skill hoặc một Cultivation_Method.
- **Generation_Seed**: Số nguyên 64 bit dùng để sinh một thực thể; cùng Generation_Seed, Generator_Version và ngữ cảnh thì cho ra cùng thực thể.
- **Generator_Version**: Số phiên bản của thuật toán sinh; thay đổi khi kết quả sinh có thể khác đi.
- **RNG_Stream**: Dòng số giả ngẫu nhiên có tên của Seeded_RNG, có vị trí riêng (số giá trị đã lấy) và độc lập với các dòng còn lại (xem Requirement 13).
- **RNG_Version**: Số phiên bản của thuật toán sinh dãy số và của cách suy ra Generation_Seed trong Seeded_RNG; thay đổi khi bất kỳ dãy nào có thể khác đi.
- **Account_Seed**: Số nguyên 64 bit bí mật, sinh một lần khi tạo Account và là gốc của mọi RNG_Stream của Account đó; không bao giờ gửi đến Game_Client.
- **Fingerprint**: Giá trị băm của dạng chuẩn hóa các thuộc tính phân biệt của một thực thể, dùng để đo độ trùng lặp.
- **Diversity_Fingerprint**: Fingerprint dùng riêng để đo Duplicate_Rate, có thể mịn hơn Fingerprint của Requirement 19 tiêu chí 13 và có thành phần riêng cho từng loại thực thể (Requirement 25 tiêu chí 1 đến 3). Mỗi giá trị liên tục được thay bằng số thứ tự khoảng: với m khoảng bằng nhau trên [a, b], số thứ tự của x là phần nguyên của m × (x − a) ÷ (b − a) và khoảng cuối gồm cả cận trên b, còn khi a bằng b thì số thứ tự bằng 0; với khoảng rộng w, số thứ tự của x là phần nguyên của x ÷ w.
- **Duplicate_Rate**: Tỉ lệ trong khoảng [0, 1] giữa số thực thể của một mẫu có Diversity_Fingerprint trùng với ít nhất một thực thể khác của cùng mẫu và số thực thể của mẫu (Requirement 25 tiêu chí 4).
- **Distinct_Name_Ratio**: Tỉ lệ giữa số tên khác nhau trong một mẫu và số thực thể của mẫu (Requirement 25 tiêu chí 10).
- **Loại đo**: Một trong tám nhóm thực thể mà Diversity_Report đo riêng: Monster_Instance, Cultivator và Item_Instance của từng Rarity_Tier trong sáu hạng. Kỳ_Ngộ không phải loại đo, vì độ đa dạng của Kỳ_Ngộ do Event_Distinct_Window bảo đảm (Requirement 7).
- **Xác suất cấu hình**: Xác suất mà Content_Catalog và Balance_Config quy định cho một giá trị của một chiều phân bố, tính khi không có Zone_Phenomenon hoạt động. Cách tính cho từng chiều nằm ở mục Chiều phân bố.
- **Chiều phân bố**: Một trong năm đại lượng mà Diversity_Report kiểm tra tần suất xuất hiện của từng giá trị (Requirement 25 tiêu chí 11 và 12). (1) Personality của Monster_Instance, mỗi Personality có xác suất cấu hình bằng nhau (Requirement 16 tiêu chí 8). (2) Personality của Cultivator, mỗi Personality có xác suất cấu hình bằng nhau. (3) Element trong Linh_Can của Cultivator, đếm số Cultivator có Linh_Can chứa Element đó; k Element phân biệt của Linh_Can được chọn đều trong tám Element, nên xác suất cấu hình của mỗi Element bằng tổng, với k từ 1 đến 5, của xác suất của k Element (tính từ Linh_Can_Count_Weights) nhân k ÷ 8. (4) Monster_Species trong bảng xuất hiện quái của một Zone, có xác suất cấu hình bằng trọng số của Monster_Species chia tổng trọng số của bảng (Requirement 7 tiêu chí 4). (5) Item_Template của các Item_Instance cùng Level nguồn, có xác suất cấu hình bằng trọng số rơi chia tổng trọng số rơi (Requirement 20 tiêu chí 8).
- **Diversity_Report**: Báo cáo mà CI_Pipeline tạo trên mỗi bản build (Requirement 25 tiêu chí 5). Báo cáo ghi, cho mỗi loại đo, Duplicate_Rate và, với loại đo có tên được kiểm tra, Distinct_Name_Ratio cùng ngưỡng tương ứng; cho mỗi chiều phân bố, báo cáo ghi số lần xuất hiện của từng giá trị.
- **Launch_Content_Minimums**: Tham số Balance_Config. Bảng số mục tối thiểu của từng loại nội dung trong Content_Catalog khi ra mắt, kèm các điều kiện đi kèm (Phụ lục B.4); CI_Pipeline kiểm tra bảng này (Requirement 25 tiêu chí 14). Số lượng tối thiểu của asset hình ảnh nằm ở Requirement 28.
- **Size_Bucket_Width**: Tham số Balance_Config. Độ rộng, tính theo Size_Scale, của một khoảng kích thước trong Diversity_Fingerprint của Monster_Instance (Requirement 25 tiêu chí 1).
- **Aptitude_Bucket_Count**: Tham số Balance_Config. Số khoảng bằng nhau chia [Aptitude_Min, Aptitude_Max] cho mỗi Stat chính trong Diversity_Fingerprint của Monster_Instance (Requirement 25 tiêu chí 1).
- **Purity_Bucket_Count**: Tham số Balance_Config. Số khoảng bằng nhau chia độ thuần của Linh_Can trong [0.5, 1.0] trong Diversity_Fingerprint của Cultivator (Requirement 25 tiêu chí 2).
- **Roll_Bucket_Count**: Tham số Balance_Config. Số khoảng bằng nhau chia khoảng lăn được của Implicit_Stat hoặc của một Affix trong Diversity_Fingerprint của Item_Instance (Requirement 25 tiêu chí 3).
- **Max_Duplicate_Rate_By_Kind**: Tham số Balance_Config. Duplicate_Rate tối đa cho phép của từng loại đo; loại đo Item_Instance hạng Phàm không có ngưỡng và chỉ được báo cáo (Requirement 25 tiêu chí 7 và 8).
- **Min_Distinct_Name_Ratio**: Tham số Balance_Config. Distinct_Name_Ratio tối thiểu của ba loại đo Cultivator, Item_Instance hạng Thiên và Item_Instance hạng Tiên (Requirement 25 tiêu chí 10).
- **Max_Share_Factor**: Tham số Balance_Config. Hệ số lớn hơn 1: số lần một giá trị của chiều phân bố xuất hiện không được vượt quá Max_Share_Factor nhân số lần kỳ vọng theo xác suất cấu hình (Requirement 25 tiêu chí 12).
- **Appearance_Descriptor**: Bộ ba (art_base_id, palette_id, effect_id) xác định cách một Item_Instance hoặc Monster_Instance hiển thị.
- **Drop_Table**: Bảng trọng số các loại phần thưởng của một lần rơi, dùng sau chiến thắng hoặc khi một kết quả Kỳ_Ngộ chỉ định lần rơi (Requirement 20).
- **Request_Id**: Mã duy nhất do Game_Client gắn vào mỗi yêu cầu làm thay đổi trạng thái, dùng để chống xử lý trùng.
- **Stat**: Chỉ số. Chỉ số chính gồm Max_HP, Max_Spirit, Attack, Defense, Speed. Chỉ số phụ gồm Crit_Rate, Crit_Damage, Luck, Cultivation_Speed.
- **Base_Stat**: Giá trị cơ sở của một Stat chính ở một Level, lấy từ bảng Base_Stat(L) của Requirement 22, trước khi áp dụng phương sai, Aptitude, Mutation hoặc trang bị.
- **Variance_Factor**: Hệ số nhân của một Stat chính của một Cultivator, do Cultivator_Generator lấy từ Generation_Seed trong khoảng [1 − Cultivator_Stat_Variance, 1 + Cultivator_Stat_Variance] và giữ nguyên khi Level đổi (Requirement 22 tiêu chí 13).
- **Stat nền**: Giá trị chưa làm tròn của một Stat của Cultivator trước khi áp dụng trang bị và Cultivation_Method. Với Stat chính, bằng Base_Stat(Level, Stat) nhân Variance_Factor và nhân (1 + độ lệch của Personality cho Stat đó). Với Stat phụ, bằng giá trị tương ứng trong Base_Secondary_Stats (Requirement 22 tiêu chí 13).
- **Vật phẩm xếp chồng**: Material, Pill, Taming_Talisman, Tribulation_Talisman và Skill_Book; lưu trong Storage_Bag theo loại kèm số lượng và không chiếm ô (Requirement 21 tiêu chí 1).

### D. Thuật ngữ về nghệ thuật và giấy phép

- **Art_Layer**: Một ảnh trong suốt (WebP hoặc PNG có alpha) biểu diễn một bộ phận hiển thị của nhân vật hoặc một trang bị, đặt trên canvas chung.
- **Layer_Manifest**: Tệp JSON mô tả mỗi Art_Layer (khe, thứ tự xếp lớp, điểm neo, bảng màu, kích thước).
- **Z_Order_Table**: Bảng thứ tự xếp chồng cố định giữa các khe và bộ phận của nhân vật.
- **Palette_Set**: Tập các bảng màu mà một Art_Layer hỗ trợ.
- **Art_Style_Guide**: Tài liệu quy định phong cách hình ảnh, bảng màu, khung canvas, ánh sáng và danh sách kiểm duyệt.
- **Style_Anchor**: Ảnh tham chiếu đã được duyệt, dùng để giữ nhất quán phong cách khi tạo ảnh hàng loạt.
- **Launch_Asset_Set**: Bộ asset tối thiểu để ra mắt MVP (xem Requirement 28).
- **Pilot_Asset_Set**: Bộ asset nhỏ dùng để thử quy trình và duyệt phong cách trước khi tạo hàng loạt (xem Requirement 29).
- **Placeholder_Asset**: Asset tạm dạng vector hoặc bóng đen không phải pixel, dùng trong lúc phát triển.
- **Human_Review**: Bước duyệt thủ công của chủ dự án theo danh sách kiểm duyệt của Art_Style_Guide.
- **License_Record**: Bản ghi nguồn gốc và giấy phép của một asset (xem Requirement 30).
- **Third_Party_Asset**: Asset do bên thứ ba tạo ra và cấp phép.
- **AI_Generated_Asset**: Asset được tạo bằng mô hình hoặc dịch vụ tạo ảnh AI.
- **Body_Template**: Khuôn thân dựng sẵn của Base_Appearance (dáng người và tư thế đứng), là cơ sở để căn các Art_Layer khác.
- **Reference_Canvas**: Khung ảnh chuẩn 1024 × 1536 pixel dùng chung cho mọi Art_Layer của nhân vật.
- **Palette_Mask**: Mặt nạ hoặc bản đồ đổi màu đi kèm một Art_Layer có thể đổi màu. Palette_Mask cho biết vùng nào của Art_Layer đổi theo màu nào của Palette_Set (tóc, mắt, da, vải, viền, ánh sáng), để công cụ đổi màu tạo biến thể palette mà không phải tạo lại ảnh (xem Requirement 28 và 29).
- **Generation_Job_Record**: Bản ghi trong Asset_Registry về một lần tạo ảnh của Art_Pipeline: công cụ, mô hình và phiên bản, prompt, negative prompt, seed khi có, mã các ảnh tham chiếu (gồm Style_Anchor), tham số, thời điểm, Operator và chi phí. Là phần xuất xứ của AI_Generated_Asset (xem Requirement 29).
- **Route_Decision_Record**: Bản ghi do Operator lập cho từng Asset_Class trước khi tạo hoặc nhập asset: tuyến đã chọn (dịch vụ AI kèm mô hình và phiên bản, gói mua sẵn hoặc họa sĩ thuê), ngày và kết quả kiểm tra giấy phép, và xác nhận giấy phép cho phép dùng thương mại trong game trực tuyến (xem Requirement 29 và 30).
- **Asset_Class**: Nhóm asset cùng loại được đếm riêng trong Launch_Asset_Minimums và Pilot_Asset_Minimums. Mỗi dòng của các bảng ở Appendix B mục B.6 là một Asset_Class (xem Requirement 28).
- **Launch_Asset_Minimums**: Tham số Balance_Config gồm số asset tối thiểu của từng Asset_Class trong Launch_Asset_Set. Giá trị khởi đầu nằm ở Appendix B mục B.6 (xem Requirement 28).
- **Pilot_Asset_Minimums**: Tham số Balance_Config gồm số asset tối thiểu của từng Asset_Class trong Pilot_Asset_Set. Giá trị khởi đầu nằm ở Appendix B mục B.6 (xem Requirement 29).
- **Asset_Coverage_Report**: Báo cáo do CI_Pipeline lập, đếm số asset approved theo từng Asset_Class và so với Launch_Asset_Minimums (xem Requirement 28).
- **Candidate_Asset**: Ảnh do Art_Pipeline tạo ra hoặc nhập vào nhưng chưa được duyệt. Review_Status của Candidate_Asset là pending cho tới khi Human_Review quyết định (xem Requirement 29).
- **Review_Status**: Trạng thái duyệt của một asset trong Asset_Registry, nhận một trong ba giá trị: pending (chờ duyệt), approved (đã duyệt), rejected (bị từ chối, kèm lý do).
- **Pilot_Approval**: Bản ghi trong Asset_Registry về quyết định của chủ dự án đối với Pilot_Asset_Set (approved hoặc rejected, kèm người duyệt và ngày duyệt). Art_Pipeline đọc bản ghi này để mở hoặc khóa Bulk_Generation (xem Requirement 29).
- **Bulk_Generation**: Mọi lần Art_Pipeline tạo ảnh cho asset nằm ngoài Pilot_Asset_Set (tạo ảnh hàng loạt).
- **License_Snapshot**: Bản lưu nguyên văn license hoặc trang điều khoản áp dụng cho một asset, được lưu tại thời điểm thu nhận hoặc tạo asset và ghi trong License_Record kèm giá trị băm và ngày lưu (xem Requirement 30; bản chụp license).
- **Credits_Page**: Màn hình ghi công trong game do CI_Pipeline tạo từ Asset_Registry, liệt kê mọi asset có attribution_required là true và một nhóm AI-assisted gồm các AI_Generated_Asset (xem Requirement 30; trang ghi công).
- **Legal_Review_Status**: Trạng thái xem xét pháp lý do chủ dự án ghi cho từng chủ đề (bản quyền tranh AI theo giả định A12, tài liệu bảo vệ dữ liệu theo giả định A13), nhận một trong ba giá trị: not_recorded (chưa ghi), acknowledged (chủ dự án xác nhận đã biết rủi ro của chủ đề) hoặc completed (việc xem xét pháp lý của chủ đề đã xong) (xem Requirement 30; trạng thái xem xét pháp lý).
- **Asset_License_Report**: Báo cáo do CI_Pipeline xuất ra, gồm số asset theo từng license và danh sách mọi asset bị gắn cờ; một asset bị gắn cờ khi vi phạm một kiểm tra license của Requirement 30: thiếu License_Record hoặc trường bắt buộc, không đạt điều kiện dùng thương mại, quá hạn kiểm tra license, chưa được chủ dự án xác minh, hoặc đã withdrawn mà vẫn được tham chiếu và chưa có asset thay thế (báo cáo license asset).
- **Allowed_Licenses**: Tên tham số Balance_Config (Appendix B) cho danh sách license được chấp nhận cho asset phát hành; license ngoài danh sách chỉ được dùng khi License_Record kèm bằng chứng mua license hoặc giấy phép bằng văn bản (danh sách license được phép).
- **Denied_License_Patterns**: Tên tham số Balance_Config (Appendix B) cho danh sách mẫu so khớp với tên license; license có tên khớp một mẫu bị từ chối (mẫu license bị cấm).
- **Asset_License_Recheck_Months**: Tên tham số Balance_Config (Appendix B) cho số tháng tối đa kể từ ngày kiểm tra license trước khi License_Record phải được kiểm tra lại (số tháng kiểm tra lại license).
- **Odds_Page**: Màn hình trong Game_Client hiển thị các xác suất, bộ đếm pity và phiên bản Balance_Config đang có hiệu lực, toàn bộ lấy từ phản hồi của Game_Server; Game_Client không tự tính các giá trị này (xem Requirement 31; Trang Xác Suất).
- **Confirm_Purchase_Threshold**: Tên tham số Balance_Config (Appendix B) cho mức giá, tính bằng Spirit_Stone, mà một lần mua phải vượt quá thì Game_Client yêu cầu xác nhận rõ ràng trước khi gửi yêu cầu mua (xem Requirement 31; ngưỡng xác nhận mua).
- **UI_Max_Tap_Depth**: Tên tham số Balance_Config (Appendix B) cho số lần chạm tối đa trên điện thoại để mở một màn hình từ Dashboard (xem Requirement 31; độ sâu chạm tối đa).
- **Min_Touch_Target_CSS_Px**: Tên tham số Balance_Config (Appendix B) cho cạnh tối thiểu, tính bằng CSS px, của một vùng chạm trong Game_Client (xem Requirement 31; kích thước vùng chạm tối thiểu).
- **Effect_Overlay**: Art_Layer hiệu ứng (hào quang, ánh sáng) gắn với một Element, hiển thị trên các pháp khí hiếm và trên Monster_Instance có Mutation.
- **Layer_Kind (Loại lớp)**: Phân loại của một Art_Layer, thuộc một trong các giá trị body, face, hair_back, hair_front, outfit_base, robe_back, robe_front, sleeves, footwear, back, weapon, headwear, accessory, effect_back, effect_front; Layer_Kind xác định giá trị z của Art_Layer trong Z_Order_Table.
- **Anchor_Point (Điểm neo)**: Tọa độ trên Reference_Canvas, hoặc trên Monster_Reference_Canvas đối với Yêu Thú, dùng để căn một Art_Layer vào đúng vị trí; với Yêu Thú, Anchor_Point nằm tại mặt đất.
- **Hide_Rule (Quy tắc ẩn lớp)**: Khai báo trong Layer_Manifest liệt kê các Layer_Kind bị ẩn khi Art_Layer chứa quy tắc này thuộc tổ hợp đầu vào của ảnh ghép (ví dụ mũ trùm đầu ẩn hair_front).
- **Default_Outfit (Y phục mặc định)**: Bộ Art_Layer "Phàm y" khiêm tốn mà Character_Renderer vẽ thay cho Equipment_Slot hiển thị còn trống.
- **Composite_Hash (Mã băm ảnh ghép)**: Giá trị băm của các điểm ảnh của một ảnh ghép, dùng để so sánh hai ảnh ghép; khác với Composite_Key là băm của đầu vào.
- **Composite_Key (Khóa ảnh ghép)**: Giá trị băm của các đầu vào tạo ra ảnh ghép (Body_Template, các id của Base_Appearance và Appearance_Descriptor của từng vật phẩm ở Equipment_Slot hiển thị), dùng làm khóa của bộ nhớ đệm ảnh ghép.
- **Try_On_Preview (Xem thử trang bị)**: Chế độ hiển thị nhân vật mặc thử một Item_Instance chưa trang bị mà không thay đổi Game_State.
- **Monster_Reference_Canvas (Khung tham chiếu Yêu Thú)**: Khung ảnh chuẩn 1024 × 1024 điểm ảnh mà mọi ảnh Yêu Thú dùng chung, có Anchor_Point tại mặt đất.
- **Display_Size_Fraction (Tỷ lệ kích thước hiển thị)**: Hàm ánh xạ một Size_Scale thành chiều cao hiển thị của Yêu Thú, tính bằng tỷ lệ so với chiều cao khung hiển thị.

## Requirements

### Requirement 1: Tài khoản và phiên đăng nhập

**User Story:** Là một người chơi, tôi muốn tạo tài khoản và đăng nhập an toàn trên nhiều thiết bị, để tiến trình tu luyện được giữ nguyên và tiếp tục ở bất cứ đâu.

#### Acceptance Criteria

1. WHEN một người gửi biểu mẫu đăng ký có địa chỉ email hợp lệ chưa được Account nào dùng và mật khẩu dài ít nhất Password_Min_Length ký tự, THE Account_Service SHALL tạo một Account kèm đúng một Player_Character (do Cultivator_Generator sinh theo Requirement 15) và đúng một Game_State.
2. IF địa chỉ email trong biểu mẫu đăng ký không đúng cú pháp, THEN THE Account_Service SHALL từ chối đăng ký và báo lỗi tại trường email.
3. IF mật khẩu trong biểu mẫu đăng ký ngắn hơn Password_Min_Length ký tự, THEN THE Account_Service SHALL từ chối đăng ký và báo lỗi tại trường mật khẩu.
4. IF địa chỉ email trong biểu mẫu đăng ký trùng với email của một Account khác khi so sánh không phân biệt chữ hoa chữ thường, THEN THE Account_Service SHALL từ chối đăng ký và báo rằng email đã được dùng.
5. IF việc tạo Account, Player_Character hoặc Game_State thất bại ở bất kỳ bước nào, THEN THE Account_Service SHALL hủy mọi bản ghi đã tạo trong lần đăng ký đó.
6. FOR ALL Account, THE Account_Service SHALL duy trì đúng một Player_Character và đúng một Game_State thuộc Account đó.
7. WHEN một Game_State mới được tạo, THE Game_Server SHALL đặt Player_Character ở Level 1 với Cultivation_Points bằng 0 và chọn Adventure_Mode tại Zone khởi đầu do Content_Catalog chỉ định.
8. WHEN một Game_State mới được tạo, THE Game_Server SHALL đặt thời điểm Settlement gần nhất bằng thời điểm tạo Account và đặt mọi cài đặt (Retreat_Threshold, Resume_Threshold, Auto_Pill, Auto_Tame, Auto_Breakthrough, Auto_Equip, Auto_Dissolve_Max_Rarity) về giá trị mặc định trong Balance_Config.
9. WHEN một Game_State mới được tạo, THE Economy_Service SHALL cấp Spirit_Stone và vật phẩm khởi đầu theo Requirement 24, cùng phần thưởng khởi đầu của Origin của Player_Character.
10. WHEN một người gửi email và mật khẩu khớp với một Account, THE Account_Service SHALL tạo một Session mới cho thiết bị đó và trả về thông tin xác thực của Session.
11. IF email hoặc mật khẩu trong yêu cầu đăng nhập không khớp với Account nào, THEN THE Account_Service SHALL từ chối đăng nhập và trả về cùng một thông báo lỗi cho trường hợp email không tồn tại và trường hợp mật khẩu sai.
12. WHILE một Session chưa bị thu hồi và thời gian kể từ yêu cầu xác thực gần nhất của Session đó nhỏ hơn Session_Lifetime, THE Game_Server SHALL chấp nhận các yêu cầu mang thông tin xác thực của Session đó.
13. IF một yêu cầu mang thông tin xác thực của Session đã hết hạn, đã bị thu hồi hoặc không tồn tại, THEN THE Game_Server SHALL từ chối yêu cầu bằng lỗi xác thực và không thay đổi Game_State.
14. WHEN người chơi đăng xuất, THE Account_Service SHALL thu hồi Session của thiết bị đó.
15. WHEN một Session mới được tạo cho Account đang có Max_Active_Sessions Session còn hiệu lực, THE Account_Service SHALL thu hồi Session có yêu cầu xác thực gần nhất cũ nhất trước khi tạo Session mới.
16. FOR ALL Account, THE Account_Service SHALL giữ số Session còn hiệu lực nhỏ hơn hoặc bằng Max_Active_Sessions.
17. WHEN một người yêu cầu đặt lại mật khẩu cho một địa chỉ email, THE Account_Service SHALL trả về cùng một phản hồi dù địa chỉ email đã đăng ký hay chưa.
18. WHEN người yêu cầu đặt lại mật khẩu dùng địa chỉ email của một Account, THE Account_Service SHALL gửi đến địa chỉ đó một liên kết đặt lại chỉ dùng được một lần và có hiệu lực trong Password_Reset_Lifetime.
19. WHEN người chơi dùng một liên kết đặt lại còn hiệu lực cùng mật khẩu mới dài ít nhất Password_Min_Length ký tự, THE Account_Service SHALL lưu mật khẩu mới, vô hiệu hóa liên kết và thu hồi mọi Session của Account.
20. IF liên kết đặt lại đã hết hạn hoặc đã được dùng, THEN THE Account_Service SHALL từ chối yêu cầu và giữ nguyên mật khẩu hiện tại.

### Requirement 2: Máy chủ quyết định mọi kết quả

**User Story:** Là một người chơi, tôi muốn mọi kết quả ngẫu nhiên và mọi thay đổi trạng thái do máy chủ quyết định, để tiến trình của tôi công bằng và không ai sửa được từ trình duyệt.

#### Acceptance Criteria

1. THE Game_Server SHALL sinh mọi kết quả ngẫu nhiên có ảnh hưởng đến Game_State bằng Seeded_RNG.
2. WHEN Game_Server nhận một yêu cầu làm thay đổi trạng thái, THE Game_Server SHALL tính mọi giá trị kết quả (sát thương, xác suất, phần thưởng, giá) từ Game_State, Content_Catalog và Balance_Config, và bỏ qua mọi giá trị kết quả do Game_Client gửi kèm.
3. WHEN Game_Server nhận một yêu cầu đọc hoặc thay đổi Game_State, THE Game_Server SHALL chỉ cho phép Session của Account sở hữu Game_State đó.
4. IF một ý định không được phép trong Game_State hiện tại (ví dụ trang bị Item_Instance không sở hữu, dùng Taming_Talisman khi số lượng bằng 0, hoặc Breakthrough khi chưa ở Bình_Cảnh), THEN THE Game_Server SHALL từ chối yêu cầu bằng một mã lỗi và không áp dụng thay đổi nào ngoài Settlement của khoảng thời gian đã trôi qua.
5. WHEN Game_Server áp dụng một yêu cầu làm thay đổi trạng thái, THE Game_Server SHALL áp dụng toàn bộ thay đổi của yêu cầu đó hoặc không áp dụng thay đổi nào.
6. WHEN Game_Server trả về phản hồi thành công cho một yêu cầu làm thay đổi trạng thái, THE Game_Server SHALL đã ghi bền vững Game_State kết quả cùng vị trí mới của các dòng ngẫu nhiên của Seeded_RNG trong cùng một thao tác ghi nguyên tử.
7. WHEN Game_Server nhận một yêu cầu làm thay đổi trạng thái có Request_Id mà cùng Account đã dùng trong Request_Retention_Period, THE Game_Server SHALL trả lại kết quả của lần xử lý đầu và không áp dụng lại thay đổi.
8. FOR ALL yêu cầu làm thay đổi trạng thái và mọi số lần gửi k ≥ 1 trong Request_Retention_Period, THE Game_Server SHALL cho Game_State sau k lần gửi cùng một Request_Id bằng Game_State sau đúng một lần gửi (tính lũy đẳng).
9. WHEN hai yêu cầu làm thay đổi trạng thái của cùng một Account đến đồng thời, THE Game_Server SHALL xử lý chúng lần lượt theo một thứ tự duy nhất, sao cho Game_State cuối cùng bằng kết quả áp dụng tuần tự theo thứ tự đó.
10. THE Game_Server SHALL đo mọi khoảng thời gian trôi qua bằng đồng hồ của Game_Server và bỏ qua mọi giá trị thời gian do Game_Client gửi.
11. WHEN kết nối của Game_Client bị đóng hoặc bị ngắt vào bất kỳ lúc nào, THE Game_Server SHALL giữ nguyên mọi kết quả đã ghi, kể cả kết quả của Encounter mà Game_Client đang phát lại.

### Requirement 3: Tick và các chế độ Lịch Luyện, Bế Quan

**User Story:** Là một người chơi, tôi muốn chọn giữa đi lịch luyện để săn và thu phục hoặc bế quan để tu luyện an toàn, để nhân vật tự tiến bộ theo cách tôi chọn kể cả khi tôi không có mặt.

#### Acceptance Criteria

1. THE Idle_Engine SHALL mô phỏng trò chơi theo các Tick, mỗi Tick dài đúng Tick_Interval giây thời gian trò chơi.
2. WHEN Game_Server nhận một yêu cầu đã xác thực đọc hoặc thay đổi Game_State, THE Idle_Engine SHALL thực hiện Settlement cho mọi Tick trọn vẹn đã trôi qua kể từ thời điểm Settlement gần nhất, trước khi xử lý yêu cầu đó.
3. THE Idle_Engine SHALL chỉ mô phỏng các Tick trọn vẹn và giữ phần thời gian lẻ chưa đủ một Tick cho Settlement kế tiếp.
4. FOR ALL Game_State, THE Game_Server SHALL giữ Player_Character ở đúng một trong ba hoạt động Adventure_Mode, Recovery_State và Retreat_Mode, trong đó Recovery_State chỉ được vào từ Adventure_Mode và chỉ được rời về Adventure_Mode hoặc Retreat_Mode.
5. WHEN người chơi chọn Bế Quan, THE Game_Server SHALL chuyển Player_Character sang Retreat_Mode.
6. WHEN người chơi chọn Lịch Luyện trong lúc Player_Character ở Retreat_Mode, THE Game_Server SHALL chuyển Player_Character sang Adventure_Mode tại Zone đang chọn.
7. FOR ALL thay đổi chế độ, Zone hoặc cài đặt (Retreat_Threshold, Resume_Threshold, Auto_Pill, Auto_Tame, Auto_Breakthrough) có hiệu lực tại thời điểm t, THE Idle_Engine SHALL mô phỏng mọi Tick đã kết thúc trước hoặc tại t theo giá trị cũ và mọi Tick kết thúc sau t theo giá trị mới.
8. WHILE Player_Character ở Adventure_Mode ngoài Recovery_State, WHEN một Tick được mô phỏng, THE Encounter_Generator SHALL tạo đúng một Encounter cho Zone đang chọn theo Requirement 7.
9. THE Cultivation_Service SHALL cộng Cultivation_Points cho Player_Character ở mỗi Tick theo hệ số của hoạt động hiện tại, theo Requirement 22.
10. WHERE Auto_Pill được bật, WHEN HP của Player_Character nhỏ hơn Retreat_Threshold (tính bằng phần trăm Max_HP) vào cuối một Tick và Storage_Bag có HP_Pill, THE Idle_Engine SHALL dùng đúng một HP_Pill thuộc hạng thấp nhất mà Storage_Bag đang có, để HP_Pill rẻ nhất được dùng trước, và áp dụng hiệu ứng của HP_Pill đó.
11. WHEN HP của Player_Character, sau khi áp dụng Auto_Pill nếu có, vẫn nhỏ hơn Retreat_Threshold vào cuối một Tick ở Adventure_Mode, THE Idle_Engine SHALL đưa Player_Character vào Recovery_State.
12. WHILE Player_Character ở Recovery_State hoặc Retreat_Mode, WHEN một Tick được mô phỏng, THE Idle_Engine SHALL hồi HP của Player_Character bằng Recovery_Regen_Rate nhân Max_HP và bỏ qua việc tạo Encounter.
13. WHEN HP của Player_Character đạt hoặc vượt Resume_Threshold (tính bằng phần trăm Max_HP) trong lúc ở Recovery_State, THE Idle_Engine SHALL đưa Player_Character về Adventure_Mode tại Zone đang chọn.
14. WHILE Player_Character ở Adventure_Mode ngoài Recovery_State, WHEN một Tick được mô phỏng, THE Idle_Engine SHALL hồi HP của Player_Character bằng Adventure_Regen_Rate nhân Max_HP.
15. IF người chơi đặt cặp Retreat_Threshold và Resume_Threshold không thỏa 0 < Retreat_Threshold < Resume_Threshold ≤ 100, THEN THE Game_Server SHALL từ chối thay đổi và giữ nguyên cặp giá trị hiện tại.
16. WHILE Player_Character ở Retreat_Mode, WHEN một Tick được mô phỏng, THE Idle_Engine SHALL xác định Đốn_Ngộ cho Tick đó với xác suất Epiphany_Probability và, khi Đốn_Ngộ xảy ra, nhân Cultivation_Points của Tick đó với Epiphany_Multiplier.
17. FOR ALL chuỗi N = 100.000 Tick liên tiếp ở Retreat_Mode, THE Idle_Engine SHALL cho số Đốn_Ngộ nằm trong khoảng ±4 độ lệch chuẩn quanh N × Epiphany_Probability.

### Requirement 4: Settlement ngoại tuyến và báo cáo

**User Story:** Là một người chơi, tôi muốn khi quay lại sau một thời gian vắng mặt nhận được kết quả của khoảng thời gian đó cùng một báo cáo rõ ràng, để biết nhân vật đã gặp gì và thu được gì.

#### Acceptance Criteria

1. WHILE Game_Client đang hiển thị ở nền trước, THE Game_Client SHALL gửi yêu cầu cập nhật Game_State ít nhất một lần mỗi Online_Poll_Interval.
2. WHEN một Settlement bắt đầu và thời gian trôi qua kể từ thời điểm Settlement gần nhất nhỏ hơn Min_Offline_Seconds, THE Idle_Engine SHALL xử lý Settlement đó là Settlement trực tuyến và không tạo Offline_Report.
3. WHEN một Settlement bắt đầu và thời gian trôi qua kể từ thời điểm Settlement gần nhất bằng hoặc lớn hơn Min_Offline_Seconds, THE Idle_Engine SHALL xử lý Settlement đó là Settlement ngoại tuyến và tạo đúng một Offline_Report.
4. WHILE Account không có Session nào còn hiệu lực, THE Idle_Engine SHALL tiếp tục tính thời gian trôi qua cho Settlement kế tiếp.
5. FOR ALL Settlement ngoại tuyến có thời gian trôi qua e giây, THE Idle_Engine SHALL mô phỏng đúng ⌊min(e, 3600 × Offline_Cap) ÷ Tick_Interval⌋ Tick, bắt đầu từ thời điểm Settlement gần nhất (Offline_Cap tính bằng giờ).
6. IF e lớn hơn 3600 × Offline_Cap, THEN THE Idle_Engine SHALL bỏ phần thời gian vượt quá và đặt thời điểm Settlement gần nhất bằng thời điểm của yêu cầu hiện tại.
7. IF đồng hồ của Game_Server đọc sớm hơn thời điểm Settlement gần nhất, THEN THE Idle_Engine SHALL coi thời gian trôi qua bằng 0, không mô phỏng Tick nào và giữ nguyên thời điểm Settlement gần nhất.
8. THE Offline_Report SHALL ghi tổng thời gian được tính, số Tick đã mô phỏng, hoạt động và Zone lúc bắt đầu, và thời gian Player_Character ở Recovery_State.
9. THE Offline_Report SHALL ghi số Encounter theo từng Encounter_Type, số trận theo từng Battle_Outcome, Cultivation_Points nhận được, thay đổi Realm và Sub_Stage, số lần Đốn_Ngộ, số Breakthrough_Attempt thành công, số Breakthrough_Attempt thất bại và Cultivation_Points mất do Breakthrough_Attempt thất bại (Requirement 23 tiêu chí 10).
10. THE Offline_Report SHALL ghi Spirit_Stone nhận được, số Material theo loại, số Item_Instance nhận được theo từng Rarity_Tier, số Item_Instance đưa vào Overflow_Stash và số Item_Instance bị tự động phân giải thành Spirit_Stone.
11. THE Offline_Report SHALL ghi số lần thử thu phục, số Spirit_Beast thu phục được (kể cả Mutation), số loài mới vào Bestiary, số lần bỏ qua thu phục vì Spirit_Beast_Pen đầy hoặc hết Taming_Talisman, và số Taming_Talisman, Tribulation_Talisman và Pill đã tiêu hao.
12. THE Offline_Report SHALL liệt kê mỗi Zone_Phenomenon đã xảy ra trong khoảng thời gian được tính, kèm số Tick chịu ảnh hưởng.
13. FOR ALL Settlement ngoại tuyến và mọi đại lượng q mà Offline_Report ghi tổng tăng và tổng giảm (Cultivation_Points, Spirit_Stone, Material, Item_Instance, Spirit_Beast, Taming_Talisman, Tribulation_Talisman, Pill), THE Idle_Engine SHALL cho giá trị q trong Game_State sau Settlement bằng giá trị q trước Settlement cộng tổng tăng trừ tổng giảm ghi trong Offline_Report, trong đó tổng giảm của Cultivation_Points gồm Cultivation_Points mất do Breakthrough_Attempt thất bại (tiêu chí 9) và tổng giảm của Tribulation_Talisman là số Tribulation_Talisman đã tiêu hao (tiêu chí 11).
14. THE Idle_Engine SHALL chọn Highlight từ các sự kiện của Settlement ngoại tuyến thuộc các loại sau: Monster_Instance có Mutation xuất hiện (dù thu phục được hay không); Item_Instance có Rarity_Tier từ Highlight_Min_Rarity trở lên; Spirit_Beast thuộc loài lần đầu thu phục; Kỳ_Ngộ; Đốn_Ngộ; lên Sub_Stage; Breakthrough_Attempt, dù thành công (lên Realm) hay thất bại (Highlight loại Breakthrough, Requirement 23 tiêu chí 13); Mutation bị bỏ lỡ vì Spirit_Beast_Pen đầy hoặc hết Taming_Talisman.
15. THE Offline_Report SHALL chứa tối đa Report_Highlight_Limit Highlight xếp theo ưu tiên giảm dần; IF số sự kiện đủ điều kiện vượt Report_Highlight_Limit, THEN THE Idle_Engine SHALL giữ các Highlight có ưu tiên cao nhất theo Highlight_Priority và, khi ưu tiên bằng nhau, giữ sự kiện xảy ra muộn hơn.
16. WHERE một Highlight đến từ một trận chiến, THE Offline_Report SHALL kèm mã tham chiếu để lấy Combat_Log của trận đó.
17. THE Game_Server SHALL lưu mỗi Offline_Report cho đến khi người chơi xác nhận đã xem hoặc đã có Offline_Report_History_Size Offline_Report mới hơn, tùy điều kiện nào đến trước.
18. WHILE một Offline_Report chưa được xác nhận, THE Game_Server SHALL đưa Offline_Report đó vào mỗi phản hồi Game_State.
19. WHEN người chơi xác nhận đã xem một Offline_Report, THE Game_Server SHALL đánh dấu báo cáo đó là đã xem và không thay đổi đại lượng nào khác của Game_State.

### Requirement 5: Tính nhất quán của Settlement

**User Story:** Là một người chơi, tôi muốn kết quả treo máy không phụ thuộc vào số lần hay thời điểm tôi mở game, để tôi không bị thiệt và không thể lợi dụng việc tải lại trang.

#### Acceptance Criteria

1. FOR ALL Game_State S và số Tick n, THE Idle_Engine SHALL cho cùng một Game_State kết quả, kể cả mọi Combat_Log, mỗi lần mô phỏng n Tick từ S với cùng phiên bản Balance_Config, Content_Catalog và Generator_Version (tính xác định).
2. FOR ALL Game_State S có thời điểm Settlement gần nhất t0 và mọi t1, t2 thỏa t0 ≤ t1 ≤ t2 và t2 − t0 ≤ 3600 × Offline_Cap, nếu người chơi không gửi ý định nào trong khoảng từ t0 đến t2, THE Idle_Engine SHALL cho cùng một Game_State (không kể các bản ghi Offline_Report) khi thực hiện Settlement đến t1 rồi đến t2 như khi thực hiện một Settlement duy nhất đến t2 (tính nhất quán khi chia nhỏ). Điểm chia t1 có thể là các lần cập nhật trực tuyến, nên người chơi ở trong game hay vắng mặt đều nhận cùng kết quả.
3. FOR ALL Game_State S và thời điểm t, THE Idle_Engine SHALL cho cùng một Game_State khi thực hiện Settlement đến t hai lần liên tiếp như khi thực hiện một lần (tính lũy đẳng).
4. FOR ALL Account, THE Idle_Engine SHALL mô phỏng mỗi Tick của thời gian trò chơi đúng một lần, ngoại trừ các Tick nằm trong phần thời gian vượt Offline_Cap của một khoảng vắng mặt (những Tick đó không được mô phỏng).
5. WHEN hai yêu cầu của cùng một Account cùng kích hoạt Settlement đồng thời, THE Game_Server SHALL mô phỏng mỗi Tick đúng một lần.
6. THE Idle_Engine SHALL gán cho mỗi Settlement một mã định danh duy nhất, tạo từ Account và khoảng chỉ số Tick được mô phỏng.
7. IF Game_Server gặp lỗi trong lúc thực hiện một Settlement, THEN THE Game_Server SHALL để Game_State bằng Game_State trước Settlement đó.
8. FOR ALL điểm lỗi trong một Settlement, THE Idle_Engine SHALL cho Game_State cuối cùng của lần chạy lại sau lỗi bằng Game_State của lần chạy không lỗi.
9. WHEN Balance_Config hoặc Content_Catalog đổi phiên bản trong lúc Account vắng mặt, THE Idle_Engine SHALL mô phỏng mọi Tick của Settlement bằng phiên bản đang áp dụng khi Settlement bắt đầu.
10. WHEN một Settlement ngoại tuyến hoàn tất, THE Idle_Engine SHALL ghi vào Audit_Log mã định danh Settlement, khoảng chỉ số Tick và phiên bản Balance_Config, Content_Catalog và Generator_Version đã dùng.

### Requirement 6: Khu Vực và Thiên Địa Dị Tượng

**User Story:** Là một người chơi, tôi muốn chọn khu vực lịch luyện có đặc điểm riêng và thỉnh thoảng gặp dị tượng, để mỗi lựa chọn khu vực mang lại trải nghiệm và phần thưởng khác nhau.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa cho mỗi Zone: tên, khoảng Level, Level tối thiểu để vào, bảng xuất hiện quái (Monster_Species kèm trọng số), trọng số của từng Encounter_Type, bảng Material, nhóm Event_Template, Drop_Table, Spirit_Qi_Density và danh sách Zone_Phenomenon có thể xảy ra kèm trọng số.
2. THE Content_Catalog SHALL chỉ định đúng một Zone khởi đầu có Level tối thiểu để vào bằng 1.
3. FOR ALL Zone, THE Content_Catalog SHALL có khoảng Level nằm trong khoảng từ 1 đến Playable_Level_Cap.
4. IF có một Level L trong khoảng từ 1 đến Playable_Level_Cap mà khoảng Level của không Zone nào chứa L, THEN THE CI_Pipeline SHALL báo lỗi bản build.
5. WHEN người chơi chọn một Zone có Level tối thiểu để vào nhỏ hơn hoặc bằng Level của Player_Character, THE Game_Server SHALL đặt Zone đó làm Zone đang chọn.
6. IF người chơi chọn một Zone có Level tối thiểu để vào lớn hơn Level của Player_Character, THEN THE Game_Server SHALL từ chối yêu cầu và giữ nguyên Zone đang chọn.
7. THE Idle_Engine SHALL chia thời gian thành các ô liên tiếp dài Phenomenon_Slot_Duration giây, đánh số từ mốc Unix epoch (1970-01-01T00:00:00Z).
8. FOR ALL Zone và ô thời gian s, THE Seeded_RNG SHALL xác định Zone_Phenomenon của Zone trong ô s (hoặc không có Zone_Phenomenon nào) chỉ từ World_Seed, Zone và s, nên mọi Account và mọi lần tính, trực tuyến hay trong Settlement ngoại tuyến, cho cùng kết quả.
9. FOR ALL Zone có danh sách Zone_Phenomenon không rỗng, THE Seeded_RNG SHALL cho số ô có Zone_Phenomenon trong N = 10.000 ô liên tiếp nằm trong khoảng ±4 độ lệch chuẩn quanh N × Phenomenon_Probability.
10. WHILE một Zone_Phenomenon đang hoạt động trong Zone của Tick, THE Idle_Engine SHALL áp dụng các hệ số của Zone_Phenomenon đó cho Tick, với ô thời gian của Tick được xác định theo thời điểm bắt đầu Tick (bằng thời điểm Settlement gần nhất cộng chỉ số Tick nhân Tick_Interval) chứ không theo thời điểm Settlement diễn ra.
11. THE Zone_Phenomenon SHALL chỉ thay đổi trọng số xuất hiện của Monster_Species và Encounter_Type trong Zone, hệ số Cultivation_Points, và mức cộng Luck khi rơi Item_Instance.
12. FOR ALL Zone và thời điểm, THE Idle_Engine SHALL có tối đa một Zone_Phenomenon hoạt động trong Zone đó.
13. THE Game_Server SHALL đưa vào mỗi phản hồi Game_State tên, hiệu ứng và thời điểm kết thúc của Zone_Phenomenon đang hoạt động ở mỗi Zone.

### Requirement 7: Chạm trán và Kỳ Ngộ

**User Story:** Là một người chơi, tôi muốn mỗi lượt lịch luyện gặp những chạm trán đa dạng và thỉnh thoảng có kỳ ngộ bất ngờ, để việc treo máy luôn có điều mới lạ.

#### Acceptance Criteria

1. WHILE Player_Character ở Adventure_Mode ngoài Recovery_State, WHEN một Tick được mô phỏng, THE Encounter_Generator SHALL chọn đúng một Encounter_Type theo xác suất tỉ lệ với trọng số Encounter_Type của Zone đang chọn, sau khi áp dụng hệ số của Zone_Phenomenon đang hoạt động.
2. FOR ALL Zone và Encounter_Type T, THE Encounter_Generator SHALL cho số Encounter loại T trong N = 100.000 Encounter nằm trong khoảng ±4 độ lệch chuẩn quanh N × (trọng số của T ÷ tổng trọng số).
3. WHEN Encounter_Type là Monster, THE Encounter_Generator SHALL chọn một Monster_Species từ bảng xuất hiện quái của Zone theo trọng số (sau khi áp dụng Zone_Phenomenon) và yêu cầu Monster_Generator sinh một Monster_Instance theo Requirement 16.
4. FOR ALL Zone và Monster_Species M trong bảng xuất hiện quái của Zone, THE Encounter_Generator SHALL cho số Monster_Instance thuộc M trong N = 100.000 Encounter loại Monster nằm trong khoảng ±4 độ lệch chuẩn quanh N × (trọng số của M ÷ tổng trọng số).
5. FOR ALL Monster_Instance được sinh trong một Zone, THE Monster_Generator SHALL cho Level nằm trong khoảng Level của Zone đó.
6. WHEN Encounter_Type là NPC_Cultivator, THE Encounter_Generator SHALL yêu cầu Cultivator_Generator sinh một NPC_Cultivator theo Requirement 15 có Level nằm trong khoảng Level của Zone.
7. WHEN Encounter_Type là Monster hoặc NPC_Cultivator, THE Combat_Engine SHALL giải quyết một trận chiến theo Requirement 8.
8. WHEN một trận chiến trong Encounter kết thúc với Victory, THE Idle_Engine SHALL cấp phần thưởng của Encounter theo Requirement 20 (vật phẩm rơi) và Requirement 24 (Spirit_Stone); Cultivation_Points được cộng ở mỗi Tick theo Requirement 22, không phụ thuộc Battle_Outcome.
9. THE Taming_Service SHALL chỉ được gọi cho Encounter có Encounter_Type là Monster.
10. WHEN Encounter_Type là Resource, THE Encounter_Generator SHALL chọn một Material từ bảng Material của Zone theo trọng số cùng một số lượng ngẫu nhiên trong khoảng quy định cho Material đó, và THE Inventory_Service SHALL thêm Material vào Storage_Bag theo Requirement 21.
11. WHEN Encounter_Type là Kỳ_Ngộ, THE Encounter_Generator SHALL chọn một Event_Template theo trọng số từ nhóm Event_Template của Zone, trong số các Event_Template có khoảng Level chứa Level của Player_Character và không nằm trong Event_Distinct_Window − 1 Kỳ_Ngộ gần nhất của Account.
12. FOR ALL Account và mọi chuỗi gồm Event_Distinct_Window Kỳ_Ngộ liên tiếp, THE Encounter_Generator SHALL dùng các Event_Template khác nhau từng đôi một.
13. IF tồn tại một Zone và một Level trong khoảng Level của Zone mà số Event_Template trong nhóm của Zone có khoảng Level chứa Level đó nhỏ hơn Event_Distinct_Window, THEN THE CI_Pipeline SHALL báo lỗi bản build.
14. WHEN một Kỳ_Ngộ được phân giải, THE Encounter_Generator SHALL chọn kết quả từ bảng kết quả có trọng số của Event_Template bằng Seeded_RNG và áp dụng kết quả đó mà không cần nhập liệu của người chơi, trong đó mỗi kết quả có thể kèm thêm một số lần rơi tùy chọn (số nguyên lớn hơn hoặc bằng 1; thực hiện theo Requirement 20 tiêu chí 2) và một khoảng Spirit_Stone tùy chọn (hai cận là số nguyên, tính cả hai cận, cận dưới lớn hơn hoặc bằng 1 và không lớn hơn cận trên; cấp theo Requirement 24).
15. WHEN văn bản của một Kỳ_Ngộ được tạo, THE Encounter_Generator SHALL điền mỗi chỗ giữ chỗ trong văn bản của Event_Template bằng một giá trị lấy từ bảng giá trị của chỗ giữ chỗ đó bằng Seeded_RNG.
16. IF một Event_Template chứa chỗ giữ chỗ không có bảng giá trị hoặc có bảng giá trị rỗng, THEN THE CI_Pipeline SHALL báo lỗi bản build.
17. FOR ALL kết quả của Kỳ_Ngộ, THE Game_Server SHALL giữ HP của Player_Character lớn hơn hoặc bằng 1 và giữ số Item_Instance, số Spirit_Beast và Level của Account ở giá trị không thấp hơn trước Kỳ_Ngộ.
18. THE Game_Server SHALL lưu Activity_Feed_Size bản ghi Encounter gần nhất của Account, mỗi bản ghi gồm loại Encounter, mô tả ngắn, kết quả và mã tham chiếu Combat_Log nếu có.

### Requirement 8: Chiến đấu tự động

**User Story:** Là một người chơi, tôi muốn nhân vật và Linh Thú tự động chiến đấu theo Thần Thông, Hệ và Tính Cách, để kết quả phản ánh sự chuẩn bị của tôi mà tôi không cần thao tác từng lượt.

#### Acceptance Criteria

1. WHEN một Encounter có Encounter_Type là Monster hoặc NPC_Cultivator được tạo, THE Combat_Engine SHALL giải quyết một trận chiến giữa Party và đúng một kẻ địch (Monster_Instance hoặc NPC_Cultivator của Encounter) hoàn toàn trên Game_Server mà không cần nhập liệu của người chơi (riêng Tribulation_Wave theo Requirement 23 là ngoại lệ: trận chiến diễn ra giữa riêng Player_Character và một kẻ địch của Tribulation_Wave, xem tiêu chí 24).
2. WHEN người chơi chọn tập Spirit_Beast cho Party có số lượng nhỏ hơn hoặc bằng Max_Party_Beasts và mọi Spirit_Beast đều nằm trong Spirit_Beast_Pen của Account, THE Game_Server SHALL lưu tập đó làm Party.
3. IF tập Spirit_Beast người chơi chọn cho Party vượt quá Max_Party_Beasts hoặc chứa Spirit_Beast không nằm trong Spirit_Beast_Pen của Account, THEN THE Game_Server SHALL từ chối yêu cầu và giữ nguyên Party.
4. WHEN một trận chiến bắt đầu, THE Combat_Engine SHALL đặt HP của mỗi Spirit_Beast bằng Max_HP, đặt Spirit của mọi thành viên Party bằng Max_Spirit, và giữ HP của Player_Character bằng giá trị trong Game_State.
5. WHEN một trận chiến bắt đầu, THE Combat_Engine SHALL lấy một Generation_Seed cho trận từ Seeded_RNG và lấy mọi giá trị ngẫu nhiên của trận từ Generation_Seed đó.
6. FOR ALL trận chiến, THE Combat_Engine SHALL cho cùng Combat_Log và cùng Battle_Outcome khi nhận cùng dữ liệu đầu vào của các bên và cùng Generation_Seed của trận.
7. THE Combat_Engine SHALL chia trận chiến thành các hiệp, trong đó mỗi bên tham chiến còn HP lớn hơn 0 hành động đúng một lần mỗi hiệp theo thứ tự Speed giảm dần, và khi Speed bằng nhau thì bên đứng trước trong danh sách tham chiến hành động trước (danh sách xếp Player_Character đầu tiên, rồi các Spirit_Beast theo thứ tự trong Party, rồi kẻ địch).
8. WHEN một bên tham chiến hành động, THE Combat_Engine SHALL chọn một Skill dùng được (đủ Spirit, ngoài thời gian hồi và có mục tiêu hợp lệ) theo hồ sơ ưu tiên kỹ năng trong Personality của bên đó.
9. IF bên hành động không có Skill nào dùng được, THEN THE Combat_Engine SHALL dùng đòn đánh thường không tốn Spirit.
10. WHEN một Skill có Element trúng mục tiêu, THE Combat_Engine SHALL nhân sát thương với hệ số Strong, Neutral hoặc Weak của Element_Matrix theo Requirement 14.
11. THE Combat_Engine SHALL gây ít nhất Min_Damage sát thương cho mỗi đòn tấn công trúng.
12. THE Combat_Engine SHALL giữ Crit_Rate hiệu dụng trong khoảng từ 0 đến Crit_Rate_Cap và giữ hệ số ngẫu nhiên của sát thương trong khoảng từ 1 − Damage_Variance đến 1 + Damage_Variance.
13. FOR ALL cặp dữ liệu đầu vào chỉ khác nhau ở một yếu tố và có cùng giá trị ngẫu nhiên, THE Combat_Engine SHALL cho sát thương không giảm khi Attack của bên tấn công tăng, không tăng khi Defense của bên phòng thủ tăng, và không giảm khi quan hệ Element đổi từ Weak sang Neutral rồi sang Strong (tính đơn điệu của sát thương).
14. FOR ALL trận chiến và mọi thời điểm trong trận, THE Combat_Engine SHALL giữ HP của mỗi bên tham chiến trong khoảng từ 0 đến Max_HP và Spirit trong khoảng từ 0 đến Max_Spirit.
15. WHILE một bên tham chiến chịu hiệu ứng Khống Chế làm mất lượt, THE Combat_Engine SHALL bỏ qua hành động của bên đó, giảm thời lượng hiệu ứng một hiệp ở cuối mỗi hiệp và gỡ hiệu ứng khi thời lượng bằng 0.
16. FOR ALL trận chiến, THE Combat_Engine SHALL giữ số hiệp liên tiếp mà một bên tham chiến mất lượt vì Khống Chế nhỏ hơn hoặc bằng Max_Consecutive_Control_Rounds.
17. THE Combat_Engine SHALL kết thúc trận chiến ngay khi điều kiện đầu tiên sau đây xảy ra: HP của kẻ địch bằng 0 (Victory), HP của Player_Character bằng 0 (Defeat), hoặc số hiệp đạt Max_Combat_Rounds mà chưa bên nào thắng (Draw).
18. WHEN một trận chiến kết thúc với Defeat, THE Idle_Engine SHALL đặt HP của Player_Character bằng 1, đưa Player_Character vào Recovery_State và không cấp phần thưởng của Encounter.
19. WHEN một trận chiến kết thúc với Draw, THE Idle_Engine SHALL giữ HP của Player_Character ở giá trị cuối trận và không cấp phần thưởng của Encounter.
20. FOR ALL trận chiến kết thúc với Defeat hoặc Draw, THE Game_Server SHALL giữ số Item_Instance, số Spirit_Beast và Level của Account ở giá trị không thấp hơn trước trận.
21. THE Combat_Engine SHALL tạo một Combat_Log cho mỗi trận chiến.
22. THE Game_Server SHALL lưu Combat_Log của mọi trận chiến sinh ra Highlight và của Combat_Log_Retention trận chiến gần nhất, và có thể xóa Combat_Log của các trận cũ hơn.
23. WHEN Game_Client yêu cầu Combat_Log của một trận chiến còn được lưu, THE Game_Server SHALL trả về Combat_Log đó mà không kèm Generation_Seed của trận, Account_Seed hay vị trí của bất kỳ RNG_Stream nào (Requirement 13).
24. WHEN một Tribulation_Wave được giải quyết theo Requirement 23 tiêu chí 5, THE Combat_Engine SHALL giải quyết wave đó như một trận chiến theo Requirement này, trừ những điểm Requirement 23 tiêu chí 6 và 7 quy định khác, với các bên tham chiến là riêng Player_Character (không có Spirit_Beast nào của Party tham chiến) và đúng một kẻ địch của Tribulation_Wave thay cho Party và kẻ địch của Encounter ở tiêu chí 1, và với kẻ địch của Tribulation_Wave không có Personality, nên ở mỗi hành động kẻ địch đó luôn chọn Skill dùng được (tiêu chí 8) có Skill_Power cao nhất thay cho việc chọn theo hồ sơ ưu tiên kỹ năng.
25. WHEN một đòn tấn công là đòn bạo kích, THE Combat_Engine SHALL nhân sát thương của đòn đó với Crit_Damage hiệu dụng của bên tấn công, được lấy tối thiểu bằng 1, như một thừa số nhân cùng với Element_Multiplier, Same_Element_Bonus (Requirement 14) và hệ số ngẫu nhiên của sát thương (tiêu chí 12) áp lên Skill_Power (Requirement 18 tiêu chí 2), trước khi áp dụng Min_Damage (tiêu chí 11), nên đòn bạo kích không gây sát thương thấp hơn cùng đòn đó khi không bạo kích.
26. FOR ALL cặp đòn tấn công chỉ khác nhau ở Crit_Damage của bên tấn công và có cùng giá trị ngẫu nhiên, THE Combat_Engine SHALL cho sát thương không giảm khi Crit_Damage tăng (tính đơn điệu của sát thương).

### Requirement 9: Thu phục Linh Thú

**User Story:** Là một người chơi, tôi muốn nhân vật tự thử thu phục Yêu Thú sau khi thắng theo bộ lọc tôi đặt, để bộ sưu tập Linh Thú lớn dần kể cả khi tôi vắng mặt mà không lãng phí Khế Ước Phù.

#### Acceptance Criteria

1. WHEN một trận chiến với Monster_Instance kết thúc với Victory, THE Taming_Service SHALL đánh giá Monster_Instance đó theo bộ lọc Auto_Tame.
2. THE bộ lọc Auto_Tame SHALL gồm: tập Monster_Species được phép (mặc định là mọi loài), cờ "chỉ loài chưa từng thu phục", cờ "luôn thử với Mutation", tập Size_Class được phép, và hạng Taming_Talisman sẽ dùng.
3. FOR ALL Monster_Instance m và bộ lọc f, THE Taming_Service SHALL coi m thỏa f khi và chỉ khi m có Mutation và cờ "luôn thử với Mutation" bật, hoặc loài của m thuộc tập loài được phép, Size_Class của m thuộc tập Size_Class được phép, và cờ "chỉ loài chưa từng thu phục" tắt hoặc loài của m chưa từng được thu phục.
4. WHERE Auto_Tame được bật, WHEN Monster_Instance thỏa bộ lọc, Spirit_Beast_Pen còn chỗ trống và Storage_Bag có ít nhất một Taming_Talisman của hạng trong bộ lọc, THE Taming_Service SHALL thực hiện đúng một lần thử thu phục và tiêu hao đúng một Taming_Talisman của hạng đó.
5. IF Monster_Instance thỏa bộ lọc và Spirit_Beast_Pen đầy, THEN THE Taming_Service SHALL bỏ qua lần thử, giữ nguyên số Taming_Talisman và ghi nhận lượt bỏ qua để đưa vào Offline_Report.
6. IF Monster_Instance thỏa bộ lọc và Storage_Bag không có Taming_Talisman của hạng trong bộ lọc, THEN THE Taming_Service SHALL bỏ qua lần thử và ghi nhận lượt bỏ qua để đưa vào Offline_Report.
7. THE Taming_Service SHALL tính xác suất thu phục từ hệ số thu phục cơ bản của Monster_Species, hệ số của hạng Taming_Talisman, hiệu giữa Level của Player_Character và Level của Monster_Instance, và hệ số thu phục trong Personality của Monster_Instance.
8. FOR ALL lần thử thu phục, THE Taming_Service SHALL giữ xác suất thu phục trong khoảng từ Taming_Min_Probability đến Taming_Max_Probability.
9. FOR ALL cặp lần thử chỉ khác nhau ở hạng Taming_Talisman, THE Taming_Service SHALL cho xác suất theo thứ tự hạng Hoàng ≤ Huyền ≤ Địa ≤ Thiên (tính đơn điệu theo hạng).
10. FOR ALL cặp lần thử chỉ khác nhau ở hiệu Level d (Level của Player_Character trừ Level của Monster_Instance), THE Taming_Service SHALL cho xác suất không giảm khi d tăng (tính đơn điệu theo hiệu Level).
11. FOR ALL xác suất p, THE Taming_Service SHALL cho số lần thử thành công trong N = 100.000 lần thử có xác suất p nằm trong khoảng ±4 độ lệch chuẩn quanh N × p.
12. WHEN một lần thử thu phục thành công, THE Taming_Service SHALL thêm một Spirit_Beast vào Spirit_Beast_Pen mang nguyên các thuộc tính của Monster_Instance.
13. FOR ALL Spirit_Beast vừa thu phục, THE Taming_Service SHALL giữ Generation_Seed, Generator_Version, Level, Size_Scale, Personality, Aptitude, Skill, Element và Mutation bằng giá trị tương ứng của Monster_Instance tại thời điểm thu phục.
14. WHEN một lần thử thu phục thành công, THE Bestiary_Service SHALL cập nhật Bestiary theo Requirement 12.
15. WHEN một lần thử thu phục thất bại, THE Taming_Service SHALL loại Monster_Instance khỏi trò chơi, giữ Taming_Talisman ở trạng thái đã tiêu hao và không áp dụng hình phạt nào khác.
16. FOR ALL Game_State, THE Spirit_Beast_Pen SHALL chứa số Spirit_Beast nhỏ hơn hoặc bằng Pen_Capacity.
17. WHEN người chơi thả một Spirit_Beast, THE Game_Server SHALL xóa Spirit_Beast đó khỏi Spirit_Beast_Pen và khỏi Party, và THE Economy_Service SHALL cấp Spirit_Stone theo Requirement 24.

### Requirement 10: Thiên Đạo Bảo Hộ (chống xui)

**User Story:** Là một người chơi, tôi muốn có cơ chế chống xui bảo đảm Dị Biến và pháp khí hiếm cuối cùng sẽ xuất hiện sau một chuỗi thất bại dài, để công sức treo máy của tôi không phụ thuộc hoàn toàn vào vận may.

#### Acceptance Criteria

1. THE Pity_Tracker SHALL lưu cho mỗi Account đúng hai Pity_Counter là Mutation_Pity_Counter và Item_Pity_Counter, và đặt cả hai bằng 0 khi Account được tạo.
2. THE Game_Server SHALL ghi hai Pity_Counter cùng Game_State kết quả trong cùng một thao tác ghi nguyên tử theo Requirement 2.
3. THE Pity_Tracker SHALL tính Pity_Probability P(c) = p + (1 − p) × clamp((c − S) / (H − S), 0, 1), trong đó c là giá trị Pity_Counter ngay trước lần rút, p là xác suất cơ bản của lần rút, S là ngưỡng bắt đầu soft pity, H là ngưỡng hard pity, và clamp(x, 0, 1) giới hạn x trong khoảng từ 0 đến 1.
4. WHEN Monster_Generator quyết định Mutation cho một Monster_Instance mới, THE Pity_Tracker SHALL tính Pity_Probability từ Mutation_Pity_Counter với p = Mutation_Probability, S = Mutation_Soft_Pity_Start và H = Mutation_Hard_Pity_Count, và Monster_Generator SHALL dùng giá trị đó làm xác suất xảy ra Mutation.
5. WHEN Item_Generator chọn Rarity_Tier cho một Item_Instance rơi ra theo Requirement 20, THE Pity_Tracker SHALL tính Pity_Probability từ Item_Pity_Counter với p là xác suất chọn Rarity_Tier từ Thiên trở lên sau khi áp dụng Luck (kể cả mức cộng Luck của Zone_Phenomenon theo Requirement 6), S = Item_Soft_Pity_Start và H = Item_Hard_Pity_Count, và Item_Generator SHALL dùng giá trị đó làm xác suất chọn Rarity_Tier từ Thiên trở lên, rồi chọn giữa Thiên và Tiên theo Requirement 20.
6. FOR ALL Pity_Counter và lần rút, THE Pity_Tracker SHALL đặt giá trị mới của Pity_Counter bằng 0 khi lần rút thành công và bằng giá trị cũ cộng 1 khi lần rút thất bại.
7. FOR ALL lần rút, THE Pity_Tracker SHALL chỉ thay đổi Pity_Counter thuộc loại lần rút đó và giữ nguyên Pity_Counter còn lại.
8. FOR ALL bộ (p, S, H) hợp lệ, THE Pity_Tracker SHALL cho P(c) = p với mọi c nhỏ hơn hoặc bằng S và P(c) = 1 với mọi c lớn hơn hoặc bằng H.
9. FOR ALL bộ (p, S, H) hợp lệ và mọi c1 ≤ c2, THE Pity_Tracker SHALL cho p ≤ P(c1) ≤ P(c2) ≤ 1 (tính đơn điệu theo c).
10. WHILE Pity_Enabled là true, FOR ALL chuỗi lần rút của một Pity_Counter, THE Pity_Tracker SHALL giữ số lần thất bại liên tiếp nhỏ hơn hoặc bằng H và giữ giá trị Pity_Counter trong khoảng từ 0 đến H.
11. WHERE Pity_Enabled là false, THE Pity_Tracker SHALL dùng p làm xác suất của mọi lần rút và giữ nguyên giá trị hai Pity_Counter.
12. IF Balance_Config có Mutation_Probability ngoài khoảng [0, 1], hoặc có ngưỡng soft pity âm, hoặc có ngưỡng soft pity lớn hơn hoặc bằng ngưỡng hard pity tương ứng, THEN THE CI_Pipeline SHALL báo lỗi bản build.
13. FOR ALL Game_State S và mọi t0 ≤ t1 ≤ t2 thỏa điều kiện của Requirement 5 tiêu chí 2, THE Pity_Tracker SHALL cho cùng giá trị hai Pity_Counter khi Settlement chia ở t1 như khi Settlement không chia, nên Settlement trực tuyến và ngoại tuyến cho cùng kết quả.
14. FOR ALL bộ (p, S, H) hợp lệ, THE Pity_Tracker SHALL cho trung bình số lần rút đến lần thành công đầu tiên, đo trên N = 10.000 chuỗi rút độc lập bắt đầu từ Pity_Counter bằng 0, nằm trong khoảng ±4 độ lệch chuẩn của trung bình mẫu quanh E(p, S, H) = Σ (k = 0 đến H) Π (c = 0 đến k − 1) (1 − P(c)); giá trị với tham số mặc định ở Phụ lục A.10.
15. FOR ALL cặp Game_State chỉ khác nhau ở giá trị Pity_Counter, THE Taming_Service SHALL cho cùng xác suất thu phục cho cùng một lần thử (Thiên_Đạo_Bảo_Hộ không áp dụng cho thu phục, Requirement 9).
16. THE Game_Server SHALL đưa vào mỗi phản hồi Game_State giá trị Mutation_Pity_Counter và Item_Pity_Counter cùng ngưỡng soft pity và ngưỡng hard pity tương ứng, để Game_Client hiển thị theo Requirement 31.

### Requirement 11: Dị Biến (Mutation)

**User Story:** Là một người chơi, tôi muốn thỉnh thoảng gặp và thu phục được những Linh Thú Dị Biến có màu sắc, hào quang riêng và chỉ số mạnh hơn, để mỗi chuyến lịch luyện, kể cả khi tôi vắng mặt, có cơ hội tạo ra một khoảnh khắc đáng nhớ.

#### Acceptance Criteria

1. WHEN Monster_Generator sinh một Monster_Instance, THE Monster_Generator SHALL quyết định Mutation cho Monster_Instance đó với xác suất Pity_Probability của Mutation_Pity_Counter theo Requirement 10, tính từ Mutation_Probability.
2. FOR ALL Monster_Instance m, THE Monster_Generator SHALL cho Appearance_Descriptor của m dùng bảng màu Mutation và Effect_Overlay hào quang Mutation của Monster_Species khi và chỉ khi m có Mutation.
3. FOR ALL Monster_Instance m có Mutation và mỗi Stat chính s, THE Monster_Generator SHALL cho giá trị s của m bằng giá trị chưa làm tròn của s ở cùng Monster_Instance khi không áp dụng Mutation, nhân với (1 + Mutation_Stat_Bonus).
4. FOR ALL Generation_Seed g và ngữ cảnh sinh, THE Monster_Generator SHALL cho hai Monster_Instance sinh từ g, một có Mutation và một không có Mutation, giống nhau ở loài, Level, Size_Scale, Personality, Aptitude, Skill và Element, và chỉ khác nhau ở Appearance_Descriptor và các Stat chính.
5. FOR ALL cặp lần sinh Monster_Instance có cùng giá trị Mutation_Pity_Counter, THE Monster_Generator SHALL dùng cùng xác suất Mutation dù Zone_Phenomenon đang hoạt động và Luck của Player_Character khác nhau.
6. WHEN một Settlement ngoại tuyến sinh Monster_Instance có Mutation, THE Idle_Engine SHALL cho Monster_Instance đó chiến đấu và được Taming_Service thử thu phục theo bộ lọc Auto_Tame của Requirement 9, với cùng xác suất xuất hiện và cùng quy tắc như Settlement trực tuyến.
7. WHEN một Monster_Instance có Mutation xuất hiện trong Settlement ngoại tuyến, THE Idle_Engine SHALL tạo một Highlight cho sự kiện đó theo Requirement 4, kèm mã tham chiếu Combat_Log của trận chiến, bất kể Battle_Outcome và bất kể Monster_Instance có được thu phục hay không.
8. THE Bestiary_Service SHALL ghi mỗi lần gặp và mỗi lần thu phục Monster_Instance có Mutation vào bản ghi Mutation của Bestiary_Entry theo Requirement 12.
9. IF một Monster_Species trong Content_Catalog thiếu bảng màu Mutation hoặc Effect_Overlay hào quang Mutation, THEN THE CI_Pipeline SHALL báo lỗi bản build.
10. WHEN Game_Client hiển thị một Monster_Instance hoặc Spirit_Beast có Mutation, THE Game_Client SHALL vẽ nó bằng bảng màu và Effect_Overlay của Mutation theo Appearance_Descriptor và hiển thị nhãn "Dị Biến".
11. FOR ALL N = 1.000.000 Monster_Instance liên tiếp được sinh khi Pity_Enabled là false, THE Monster_Generator SHALL cho số Monster_Instance có Mutation nằm trong khoảng ±4 độ lệch chuẩn quanh N × Mutation_Probability.

### Requirement 12: Linh Thú Đồ Giám (Bestiary)

**User Story:** Là một người chơi, tôi muốn có một cuốn Đồ Giám ghi lại các loài đã gặp, đã thu phục và các kỷ lục của tôi, để tôi theo dõi tiến độ sưu tập và biết mình đã gặp những cá thể đặc biệt nào.

#### Acceptance Criteria

1. THE Bestiary_Service SHALL giữ trong Game_State của mỗi Account đúng một Bestiary_Entry cho mỗi Monster_Species trong Content_Catalog, trong đó loài chưa gặp có mọi cờ bằng false và mọi số lần bằng 0, kể cả loài được thêm vào Content_Catalog sau khi Account được tạo.
2. THE Bestiary_Service SHALL ghi trong mỗi Bestiary_Entry: cờ đã gặp, cờ đã thu phục, số lần gặp, số lần thu phục, Size_Cm lớn nhất, Size_Cm nhỏ nhất, Aptitude_Total cao nhất, thời điểm gặp lần đầu, và bản ghi Mutation gồm số lần gặp Mutation, số lần thu phục Mutation và thời điểm gặp Mutation lần đầu.
3. WHEN một Monster_Instance của loài M được sinh cho một Encounter, THE Bestiary_Service SHALL đặt cờ đã gặp của M bằng true và tăng số lần gặp của M thêm 1.
4. WHEN một lần thử thu phục Monster_Instance của loài M thành công, THE Bestiary_Service SHALL đặt cờ đã thu phục của M bằng true và tăng số lần thu phục của M thêm 1.
5. WHEN một Monster_Instance có Mutation của loài M được sinh cho một Encounter, THE Bestiary_Service SHALL tăng số lần gặp Mutation của M thêm 1 và đặt thời điểm gặp Mutation lần đầu nếu bản ghi chưa có giá trị.
6. WHEN một lần thử thu phục Monster_Instance có Mutation của loài M thành công, THE Bestiary_Service SHALL tăng số lần thu phục Mutation của M thêm 1.
7. FOR ALL chuỗi lần gặp một loài M, THE Bestiary_Service SHALL cho Size_Cm lớn nhất bằng giá trị lớn nhất, Size_Cm nhỏ nhất bằng giá trị nhỏ nhất và Aptitude_Total cao nhất bằng giá trị lớn nhất của Size_Cm và Aptitude_Total tương ứng trong chuỗi đó.
8. FOR ALL Game_State S và mọi t0 ≤ t1 ≤ t2 thỏa điều kiện của Requirement 5 tiêu chí 2, THE Bestiary_Service SHALL ghi thời điểm gặp lần đầu của mỗi loài bằng thời điểm bắt đầu của Tick có lần gặp đó (bằng thời điểm Settlement gần nhất cộng chỉ số Tick nhân Tick_Interval) chứ không bằng thời điểm của yêu cầu, nên Bestiary bằng nhau khi Settlement chia ở t1 và khi không chia.
9. FOR ALL Bestiary_Entry, THE Bestiary_Service SHALL giữ số lần thu phục nhỏ hơn hoặc bằng số lần gặp, số lần gặp Mutation nhỏ hơn hoặc bằng số lần gặp, số lần thu phục Mutation nhỏ hơn hoặc bằng cả số lần gặp Mutation và số lần thu phục, và cờ đã thu phục bằng true chỉ khi cờ đã gặp bằng true.
10. FOR ALL Settlement, THE Bestiary_Service SHALL giữ mỗi số lần, mỗi cờ, Size_Cm lớn nhất và Aptitude_Total cao nhất không giảm, và Size_Cm nhỏ nhất không tăng, so với trước Settlement đó (tính đơn điệu).
11. FOR ALL Bestiary, THE Bestiary_Service SHALL tính tỉ lệ hoàn thành đã gặp bằng 100 × số loài có cờ đã gặp ÷ tổng số Monster_Species trong Content_Catalog và tỉ lệ hoàn thành đã thu phục bằng 100 × số loài có cờ đã thu phục ÷ tổng số Monster_Species, cả hai nằm trong khoảng từ 0 đến 100, và tỉ lệ đã thu phục nhỏ hơn hoặc bằng tỉ lệ đã gặp.
12. FOR ALL Settlement, THE Bestiary_Service SHALL cho tổng thay đổi của số lần gặp qua mọi loài bằng số Encounter có Encounter_Type là Monster, và tổng thay đổi của số lần thu phục qua mọi loài bằng số Spirit_Beast thu phục được, trong Settlement đó.
13. FOR ALL Settlement ngoại tuyến, THE Bestiary_Service SHALL cho số loài mới vào Bestiary trong Offline_Report (Requirement 4 tiêu chí 11) bằng số loài có cờ đã gặp đổi từ false sang true, và cho mỗi loài có cờ đã thu phục đổi từ false sang true đúng một Highlight loại loài lần đầu thu phục (Requirement 4 tiêu chí 14).
14. WHEN người chơi thả một Spirit_Beast, THE Bestiary_Service SHALL giữ nguyên Bestiary.
15. THE Game_Server SHALL ghi mọi thay đổi của Bestiary cùng các thay đổi còn lại của cùng Settlement trong cùng một thao tác ghi nguyên tử theo Requirement 2.
16. WHEN Game_Client yêu cầu Bestiary, THE Game_Server SHALL chỉ trả về các Bestiary_Entry và hai tỉ lệ hoàn thành của Account sở hữu Session yêu cầu.

### Requirement 13: Bộ sinh ngẫu nhiên có seed (Seeded_RNG)

**User Story:** Là một người chơi và là nhà phát triển, tôi muốn mọi kết quả ngẫu nhiên đến từ các dòng ngẫu nhiên độc lập, có seed và có phiên bản, để kết quả công bằng, không đoán trước được từ trình duyệt, và vẫn tái hiện và kiểm thử được.

#### Acceptance Criteria

1. THE Seeded_RNG SHALL cung cấp cho mỗi Account đúng bảy RNG_Stream có tên, và mọi kết quả ngẫu nhiên có ảnh hưởng đến Game_State SHALL lấy từ đúng một dòng theo bảng sau: `encounter` (chọn Encounter_Type, Monster_Species và Material), `combat` (Generation_Seed của mỗi trận chiến, kể cả các wave của Tribulation), `loot` (chọn phần thưởng từ Drop_Table và Rarity_Tier của Item_Instance), `taming` (các lần thử thu phục), `events` (chọn Event_Template, kết quả và giá trị chỗ giữ chỗ của Kỳ_Ngộ), `generation` (Generation_Seed của mỗi Monster_Instance, Item_Instance và Cultivator được sinh), `cultivation` (Đốn_Ngộ và thành công của Breakthrough).
2. FOR ALL Account_Seed, RNG_Version và tên RNG_Stream, THE Seeded_RNG SHALL suy ra dãy giá trị của dòng đó chỉ từ Account_Seed, RNG_Version, tên dòng và vị trí, nên hai lần khởi tạo với cùng đầu vào cho cùng dãy giá trị (tính xác định).
3. FOR ALL cặp RNG_Stream khác nhau X và Y và mọi số k, THE Seeded_RNG SHALL cho dãy giá trị của Y không đổi dù đã lấy k giá trị từ X hay chưa (tính độc lập).
4. THE Seeded_RNG SHALL tiêu thụ đúng một giá trị của RNG_Stream tương ứng cho mỗi Generation_Seed được cấp, và mọi giá trị ngẫu nhiên khác của thực thể hoặc trận chiến được suy ra từ Generation_Seed đó.
5. THE Game_Server SHALL ghi vị trí của cả bảy RNG_Stream của Account cùng Game_State kết quả trong cùng một thao tác ghi nguyên tử theo Requirement 2 tiêu chí 6.
6. FOR ALL RNG_Stream, vị trí n và số m, THE Seeded_RNG SHALL cho m giá trị lấy sau khi khôi phục dòng từ vị trí đã lưu sau n giá trị bằng m giá trị kế tiếp của dòng lấy liên tục n + m giá trị (tính khứ hồi của vị trí).
7. IF một Settlement bị hủy hoặc thất bại, THEN THE Game_Server SHALL giữ vị trí của mọi RNG_Stream bằng giá trị trước Settlement đó, để lần chạy lại dùng đúng các giá trị ngẫu nhiên như lần chạy đầu.
8. FOR ALL Zone và ô thời gian, THE Seeded_RNG SHALL xác định Zone_Phenomenon theo Requirement 6 chỉ từ World_Seed, không đọc Account_Seed và không thay đổi vị trí của RNG_Stream nào.
9. WHEN Game_Server lưu một Generation_Seed, THE Game_Server SHALL lưu kèm RNG_Version và Generator_Version đã dùng để sinh thực thể hoặc trận chiến từ seed đó.
10. THE Seeded_RNG SHALL tái tạo đúng dãy giá trị của mọi RNG_Version xuất hiện trong dữ liệu đã lưu.
11. IF đầu ra của Seeded_RNG cho một Account_Seed mẫu khác bộ giá trị chuẩn đã ghi cho RNG_Version tương ứng, THEN THE CI_Pipeline SHALL báo lỗi bản build.
12. FOR ALL RNG_Stream, THE Seeded_RNG SHALL cho số giá trị rơi vào mỗi khoảng trong 10 khoảng bằng nhau của [0, 1), khi lấy N = 100.000 giá trị, nằm trong khoảng ±4 độ lệch chuẩn quanh N ÷ 10 (tính phân bố đều).
13. FOR ALL cặp Account_Seed hoặc Generation_Seed 64 bit khác nhau ở một bit bất kỳ, THE Seeded_RNG SHALL cho hai dãy 8 giá trị đầu khác nhau, để mọi bit của seed ảnh hưởng đến dãy.
14. FOR ALL số nguyên không dấu 64 bit v, THE State_Serializer SHALL tuần tự hóa Account_Seed hoặc Generation_Seed có giá trị v thành chuỗi chữ số thập phân trong JSON, sao cho giải tuần tự hóa trả lại đúng v (tính khứ hồi, gồm các giá trị biên 0 và 2^64 − 1).
15. WHEN một Account được tạo, THE Account_Service SHALL sinh Account_Seed 64 bit không đoán trước được từ nguồn ngẫu nhiên đạt chuẩn mật mã.
16. FOR ALL phản hồi gửi đến Game_Client, THE Game_Server SHALL loại Account_Seed, mọi Generation_Seed và vị trí của mọi RNG_Stream khỏi nội dung phản hồi, kể cả Game_State, Offline_Report và Combat_Log.

### Requirement 14: Hệ thuộc tính và khắc chế (Element)

**User Story:** Là một người chơi, tôi muốn tám hệ thuộc tính có quan hệ khắc chế rõ ràng và nhất quán, để việc chọn Thần Thông, Linh Thú và Linh Căn theo Hệ có chiều sâu chiến thuật mà vẫn dễ học.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa Element_Matrix cho mọi cặp có thứ tự (A, B) của 8 Element, mỗi cặp có đúng một trong ba giá trị Strong, Neutral, Weak, trong đó A là hệ tấn công và B là hệ phòng thủ.
2. FOR ALL cặp (A, B), THE Element_Matrix SHALL có Strong(A, B) khi và chỉ khi Weak(B, A), và Neutral(A, B) khi và chỉ khi Neutral(B, A).
3. FOR ALL Element A, THE Element_Matrix SHALL cho A là Strong với đúng 2 Element, Weak với đúng 2 Element và Neutral với 4 Element còn lại trong 8 Element, trong đó A là Neutral với chính A.
4. THE Element_Matrix SHALL có giá trị Strong cho năm cặp Tương Khắc cổ điển Kim→Mộc, Mộc→Thổ, Thổ→Thủy, Thủy→Hỏa và Hỏa→Kim.
5. IF Element_Matrix vi phạm một trong các tiêu chí 1 đến 4, hoặc một Skill, Monster_Species hoặc Affix vi phạm tiêu chí 7, THEN THE CI_Pipeline SHALL báo lỗi bản build.
6. IF Balance_Config không thỏa 0 < Weak_Multiplier < Neutral_Multiplier < Strong_Multiplier, hoặc có Same_Element_Bonus nhỏ hơn 1, THEN THE CI_Pipeline SHALL báo lỗi bản build.
7. THE Content_Catalog SHALL gán cho mỗi Skill đúng một Element hoặc đánh dấu Skill là trung tính, gán cho mỗi Monster_Species 1 hoặc 2 Element phân biệt, và gán cho mỗi Affix không quá một Element, mỗi Element thuộc 8 Element; Linh_Can của Cultivator gồm từ 1 đến 5 Element phân biệt theo Requirement 15.
8. WHEN một Skill có Element trúng mục tiêu, THE Combat_Engine SHALL tính Element_Multiplier bằng trung bình cộng, trên mọi Element của mục tiêu (Element của Monster_Species với Monster_Instance và Spirit_Beast, Element của Linh_Can với Cultivator), của Strong_Multiplier, Neutral_Multiplier hoặc Weak_Multiplier ứng với giá trị Element_Matrix của Element Skill và Element đó.
9. FOR ALL đòn tấn công, THE Combat_Engine SHALL cho Element_Multiplier nằm trong khoảng từ Weak_Multiplier đến Strong_Multiplier, và bằng đúng một trong ba giá trị Weak_Multiplier, Neutral_Multiplier, Strong_Multiplier khi mục tiêu có đúng một Element.
10. WHEN bên tấn công dùng Skill trung tính hoặc đòn đánh thường, THE Combat_Engine SHALL dùng Neutral_Multiplier làm Element_Multiplier.
11. FOR ALL đòn tấn công, THE Combat_Engine SHALL nhân thêm Same_Element_Bonus vào sát thương khi và chỉ khi Skill thuộc nhóm Tấn Công, có Element, và Element đó là một trong các Element của bên tấn công (Element của Monster_Species hoặc của Linh_Can).
12. WHERE một Item_Instance có Affix mang Element E, THE Combat_Engine SHALL chỉ áp dụng giá trị của Affix đó cho các đòn có Element E.
13. THE Combat_Log SHALL ghi, cho mỗi đòn tấn công, Element_Multiplier đã áp dụng và cờ cho biết Same_Element_Bonus có được áp dụng hay không.

### Requirement 15: Sinh Tu Sĩ (Cultivator)

**User Story:** Là một người chơi, tôi muốn nhân vật của tôi và các Tu Sĩ tôi gặp được sinh với Linh Căn, Tính Cách, Xuất Thân, ngoại hình và tên riêng, để mỗi Tu Sĩ có cá tính riêng nhưng vẫn cân bằng.

#### Acceptance Criteria

1. FOR ALL Generation_Seed, Generator_Version và ngữ cảnh sinh (khoảng Level, lựa chọn Body_Template nếu có), THE Cultivator_Generator SHALL cho cùng một Cultivator ở mọi thuộc tính: Linh_Can, Personality, Origin, Base_Appearance, Skill khởi đầu, Cultivation_Method, tên và các Stat chính (tính xác định).
2. FOR ALL Generation_Seed và ngữ cảnh sinh, THE Cultivator_Generator SHALL cho cùng một Cultivator dù vai trò là Player_Character hay NPC_Cultivator, vì hai vai trò dùng cùng một thuật toán và cùng một Generator_Version.
3. FOR ALL Cultivator được sinh với khoảng Level từ a đến b, THE Cultivator_Generator SHALL cho Level của Cultivator nằm trong khoảng từ a đến b, trong đó NPC_Cultivator dùng khoảng Level của Zone theo Requirement 7 và Player_Character khi tạo Account dùng a = b = 1.
4. FOR ALL Cultivator, THE Cultivator_Generator SHALL cho Linh_Can gồm k Element phân biệt với 1 ≤ k ≤ 5 và độ thuần trong khoảng từ 0.5 đến 1.0.
5. FOR ALL N = 100.000 Cultivator liên tiếp, THE Cultivator_Generator SHALL cho số Cultivator có Linh_Can gồm k Element nằm trong khoảng ±4 độ lệch chuẩn quanh N × (trọng số của k trong Linh_Can_Count_Weights ÷ tổng Linh_Can_Count_Weights), với mỗi k từ 1 đến 5.
6. FOR ALL Linh_Can, THE Cultivator_Generator SHALL đặt Linh_Can_Speed_Factor bằng giá trị của Linh_Can_Speed_By_Count ứng với số Element của Linh_Can, nên mọi cặp Linh_Can có số Element k1 < k2 thỏa Linh_Can_Speed_Factor của k1 lớn hơn của k2.
7. IF Linh_Can_Count_Weights có tổng bằng 0 hoặc có trọng số của k Element lớn hơn trọng số của k + 1 Element, hoặc Linh_Can_Speed_By_Count không giảm ngặt khi số Element tăng từ 1 đến 5, hoặc Starting_Skill_Count lớn hơn số Skill_Slot của Realm 1 theo Requirement 18, hoặc Cultivator_Stat_Variance hay Personality_Max_Deviation nằm ngoài khoảng [0, 1), THEN THE CI_Pipeline SHALL báo lỗi bản build.
8. THE Cultivator_Generator SHALL chọn Personality từ danh sách Personality trong Content_Catalog, mỗi Personality gồm độ lệch cho từng Stat chính, hồ sơ ưu tiên kỹ năng, hệ số thu phục và một lời thoại nhỏ để hiển thị.
9. IF một Personality trong Content_Catalog có độ lệch Stat với giá trị tuyệt đối lớn hơn Personality_Max_Deviation, THEN THE CI_Pipeline SHALL báo lỗi bản build.
10. THE Cultivator_Generator SHALL chọn Origin từ danh sách Origin trong Content_Catalog, và WHEN Player_Character được tạo, THE Game_Server SHALL cấp cho Account phần thưởng khởi đầu mà Content_Catalog gán cho Origin đó.
11. THE Cultivator_Generator SHALL chọn mỗi thành phần của Base_Appearance (Body_Template, khuôn mặt, kiểu tóc, màu tóc, màu mắt, sắc da) từ các lựa chọn có asset tương ứng trong Layer_Manifest, và dùng Body_Template do người chơi chọn trong biểu mẫu đăng ký của Requirement 1 khi biểu mẫu có lựa chọn, còn khi không có thì chọn Body_Template bằng Generation_Seed.
12. IF lựa chọn Body_Template trong biểu mẫu đăng ký không thuộc các Body_Template hiện có, THEN THE Account_Service SHALL từ chối đăng ký và báo lỗi tại trường Body_Template.
13. THE Cultivator_Generator SHALL gán cho mỗi Cultivator đúng Starting_Skill_Count Skill khởi đầu đôi một khác nhau, mỗi Skill là Skill trung tính hoặc có Element thuộc Linh_Can của Cultivator, cùng đúng một Cultivation_Method từ Content_Catalog.
14. THE Cultivator_Generator SHALL tạo tên của Cultivator từ một họ Hán-Việt và một tên gọi lấy từ các bảng trong Content_Catalog, và gắn thêm một Đạo_Hiệu lấy từ bảng Đạo_Hiệu với xác suất Epithet_Probability.
15. FOR ALL Cultivator có Level L, THE Cultivator_Generator SHALL cho mỗi Stat chính, trước khi áp dụng trang bị, nằm trong khoảng từ Base_Stat(L) × (1 − Cultivator_Stat_Variance) × (1 − Personality_Max_Deviation) đến Base_Stat(L) × (1 + Cultivator_Stat_Variance) × (1 + Personality_Max_Deviation), với Base_Stat(L) lấy từ Requirement 22.

### Requirement 16: Sinh Yêu Thú (Monster_Instance)

**User Story:** Là một người chơi, tôi muốn mỗi Yêu Thú tôi gặp có Level, Tư Chất, Tính Cách, kích thước và Thần Thông riêng, để mỗi trận chiến và mỗi lần thu phục đều khác nhau mà vẫn cân bằng.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa cho mỗi Monster_Species: mã định danh duy nhất, tên, 1 hoặc 2 Element phân biệt, kích thước cơ sở base_size_cm tính bằng centimét, hệ số loài cho từng Stat chính trong năm Stat chính, nhóm Skill của loài kèm trọng số, danh sách Zone sinh sống, hệ số thu phục cơ bản, art_base_id, ít nhất một bảng màu thường, đúng một bảng màu Mutation, Effect_Overlay hào quang Mutation, và tùy chọn một Drop_Table riêng của loài (Requirement 20).
2. WHEN Monster_Generator sinh một Monster_Instance, THE Monster_Generator SHALL lấy Generation_Seed của Monster_Instance từ RNG_Stream `generation` theo Requirement 13 tiêu chí 1 và 4, ghi kèm Generator_Version theo Requirement 13 tiêu chí 9, và suy ra mọi thuộc tính còn lại từ Generation_Seed đó, gồm Level, Aptitude, Personality, các Skill, Size_Scale, quyết định Mutation, Appearance_Descriptor và tên hiển thị.
3. FOR ALL Generation_Seed, Generator_Version, Monster_Species, khoảng Level của Zone và Pity_Probability của Mutation, THE Monster_Generator SHALL cho cùng một Monster_Instance ở mọi thuộc tính (tính xác định).
4. FOR ALL Generation_Seed g, THE Monster_Generator SHALL suy ra một seed con riêng cho mỗi nhóm trong các nhóm Level, Aptitude, Personality, Skill, Size_Scale và quyết định Mutation từ g và tên nhóm, nên giá trị của một nhóm không đổi khi kết quả của nhóm khác đổi, kể cả khi quyết định Mutation đổi (Requirement 11 tiêu chí 4).
5. THE Monster_Generator SHALL chọn Level của Monster_Instance đều trên các số nguyên của khoảng Level của Zone nơi Monster_Instance xuất hiện (bất biến về khoảng Level nằm ở Requirement 7 tiêu chí 5).
6. FOR ALL Monster_Instance, THE Monster_Generator SHALL gán Aptitude gồm đúng năm hệ số, một cho mỗi Stat chính, mỗi hệ số lấy độc lập từ phân bố đều trên khoảng [Aptitude_Min, Aptitude_Max], nên mỗi hệ số và Aptitude_Total đều nằm trong khoảng đó.
7. FOR ALL N = 100.000 Monster_Instance liên tiếp và mỗi Stat chính s, THE Monster_Generator SHALL cho số hệ số Aptitude của s rơi vào mỗi khoảng trong 10 khoảng bằng nhau của [Aptitude_Min, Aptitude_Max] nằm trong khoảng ±4 độ lệch chuẩn quanh N ÷ 10 (tính phân bố đều).
8. THE Monster_Generator SHALL chọn Personality của Monster_Instance với xác suất bằng nhau từ danh sách Personality trong Content_Catalog (Requirement 15 tiêu chí 8).
9. FOR ALL Monster_Instance, THE Monster_Generator SHALL gán Monster_Skill_Count Skill đôi một khác nhau, chọn theo trọng số và không hoàn lại từ nhóm Skill của loài, với Monster_Skill_Count chọn đều trong các số nguyên từ Monster_Skill_Count_Min đến Monster_Skill_Count_Max.
10. FOR ALL Monster_Instance m và mỗi Stat chính s, THE Monster_Generator SHALL tính giá trị chưa làm tròn của s (không kể Mutation) bằng Base_Stat(Level của m, s) × hệ số loài của s × Aptitude của s × (1 + độ lệch của Personality của m cho s) × hệ số kích thước của s (Requirement 17 tiêu chí 5), nhân thêm (1 + Mutation_Stat_Bonus) khi m có Mutation (Requirement 11 tiêu chí 3), rồi đặt Stat chính s của m bằng kết quả làm tròn đến số nguyên gần nhất (0.5 làm tròn lên) và tối thiểu bằng 1, với phép làm tròn là bước cuối cùng.
11. FOR ALL Spirit_Beast b thu phục từ Monster_Instance m, THE Game_Server SHALL tính Stat chính của b bằng công thức của tiêu chí 10 từ các thuộc tính b giữ theo Requirement 9 tiêu chí 13, nên Stat chính và Skill của b bằng Stat chính và Skill của m.
12. THE Monster_Generator SHALL đặt Appearance_Descriptor của Monster_Instance không có Mutation gồm art_base_id của loài, palette_id của một bảng màu thường chọn đều trong các bảng màu thường của loài, và effect_id rỗng; Appearance_Descriptor của Monster_Instance có Mutation theo Requirement 11 tiêu chí 2.
13. THE Monster_Generator SHALL đặt tên hiển thị của Monster_Instance bằng tên loài, gắn thêm đúng một mô tả khi Monster_Instance có Mutation (mô tả "Dị Biến") hoặc có Size_Class là Tí Hon hoặc Khổng Lồ (mô tả là tên Size_Class), ưu tiên mô tả "Dị Biến" khi cả hai điều kiện cùng đúng, và không gắn mô tả trong các trường hợp còn lại.
14. IF một Monster_Species trong Content_Catalog có nhóm Skill rỗng hoặc ít hơn Monster_Skill_Count_Max Skill, hoặc có trọng số Skill không dương, hoặc có mã Skill không tồn tại, hoặc có hệ số loài, base_size_cm hay hệ số thu phục cơ bản không dương, THEN THE CI_Pipeline SHALL báo lỗi bản build.
15. IF một Monster_Species có danh sách Zone sinh sống rỗng hoặc không khớp với bảng xuất hiện quái của các Zone (loài nằm trong bảng của một Zone khi và chỉ khi Zone đó nằm trong danh sách Zone sinh sống của loài), hoặc vi phạm quy tắc Element ở Requirement 14 tiêu chí 7, hoặc thiếu bảng màu thường, bảng màu Mutation hay Effect_Overlay hào quang Mutation (Requirement 11 tiêu chí 9), hoặc có art_base_id, bảng màu hay Effect_Overlay không có trong Asset_Registry, THEN THE CI_Pipeline SHALL báo lỗi bản build.
16. IF Balance_Config có Aptitude_Min không lớn hơn 0, hoặc Aptitude_Min lớn hơn Aptitude_Max, hoặc Monster_Skill_Count_Min nhỏ hơn 1, hoặc Monster_Skill_Count_Min lớn hơn Monster_Skill_Count_Max, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 17: Kích thước Yêu Thú (Size_Scale và Size_Class)

**User Story:** Là một người chơi, tôi muốn mỗi Yêu Thú có kích thước riêng, thường ở cỡ vừa và hiếm khi tí hon hay khổng lồ, để việc săn một cá thể kỳ lạ trở thành mục tiêu sưu tập.

#### Acceptance Criteria

1. THE Monster_Generator SHALL lấy Size_Scale của mỗi Monster_Instance từ phân bố chuẩn bị cắt cụt vào khoảng [Size_Min, Size_Max], với trung bình Size_Mean và độ lệch chuẩn Size_Sigma là tham số của phân bố chuẩn gốc; trung bình và độ lệch chuẩn thực của phân bố đã cắt cụt khác hai tham số đó, nên mọi kiểm thử thống kê của Requirement này dùng giá trị của phân bố đã cắt cụt.
2. FOR ALL Monster_Instance, THE Monster_Generator SHALL cho Size_Scale nằm trong khoảng [Size_Min, Size_Max].
3. FOR ALL Monster_Instance, THE Monster_Generator SHALL đặt Size_Cm bằng base_size_cm của loài nhân Size_Scale, nên Size_Cm nằm trong khoảng từ base_size_cm × Size_Min đến base_size_cm × Size_Max.
4. FOR ALL Monster_Instance, THE Monster_Generator SHALL đặt Size_Class theo bốn ngưỡng t1 < t2 < t3 < t4 của Size_Class_Thresholds: Tí Hon khi Size_Scale < t1, Nhỏ khi t1 ≤ Size_Scale < t2, Vừa khi t2 ≤ Size_Scale < t3, Lớn khi t3 ≤ Size_Scale < t4, và Khổng Lồ khi Size_Scale ≥ t4.
5. THE Monster_Generator SHALL tính hệ số kích thước của Max_HP bằng 1 + Size_HP_Coefficient × (Size_Scale − 1), hệ số kích thước của Speed bằng 1 − Size_Speed_Coefficient × (Size_Scale − 1), và hệ số kích thước của Max_Spirit, Attack và Defense bằng 1.
6. FOR ALL Size_Scale trong khoảng [Size_Min, Size_Max], THE Monster_Generator SHALL cho cả hệ số kích thước của Max_HP và hệ số kích thước của Speed lớn hơn 0.
7. FOR ALL cặp Monster_Instance chỉ khác nhau ở Size_Scale a < b, THE Monster_Generator SHALL cho Max_HP của b lớn hơn hoặc bằng Max_HP của a, Speed của b nhỏ hơn hoặc bằng Speed của a, và Max_Spirit, Attack, Defense của hai Monster_Instance bằng nhau (tính đơn điệu theo kích thước).
8. FOR ALL Generation_Seed g, THE Monster_Generator SHALL cho Size_Scale chỉ phụ thuộc g, Generator_Version và các tham số Size_Mean, Size_Sigma, Size_Min, Size_Max, không phụ thuộc loài, Level, Zone, Mutation hay giá trị Pity_Counter (tính xác định và tính độc lập).
9. FOR ALL N = 100.000 Monster_Instance liên tiếp, THE Monster_Generator SHALL cho số Monster_Instance thuộc mỗi Size_Class nằm trong khoảng ±4 độ lệch chuẩn quanh N × xác suất của Size_Class đó, tính từ phân bố chuẩn đã cắt cụt theo Size_Mean, Size_Sigma, Size_Min, Size_Max và Size_Class_Thresholds; giá trị với tham số mặc định ở Phụ lục B.
10. FOR ALL N = 100.000 Monster_Instance liên tiếp, THE Monster_Generator SHALL cho trung bình mẫu của Size_Scale nằm trong khoảng ±4 sai số chuẩn quanh trung bình của phân bố đã cắt cụt, với sai số chuẩn bằng độ lệch chuẩn của phân bố đã cắt cụt chia cho √N; giá trị với tham số mặc định ở Phụ lục B.
11. FOR ALL Monster_Species M và mọi chuỗi lần gặp M, THE Bestiary_Service SHALL cho Size_Cm lớn nhất và Size_Cm nhỏ nhất của Bestiary_Entry của M (Requirement 12 tiêu chí 7) nằm trong khoảng từ base_size_cm của M × Size_Min đến base_size_cm của M × Size_Max.
12. THE Game_Server SHALL đưa Size_Scale, Size_Class và Size_Cm của mỗi Monster_Instance và Spirit_Beast vào dữ liệu gửi đến Game_Client; việc giới hạn kích thước vẽ trên màn hình thuộc Requirement 27.
13. IF Balance_Config không thỏa 0 < Size_Min < Size_Max, hoặc có Size_Sigma không dương, hoặc có Size_Mean ngoài khoảng [Size_Min, Size_Max], hoặc có Size_Class_Thresholds không tăng ngặt hay không nằm hoàn toàn trong khoảng (Size_Min, Size_Max), hoặc có Size_HP_Coefficient hay Size_Speed_Coefficient âm, hoặc có hệ số kích thước của Max_HP không dương tại Size_Min hay hệ số kích thước của Speed không dương tại Size_Max, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 18: Thần Thông (Skill) và Công Pháp (Cultivation_Method)

**User Story:** Là một người chơi, tôi muốn học và trang bị Thần Thông, chọn Công Pháp hợp với Linh Căn của nhân vật, để lối đánh và tốc độ tu luyện phản ánh lựa chọn của tôi mà tôi không cần thao tác trong từng trận.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa cho mỗi Skill: mã định danh duy nhất, tên, Element hoặc dấu trung tính (Requirement 14 tiêu chí 7), đúng một nhóm trong sáu nhóm Tấn Công, Phòng Thủ, Hồi Phục, Cường Hóa, Suy Yếu, Khống Chế, chi phí Spirit, thời gian hồi tính bằng hiệp, hệ số công suất, mục tiêu (Kẻ Địch, Bản Thân, Một Đồng Minh hoặc Cả Đội), hiệu ứng trạng thái (loại, độ lớn và thời lượng tính bằng hiệp) khi Skill có hiệu ứng, và Level học tối thiểu; nhóm của Skill là khóa để hồ sơ ưu tiên kỹ năng trong Personality xếp hạng Skill (Requirement 8 tiêu chí 8).
2. THE Combat_Engine SHALL đặt Skill_Power của một Skill thuộc nhóm Tấn Công hoặc Hồi Phục bằng hệ số công suất của Skill nhân Attack của bên dùng, nhân thêm Off_Element_Penalty khi Skill có Element mà bên dùng không có Element đó (Element của Linh_Can với Cultivator, Element của Monster_Species với Monster_Instance và Spirit_Beast), và dùng Skill_Power làm giá trị gốc của sát thương hoặc lượng hồi phục trước các hệ số của Requirement 8 và Requirement 14.
3. FOR ALL Skill thuộc nhóm Tấn Công hoặc Hồi Phục, THE Combat_Engine SHALL cho Skill_Power không giảm khi Attack của bên dùng tăng, và với cùng một Cultivator không giảm khi Level của Cultivator tăng, vì Base_Stat tăng ngặt theo Level (tính đơn điệu; Requirement 22).
4. THE Combat_Engine SHALL dùng các Skill đang trang bị trong Skill_Slot cho Player_Character, các Skill đã gán theo Requirement 16 tiêu chí 9 cho Monster_Instance và Spirit_Beast, và các Skill khởi đầu theo Requirement 15 tiêu chí 13 cho NPC_Cultivator, trong khi Skill_Slot và Skill_Book chỉ áp dụng cho Player_Character.
5. THE Content_Catalog SHALL định nghĩa cho mỗi Cultivation_Method: mã định danh duy nhất, tên, hạng (Hoàng, Huyền, Địa hoặc Thiên), hệ số tốc độ, Element hoặc dấu trung tính, một hoặc hai Stat chính được cộng thêm Method_Stat_Bias (hướng tăng chỉ số), và Level học tối thiểu.
6. THE Cultivation_Service SHALL đặt Method_Speed_Factor của Cultivator bằng hệ số tốc độ của Cultivation_Method đang dùng, nhân thêm (1 + Method_Affinity_Bonus) khi Element của Cultivation_Method thuộc Linh_Can của Cultivator.
7. THE Cultivator_Generator SHALL chọn Cultivation_Method khởi đầu theo Requirement 15 tiêu chí 13 chỉ trong các Cultivation_Method hạng Hoàng, để mọi Player_Character bắt đầu với cùng mức Cultivation_Method.
8. WHEN Player_Character được tạo, THE Game_Server SHALL đưa các Skill khởi đầu và Cultivation_Method khởi đầu của Player_Character vào danh sách đã học, trang bị các Skill khởi đầu vào các Skill_Slot đầu tiên và đặt Cultivation_Method khởi đầu làm Cultivation_Method đang dùng.
9. FOR ALL Player_Character, THE Game_Server SHALL đặt số Skill_Slot bằng phần tử của Skill_Slots_By_Realm ứng với Realm của Player_Character và giữ số Skill đang trang bị nhỏ hơn hoặc bằng số Skill_Slot.
10. WHEN người chơi trang bị một Skill đã học vào một Skill_Slot còn trống, hoặc gỡ một Skill đang trang bị, THE Game_Server SHALL đặt Skill đó vào Skill_Slot hoặc để Skill_Slot trống, và giữ nguyên danh sách Skill đã học.
11. IF người chơi trang bị một Skill chưa học hoặc đã được trang bị, hoặc trang bị khi không còn Skill_Slot trống, THEN THE Game_Server SHALL từ chối yêu cầu bằng một mã lỗi và giữ nguyên Game_State.
12. FOR ALL Game_State, Skill chưa trang bị s và Skill_Slot trống, THE Game_Server SHALL cho Game_State sau khi trang bị s rồi gỡ s bằng Game_State ban đầu (tính khứ hồi).
13. WHEN người chơi dùng một Skill_Book dạy một Skill hoặc một Cultivation_Method mà Player_Character chưa học và Level của Player_Character đạt Level học tối thiểu, THE Game_Server SHALL thêm Skill hoặc Cultivation_Method đó vào danh sách đã học và tiêu hao đúng một Skill_Book đó, kể cả khi Element của nó không thuộc Linh_Can (Skill lệch Element chịu Off_Element_Penalty theo tiêu chí 2, còn Cultivation_Method lệch Element không nhận Method_Affinity_Bonus theo tiêu chí 6).
14. IF việc dùng Skill_Book bị từ chối vì Skill hoặc Cultivation_Method đã học, vì Level của Player_Character thấp hơn Level học tối thiểu, hoặc vì Storage_Bag không có Skill_Book đó, THEN THE Game_Server SHALL giữ nguyên Game_State, kể cả số Skill_Book.
15. WHEN người chơi chọn một Cultivation_Method đã học làm Cultivation_Method đang dùng, THE Game_Server SHALL thay Cultivation_Method đang dùng bằng Cultivation_Method đó, nên Player_Character luôn có đúng một Cultivation_Method đang dùng, và THE Idle_Engine SHALL mô phỏng mọi Tick kết thúc trước hoặc tại thời điểm đổi theo Cultivation_Method cũ và mọi Tick kết thúc sau thời điểm đổi theo Cultivation_Method mới (cùng quy tắc của Requirement 3 tiêu chí 7).
16. IF Content_Catalog có một Skill hoặc Cultivation_Method vi phạm một trong các điều kiện sau, THEN THE CI_Pipeline SHALL báo lỗi bản build: Skill có chi phí Spirit hoặc thời gian hồi âm; Skill không có đúng một nhóm trong sáu nhóm, hoặc có Element ngoài 8 Element; Skill nhóm Tấn Công hoặc Hồi Phục có hệ số công suất không dương, hoặc Skill nhóm còn lại có hệ số công suất khác 0; Skill nhóm Phòng Thủ, Cường Hóa, Suy Yếu hoặc Khống Chế thiếu hiệu ứng trạng thái hoặc có thời lượng nhỏ hơn 1 hiệp; Skill nhóm Tấn Công, Suy Yếu hoặc Khống Chế có mục tiêu khác Kẻ Địch, hoặc Skill nhóm Hồi Phục, Cường Hóa hoặc Phòng Thủ có mục tiêu là Kẻ Địch; Cultivation_Method có hệ số tốc độ không dương; hai Cultivation_Method mà hạng cao hơn lại có hệ số tốc độ thấp hơn; Cultivation_Method không có Stat chính nào được cộng hoặc có nhiều hơn hai; Content_Catalog không có Cultivation_Method hạng Hoàng.
17. IF số Skill của một nhóm nhỏ hơn Min_Skills_Per_Category, hoặc tồn tại một Element E mà số Skill trung tính hoặc có Element E với Level học tối thiểu bằng 1 nhỏ hơn Starting_Skill_Count (khiến Cultivator_Generator không thể gán đủ Skill khởi đầu theo Requirement 15 tiêu chí 13), hoặc Balance_Config có Skill_Slots_By_Realm không gồm đúng 9 số nguyên lớn hơn hoặc bằng 1 và không giảm theo Realm, hoặc có Off_Element_Penalty ngoài khoảng (0, 1), hoặc có Method_Affinity_Bonus hay Method_Stat_Bias âm, THEN THE CI_Pipeline SHALL báo lỗi bản build (kiểm tra Starting_Skill_Count so với số Skill_Slot của Realm 1 nằm ở Requirement 15 tiêu chí 7).

### Requirement 19: Sinh Pháp Khí (Item_Instance)

**User Story:** Là một người chơi, tôi muốn mỗi pháp khí nhặt được có chỉ số, Affix, tên và hình dáng riêng theo độ hiếm, để mỗi lần nhặt đồ đều có điều mới mà vẫn cân bằng.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa cho mỗi Item_Template: mã định danh duy nhất, Equipment_Slot, mẫu tên Hán-Việt, loại Implicit_Stat cùng khoảng giá trị theo Level, danh sách Affix_Group được phép, trọng số rơi, art_base_id và Palette_Set được hỗ trợ.
2. THE Content_Catalog SHALL định nghĩa cho mỗi Affix_Group một loại là tiền tố hoặc hậu tố, và cho mỗi Affix: mã định danh duy nhất, Affix_Group (mọi Affix trong một Affix_Group cùng loại), đoạn tên Hán-Việt, Stat đích kèm cách cộng (cố định hoặc phần trăm với Stat chính, cộng thêm với Stat phụ), khoảng giá trị theo Level, trọng số chọn, và không quá một Element, trong đó Affix có Element chỉ nhắm Stat đích Attack (Requirement 14 tiêu chí 7 và 12).
3. THE Content_Catalog SHALL định nghĩa cho mỗi Tiên_Văn: mã định danh duy nhất, tên, hiệu ứng gồm một hoặc hai dòng chỉ số cố định (phần trăm với Stat chính, cộng thêm với Stat phụ) và effect_id của Effect_Overlay riêng.
4. WHEN Item_Generator sinh một Item_Instance, THE Item_Generator SHALL nhận Level nguồn và Rarity_Tier do Requirement 20 tiêu chí 10 chọn, lấy Generation_Seed từ RNG_Stream `generation` theo Requirement 13 tiêu chí 4, ghi kèm Generator_Version theo Requirement 13 tiêu chí 9, và tạo lần lượt Level cùng Item_Template (Requirement 20 tiêu chí 7 và 8), Implicit_Stat, các Affix cùng giá trị, Tiên_Văn, Item_Power_Score, tên và Appearance_Descriptor, mỗi bước dùng một seed con riêng suy ra từ Generation_Seed và tên bước.
5. THE Item_Generator SHALL lăn Implicit_Stat đều trong khoảng giá trị của Item_Template tại Level của Item_Instance, trên các bội của đơn vị Stat, và không để Implicit_Stat phụ thuộc Rarity_Tier.
6. FOR ALL Item_Instance hạng R, THE Item_Generator SHALL gán số Affix chọn đều trong khoảng Affix_Count_By_Tier của R, với số tiền tố nhỏ hơn hoặc bằng Max_Prefix_Count, số hậu tố nhỏ hơn hoặc bằng Max_Suffix_Count, mỗi Affix_Group có tối đa một Affix và mọi Affix thuộc Affix_Group được phép của Item_Template, mỗi Affix được chọn theo trọng số chọn.
7. FOR ALL Item_Instance hạng R và Affix a trên Item_Instance đó, THE Item_Generator SHALL lăn giá trị của a đều, trên các bội của đơn vị Stat, trong khoảng từ cận dưới + Roll_Floor_By_Tier(R) × (cận trên − cận dưới) đến cận trên của khoảng giá trị của a tại Level của Item_Instance.
8. FOR ALL Item_Instance, THE Item_Generator SHALL gán đúng một Tiên_Văn lấy đều từ danh sách Tiên_Văn khi Rarity_Tier là Tiên và không gán Tiên_Văn khi Rarity_Tier là hạng khác.
9. THE Item_Generator SHALL tính Item_Power_Score của Item_Instance bằng tổng, trên Implicit_Stat, mọi Affix và các dòng hiệu ứng của Tiên_Văn (nếu có), của giá trị × trọng số của Stat đích trong Item_Power_Weights × hệ số quy đổi, trong đó hệ số quy đổi bằng 1 với dòng cố định của Stat chính, bằng Base_Stat(Level của Item_Instance, Stat đó) với dòng phần trăm của Stat chính, và bằng Base_Stat(Level của Item_Instance, Attack) với dòng của Stat phụ.
10. FOR ALL cặp Item_Instance chỉ khác nhau ở giá trị lăn của một dòng (Implicit_Stat hoặc một Affix), THE Item_Generator SHALL cho Item_Power_Score của Item_Instance có giá trị lăn lớn hơn không nhỏ hơn Item_Power_Score của Item_Instance còn lại (tính đơn điệu).
11. THE Item_Generator SHALL đặt tên Item_Instance từ các đoạn tên Hán-Việt: hạng Phàm, Hoàng, Huyền và Địa gồm đoạn tên của Affix tiền tố được chọn đầu tiên (nếu có), mẫu tên của Item_Template và đoạn tên của Affix hậu tố được chọn đầu tiên (nếu có), theo thứ tự đó; hạng Thiên và Tiên gồm một tên riêng ghép từ hai bảng âm Hán-Việt của Content_Catalog đặt trước mẫu tên của Item_Template, và hạng Tiên thêm tên của Tiên_Văn ở cuối.
12. THE Item_Generator SHALL đặt Appearance_Descriptor của Item_Instance gồm art_base_id của Item_Template; palette_id lấy từ bảng màu của Content_Catalog theo cặp (Rarity_Tier, Element trội hoặc trung tính); và effect_id là effect_id của Tiên_Văn khi hạng Tiên, là Effect_Overlay ứng với Element trội (hoặc Effect_Overlay trung tính khi không có Element trội) khi hạng thấp hơn Tiên và từ Effect_Overlay_Min_Rarity trở lên, và rỗng khi hạng thấp hơn Effect_Overlay_Min_Rarity, trong đó Element trội là Element xuất hiện ở nhiều Affix nhất, và khi hòa thì lấy Element của Affix được chọn trước.
13. THE Item_Generator SHALL tính Fingerprint của Item_Instance từ dạng chuẩn hóa gồm mã Item_Template, Rarity_Tier, danh sách mã Affix sắp tăng dần, mã Tiên_Văn (hoặc rỗng) và tên; FOR ALL hai Item_Instance có cùng dạng chuẩn hóa đó, Fingerprint bằng nhau dù khác Level, giá trị lăn, thứ tự Affix hay Generation_Seed.
14. FOR ALL Generation_Seed, Generator_Version, Level nguồn và Rarity_Tier, THE Item_Generator SHALL cho cùng một Item_Instance ở mọi thuộc tính (tính xác định).
15. IF Content_Catalog có một Item_Template, Affix, Tiên_Văn hoặc bảng tên vi phạm một trong các điều kiện sau, THEN THE CI_Pipeline SHALL báo lỗi bản build: Item_Template có Equipment_Slot không hợp lệ, trọng số rơi không dương, art_base_id hoặc Palette_Set không có trong Asset_Registry, hoặc danh sách Affix_Group được phép có ít hơn Max_Prefix_Count Affix_Group tiền tố hoặc ít hơn Max_Suffix_Count Affix_Group hậu tố; Affix thuộc Affix_Group không tồn tại, có trọng số chọn không dương, có hơn một Element, hoặc có Element mà Stat đích không phải Attack; khoảng giá trị của Implicit_Stat hoặc Affix thiếu ở một Level từ 1 đến Playable_Level_Cap, có cận dưới lớn hơn cận trên, có cận không phải bội của đơn vị Stat, hoặc có cận dưới hay cận trên giảm khi Level tăng; danh sách Tiên_Văn rỗng hoặc có Tiên_Văn mà effect_id không có trong Asset_Registry; bảng tên Hán-Việt rỗng; bảng màu thiếu một cặp (Rarity_Tier, Element hoặc trung tính) hoặc trả về palette_id nằm ngoài Palette_Set của một Item_Template; thiếu Effect_Overlay cho một Element hoặc cho trường hợp trung tính.
16. IF Balance_Config có Affix_Count_By_Tier không gồm 6 khoảng [min, max] thỏa 0 ≤ min ≤ max ≤ Max_Prefix_Count + Max_Suffix_Count và không giảm (cả min lẫn max) khi Rarity_Tier tăng, hoặc có Roll_Floor_By_Tier không gồm 6 giá trị trong khoảng [0, 1) và không giảm khi Rarity_Tier tăng, hoặc có Item_Power_Weights thiếu một Stat hoặc có giá trị âm, hoặc có Max_Prefix_Count hay Max_Suffix_Count không phải số nguyên dương, hoặc có Effect_Overlay_Min_Rarity không phải một Rarity_Tier, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 20: Độ hiếm và phần thưởng rơi

**User Story:** Là một người chơi, tôi muốn mỗi chiến thắng có một chút phần thưởng bất ngờ, pháp khí hiếm xuất hiện đúng tỉ lệ đã công bố và tăng nhẹ theo may mắn, để việc săn đồ có hồi hộp mà không phụ thuộc hoàn toàn vào vận may.

#### Acceptance Criteria

1. WHEN một trận chiến kết thúc với Victory, THE Idle_Engine SHALL thực hiện đúng Drop_Roll_Count lần rơi, trong đó một lần rơi là một lần chọn đúng một mục từ Drop_Table (trận kết thúc với Defeat hoặc Draw không cấp phần thưởng theo Requirement 8 tiêu chí 18 và 19).
2. WHERE một kết quả của Event_Template chỉ định số lần rơi, THE Idle_Engine SHALL thực hiện ngần ấy lần rơi ngay sau khi áp dụng kết quả đó (Requirement 7 tiêu chí 14).
3. THE Content_Catalog SHALL định nghĩa mỗi Drop_Table là danh sách mục, mỗi mục gồm loại phần thưởng, trọng số và nội dung theo loại: Spirit_Stone thưởng thêm (khoảng số lượng), Material (chọn từ bảng Material của Zone theo Requirement 7 tiêu chí 10), Pill (mã Pill và khoảng số lượng), Taming_Talisman (hạng và khoảng số lượng), Skill_Book (danh sách Skill hoặc Cultivation_Method đích kèm trọng số), Item_Instance (đúng một Item_Instance), hoặc không có phần thưởng.
4. THE Idle_Engine SHALL dùng Drop_Table riêng của Monster_Species của kẻ địch bị đánh bại khi loài đó có Drop_Table riêng (Requirement 16 tiêu chí 1), và dùng Drop_Table của Zone đang chọn (Requirement 6 tiêu chí 1) trong các trường hợp còn lại, kể cả khi kẻ địch là NPC_Cultivator hoặc khi lần rơi đến từ Kỳ_Ngộ.
5. THE Idle_Engine SHALL chọn mục của mỗi lần rơi với xác suất tỉ lệ với trọng số của mục, chọn số lượng đều trong khoảng số lượng của mục và chọn đích của Skill_Book theo trọng số, với các giá trị ngẫu nhiên này và Rarity_Tier lấy từ RNG_Stream `loot` (Requirement 13 tiêu chí 1), còn Level và Item_Template của Item_Instance được suy ra từ Generation_Seed của Item_Instance (Requirement 19 tiêu chí 4).
6. FOR ALL Drop_Table và N = 100.000 lần rơi liên tiếp, THE Idle_Engine SHALL cho số lần rơi vào mỗi mục nằm trong khoảng ±4 độ lệch chuẩn quanh N × (trọng số của mục ÷ tổng trọng số).
7. WHEN một lần rơi chọn mục Item_Instance, THE Item_Generator SHALL lấy Level nguồn bằng Level của kẻ địch bị đánh bại (hoặc bằng Level của Player_Character khi lần rơi đến từ Kỳ_Ngộ) và chọn Level của Item_Instance đều trên các số nguyên từ max(1, Level nguồn − Item_Level_Spread) đến min(Playable_Level_Cap, Level nguồn + Item_Level_Spread).
8. FOR ALL N = 100.000 Item_Instance liên tiếp có cùng Level nguồn, THE Item_Generator SHALL chọn Item_Template với xác suất tỉ lệ với trọng số rơi (Requirement 19 tiêu chí 1), nên số Item_Instance thuộc mỗi Item_Template nằm trong khoảng ±4 độ lệch chuẩn quanh N × (trọng số rơi ÷ tổng trọng số rơi).
9. THE Item_Generator SHALL tính trọng số hiệu dụng của Rarity_Tier thứ k (k = 0 cho Phàm, 1 cho Hoàng, 2 cho Huyền, 3 cho Địa, 4 cho Thiên, 5 cho Tiên) bằng Rarity_Weights của hạng đó nhân (1 + Luck_Rarity_Gain × Luck hiệu dụng)^k, trong đó tổng Luck là Luck của Player_Character cộng mức cộng Luck của Zone_Phenomenon đang hoạt động (Requirement 6 tiêu chí 11) và Luck hiệu dụng là tổng Luck giới hạn trong khoảng từ 0 đến Luck_Cap.
10. WHEN Item_Generator chọn Rarity_Tier cho một Item_Instance, THE Item_Generator SHALL dùng các giá trị lấy từ RNG_Stream `loot` để chọn Rarity_Tier từ Thiên trở lên với xác suất Pity_Probability tính theo Requirement 10 tiêu chí 5, trong đó p bằng tổng trọng số hiệu dụng của Thiên và Tiên chia cho tổng trọng số hiệu dụng của sáu hạng; khi đã chọn từ Thiên trở lên thì chọn Thiên hoặc Tiên với xác suất tỉ lệ với Rarity_Weights của hai hạng đó, không phụ thuộc Luck; khi đã chọn thấp hơn Thiên thì chọn một trong Phàm, Hoàng, Huyền, Địa với xác suất tỉ lệ với trọng số hiệu dụng của bốn hạng đó.
11. THE Pity_Tracker SHALL chỉ cập nhật Item_Pity_Counter theo các lần chọn Rarity_Tier của tiêu chí 10 và giữ nguyên Item_Pity_Counter khi Item_Instance được cấp theo cách khác, như vật phẩm khởi đầu theo Requirement 24.
12. FOR ALL Item_Pity_Counter c, Rarity_Tier t và hai giá trị tổng Luck a ≤ b, THE Item_Generator SHALL cho xác suất chọn Rarity_Tier từ t trở lên với b lớn hơn hoặc bằng với a, và cho xác suất bằng nhau với mọi tổng Luck từ Luck_Cap trở lên (tính đơn điệu và bị chặn của Luck).
13. FOR ALL N = 100.000 Item_Instance liên tiếp khi Pity_Enabled là false và Luck hiệu dụng bằng 0, THE Item_Generator SHALL cho số Item_Instance thuộc mỗi Rarity_Tier nằm trong khoảng ±4 độ lệch chuẩn quanh N × (Rarity_Weights của hạng đó ÷ tổng Rarity_Weights); giá trị với tham số mặc định ở Phụ lục B.
14. THE Game_Server SHALL đưa vào mỗi phản hồi Game_State xác suất hiệu dụng của từng Rarity_Tier tại tổng Luck hiện tại (kể cả Zone_Phenomenon đang hoạt động ở Zone đang chọn), tính chưa kể Thiên_Đạo_Bảo_Hộ, để Game_Client hiển thị theo Requirement 31.
15. IF một Drop_Table có trọng số âm, có tổng trọng số bằng 0, có khoảng số lượng với cận dưới nhỏ hơn 1 hoặc lớn hơn cận trên, có mục Pill, Skill_Book hoặc Taming_Talisman tham chiếu đến mã hoặc hạng không tồn tại, hoặc (với Drop_Table của một Zone) không có mục Item_Instance nào có trọng số dương, THEN THE CI_Pipeline SHALL báo lỗi bản build.
16. IF Balance_Config có Rarity_Weights không gồm 6 số nguyên không âm, có tổng bằng 0, có tổng trọng số của Thiên và Tiên bằng 0, hoặc có trọng số tăng khi Rarity_Tier tăng, hoặc có Luck_Rarity_Gain hay Luck_Cap âm, hoặc có Item_Level_Spread không phải số nguyên không âm, hoặc có Drop_Roll_Count không phải số nguyên lớn hơn hoặc bằng 1, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 21: Túi Càn Khôn và trang bị

**User Story:** Là một người chơi, tôi muốn vật phẩm nhặt được được cất gọn và không bị mất lặng lẽ, và nhân vật tự mặc đồ tốt hơn kể cả khi tôi vắng mặt, để hình dáng và sức mạnh của nhân vật luôn phản ánh những gì tôi thu được.

#### Acceptance Criteria

1. THE Inventory_Service SHALL lưu trong Storage_Bag hai loại vật phẩm: vật phẩm xếp chồng (Material, Pill, Taming_Talisman, Tribulation_Talisman, Skill_Book), lưu theo loại với số lượng là số nguyên không âm, cộng dồn khi được cấp và không chiếm ô; và Item_Instance, mỗi Item_Instance chiếm đúng một ô trong tối đa Bag_Capacity ô.
2. WHEN một Item_Instance mới được cấp cho Account, hoặc một Item_Instance bị Auto_Equip thay ra khỏi Equipment_Slot, THE Inventory_Service SHALL xử lý Item_Instance đó theo thứ tự: Auto_Equip (tiêu chí 3, chỉ với Item_Instance mới được cấp), tự động phân giải theo Auto_Dissolve_Max_Rarity (tiêu chí 4), cất vào Storage_Bag nếu còn ô trống, cất vào Overflow_Stash nếu Storage_Bag đầy và Overflow_Stash chưa đầy, và áp dụng tiêu chí 5 nếu cả hai cùng đầy, rồi dừng ở bước đầu tiên xử lý được Item_Instance đó.
3. WHERE Auto_Equip được bật, WHEN một Item_Instance mới được cấp có Level không lớn hơn Level của Player_Character và có Equipment_Slot đang trống hoặc đang mặc một Item_Instance không bị khóa có Item_Power_Score nhỏ hơn Item_Power_Score của Item_Instance mới, THE Inventory_Service SHALL mặc Item_Instance mới vào Equipment_Slot đó và xử lý Item_Instance bị thay ra (nếu có) theo tiêu chí 2.
4. WHERE Auto_Dissolve_Max_Rarity là một Rarity_Tier, WHEN Item_Instance đang được xử lý theo tiêu chí 2 chưa được mặc, không bị khóa, có Rarity_Tier thấp hơn hoặc bằng Auto_Dissolve_Max_Rarity và có Equipment_Slot đang mặc một Item_Instance khác, THE Inventory_Service SHALL phân giải Item_Instance đó, và THE Economy_Service SHALL cấp Spirit_Stone theo Requirement 24.
5. IF Storage_Bag và Overflow_Stash cùng đầy khi cần cất một Item_Instance X, THEN THE Inventory_Service SHALL phân giải đúng một Item_Instance trong tập gồm X và các Item_Instance không bị khóa của Overflow_Stash, chọn theo thứ tự ưu tiên Rarity_Tier thấp nhất, rồi Item_Power_Score thấp nhất, rồi thời điểm vào kho sớm nhất (X được tính là vào muộn nhất), cất X vào Overflow_Stash khi Item_Instance bị phân giải không phải X, THE Economy_Service SHALL cấp Spirit_Stone theo Requirement 24, và THE Idle_Engine SHALL tính Item_Instance đó vào số Item_Instance bị tự động phân giải của Offline_Report (Requirement 4 tiêu chí 10) và ghi riêng số Item_Instance bị phân giải vì kho đầy; X luôn không bị khóa, vì Item_Instance mới chưa thể bị khóa và tiêu chí 3 không thay Item_Instance bị khóa.
6. WHEN người chơi chuyển một Item_Instance từ Overflow_Stash sang Storage_Bag còn ô trống, THE Inventory_Service SHALL đưa Item_Instance đó vào Storage_Bag và xóa khỏi Overflow_Stash.
7. WHEN người chơi khóa hoặc mở khóa một Item_Instance mà Account sở hữu, THE Inventory_Service SHALL đặt hoặc xóa cờ khóa của Item_Instance đó.
8. WHEN người chơi mặc một Item_Instance X trong Storage_Bag hoặc Overflow_Stash vào Equipment_Slot trùng với Equipment_Slot của Item_Template của X, và Level của Player_Character lớn hơn hoặc bằng Level của X, THE Inventory_Service SHALL mặc X vào Equipment_Slot đó, và khi Equipment_Slot đang mặc một Item_Instance Y thì chuyển Y vào chính nơi X vừa rời.
9. WHEN người chơi gỡ một Item_Instance khỏi Equipment_Slot và Storage_Bag còn ô trống, THE Inventory_Service SHALL chuyển Item_Instance đó vào Storage_Bag và để Equipment_Slot trống.
10. IF người chơi mặc một Item_Instance không thuộc Account, không nằm trong Storage_Bag hoặc Overflow_Stash, có Equipment_Slot không khớp ô đích hoặc có Level lớn hơn Level của Player_Character, hoặc gỡ một Item_Instance khi Storage_Bag đầy, hoặc chuyển một Item_Instance sang Storage_Bag khi Storage_Bag đầy, hoặc phân giải một Item_Instance đang bị khóa hoặc đang được mặc, THEN THE Game_Server SHALL từ chối yêu cầu bằng một mã lỗi và giữ nguyên Game_State.
11. WHEN người chơi phân giải một Item_Instance không bị khóa trong Storage_Bag hoặc Overflow_Stash, THE Inventory_Service SHALL xóa Item_Instance đó khỏi nơi chứa và ghi nhận là đã phân giải, và THE Economy_Service SHALL cấp Spirit_Stone theo Requirement 24.
12. FOR ALL Game_State và Item_Instance X trong Storage_Bag có thể mặc vào Equipment_Slot S, THE Inventory_Service SHALL cho các tập Item_Instance trong Storage_Bag, Overflow_Stash và Equipment_Slot sau khi mặc X vào S rồi hoàn tác (gỡ X khi S trống từ trước, hoặc mặc lại Item_Instance Y bị thay ra khi S đang mặc Y) bằng các tập ban đầu (tính khứ hồi).
13. FOR ALL Game_State và mọi dãy thao tác, THE Inventory_Service SHALL cho mỗi Item_Instance đã được tạo nằm ở đúng một trong bốn trạng thái: trong Storage_Bag, trong Overflow_Stash, đang mặc ở một Equipment_Slot, hoặc đã phân giải (có bản ghi phân giải), và giữ số Item_Instance trong Storage_Bag nhỏ hơn hoặc bằng Bag_Capacity, trong Overflow_Stash nhỏ hơn hoặc bằng Overflow_Capacity, trong mỗi Equipment_Slot nhỏ hơn hoặc bằng 1, với Equipment_Slot của Item_Template của Item_Instance đang mặc khớp với ô chứa (tính bảo toàn).
14. THE Inventory_Service SHALL tổng hợp Stat chính s của Player_Character bằng (Stat nền của s + tổng giá trị cố định của s) × (1 + tổng giá trị phần trăm của s), đặt giá trị tối thiểu bằng 0 rồi làm tròn đến số nguyên gần nhất (0.5 làm tròn lên) làm bước cuối cùng, và tổng hợp Stat phụ bằng Stat nền của Stat đó cộng tổng giá trị cộng thêm của Stat đó, đặt giá trị tối thiểu bằng 0; các giá trị này lấy từ Implicit_Stat, Affix không có Element và dòng hiệu ứng của Tiên_Văn của các Item_Instance đang mặc, tổng giá trị phần trăm của s gồm cả Method_Stat_Bias khi Cultivation_Method đang dùng chỉ định s, Stat nền lấy theo Requirement 22, và Affix có Element được Combat_Engine áp dụng theo Requirement 14 tiêu chí 12.
15. FOR ALL Player_Character, THE Inventory_Service SHALL cho mọi Stat tổng hợp lớn hơn hoặc bằng 0, mọi Stat chính tổng hợp là số nguyên, và Stat tổng hợp chỉ phụ thuộc tập Item_Instance đang mặc, Level, Cultivation_Method đang dùng và Stat nền, không phụ thuộc thứ tự mặc và gỡ.
16. WHEN một thay đổi trang bị làm đổi Max_HP của Player_Character, THE Inventory_Service SHALL đặt HP bằng giá trị nhỏ hơn trong hai giá trị HP hiện tại và Max_HP mới.
17. THE Game_Server SHALL đưa vào mỗi phản hồi Game_State và phản hồi của mọi yêu cầu mặc hoặc gỡ: Base_Appearance của Player_Character và, cho mỗi Equipment_Slot nhìn thấy được, Appearance_Descriptor của Item_Instance đang mặc (hoặc giá trị rỗng khi ô trống), để Character_Renderer (Requirement 26) vẽ lại nhân vật sau mọi thay đổi trang bị mà không cần yêu cầu thêm.
18. IF Balance_Config có Bag_Capacity không phải số nguyên lớn hơn hoặc bằng 1, hoặc Overflow_Capacity không phải số nguyên lớn hơn hoặc bằng 0, hoặc Auto_Dissolve_Max_Rarity mặc định không phải một Rarity_Tier hay giá trị "tắt", hoặc Auto_Equip mặc định không phải giá trị boolean, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 22: Cảnh Giới và Tu Vi

**User Story:** Là một người chơi, tôi muốn Tu Vi tích lũy đều theo thời gian và tự thăng Tiểu Cảnh Giới theo một thang tiến độ rõ ràng, để tôi thấy nhân vật mạnh lên đều đặn kể cả khi vắng mặt.

#### Acceptance Criteria

1. THE Content_Catalog SHALL định nghĩa Realm_Ladder gồm đúng 9 Realm theo thứ tự Luyện Khí, Trúc Cơ, Kim Đan, Nguyên Anh, Hóa Thần, Luyện Hư, Hợp Thể, Đại Thừa, Độ Kiếp, mỗi Realm có đúng 4 Sub_Stage theo thứ tự Sơ Kỳ, Trung Kỳ, Hậu Kỳ, Đỉnh Phong.
2. FOR ALL Realm r từ 1 đến 9 và Sub_Stage s từ 1 đến 4, THE Cultivation_Service SHALL tính Level = 4 × (r − 1) + s, nên phép ánh xạ (r, s) → Level là song ánh lên các số nguyên từ 1 đến 36, với r = ⌈Level ÷ 4⌉ và s = Level − 4 × (r − 1) (tính khứ hồi).
3. THE Cultivation_Service SHALL cộng vào Cultivation_Points của Player_Character ở cuối mỗi Tick, bất kể Battle_Outcome của Encounter trong Tick đó, một lượng bằng kết quả làm tròn đến số nguyên gần nhất (0.5 làm tròn lên) của tích các thừa số sau: Base_Cultivation_Rate của Level lúc đầu Tick; Linh_Can_Multiplier; Method_Speed_Factor (Requirement 18 tiêu chí 6); (1 + Cultivation_Speed tổng hợp theo Requirement 21 tiêu chí 14); Spirit_Qi_Density của Zone đang chọn; hệ số Cultivation_Points của Zone_Phenomenon đang hoạt động (bằng 1 khi không có Zone_Phenomenon); hệ số hoạt động (Retreat_Cultivation_Factor ở Retreat_Mode, Adventure_Cultivation_Factor ở Adventure_Mode và Recovery_State); hệ số Đốn_Ngộ (Epiphany_Multiplier ở Tick có Đốn_Ngộ theo Requirement 3 tiêu chí 16, bằng 1 ở các Tick còn lại); và Heart_Demon_Factor.
4. FOR ALL Linh_Can, THE Cultivation_Service SHALL đặt Linh_Can_Multiplier bằng Linh_Can_Speed_Factor nhân độ thuần của Linh_Can, nên với cùng số Element thì Linh_Can_Multiplier không giảm khi độ thuần tăng, và với cùng độ thuần thì Linh_Can_Multiplier giảm ngặt khi số Element tăng.
5. FOR ALL cặp trạng thái chỉ khác nhau ở một thừa số của tiêu chí 3, THE Cultivation_Service SHALL cho Cultivation_Points nhận được ở một Tick không giảm khi thừa số đó tăng (tính đơn điệu theo từng thừa số).
6. FOR ALL Game_State S và mọi t0 ≤ t1 ≤ t2 thỏa điều kiện của Requirement 5 tiêu chí 2, THE Cultivation_Service SHALL cho cùng Cultivation_Points, Level và số Đốn_Ngộ khi Settlement chia ở t1 như khi Settlement không chia, vì mỗi Tick tính lượng Cultivation_Points từ trạng thái lúc đầu Tick và từ Zone_Phenomenon theo thời điểm bắt đầu Tick (Requirement 6 tiêu chí 10).
7. THE Balance_Config SHALL chứa bảng Cultivation_Threshold(L), là số Cultivation_Points cần có để rời Level L, cho mọi L từ 1 đến Playable_Level_Cap, gồm các số nguyên dương tăng ngặt theo L.
8. WHEN Cultivation_Points của Player_Character đạt hoặc vượt Cultivation_Threshold(Level) và Level không phải Đỉnh Phong, THE Cultivation_Service SHALL tăng Level thêm 1 trong cùng Realm, trừ Cultivation_Threshold của Level cũ khỏi Cultivation_Points để giữ phần dư, và lặp lại cho đến khi điều kiện không còn đúng.
9. WHILE Level của Player_Character là Đỉnh Phong, WHEN Cultivation_Points đạt hoặc vượt Cultivation_Threshold(Level), THE Cultivation_Service SHALL đặt Cultivation_Points bằng Cultivation_Threshold(Level) (bỏ phần vượt) và đặt Player_Character ở trạng thái Bình_Cảnh, không tăng Level cho đến khi Breakthrough thành công (Requirement 23).
10. IF Level của Player_Character bằng Playable_Level_Cap, THEN THE Cultivation_Service SHALL không thực hiện Breakthrough nào, kể cả Breakthrough do Auto_Breakthrough, và THE Game_Server SHALL từ chối yêu cầu Breakthrough của người chơi bằng một mã lỗi và giữ nguyên Game_State, vì Realm kế tiếp chưa chơi được (giả định A3).
11. FOR ALL Game_State và mọi dãy Tick và thao tác, THE Cultivation_Service SHALL giữ Level trong khoảng từ 1 đến Playable_Level_Cap và không giảm, và giữ Cultivation_Points là số nguyên thỏa 0 ≤ Cultivation_Points ≤ Cultivation_Threshold(Level).
12. THE Balance_Config SHALL chứa bảng Base_Stat(L, s) gồm số nguyên dương cho mỗi Stat chính s và mỗi L từ 1 đến Playable_Level_Cap, tăng ngặt theo L, trong đó mức tăng khi qua ranh giới Realm (từ Đỉnh Phong của một Realm lên Sơ Kỳ của Realm kế tiếp) lớn hơn mọi mức tăng giữa hai Sub_Stage liên tiếp của Realm đứng trước ranh giới đó; và SHALL chứa Base_Secondary_Stats gồm giá trị nền của Crit_Rate, Crit_Damage, Luck và Cultivation_Speed, không đổi theo Level.
13. THE Cultivation_Service SHALL tính Stat nền của Stat chính s của một Cultivator ở Level hiện tại L bằng Base_Stat(L, s) × Variance_Factor của s × (1 + độ lệch của Personality cho s), chưa làm tròn, và tính lại Stat nền từ Base_Stat của Level mới mỗi khi Level của Player_Character đổi mà giữ nguyên Variance_Factor và Personality; Stat nền của Stat phụ bằng giá trị tương ứng trong Base_Secondary_Stats; Stat chính của NPC_Cultivator bằng Stat nền làm tròn đến số nguyên gần nhất và tối thiểu bằng 1; khoảng giá trị của Requirement 15 tiêu chí 15 áp dụng cho Stat nền chưa làm tròn.
14. WHEN Realm của Player_Character tăng, THE Game_Server SHALL mở thêm Skill_Slot theo Skill_Slots_By_Realm (Requirement 18 tiêu chí 9) và giữ nguyên các Skill đang trang bị.
15. FOR ALL Level L từ 1 đến Playable_Level_Cap − 1, khi mọi thừa số của tiêu chí 3 ngoài Base_Cultivation_Rate bằng 1, THE Cultivation_Service SHALL cho số Tick để Cultivation_Points tăng từ 0 đến Cultivation_Threshold(L) bằng ⌈Cultivation_Threshold(L) ÷ Base_Cultivation_Rate(L)⌉, nên thời gian tiến độ ở điều kiện tham chiếu (Phụ lục B.2) kiểm tra được bằng tính toán.
16. IF Balance_Config có Cultivation_Threshold thiếu giá trị ở một Level từ 1 đến Playable_Level_Cap hoặc không gồm số nguyên dương tăng ngặt, hoặc có Base_Cultivation_Rate không phải số nguyên dương hoặc giảm khi Level tăng, hoặc có Base_Stat vi phạm tiêu chí 12, hoặc có Base_Secondary_Stats với Crit_Rate ngoài khoảng [0, 1], Crit_Damage nhỏ hơn 1, Luck hay Cultivation_Speed âm, hoặc có Adventure_Cultivation_Factor hay Retreat_Cultivation_Factor không dương, hoặc có Playable_Level_Cap ngoài khoảng từ 1 đến 36, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 23: Đột Phá và Thiên Kiếp

**User Story:** Là một người chơi, tôi muốn vượt qua Bình_Cảnh bằng một Breakthrough có xác suất, rủi ro và cách chuẩn bị rõ ràng, và có thể giao cho game tự làm khi đủ an toàn, để mỗi lần lên Realm mới là một thời khắc có ý nghĩa mà tôi không bị thiệt khi vắng mặt.

#### Acceptance Criteria

1. WHILE Player_Character ở Bình_Cảnh và Level nhỏ hơn Playable_Level_Cap, WHEN người chơi gửi yêu cầu Breakthrough kèm Request_Id (Requirement 2 tiêu chí 7) và chọn dùng hoặc không dùng một Breakthrough_Pill và một Tribulation_Talisman cho lần thử đó, THE Cultivation_Service SHALL bắt đầu một Breakthrough_Attempt mà không đòi hỏi mức HP tối thiểu, kể cả khi Player_Character đang có Heart_Demon, và SHALL tiêu hao đúng một Breakthrough_Pill khi yêu cầu chọn Breakthrough_Pill hoặc không tiêu hao Breakthrough_Pill nào khi yêu cầu không chọn.
2. IF người chơi gửi yêu cầu Breakthrough khi Player_Character chưa ở Bình_Cảnh hoặc khi Level bằng Playable_Level_Cap, hoặc yêu cầu chọn một Breakthrough_Pill hay Tribulation_Talisman có số lượng bằng 0 trong Storage_Bag, hoặc yêu cầu xem trước Breakthrough (tiêu chí 14) khi Level bằng Playable_Level_Cap, THEN THE Game_Server SHALL từ chối yêu cầu bằng một mã lỗi và không áp dụng thay đổi nào ngoài Settlement của khoảng thời gian đã trôi qua (Requirement 2 tiêu chí 4, Requirement 22 tiêu chí 10), nên với Playable_Level_Cap mặc định (Phụ lục B) chỉ có Breakthrough vào Realm 2, 3, 4 và 5.
3. FOR ALL Breakthrough_Attempt, THE Cultivation_Service SHALL tính Breakthrough_Probability bằng Breakthrough_Base_Probability của Realm đích (Realm kế tiếp của Player_Character), cộng Breakthrough_Purity_Bonus nhân độ thuần của Linh_Can của Player_Character, cộng Breakthrough_Pill_Bonus khi lần thử dùng Breakthrough_Pill (không cộng gì khi không dùng), rồi giới hạn kết quả trong khoảng từ Breakthrough_Probability_Min đến Breakthrough_Probability_Max, nên Breakthrough_Probability luôn nằm trong khoảng đó và không giảm khi độ thuần tăng hoặc khi lần thử chuyển từ không dùng sang dùng Breakthrough_Pill.
4. FOR ALL Breakthrough_Attempt, THE Cultivation_Service SHALL lấy đúng một giá trị phân bố đều trong [0, 1) từ RNG_Stream `cultivation` (Requirement 13 tiêu chí 1) và coi lần tung là thành công khi giá trị đó nhỏ hơn Breakthrough_Probability, nên với mọi Breakthrough_Probability p cố định, số lần tung thành công trong N = 100.000 lần thử nằm trong khoảng ±4 độ lệch chuẩn quanh N × p.
5. WHEN lần tung của một Breakthrough_Attempt thành công và Realm đích thuộc Tribulation_Realms, THE Combat_Engine SHALL giải quyết một Tribulation gồm đúng Tribulation_Wave_Count_By_Realm của Realm đích Tribulation_Wave nối tiếp nhau, trong đó mỗi Tribulation_Wave là một trận chiến theo Requirement 8 giữa riêng Player_Character (không có Spirit_Beast nào của Party tham chiến) và đúng một kẻ địch có Element Lôi, với mọi Skill của kẻ địch có Element Lôi và mỗi Stat chính của kẻ địch bằng Base_Stat(Level đích, Stat đó) nhân Tribulation_Wave_Strength, làm tròn đến số nguyên gần nhất (0.5 làm tròn lên) và tối thiểu bằng 1, trong đó Level đích là Level của Sơ Kỳ của Realm đích.
6. FOR ALL Tribulation_Wave, THE Game_Server SHALL đặt HP của Player_Character lúc bắt đầu wave bằng HP lúc kết thúc wave liền trước (wave đầu tiên dùng HP lúc Breakthrough_Attempt bắt đầu); đặt Spirit bằng Max_Spirit (Requirement 8 tiêu chí 4); lấy Generation_Seed của wave từ RNG_Stream `combat` (Requirement 13 tiêu chí 1); tạo một Combat_Log lưu và trả về theo Requirement 8 tiêu chí 22 và 23; không dùng Pill nào giữa hai wave, kể cả Pill do Auto_Pill; không cấp phần thưởng của Encounter, không cho vật phẩm rơi và không cập nhật Bestiary, vì Tribulation_Wave không phải Encounter (Requirement 7 tiêu chí 8 không áp dụng); và coi wave là đã vượt qua khi Battle_Outcome của wave không phải Defeat.
7. IF một Tribulation_Wave kết thúc với Defeat, THEN THE Cultivation_Service SHALL coi Tribulation và Breakthrough_Attempt là thất bại, không giải quyết các wave còn lại, đặt HP của Player_Character bằng 1 và đưa Player_Character vào Recovery_State khi chế độ trước lần thử là Adventure_Mode (Requirement 8 tiêu chí 18, Requirement 3 tiêu chí 11), còn khi chế độ trước lần thử là Recovery_State hoặc Retreat_Mode thì giữ nguyên chế độ đó.
8. WHEN một Tribulation bắt đầu, THE Game_Server SHALL tiêu hao đúng một Tribulation_Talisman nếu Breakthrough_Attempt đã chọn dùng Tribulation_Talisman và, trong mọi Tribulation_Wave của lần thử đó, nhân sát thương mà Player_Character nhận với (1 − Tribulation_Talisman_Reduction) trước khi áp dụng Min_Damage (Requirement 8 tiêu chí 11); Breakthrough_Attempt không chọn Tribulation_Talisman vẫn được tiến hành mà không giảm sát thương, và vì Tribulation_Talisman chỉ bị tiêu hao khi Tribulation bắt đầu nên lần tung thất bại hoặc Realm đích không thuộc Tribulation_Realms không tiêu hao Tribulation_Talisman nào.
9. WHEN một Breakthrough_Attempt kết thúc thành công, tức lần tung thành công và Realm đích không thuộc Tribulation_Realms hoặc mọi Tribulation_Wave đều được vượt qua, THE Cultivation_Service SHALL tăng Level của Player_Character thêm 1 để lên Sơ Kỳ của Realm đích, đặt Cultivation_Points bằng 0, đặt HP bằng Max_HP và Spirit bằng Max_Spirit của Level mới (Requirement 21 tiêu chí 14), và giữ nguyên Heart_Demon đang có, nên Skill_Slot mở thêm theo Requirement 22 tiêu chí 14, Stat nền tính lại từ Base_Stat của Level mới theo Requirement 22 tiêu chí 13, và các Zone có Level tối thiểu để vào nhỏ hơn hoặc bằng Level mới trở nên chọn được theo Requirement 6 tiêu chí 5.
10. WHEN một Breakthrough_Attempt kết thúc thất bại, tức lần tung thất bại hoặc một Tribulation_Wave kết thúc với Defeat, THE Cultivation_Service SHALL giữ nguyên Realm và Level; trừ khỏi Cultivation_Points một lượng bằng Cultivation_Points hiện có nhân Breakthrough_Failure_Loss, làm tròn xuống; đặt thời lượng còn lại của Heart_Demon bằng Heart_Demon_Duration Tick (một Heart_Demon đang có được đặt lại, không cộng dồn); và không hoàn lại Breakthrough_Pill hay Tribulation_Talisman đã tiêu hao, nên Player_Character rời Bình_Cảnh khi Cultivation_Points sau khi trừ nhỏ hơn Cultivation_Threshold(Level) và vào lại Bình_Cảnh theo Requirement 22 tiêu chí 9.
11. FOR ALL Tick, THE Cultivation_Service SHALL đặt Heart_Demon_Factor bằng Heart_Demon_Cultivation_Factor khi Player_Character có Heart_Demon lúc đầu Tick và bằng 1 trong các trường hợp còn lại (Requirement 22 tiêu chí 3), và giảm thời lượng còn lại của Heart_Demon đi 1 ở cuối Tick, trước bước Auto_Breakthrough của Tick đó, ở mọi chế độ, nên mỗi Heart_Demon ảnh hưởng đúng Heart_Demon_Duration Tick liên tiếp sau thất bại, kể cả khi các Tick đó nằm trong Settlement ngoại tuyến và Settlement được chia tại điểm bất kỳ (Requirement 5 tiêu chí 2).
12. WHERE Auto_Breakthrough được bật, WHEN một Tick đã hoàn tất các bước Auto_Pill và kiểm tra Recovery_State (Requirement 3 tiêu chí 10 và 11) và Player_Character thỏa tất cả các điều kiện sau: ở Bình_Cảnh với Level nhỏ hơn Playable_Level_Cap; không có Heart_Demon; HP lớn hơn hoặc bằng Auto_Breakthrough_Min_HP nhân Max_HP; Breakthrough_Probability khi không dùng Breakthrough_Pill lớn hơn hoặc bằng Auto_Breakthrough_Min_Probability; và Storage_Bag có ít nhất một Tribulation_Talisman khi Realm đích thuộc Tribulation_Realms, THE Cultivation_Service SHALL thực hiện đúng một Breakthrough_Attempt như bước cuối cùng của Tick đó, không dùng Breakthrough_Pill và dùng một Tribulation_Talisman nếu Tribulation bắt đầu.
13. WHEN một Breakthrough_Attempt kết thúc, dù thành công hay thất bại, THE Game_Server SHALL ghi một mục Audit_Log gồm nguồn của lần thử (yêu cầu của người chơi hoặc Auto_Breakthrough), Realm đích, Breakthrough_Probability, kết quả lần tung, kết quả Tribulation nếu có và số Breakthrough_Pill, Tribulation_Talisman đã tiêu hao; và, khi lần thử nằm trong một Settlement ngoại tuyến, SHALL đưa lần thử vào Offline_Report dưới dạng một Highlight loại Breakthrough xếp theo Highlight_Priority, kèm mã tham chiếu Combat_Log của từng Tribulation_Wave đã diễn ra, đồng thời ghi số lần thử thành công, số lần thử thất bại, Cultivation_Points mất do thất bại và số Tribulation_Talisman đã tiêu hao (Requirement 4 tiêu chí 9, 11, 13, 14 và 16).
14. WHEN người chơi yêu cầu xem trước Breakthrough và Level nhỏ hơn Playable_Level_Cap, THE Game_Server SHALL trả về Breakthrough_Probability khi không dùng và khi dùng Breakthrough_Pill, việc Realm đích có Tribulation hay không, số Tribulation_Wave và các Stat chính của kẻ địch của mỗi Tribulation_Wave, mà không tiêu hao vật phẩm, không lấy giá trị nào từ RNG_Stream và không thay đổi Game_State ngoài Settlement của khoảng thời gian đã trôi qua, nên kết quả của Breakthrough_Attempt kế tiếp không phụ thuộc vào việc người chơi đã xem trước hay chưa.
15. FOR ALL Game_State và mọi dãy Tick, yêu cầu và Breakthrough_Attempt, THE Game_Server SHALL giữ Realm và Level không giảm, giữ Cultivation_Points là số nguyên không âm, thực hiện không quá một Breakthrough_Attempt do Auto_Breakthrough trong mỗi Tick, và cho cùng Game_State, Combat_Log và Audit_Log khi chạy lại từ cùng Game_State với cùng vị trí của mọi RNG_Stream, kể cả khi Settlement được chia tại điểm bất kỳ (Requirement 5 tiêu chí 1 và 2).
16. IF Balance_Config có Breakthrough_Base_Probability thiếu giá trị ở một Realm từ 2 đến 5, hoặc có Breakthrough_Base_Probability, Breakthrough_Probability_Min hay Breakthrough_Probability_Max ngoài khoảng [0, 1], hoặc có Breakthrough_Probability_Min lớn hơn Breakthrough_Probability_Max, hoặc có Breakthrough_Purity_Bonus hay Breakthrough_Pill_Bonus âm, hoặc có Tribulation_Realms không phải tập con của các Realm từ 2 đến 5, hoặc có Tribulation_Wave_Count_By_Realm thiếu giá trị ở một Realm thuộc Tribulation_Realms hay có giá trị không phải số nguyên lớn hơn hoặc bằng 1, hoặc có Tribulation_Wave_Strength không dương, hoặc có Tribulation_Talisman_Reduction ngoài khoảng [0, 1), hoặc có Heart_Demon_Duration không phải số nguyên lớn hơn hoặc bằng 1, hoặc có Heart_Demon_Cultivation_Factor ngoài khoảng (0, 1], hoặc có Breakthrough_Failure_Loss ngoài khoảng [0, 1), hoặc có Auto_Breakthrough_Min_HP hay Auto_Breakthrough_Min_Probability ngoài khoảng [0, 1], THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 24: Kinh tế Linh Thạch, cửa hàng và Đan Dược

**User Story:** Là một người chơi, tôi muốn Linh Thạch kiếm được từ chiến thắng, kỳ ngộ, phân giải pháp khí và thả Linh Thú được ghi sổ chính xác, và có một cửa hàng bán Khế Ước Phù, Đan Dược và Độ Kiếp Phù với giá công khai, để tôi mua đúng thứ mình cần mà không bị tính trùng hay mất Linh Thạch khi tải lại trang hoặc khi vắng mặt.

#### Acceptance Criteria

1. FOR ALL Account, THE Economy_Service SHALL giữ Spirit_Stone hiện có (tiền tệ duy nhất của MVP, giả định A14) là một số nguyên trong khoảng từ 0 đến Spirit_Stone_Max và bằng số dư kiểm tra cộng tổng số tiền của mọi dòng ghi đang có trong Economy_Ledger, trong đó số dư kiểm tra bằng 0 cho đến lần gộp đầu tiên (tiêu chí 15) và dòng ghi đầu tiên của Economy_Ledger là dòng ghi `starting_grant` của tiêu chí 5 (tính bảo toàn).
2. WHEN một khoản thu khiến Spirit_Stone hiện có vượt Spirit_Stone_Max, THE Economy_Service SHALL chỉ cộng phần đủ để Spirit_Stone hiện có bằng Spirit_Stone_Max, bỏ phần còn lại của khoản thu và báo số Spirit_Stone bị bỏ trong phản hồi của yêu cầu đang xử lý hoặc, với Settlement ngoại tuyến, trong Offline_Report (tiêu chí 14).
3. WHEN một Settlement hoặc một yêu cầu làm thay đổi Spirit_Stone hiện có, THE Economy_Service SHALL ghi vào Economy_Ledger, trong cùng thao tác ghi nguyên tử với Game_State (Requirement 2 tiêu chí 5 và 6), đúng một dòng ghi cho mỗi mã lý do có thay đổi, gồm số tiền bằng tổng các thay đổi đã áp dụng của mã lý do đó (số nguyên khác 0), mã lý do, mã nguồn (mã định danh của Settlement hoặc Request_Id của yêu cầu) và thời điểm ghi theo đồng hồ của Game_Server (Requirement 2 tiêu chí 10); mã lý do là một trong chín giá trị `starting_grant`, `victory`, `drop` (Spirit_Stone thưởng thêm của Drop_Table, Requirement 20 tiêu chí 3), `event`, `dissolve`, `release`, `sell_material`, `sell_back` và `purchase`, và số tiền chỉ âm khi mã lý do là `purchase`, nên Settlement không làm giảm Spirit_Stone hiện có (MVP không có tự động mua).
4. FOR ALL Settlement chạy lại sau lỗi (Requirement 5 tiêu chí 8) và mọi Request_Id gửi lại trong Request_Retention_Period (Requirement 2 tiêu chí 8), THE Economy_Service SHALL cho Economy_Ledger có tối đa một dòng ghi cho mỗi cặp (mã nguồn, mã lý do), và cho Economy_Ledger cùng Spirit_Stone hiện có bằng kết quả của đúng một lần xử lý (tính lũy đẳng).
5. WHEN một Game_State mới được tạo (Requirement 1 tiêu chí 9), THE Economy_Service SHALL cấp cho Account: Spirit_Stone với số lượng Starting_Spirit_Stone, ghi bằng dòng ghi `starting_grant` có mã nguồn là Request_Id của yêu cầu đăng ký; hai Item_Instance Level 1 có Rarity_Tier cố định là Phàm (không qua lần chọn Rarity_Tier của Requirement 20 tiêu chí 10), một thuộc Equipment_Slot Weapon và một thuộc Equipment_Slot Robe, do Item_Generator sinh theo Requirement 19 và do Inventory_Service xử lý theo Requirement 21 tiêu chí 2; Taming_Talisman hạng Hoàng với số lượng Starting_Taming_Talisman_Count; HP_Pill hạng 1 với số lượng Starting_HP_Pill_Count; và phần thưởng khởi đầu của Origin của Player_Character (Requirement 15 tiêu chí 10; phần Spirit_Stone của phần thưởng này, nếu có, gộp vào dòng ghi `starting_grant`), mà không làm đổi Mutation_Pity_Counter hay Item_Pity_Counter (Requirement 20 tiêu chí 11).
6. FOR ALL trận chiến của một Encounter, THE Economy_Service SHALL cấp Spirit_Stone với mã lý do `victory` bằng Victory_Reward_Per_Level nhân Level của kẻ địch khi Battle_Outcome là Victory (Requirement 7 tiêu chí 8), và cấp 0 Spirit_Stone khi Battle_Outcome là Defeat hoặc Draw (Requirement 8 tiêu chí 18 và 19); Tribulation_Wave không phải Encounter nên không cấp Spirit_Stone (Requirement 23 tiêu chí 6).
7. WHEN một Kỳ_Ngộ có kết quả mang khoảng Spirit_Stone (Requirement 7 tiêu chí 14), THE Economy_Service SHALL cấp một số nguyên chọn đều trong khoảng đó, tính cả hai cận, bằng giá trị lấy từ RNG_Stream `events` (Requirement 13 tiêu chí 1), với mã lý do `event`.
8. WHEN một Item_Instance bị phân giải, tự động (Requirement 21 tiêu chí 4 và 5) hoặc theo yêu cầu của người chơi (Requirement 21 tiêu chí 11), hoặc một Spirit_Beast bị thả (Requirement 9 tiêu chí 17), THE Economy_Service SHALL cấp Spirit_Stone bằng: với Item_Instance, Dissolve_Value_By_Tier của Rarity_Tier của Item_Instance nhân Level của Item_Instance (mã lý do `dissolve`); với Spirit_Beast, ⌊Release_Base × Level × Aptitude_Total × hệ số của Size_Class trong Release_Size_Class_Factors × hệ số Mutation⌋ (mã lý do `release`), trong đó Level và Aptitude_Total là của Spirit_Beast và hệ số Mutation bằng Release_Mutation_Factor khi Spirit_Beast có Mutation và bằng 1 khi không có, nên mỗi giá trị không giảm khi Rarity_Tier, Level, Aptitude_Total, Size_Class hoặc việc có Mutation tăng; việc thả không làm đổi Bestiary (Requirement 12 tiêu chí 14).
9. WHEN người chơi bán Material hoặc một mặt hàng của Phường_Thị bằng yêu cầu kèm Request_Id, loại vật phẩm và số lượng q thỏa 1 ≤ q ≤ số lượng đang có trong Storage_Bag, THE Economy_Service SHALL trừ q khỏi Storage_Bag và cấp Spirit_Stone bằng q nhân giá bán một đơn vị, trong đó giá bán một đơn vị của Material là giá bán ghi trong Content_Catalog (mã lý do `sell_material`) và giá bán một đơn vị của mặt hàng Phường_Thị là ⌊Sell_Back_Ratio × giá mua một đơn vị trong Shop_Prices⌋ (mã lý do `sell_back`), nên giá bán một đơn vị của mọi mặt hàng Phường_Thị nhỏ hơn giá mua một đơn vị.
10. THE Economy_Service SHALL bán qua Phường_Thị, không giới hạn tồn kho và theo giá trong Shop_Prices (bỏ qua mọi giá do Game_Client gửi, Requirement 2 tiêu chí 2), đúng mười hai mặt hàng: Taming_Talisman hạng Hoàng, Huyền, Địa và Thiên; HP_Pill hạng 1, 2 và 3 (hạng 1 là thấp nhất); Breakthrough_Pill cho Realm đích 2, 3, 4 và 5 (dùng cho Breakthrough_Attempt theo Requirement 23); và Tribulation_Talisman (chỉ bán ở đây vì Drop_Table không có loại phần thưởng này, Requirement 20 tiêu chí 3), với giá là số nguyên dương tăng ngặt theo hạng trong họ Taming_Talisman, trong họ HP_Pill và trong họ Breakthrough_Pill theo Realm đích, nên HP_Pill hạng thấp nhất rẻ nhất và Auto_Pill dùng HP_Pill rẻ nhất trước (Requirement 3 tiêu chí 10).
11. WHEN người chơi mua một mặt hàng của Phường_Thị bằng yêu cầu kèm Request_Id, mặt hàng và số lượng q là số nguyên thỏa 1 ≤ q ≤ Max_Purchase_Quantity, mà Spirit_Stone hiện có không nhỏ hơn q nhân giá của mặt hàng và số lượng hiện có của loại đó trong Storage_Bag cộng q không vượt Stack_Max, THE Economy_Service SHALL trừ đúng q nhân giá của mặt hàng khỏi Spirit_Stone hiện có (mã lý do `purchase`) và cộng q vào Storage_Bag, hoặc áp dụng cả hai thay đổi hoặc không áp dụng thay đổi nào, và chỉ một lần cho mỗi Request_Id (Requirement 2 tiêu chí 5, 7 và 8).
12. WHEN một HP_Pill hạng g được dùng, bằng yêu cầu của người chơi hoặc bởi Auto_Pill (Requirement 3 tiêu chí 10), THE Game_Server SHALL trừ đúng một HP_Pill hạng g khỏi Storage_Bag và đặt HP của Player_Character bằng giá trị nhỏ hơn trong hai giá trị Max_HP và HP hiện tại cộng ⌊Pill_HP_Restore_By_Grade của hạng g × Max_HP⌋.
13. IF một yêu cầu mua, bán hoặc dùng HP_Pill có mặt hàng hay loại vật phẩm nằm ngoài phạm vi của tiêu chí 9 và 10, có số lượng không phải số nguyên hoặc ngoài khoảng cho phép (từ 1 đến Max_Purchase_Quantity khi mua, từ 1 đến số lượng đang có khi bán), có tổng tiền mua lớn hơn Spirit_Stone hiện có, làm số lượng của loại đó trong Storage_Bag vượt Stack_Max sau khi mua, hoặc dùng HP_Pill khi HP bằng Max_HP hay khi số lượng HP_Pill hạng đó bằng 0, THEN THE Game_Server SHALL từ chối toàn bộ yêu cầu bằng một mã lỗi, không trừ Spirit_Stone, không đổi số lượng vật phẩm nào và không áp dụng thay đổi nào ngoài Settlement của khoảng thời gian đã trôi qua (Requirement 2 tiêu chí 4).
14. FOR ALL Settlement ngoại tuyến, THE Offline_Report SHALL ghi Spirit_Stone nhận được theo từng mã lý do `victory`, `drop`, `event` và `dissolve` cùng số Spirit_Stone bị bỏ theo tiêu chí 2, trong đó mỗi số nhận được chỉ tính phần đã cộng vào Spirit_Stone hiện có, nên tổng bốn số bằng Spirit_Stone nhận được của Requirement 4 tiêu chí 10 và Requirement 4 tiêu chí 13 vẫn đúng với Spirit_Stone.
15. WHEN một dòng ghi của Economy_Ledger cũ hơn Economy_Ledger_Retention ngày, THE Economy_Service SHALL cộng số tiền của dòng ghi đó vào số dư kiểm tra và vào dòng tổng hợp theo ngày của cặp (ngày, mã lý do), rồi xóa dòng ghi đó, nên tiêu chí 1 vẫn đúng sau khi gộp.
16. IF Balance_Config có Shop_Prices thiếu giá của một trong mười hai mặt hàng ở tiêu chí 10, hoặc có giá không phải số nguyên dương, hoặc có giá không tăng ngặt theo hạng trong họ Taming_Talisman, họ HP_Pill hay họ Breakthrough_Pill theo Realm đích, hoặc có Sell_Back_Ratio ngoài khoảng [0, 1), hoặc có Dissolve_Value_By_Tier không gồm 6 số nguyên dương không giảm khi Rarity_Tier tăng, hoặc có Victory_Reward_Per_Level không phải số nguyên lớn hơn hoặc bằng 1, hoặc có Pill_HP_Restore_By_Grade không gồm 3 giá trị tăng ngặt theo hạng và nằm trong khoảng (0, 1], hoặc có Release_Base không dương, hoặc có Release_Size_Class_Factors không gồm 5 giá trị dương không giảm khi Size_Class tăng, hoặc có Release_Mutation_Factor nhỏ hơn 1, hoặc có Spirit_Stone_Max, Stack_Max hay Max_Purchase_Quantity không phải số nguyên lớn hơn hoặc bằng 1, hoặc có Max_Purchase_Quantity lớn hơn Stack_Max, hoặc có Starting_Spirit_Stone không phải số nguyên từ 0 đến Spirit_Stone_Max, hoặc có Starting_Taming_Talisman_Count hay Starting_HP_Pill_Count không phải số nguyên từ 0 đến Stack_Max, hoặc có Economy_Ledger_Retention không phải số nguyên lớn hơn hoặc bằng 1 hay có 24 × Economy_Ledger_Retention nhỏ hơn Request_Retention_Period (tính bằng giờ), hoặc Content_Catalog có Material thiếu giá bán hay có giá bán không phải số nguyên dương, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 25: Đo được độ đa dạng

**User Story:** Là một người chơi, tôi muốn Yêu Thú, Tu Sĩ và pháp khí tôi gặp hầu như không có bản sao và mọi giá trị nội dung đều xuất hiện đúng tỉ lệ đã định, và muốn mức đa dạng đó được đo và kiểm tra tự động trên mỗi bản build, để việc treo máy luôn cho tôi điều mới lạ thay vì những bản lặp lại.

#### Acceptance Criteria

1. THE Diversity_Report SHALL tính Diversity_Fingerprint của Monster_Instance từ Monster_Species, Level, Personality, danh sách mã Skill sắp tăng dần, số thứ tự khoảng của Size_Scale (mỗi khoảng rộng Size_Bucket_Width), với mỗi Stat chính một số thứ tự khoảng của Aptitude (Aptitude_Bucket_Count khoảng bằng nhau trên [Aptitude_Min, Aptitude_Max]), palette_id của Appearance_Descriptor và cờ Mutation.
2. THE Diversity_Report SHALL tính Diversity_Fingerprint của Cultivator từ tập Element của Linh_Can (sắp theo thứ tự cố định), số thứ tự khoảng của độ thuần (Purity_Bucket_Count khoảng bằng nhau trên [0.5, 1.0]), Personality, Origin, Cultivation_Method, danh sách mã Skill khởi đầu sắp tăng dần và mã của từng thành phần Base_Appearance, trong đó tên của Cultivator không thuộc Diversity_Fingerprint mà được đo riêng ở tiêu chí 10.
3. THE Diversity_Report SHALL tính Diversity_Fingerprint của Item_Instance từ Fingerprint theo Requirement 19 tiêu chí 13, Level và, cho Implicit_Stat cùng từng Affix, số thứ tự khoảng của giá trị lăn (Roll_Bucket_Count khoảng bằng nhau trên khoảng lăn được của Implicit_Stat hoặc Affix đó tại Level và Rarity_Tier của Item_Instance, theo Requirement 19 tiêu chí 5 và 7).
4. THE Diversity_Report SHALL tính Duplicate_Rate của một mẫu gồm N thực thể bằng số thực thể có Diversity_Fingerprint bằng Diversity_Fingerprint của ít nhất một thực thể khác trong mẫu, chia cho N.
5. WHEN CI_Pipeline chạy Diversity_Report, THE Diversity_Report SHALL sinh, từ các Generation_Seed cố định đôi một khác nhau, một mẫu N = 10.000 thực thể cho mỗi loại đo (riêng Monster_Instance: mỗi Zone một mẫu) và N = 100.000 lần sinh liên tiếp cho mỗi chiều phân bố (riêng Monster_Species: cho từng Zone), trong đó mẫu Item_Instance của hạng R được sinh với Rarity_Tier R bắt buộc ở một Level nguồn mà khoảng Level của Item_Instance có đủ 2 × Item_Level_Spread + 1 giá trị (Requirement 20 tiêu chí 7), còn độ đa dạng của Kỳ_Ngộ không thuộc Diversity_Report vì đã do Event_Distinct_Window bảo đảm (Requirement 7 tiêu chí 11 đến 13).
6. FOR ALL hai lần chạy Diversity_Report trên cùng Content_Catalog, Balance_Config và Generator_Version, THE Diversity_Report SHALL cho hai báo cáo giống hệt nhau ở mọi giá trị.
7. FOR ALL mẫu theo tiêu chí 5 của loại đo K khác Item_Instance hạng Phàm, THE Game_Server SHALL cho Duplicate_Rate của mẫu nhỏ hơn hoặc bằng giá trị của Max_Duplicate_Rate_By_Kind cho K.
8. THE Diversity_Report SHALL chỉ báo cáo Duplicate_Rate của loại đo Item_Instance hạng Phàm làm số liệu tham khảo, vì Affix_Count_By_Tier của hạng Phàm không cho Affix nào nên nhiều Item_Instance hạng Phàm có chung Diversity_Fingerprint theo cấu tạo.
9. THE Cultivator_Generator SHALL tạo tên của Cultivator, không kể Đạo_Hiệu, từ một họ Hán-Việt chọn đều trong bảng họ và một tên gọi gồm hai âm tiết, trong đó âm tiết đầu chọn đều trong bảng âm tiết thứ nhất và âm tiết sau chọn đều trong bảng âm tiết thứ hai của Content_Catalog (Requirement 15 tiêu chí 14).
10. FOR ALL mẫu theo tiêu chí 5 của loại đo Cultivator, Item_Instance hạng Thiên và Item_Instance hạng Tiên, THE Game_Server SHALL cho Distinct_Name_Ratio của mẫu lớn hơn hoặc bằng giá trị của Min_Distinct_Name_Ratio cho loại đo đó, trong đó Distinct_Name_Ratio là số tên khác nhau trong mẫu chia cho N, tên của Cultivator gồm họ và tên gọi (không kể Đạo_Hiệu) và tên của Item_Instance là tên đầy đủ theo Requirement 19 tiêu chí 11.
11. FOR ALL chiều phân bố và N = 100.000 lần sinh liên tiếp theo tiêu chí 5, THE Game_Server SHALL sinh mỗi giá trị có xác suất cấu hình lớn hơn 0 của chiều đó ít nhất một lần.
12. FOR ALL chiều phân bố, giá trị v của chiều đó có xác suất cấu hình p lớn hơn 0, và N = 100.000 lần sinh liên tiếp theo tiêu chí 5, THE Game_Server SHALL cho số lần v xuất hiện nằm trong khoảng ±4 độ lệch chuẩn quanh N × p, với độ lệch chuẩn bằng căn bậc hai của N × p × (1 − p), và không vượt quá Max_Share_Factor × N × p.
13. IF Diversity_Report có một kết quả không thỏa tiêu chí 7, 10, 11 hoặc 12, THEN THE CI_Pipeline SHALL báo lỗi bản build kèm loại đo hoặc chiều phân bố vi phạm, giá trị đo được và ngưỡng.
14. IF Content_Catalog có số mục của một loại nội dung nhỏ hơn giá trị tương ứng trong Launch_Content_Minimums, hoặc không thỏa một điều kiện đi kèm của giá trị đó (Phụ lục B.4), THEN THE CI_Pipeline SHALL báo lỗi bản build kèm loại nội dung, số mục hiện có và số mục tối thiểu.
15. IF danh sách thành phần của Diversity_Fingerprint của một loại thực thể (tiêu chí 1 đến 3) khác với danh sách đã ghi trong kho mã nguồn cho cùng Generator_Version, THEN THE CI_Pipeline SHALL báo lỗi bản build.
16. IF Balance_Config có Size_Bucket_Width không dương; hoặc có Aptitude_Bucket_Count, Purity_Bucket_Count hay Roll_Bucket_Count không phải số nguyên lớn hơn hoặc bằng 1; hoặc có Max_Duplicate_Rate_By_Kind thiếu giá trị ở một loại đo khác Item_Instance hạng Phàm, có giá trị ngoài khoảng [0, 1] hay có ngưỡng của một Rarity_Tier từ Huyền đến Tiên lớn hơn ngưỡng của Rarity_Tier liền trước; hoặc có Min_Distinct_Name_Ratio thiếu giá trị ở một trong ba loại đo hay có giá trị ngoài khoảng (0, 1]; hoặc có Max_Share_Factor nhỏ hơn hoặc bằng 1, THEN THE CI_Pipeline SHALL báo lỗi bản build.

### Requirement 26: Hiển thị nhân vật theo lớp và trang bị

**User Story:** Là một người chơi, tôi muốn hình ảnh nhân vật của mình hiện ra đúng với những món trang bị tôi đã nhặt và đang mặc, để mỗi món đồ nhận được đều nhìn thấy được trên nhân vật tiên hiệp của mình.

#### Acceptance Criteria

1. FOR ALL tổ hợp đầu vào gồm Body_Template, các id của Base_Appearance và Appearance_Descriptor của từng vật phẩm đang trang bị ở Equipment_Slot hiển thị (dữ liệu do Game_State cung cấp theo Requirement 21 criterion 17), THE Character_Renderer SHALL tạo ra ảnh ghép và Composite_Hash chỉ phụ thuộc vào tổ hợp đó, bất kể thứ tự hoàn tất tải của các Art_Layer; do đó vật phẩm ở Equipment_Slot Ring và Talisman không làm thay đổi Composite_Hash.
2. THE Layer_Manifest SHALL khai báo cho mỗi Art_Layer: nguồn của lớp (Equipment_Slot hoặc Base_Appearance), Layer_Kind (một trong body, face, hair_back, hair_front, outfit_base, robe_back, robe_front, sleeves, footwear, back, weapon, headwear, accessory, effect_back, effect_front), giá trị z nhất quán với Z_Order_Table, Anchor_Point, id của Palette_Set, Hide_Rule, cờ bắt buộc và Body_Template mà Art_Layer phù hợp; mọi Art_Layer của cùng một nhân vật SHALL dùng chung Reference_Canvas.
3. THE Character_Renderer SHALL loại khỏi ảnh ghép mọi Art_Layer có Layer_Kind nằm trong Hide_Rule của một Art_Layer khác thuộc tổ hợp đầu vào; WHILE một Equipment_Slot hiển thị còn trống, THE Character_Renderer SHALL vẽ Art_Layer của Default_Outfit ("Phàm y" khiêm tốn) cho Equipment_Slot đó.
4. FOR ALL cặp Art_Layer trong cùng một ảnh ghép, THE Character_Renderer SHALL vẽ Art_Layer có giá trị z nhỏ hơn ở phía sau Art_Layer có giá trị z lớn hơn theo Z_Order_Table, và SHALL phân định hai Art_Layer có cùng giá trị z theo thứ tự cố định của Equipment_Slot do Z_Order_Table quy định.
5. FOR ALL Art_Layer, THE Character_Renderer SHALL đổi màu Art_Layer theo palette_id và giữ nguyên kênh alpha, tức là alpha của từng điểm ảnh sau khi đổi màu bằng alpha của điểm ảnh đó trước khi đổi màu; màu tóc, màu mắt và màu da của Base_Appearance SHALL dùng cùng cơ chế đổi màu này.
6. WHILE effect_id của một vật phẩm đang trang bị ở Equipment_Slot hiển thị không rỗng (Requirement 19 criterion 12), THE Character_Renderer SHALL vẽ Effect_Overlay của vật phẩm đó phía sau nhân vật nếu Layer_Kind là effect_back và phía trước nhân vật nếu Layer_Kind là effect_front; WHILE effect_id rỗng, THE Character_Renderer SHALL ghép vật phẩm đó mà không kèm Effect_Overlay.
7. WHEN Game_Client nhận Game_State mới có Appearance_Descriptor của ít nhất một Equipment_Slot hiển thị khác với Game_State trước đó (do trang bị thủ công, tháo trang bị hoặc Auto_Equip), THE Game_Client SHALL vẽ lại nhân vật, gồm cả cross-fade từ ảnh ghép cũ sang ảnh ghép mới, trong vòng Equip_Redraw_Budget mili-giây kể từ lúc nhận Game_State và không tải lại trang.
8. WHEN người chơi xem thử một Item_Instance chưa trang bị, THE Game_Client SHALL hiển thị Try_On_Preview của nhân vật mặc Item_Instance đó mà không thay đổi Game_State; FOR ALL Item_Instance i, Composite_Hash của Try_On_Preview của i SHALL bằng Composite_Hash của ảnh ghép sau khi trang bị i.
9. FOR ALL Item_Instance i mà Equipment_Slot của i đang trống, THE Character_Renderer SHALL tạo ảnh ghép có Composite_Hash bằng Composite_Hash ban đầu sau khi i được trang bị rồi tháo ra (round-trip).
10. IF một Art_Layer thiếu hoặc tải thất bại, THEN THE Character_Renderer SHALL thay Art_Layer đó bằng Placeholder_Asset của cùng Layer_Kind (hình bóng vector, không phải pixel art), báo cáo sự cố vào telemetry (Requirement 35) và tiếp tục hiển thị phần còn lại của trang; bản dựng phát hành không chứa Placeholder_Asset (Requirement 28).
11. FOR ALL Art_Layer được vẽ, THE Character_Renderer SHALL dùng nội suy mượt (không dùng nearest-neighbor), vẽ theo device pixel ratio của màn hình và giữ hệ số phóng đại so với kích thước gốc không vượt quá Max_Upscale_Factor.
12. WHERE hoạt ảnh nền (ambient animation) của nhân vật được cung cấp, THE Character_Renderer SHALL chỉ dùng hiệu ứng transform và opacity, đạt tốc độ tối thiểu Ambient_Animation_Min_FPS khung hình mỗi giây trên thiết bị tham chiếu tầm trung (Requirement 32) và giữ nguyên bố cục trang; WHILE cài đặt "prefers-reduced-motion" của hệ điều hành hoặc trình duyệt đang bật hoặc tab đang ẩn, THE Character_Renderer SHALL tắt hoạt ảnh nền.
13. THE Character_Renderer SHALL ghép tối đa Max_Layers_Per_Character Art_Layer cho mỗi nhân vật, dùng cùng một bộ kết xuất cho nhân vật của người chơi và NPC_Cultivator, và lưu ảnh ghép trong bộ nhớ đệm theo Composite_Key với tối đa Composite_Cache_Size mục.
14. FOR ALL ảnh nhân vật, THE Character_Renderer SHALL cung cấp văn bản thay thế (alt text) bằng tiếng Việt liệt kê tên của mọi vật phẩm đang trang bị ở Equipment_Slot hiển thị, và WHEN trang bị hiển thị thay đổi, THE Game_Client SHALL cập nhật văn bản thay thế cùng lúc với lần vẽ lại.
15. WHEN Auto_Equip làm thay đổi trang bị hiển thị trong một Settlement, THE Game_Client SHALL hiển thị trong Offline_Report ảnh nhân vật trước và sau Settlement (nội dung còn lại của Offline_Report theo Requirement 4).
16. IF một trong các điều kiện sau xảy ra, THEN THE CI_Pipeline SHALL làm bản dựng thất bại: (a) với một art_base_id và một Layer_Kind mà art_base_id đó khai báo, Layer_Manifest thiếu Art_Layer cho một Body_Template nào đó trong mọi Body_Template hiện có (người chơi được chọn bất kỳ Body_Template nào, Requirement 15 criterion 12); (b) Anchor_Point nằm ngoài Reference_Canvas; (c) giá trị z không nhất quán với Z_Order_Table; (d) id Palette_Set không phân giải được; (e) Hide_Rule nêu một Layer_Kind không hợp lệ; (f) một Art_Layer vừa được đánh dấu bắt buộc vừa bị ẩn bởi Hide_Rule của Art_Layer khác; (g) kích thước của Art_Layer khác Reference_Canvas; (h) một trong các tham số Balance_Config Equip_Redraw_Budget, Max_Upscale_Factor, Ambient_Animation_Min_FPS, Max_Layers_Per_Character, Composite_Cache_Size không dương.

### Requirement 27: Hiển thị Yêu Thú và kích thước

**User Story:** Là một người chơi, tôi muốn Yêu Thú, kể cả Yêu Thú Dị Biến, được vẽ đẹp mắt với kích thước hiển thị phản ánh đúng độ lớn, để nhận ra loài, độ lớn và độ hiếm của từng con ngay khi nhìn.

#### Acceptance Criteria

1. THE Game_Client SHALL vẽ mỗi Monster_Instance và mỗi Spirit_Beast từ ảnh của Monster_Species tương ứng (art_base_id), đổi màu theo palette_id và thêm Effect_Overlay theo effect_id (aura của Mutation) trong Appearance_Descriptor; ảnh Yêu Thú SHALL dùng Monster_Reference_Canvas với Anchor_Point đặt tại mặt đất.
2. FOR ALL Size_Scale trong [Size_Min, Size_Max], THE Game_Client SHALL đặt chiều cao hiển thị của Yêu Thú bằng Display_Size_Fraction(Size_Scale) nhân chiều cao khung hiển thị, và Display_Size_Fraction(Size_Scale) SHALL nằm trong [Display_Min_Fraction, Display_Max_Fraction], để Yêu Thú Khổng Lồ không tràn khỏi vùng chứa và Yêu Thú Tí Hon vẫn nhìn thấy được (giới hạn kích thước trên màn hình mà Requirement 17 criterion 12 giao cho Requirement này).
3. FOR ALL a và b trong [Size_Min, Size_Max] mà a < b, Display_Size_Fraction(a) SHALL nhỏ hơn Display_Size_Fraction(b) (tăng ngặt, do đó không giảm), để hai Size_Scale khác nhau luôn cho hai chiều cao hiển thị khác nhau.
4. WHEN người chơi mở màn hình chi tiết của một Monster_Instance hoặc Spirit_Beast, THE Game_Client SHALL vẽ cạnh Yêu Thú một hình bóng người có chiều cao Human_Reference_Height_Cm, quy đổi sang tỷ lệ hiển thị bằng cùng quy tắc Display_Size_Fraction.
5. THE Game_Client SHALL luôn thể hiện Size_Cm và Size_Class của Yêu Thú bằng văn bản, với màu sắc chỉ đóng vai trò bổ trợ.
6. WHILE một Monster_Species chưa được người chơi gặp theo Bestiary (Requirement 12), THE Game_Client SHALL vẽ Monster_Species đó dưới dạng hình bóng tối và ẩn tên loài.
7. WHILE một Monster_Species đã được người chơi gặp theo Bestiary (Requirement 12), THE Game_Client SHALL vẽ ảnh đầy đủ của Monster_Species đó, và thêm huy hiệu (badge) khi Monster_Species đã được thuần hóa.
8. WHEN Bestiary hiển thị bản ghi Mutation của một Monster_Species (Requirement 12), THE Game_Client SHALL vẽ bản ghi đó bằng Palette_Set của Mutation.
9. WHEN Game_Client vẽ một Monster_Instance hoặc Spirit_Beast có Mutation, THE Game_Client SHALL vẽ aura bằng Effect_Overlay có hiệu ứng lấp lánh (shimmer) nhẹ, kèm nhãn "Dị Biến" theo Requirement 11 criterion 10; WHILE cài đặt "prefers-reduced-motion" của hệ điều hành hoặc trình duyệt đang bật, THE Game_Client SHALL hiển thị aura tĩnh, không lấp lánh.
10. THE Game_Client SHALL áp dụng cho ảnh Yêu Thú các quy tắc của Requirement 26 về nội suy mượt, không vỡ hạt và giới hạn phóng đại (Requirement 26 criterion 11), thay thế bằng Placeholder_Asset khi ảnh thiếu hoặc tải thất bại (Requirement 26 criterion 10), bộ nhớ đệm theo Composite_Key (Requirement 26 criterion 13) và giới hạn hoạt ảnh nền (Requirement 26 criterion 12).
11. THE Game_Client SHALL cung cấp văn bản thay thế (alt text) bằng tiếng Việt cho ảnh Yêu Thú theo Requirement 26 criterion 14, trong đó nêu tên Monster_Species và Size_Class, và nêu Mutation khi Yêu Thú có Mutation.
12. WHEN Game_Client khởi động hoặc Zone hiện tại của nhân vật thay đổi, THE Game_Client SHALL tải trước ảnh của các Monster_Species thuộc Zone hiện tại.
13. THE Game_Client SHALL hoãn việc tải ảnh Yêu Thú nằm ngoài vùng nhìn thấy cho đến khi ảnh đó cần hiển thị (lazy loading).
14. THE Game_Client SHALL ảo hóa (virtualize) lưới Spirit_Beast_Pen để số phần tử hiển thị được tạo chỉ phụ thuộc vào kích thước vùng nhìn thấy, không phụ thuộc vào số mục trong Spirit_Beast_Pen, và để việc hiển thị Pen_Capacity mục nằm trong ngân sách hiệu năng của Requirement 32.
15. FOR ALL Appearance_Descriptor d và Size_Scale s, THE Game_Client SHALL vẽ cùng một ảnh, tức cùng Composite_Hash, mỗi lần vẽ cặp (d, s).
16. THE CI_Pipeline SHALL kiểm tra ảnh loài, Palette_Set và Effect_Overlay Dị Biến của Monster_Species theo Requirement 16 criterion 15 và Requirement 11 criterion 9; IF điều kiện 0 < Display_Min_Fraction < Display_Max_Fraction ≤ 1 bị vi phạm hoặc Human_Reference_Height_Cm không dương, THEN THE CI_Pipeline SHALL làm bản dựng thất bại.

### Requirement 28: Phong cách nghệ thuật và bộ asset ra mắt

**User Story:** Là một chủ dự án, tôi muốn có một phong cách nghệ thuật tiên hiệp mộng ảo nhất quán, không dùng pixel art, cùng một bộ asset ra mắt đã được duyệt, để hình ảnh nhân vật, quái và Zone đẹp, đồng đều và khớp với những vật phẩm người chơi đã nhặt và mặc.

#### Acceptance Criteria

1. IF Art_Style_Guide chưa nằm trong kho mã nguồn hoặc Asset_Registry chưa có bản ghi duyệt Art_Style_Guide của chủ dự án, THEN THE Art_Pipeline SHALL từ chối chạy mọi lần Bulk_Generation và nêu điều kiện còn thiếu.
2. THE Art_Style_Guide SHALL nêu: (a) phong cách minh họa tiên hiệp mộng ảo (nét vẽ tay kiểu painterly, anime bán thực, ánh sáng mềm, vải bay, sương và ánh sáng lấp lánh làm điểm nhấn); (b) dải bảng màu; (c) một góc máy chuẩn và một tư thế đứng trung tính dùng chung cho mọi nhân vật trên Reference_Canvas; (d) chuẩn về khuôn mặt, bàn tay và chất lượng nét; (e) quy tắc trang phục kiểu hán phục phù hợp với loại vật phẩm; (f) ngôn ngữ hình ảnh của giao diện: khung, nút và ảnh nền Zone theo họa tiết mực, giấy da và ngọc bích, không dùng phông chữ pixel; (g) nội dung bị cấm: pixel art, ảnh độ phân giải thấp hoặc ảnh phóng to bằng nearest-neighbor, trộn nhiều phong cách, nhân vật có bản quyền, chân dung người thật, watermark, chữ ký và chữ trong ảnh.
3. THE Art_Style_Guide SHALL chứa danh sách kiểm duyệt cho Human_Review gồm các mục: tỉ lệ và độ cân đối của khuôn mặt; không thừa hoặc thiếu ngón tay; không có phần quần áo bị chảy hoặc vỡ hình; một hướng sáng thống nhất; màu hài hòa với bộ Style_Anchor; khớp với các Anchor_Point của Body_Template; hình bóng đọc được ở chiều cao 256 px; dấu hiệu Rarity_Tier nhìn thấy được ở chiều cao 256 px; trang phục phù hợp với loại vật phẩm; độ dày nét thống nhất; không phải pixel art.
4. WHEN Human_Review ghi kết quả duyệt cho một asset, THE Asset_Registry SHALL lưu kết quả đạt hoặc không đạt của từng mục trong danh sách kiểm duyệt (kể cả mục không phải pixel art), người duyệt và ngày duyệt, rồi đặt Review_Status thành approved khi mọi mục đều đạt, hoặc thành rejected kèm lý do khi có ít nhất một mục không đạt.
5. THE Asset_Validator SHALL từ chối: (a) mọi Art_Layer nhân vật có kích thước điểm ảnh khác Reference_Canvas, kể cả nhỏ hơn (ảnh nhỏ hơn buộc phải phóng to; xem Requirement 26 criterion 11), không có kênh alpha, không ở không gian màu sRGB hoặc không ở định dạng WebP hoặc AVIF; (b) mọi Art_Layer nhân vật có hàng và cột điểm ảnh ngoài cùng chưa trong suốt hoàn toàn; (c) mọi ảnh quái có kích thước điểm ảnh khác Monster_Reference_Canvas; (d) mọi tệp có dung lượng lớn hơn mức tối đa của loại tệp đó: Max_Layer_File_KB cho Art_Layer nhân vật, Max_Monster_File_KB cho ảnh quái, Max_Background_File_KB cho ảnh nền Zone.
6. WHEN Asset_Validator phát hiện trong một asset mẫu khối màu phẳng căn theo lưới đáng ngờ là pixel art, THE Asset_Validator SHALL chỉ gắn cờ cảnh báo kèm vị trí vùng nghi vấn để Human_Review xem xét, và không tự từ chối asset đó.
7. THE Launch_Asset_Set SHALL gồm, cho mỗi Asset_Class, số asset không thấp hơn mức tối thiểu trong Launch_Asset_Minimums (Appendix B mục B.6), với các Asset_Class: Body_Template; khuôn mặt; kiểu tóc (hair_back và hair_front); Default_Outfit; art base cho từng slot hiển thị (mỗi Item_Template hiển thị có một art_base_id riêng); Effect_Overlay (aura Element và aura trung tính ở hai biến thể front và back, overlay Tiên_Văn, aura Dị Biến dùng chung); ảnh quái cho mọi Monster_Species; một ảnh nền cho mỗi Zone; icon cho slot không hiển thị (Ring và Talisman) và cho vật phẩm xếp chồng; các asset dùng chung (Element emblem, category glyph, Rarity frame, Size_Class badge).
8. THE Art_Pipeline SHALL tạo icon Skill bằng cách ghép Element emblem và category glyph dùng chung, và tạo icon của Item_Template hiển thị bằng cách dựng từ chính Art_Layer của vật phẩm đó, để không phải vẽ riêng icon cho từng Skill hoặc từng Item_Template hiển thị.
9. THE Launch_Asset_Set SHALL chứa palette cho mọi cặp (Rarity_Tier, Element chủ đạo hoặc trung tính) mà Requirement 19 criterion 12 dùng, palette màu tóc, màu mắt và tông da, palette thường và palette Dị Biến của ảnh quái với số lượng không thấp hơn Launch_Asset_Minimums, và một Palette_Mask cho mỗi Art_Layer có thể đổi màu.
10. IF bản dựng phát hành chứa một asset có Review_Status khác approved hoặc không có License_Record, hoặc thiếu một mục của Launch_Asset_Set trong Asset_Registry, hoặc dùng Placeholder_Asset thay cho một mục của Launch_Asset_Set, THEN THE Asset_Validator SHALL từ chối bản dựng phát hành và liệt kê từng vi phạm.
11. THE Art_Pipeline SHALL tạo mọi Candidate_Asset của một đợt từ cùng một bộ Style_Anchor đã duyệt và lập một lưới so sánh giữa các Candidate_Asset của đợt đó với bộ Style_Anchor, để chủ dự án kiểm tra sự lệch phong cách trước khi duyệt.
12. THE danh sách kiểm duyệt trong Art_Style_Guide SHALL gồm thêm ba mục an toàn nội dung cho mọi asset nhân vật: Default_Outfit che phủ ngực, bụng, lưng và đùi; không mô tả tình dục hóa người chưa thành niên hay nhân vật trông như người chưa thành niên; không giống chân dung người thật (kết quả của ba mục này được ghi theo criterion 4).
13. IF một phông chữ giao diện (Requirement 31) do Art_Style_Guide chỉ định thiếu glyph của một chữ cái tiếng Việt có dấu, hoa hoặc thường, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu phông chữ cùng ký tự bị thiếu.
14. IF một art_base_id, palette_id hoặc effect_id dùng trong Content_Catalog không tồn tại trong Asset_Registry, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và liệt kê từng định danh không tìm thấy (các mục Layer_Manifest trỏ tới tệp tồn tại được kiểm tra theo Requirement 26 criterion 16).
15. WHEN một bản dựng được tạo, THE CI_Pipeline SHALL lập Asset_Coverage_Report đếm số asset approved theo từng Asset_Class so với Launch_Asset_Minimums, làm bản dựng phát hành thất bại khi có Asset_Class thiếu, và chỉ ghi cảnh báo khi đó là bản dựng phát triển.
16. IF Max_Layer_File_KB, Max_Monster_File_KB hoặc Max_Background_File_KB không phải số nguyên dương, hoặc một giá trị trong Launch_Asset_Minimums không phải số nguyên không âm, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu tham số vi phạm.

### Requirement 29: Quy trình tạo ảnh (Art_Pipeline)

**User Story:** Là một Operator, tôi muốn có một quy trình tạo ảnh lặp lại được, kiểm soát được chi phí và truy vết được nguồn gốc từng ảnh, để biến phong cách đã duyệt thành bộ asset đầy đủ mà không phải vẽ tay từng ảnh.

#### Acceptance Criteria

1. WHILE Pilot_Approval trong Asset_Registry chưa là approved, THE Art_Pipeline SHALL chỉ tạo các asset của Pilot_Asset_Set theo Pilot_Asset_Minimums (Appendix B mục B.6) để chủ dự án ghi approved hoặc rejected, và từ chối mọi lần Bulk_Generation.
2. IF một Asset_Class chưa có Route_Decision_Record đầy đủ (tuyến đã chọn, ngày kiểm tra giấy phép, kết quả kiểm tra, và xác nhận giấy phép cho phép dùng thương mại trong game trực tuyến theo Requirement 30), THEN THE Art_Pipeline SHALL từ chối tạo hoặc nhập asset của Asset_Class đó.
3. IF số Style_Anchor đã được chủ dự án duyệt thấp hơn Style_Anchor_Min_Count, THEN THE Art_Pipeline SHALL từ chối chạy đợt tạo ảnh đầu tiên và nêu số Style_Anchor còn thiếu.
4. THE Art_Pipeline SHALL tạo Art_Layer nhân vật có điều kiện theo Body_Template (ảnh tham chiếu, tư thế hoặc depth guide) và từ chối mọi Candidate_Asset có độ lệch so với hình bóng Body_Template lớn hơn Max_Alignment_Error_Px, đo trên Reference_Canvas bằng kiểm tra căn chỉnh tự động.
5. WHEN Art_Pipeline tạo một Candidate_Asset, THE Art_Pipeline SHALL đặt Review_Status của asset đó thành pending và ghi vào Asset_Registry một Generation_Job_Record gồm công cụ, mô hình và phiên bản, prompt, negative prompt, seed khi có, mã các ảnh tham chiếu (gồm Style_Anchor đã dùng), tham số, thời điểm, Operator và chi phí, làm phần xuất xứ của AI_Generated_Asset (các trường của License_Record nêu ở Requirement 30).
6. THE Art_Pipeline SHALL lấy Art_Layer trong suốt bằng cách tạo trực tiếp với nền trong suốt hoặc bằng segmentation và matting, chạy Asset_Validator trên mỗi Art_Layer, và chỉ chuyển Art_Layer đạt Asset_Validator sang Human_Review, nơi chủ dự án xem ở độ phóng 100% để kiểm tra viền halo.
7. THE Art_Pipeline SHALL tạo mọi biến thể palette từ Art_Layer đã duyệt bằng công cụ đổi màu xác định qua Palette_Mask và Palette_Set (cùng ảnh đầu vào, cùng Palette_Mask và Palette_Set cho ra tệp giống nhau từng byte), không tạo lại bằng mô hình sinh ảnh.
8. WHEN một người chỉnh sửa tay một Candidate_Asset (bàn tay, viền hoặc lỗi nhỏ) trước khi duyệt, THE Asset_Registry SHALL ghi human_edited cùng tên người chỉnh sửa và thời điểm chỉnh sửa cho asset đó, làm căn cứ cho giả định A12.
9. WHEN Human_Review đặt một Candidate_Asset thành approved, THE Art_Pipeline SHALL xuất asset sang định dạng và kích thước yêu cầu, tạo hoặc cập nhật mục Layer_Manifest tương ứng và chạy Asset_Validator trên tệp đã xuất.
10. IF thông tin xác thực mà một bước ngoài cần (tài khoản, khóa API hoặc GPU của chủ dự án hoặc Operator, đọc từ biến môi trường theo Requirement 33) không có, THEN THE Art_Pipeline SHALL chạy bước đó ở chế độ dry-run và tạo Placeholder_Asset thay cho ảnh thật để việc phát triển tiếp tục.
11. WHEN một đợt đạt Max_Generations_Per_Batch hoặc mức trần chi phí do Operator đặt, THE Art_Pipeline SHALL dừng đợt đó, lưu tiến độ và cho phép chạy tiếp mà không tạo lại asset đã approved.
12. THE Art_Pipeline SHALL chạy Bulk_Generation theo từng đợt Batch_Size Candidate_Asset, chờ Human_Review hoàn tất đợt hiện tại rồi mới bắt đầu đợt kế tiếp, ghi tỉ lệ từ chối cùng lý do từ chối của mỗi đợt, và tạm dừng cho tới khi prompt hoặc Style_Anchor được sửa khi tỉ lệ từ chối vượt Rejection_Pause_Threshold.
13. WHEN Operator yêu cầu chạy lại một job từ Generation_Job_Record, THE Art_Pipeline SHALL chạy lại job với đúng công cụ, mô hình, phiên bản, prompt, seed và tham số đã ghi, và ghi rõ dịch vụ có cho kết quả tái lập từng bit hay không.
14. THE Art_Pipeline SHALL chỉ nhập Third_Party_Asset có License_Record ghi giấy phép gốc cho phép dùng thương mại trong game trực tuyến (đã đọc tại thời điểm thu nhận, kèm theo dõi ghi công theo Requirement 30), và chỉ nhận gói tĩnh mua hoặc miễn phí cho ảnh NPC, bestiary, thẻ và nền, vì Appendix A mục A.6 không tìm thấy bộ trang bị phân lớp sẵn có nên Art_Layer trang bị phân lớp đến từ tuyến AI hoặc họa sĩ thuê.
15. THE Art_Pipeline SHALL lưu tệp nhị phân của asset theo phiên bản mã băm nội dung ở kho ngoài cây mã nguồn (object storage hoặc Git LFS) và giữ Layer_Manifest cùng Asset_Registry trong kho mã nguồn.
16. IF Style_Anchor_Min_Count, Max_Generations_Per_Batch hoặc Batch_Size không phải số nguyên dương, Max_Alignment_Error_Px không dương, Batch_Size lớn hơn Max_Generations_Per_Batch, điều kiện 0 < Rejection_Pause_Threshold ≤ 1 bị vi phạm, hoặc một giá trị trong Pilot_Asset_Minimums không phải số nguyên không âm, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu tham số vi phạm.

### Requirement 30: Nguồn gốc và giấy phép của asset

**User Story:** Là chủ dự án, tôi muốn nguồn gốc và giấy phép của mọi ảnh được ghi lại và kiểm tra tự động, để game không bao giờ phát hành ảnh mà tôi không được phép dùng thương mại.

#### Acceptance Criteria

1. THE Asset_Registry SHALL lưu đúng một License_Record cho mỗi tệp asset được đóng gói trong bản dựng hoặc được Layer_Manifest hay Content_Catalog tham chiếu, trừ Placeholder_Asset (vector gốc của dự án, được miễn License_Record vì không bao giờ được phát hành trong Launch_Asset_Set theo Requirement 28 criterion 10), và mỗi License_Record SHALL gồm các trường: (a) mã asset; (b) loại nguồn, một trong AI_Generated_Asset, Third_Party_Asset, commissioned (thuê vẽ) hoặc original (dự án tự tạo); (c) URL nguồn hoặc tên dịch vụ; (d) tên license và URL license; (e) License_Snapshot; (f) commercial_use_allowed (giấy phép cho phép dùng thương mại trong game trực tuyến); (g) attribution_required và attribution text; (h) modification_allowed; (i) các hạn chế phân phối lại; (j) với AI_Generated_Asset: dịch vụ, model và phiên bản, tham chiếu tới Generation_Job_Record và Route_Decision_Record (Requirement 29), cờ human_edited và người chỉnh sửa; (k) ngày thu nhận; (l) ngày kiểm tra license; (m) cờ xác minh của chủ dự án và người xác minh.
2. WHEN một License_Record được thay đổi, THE Asset_Registry SHALL thêm một phiên bản mới kèm thời điểm và người thay đổi, và giữ nguyên mọi phiên bản trước đó.
3. IF một asset thuộc phạm vi criterion 1 không có License_Record, hoặc License_Record của asset thiếu một trường bắt buộc áp dụng cho loại nguồn của asset, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu mã asset cùng tên trường thiếu.
4. IF một License_Record có commercial_use_allowed là false hoặc chưa xác định, hoặc có tên license khớp một mẫu trong Denied_License_Patterns, hoặc có license không thuộc Allowed_Licenses mà không kèm bằng chứng mua license hay giấy phép bằng văn bản, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu mã asset cùng điều kiện vi phạm.
5. WHEN một Third_Party_Asset pack có nhiều license khác nhau được đăng ký (ví dụ một bộ sưu tập itch.io có kèm gói CC BY-NC-SA, Appendix A mục A.6), THE Asset_Registry SHALL yêu cầu một License_Record riêng cho từng tệp trong pack, trừ khi License_Record cấp pack ghi rõ rằng nó bao phủ mọi tệp.
6. THE CI_Pipeline SHALL tạo Credits_Page từ Asset_Registry, liệt kê mọi asset có attribution_required là true kèm attribution text, và làm bản dựng thất bại nếu một asset như vậy vắng mặt trên Credits_Page đã tạo.
7. WHERE bản dựng chứa ít nhất một AI_Generated_Asset, THE Credits_Page SHALL nêu rằng một phần hình ảnh do AI tạo ra và có chỉnh sửa của con người (giả định A12), đồng thời liệt kê mọi AI_Generated_Asset trong một nhóm riêng có tên AI-assisted.
8. WHEN một asset được thu nhận hoặc được tạo ra, THE Asset_Registry SHALL lưu License_Snapshot của license hoặc trang điều khoản tại thời điểm đó, vì điều khoản có thể thay đổi về sau (giả định A15). IF ngày kiểm tra license của một asset cũ hơn Asset_License_Recheck_Months tháng, THEN THE CI_Pipeline SHALL cảnh báo trong bản dựng phát triển và làm bản dựng phát hành thất bại.
9. IF một generation route dùng model hoặc dịch vụ có license phi thương mại (ví dụ trọng số FLUX.1 [dev], Appendix A mục A.7), THEN THE Art_Pipeline SHALL từ chối route đó, trừ khi Operator đã ghi một license thương mại vào Route_Decision_Record.
10. IF một bản dựng phát hành chứa asset mà License_Record chưa đặt cờ xác minh của chủ dự án, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu mã asset.
11. WHEN một asset được đánh dấu withdrawn, THE Asset_Registry SHALL ghi lý do withdrawn và, sau khi asset thay thế được đăng ký, mã asset thay thế. IF một bản dựng phát hành tham chiếu một asset withdrawn chưa có asset thay thế đã đăng ký, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu mã asset.
12. IF Legal_Review_Status do chủ dự án ghi cho bản quyền tranh AI (giả định A12) hoặc cho tài liệu bảo vệ dữ liệu (giả định A13, Requirement 33) chưa là acknowledged hoặc completed, THEN THE CI_Pipeline SHALL cảnh báo trong bản dựng phát triển và làm bản dựng phát hành thất bại.
13. WHEN một bản dựng được kiểm tra license, THE CI_Pipeline SHALL xuất một Asset_License_Report gồm số asset theo từng license và danh sách mọi asset bị gắn cờ kèm lý do, với nội dung giống hệt nhau cho các lần chạy có cùng Asset_Registry, cùng Legal_Review_Status, cùng giá trị Allowed_Licenses, Denied_License_Patterns, Asset_License_Recheck_Months và cùng ngày chạy.
14. IF Allowed_Licenses rỗng, hoặc Denied_License_Patterns chứa một mẫu không hợp lệ, hoặc Asset_License_Recheck_Months không phải số nguyên dương, THEN THE CI_Pipeline SHALL làm bản dựng thất bại và nêu tên tham số sai.

### Requirement 31: Giao diện, cài đặt và minh bạch xác suất

**User Story:** Là một người chơi, tôi muốn một giao diện tiếng Việt rõ ràng, dùng được trên điện thoại, cho tôi thấy điều đang diễn ra, cho phép tôi đặt các hành vi tự động và hiển thị xác suất thật, để tôi tin tưởng trò chơi.

#### Acceptance Criteria

1. THE Game_Client SHALL hiển thị giao diện bằng tiếng Việt theo mặc định, bố cục đáp ứng theo hướng mobile-first để dùng được từ khung nhìn rộng 360 px, và lấy mọi chuỗi hiển thị cho người dùng từ một bảng chuỗi (string table) có cấu trúc để có thể thêm ngôn ngữ khác (Assumption A9)
2. WHEN một số được hiển thị trên giao diện, THE Game_Client SHALL định dạng số đó theo quy ước vi-VN, và WHEN số đó không vừa phần tử chứa nó, THE Game_Client SHALL hiển thị dạng viết tắt của số và hiển thị giá trị đầy đủ khi người chơi chạm hoặc rê chuột vào phần tử đó
3. THE Game_Client SHALL cung cấp các màn hình sau và cho phép mở mỗi màn hình từ Dashboard (màn hình chính) trong tối đa UI_Max_Tap_Depth lần chạm trên điện thoại, riêng Offline_Report tự mở khi người chơi quay lại (tiêu chí 7): Dashboard (hoạt động hiện tại, Zone, HP và Spirit, Level cùng tiến độ tới Sub_Stage kế tiếp, hình nhân vật ghép từ trang bị, activity feed); Offline_Report; Character (trang bị và Try_On_Preview); Storage_Bag và Overflow_Stash; Spirit_Beast_Pen và Party; Bestiary; Cultivation và Breakthrough (kèm bản xem trước); Phường_Thị; Settings (màn hình cài đặt); Odds_Page; trình xem Combat_Log; Credits_Page
4. THE Game_Client SHALL cung cấp phần điều khiển hoạt động để chuyển giữa Adventure_Mode và Retreat_Mode và để chọn Zone, hiển thị cho mỗi Zone khoảng Level, Spirit_Qi_Density và Zone_Phenomenon đang hoạt động (Requirement 6), và hiển thị Zone cao hơn Realm của Player_Character ở trạng thái khóa kèm lý do khóa
5. THE Game_Client SHALL cung cấp màn hình Settings để người chơi chỉnh Retreat_Threshold, Resume_Threshold, Auto_Pill, Auto_Tame cùng bộ lọc của Auto_Tame (Requirement 9 tiêu chí 2), Auto_Breakthrough, Auto_Equip và Auto_Dissolve_Max_Rarity, gửi giá trị tới Game_Server để kiểm tra theo Requirement 3 tiêu chí 15, hiển thị thời điểm mỗi thiết lập có hiệu lực (Requirement 3 tiêu chí 7), và có thao tác đặt lại về giá trị mặc định
6. WHILE giao diện của Game_Client đang hiển thị ở nền trước, THE Game_Client SHALL hiển thị activity feed gồm Activity_Feed_Size bản ghi Encounter mới nhất (Requirement 7 tiêu chí 18) với Highlight được đánh dấu, làm mới feed không thường xuyên hơn một lần mỗi Online_Poll_Interval (Requirement 4), và hiển thị văn bản giải thích khi feed không có bản ghi nào
7. WHEN người chơi quay lại sau một khoảng vắng mặt đủ điều kiện tạo Offline_Report (Requirement 4), THE Game_Client SHALL hiển thị Offline_Report một lần với các Highlight sắp xếp theo Highlight_Priority, kèm hình nhân vật trước và sau khi có trang bị nhìn thấy được thay đổi (Requirement 26 tiêu chí 15), và có thao tác xác nhận đã xem theo Requirement 4 tiêu chí 19
8. WHEN người chơi mở Odds_Page, THE Game_Client SHALL hiển thị các giá trị sau, lấy nguyên từ phản hồi của Game_Server mà không tự tính xác suất ở phía máy khách: xác suất Rarity_Tier hiệu dụng tại Luck hiện tại (Requirement 20 tiêu chí 14); Mutation_Probability; Mutation_Pity_Counter và Item_Pity_Counter cùng ngưỡng mềm và ngưỡng cứng của chúng (Requirement 10 tiêu chí 16); xác suất của từng Size_Class; bảng phân rã xác suất thuần hóa theo cấp (grade) của Taming_Talisman đang chọn; Breakthrough_Probability trong bản xem trước (Requirement 23 tiêu chí 14); và phiên bản Balance_Config đang có hiệu lực
9. THE Game_Client SHALL ghi rõ trên Odds_Page những xác suất nào không bao gồm Thiên_Đạo_Bảo_Hộ, hiển thị các bộ đếm pity trong mục riêng tách khỏi xác suất cơ bản, và liệt kê trên Odds_Page mọi cơ chế ảnh hưởng đến xác suất mà bất kỳ màn hình nào sử dụng
10. WHEN người chơi bắt đầu thả một Spirit_Beast, phân giải một Item_Instance có Rarity_Tier từ Highlight_Min_Rarity trở lên, thử Breakthrough, hoặc mua hàng trong cửa hàng (Requirement 24) có giá lớn hơn Confirm_Purchase_Threshold, THE Game_Client SHALL yêu cầu xác nhận rõ ràng trước khi gửi yêu cầu (kèm tóm tắt rủi ro của bản xem trước khi thử Breakthrough, Requirement 23 tiêu chí 14), và gửi tối đa một yêu cầu cho mỗi lần xác nhận, kể cả khi người chơi chạm hai lần liên tiếp, bằng cùng một Request_Id (Requirement 2 tiêu chí 7)
11. WHEN Game_Server trả về một mã lỗi, THE Game_Client SHALL hiển thị thông báo tiếng Việt ánh xạ tới mã lỗi đó trong bảng chuỗi, và mọi mã lỗi mà Game_Server có thể trả về đều có ánh xạ như vậy
12. IF Game_Client mất kết nối tới Game_Server, THEN THE Game_Client SHALL hiển thị biểu ngữ (banner) báo mất kết nối, gửi lại các yêu cầu chưa hoàn tất bằng cùng Request_Id (Requirement 2 tiêu chí 7), và làm mới trạng thái từ Game_Server sau khi kết nối được khôi phục
13. WHEN người chơi yêu cầu xem Combat_Log (Requirement 8 tiêu chí 23), THE Game_Client SHALL hiển thị bằng văn bản từng lượt cùng Skill đã dùng, sát thương, cờ chí mạng và Element_Multiplier, và không hiển thị seed nào (Requirement 13 tiêu chí 16)
14. THE Game_Client SHALL đáp ứng WCAG 2.2 mức AA về độ tương phản và chỉ báo tiêu điểm, đặt vùng chạm có cạnh tối thiểu Min_Touch_Target_CSS_Px, cho phép thao tác mọi chức năng bằng bàn phím trên máy tính, hỗ trợ chế độ giảm chuyển động (reduced-motion), và truyền đạt Rarity_Tier và Size_Class bằng chữ hoặc biểu tượng bên cạnh màu sắc
15. THE Game_Client SHALL cung cấp các màn hình tài khoản gồm đăng ký (kèm lựa chọn Body_Template tùy chọn, Requirement 15 tiêu chí 11), đăng nhập, đăng xuất và đặt lại mật khẩu (Requirement 1, với thông báo lỗi chung theo Requirement 1 tiêu chí 11 và 17), danh sách Session đang hoạt động có thao tác thu hồi (Requirement 1 tiêu chí 12-16), và các yêu cầu xuất dữ liệu và xóa dữ liệu (Requirement 33)
16. THE Game_Client SHALL phát mọi thông báo cho người chơi qua kênh thông báo trong ứng dụng (in-app) ở bản MVP, còn thông báo đẩy (push notification) nằm trong lộ trình tại Appendix D
17. IF Confirm_Purchase_Threshold không phải số nguyên dương, hoặc UI_Max_Tap_Depth không phải số nguyên ≥ 1, hoặc Min_Touch_Target_CSS_Px không phải số dương, THEN THE CI_Pipeline SHALL báo lỗi bản build

## Appendices

### Appendix A: Kết quả nghiên cứu

Mốc nghiên cứu 2026-11-11; nội dung đã được diễn đạt lại để tuân thủ giới hạn bản quyền; mọi giấy phép phải đọc lại từ văn bản gốc tại thời điểm triển khai.

#### A.1 Game bắt Pokémon dạng idle và sự mơ hồ của tên "PokeCatch"

- Tên "PokeCatch" trùng với nhiều dự án không liên quan: [sihyun0222/pokecatch](https://github.com/sihyun0222/pokecatch), [Pieter-Rees/pokecatch](https://github.com/Pieter-Rees/pokecatch), [qoyyima22/pokecatch](https://github.com/qoyyima22/pokecatch), [pokecatch.cc](https://pokecatch.cc/) (dự án tiền mã hóa) và [codyGXS/PokeCatch](https://github.com/codyGXS/PokeCatch) (bot Discord).
- Trang pokecatch.com trả về HTTP 403, nên không xác minh được nội dung của trang này.
- Cơ chế tham chiếu lấy từ PokéClicker ([mã nguồn](https://github.com/pokeclicker/pokeclicker), [trang chủ](https://www.pokeclicker.com/)) và từ [Idle Pokémoon](https://idlepokemoon.com.br/blog/caca-offline-afk).
- Trang Idle Pokémoon mô tả các điểm sau: máy chủ phát lại nhịp săn khi người chơi vắng mặt; thời gian ngoại tuyến có mức trần một giờ; thời gian vắng mặt tối thiểu là 2 phút; bị ngất nếu không có thuốc hồi; không bắt được Pokémon shiny khi ngoại tuyến; mỗi loài có một bộ đếm xui riêng.

#### A.2 Thang cảnh giới

- [Path to Immortal](https://pathtoimmortal.com/): nguồn cho khung sườn chung của thang cảnh giới tu tiên.
- [Hỏi đáp trên WebNovel](https://m.webnovel.com/ask/q336003062922327): thang cảnh giới của truyện A Record of a Mortal's Journey.
- [Cultivation Realms (Xianxia RPG Wiki)](https://xianxia-rpg.fandom.com/wiki/Cultivation_Realms): mỗi cảnh giới chia thành 4 tiểu giai, tuổi thọ tăng dần theo cảnh giới.
- [Chinese cultivation systems (TeaNovel)](https://read.teanovel.com/blog/chinese-cultivation-systems): vòng lặp tu luyện rồi đột phá, và việc bế quan tu luyện.

#### A.3 Thiết kế ngoại tuyến và quyền quyết định của máy chủ

- [Edvins: dựng lại cơ chế "welcome back" của game idle bằng React](https://edvins.io/rebuilding-the-welcome-back-mechanic-from-idle-games-in-react) và [GeekExtreme: toán học của tiến trình ngoại tuyến](https://www.geekextreme.com/idle-games-offline-progression-math/): cả hai mô tả cách quyết toán theo chênh lệch thời gian (delta-time).
- [Offline Progress Guard (itch.io)](https://mtw1man2.itch.io/offline-progress-guard-reward-validation-progression-integrity-middleware): đồng hồ phía máy khách và localStorage có thể bị chỉnh sửa, đây là lý do để máy chủ giữ quyền quyết định.

#### A.4 Độ hiếm, Affix và cơ chế chống xui

- [Trang Rarity của Path of Exile Wiki](https://www.poewiki.net/wiki/poe2wiki:Rarity): tham chiếu về bậc độ hiếm của vật phẩm.
- [Hướng dẫn chế tác cơ bản trong Path of Exile (MMOGAH)](https://www.mmogah.com/sv/news/poe/poe-basic-crafting-guide): tham chiếu về Affix và chế tác.
- [Bộ đếm pity trong gacha (PulseGeek)](https://pulsegeek.com/articles/what-is-a-pity-counter-in-gacha-how-it-works/) và [bài về bảo hộ chống xui khi thiết kế ngẫu nhiên công bằng (Medium)](https://medium.com/@niklasvmoers/designing-fair-and-fun-randomness-in-video-games-via-bad-luck-protection-48f2c2262cfa): tham chiếu về cơ chế chống xui (pity, bad-luck protection).

#### A.5 RNG có seed và kiểm thử

- [lite-random](https://github.com/PeshoVurtoleta/lite-random): thư viện sinh số ngẫu nhiên dùng thuật toán mulberry32.
- [fast-check](https://github.com/dubzzz/fast-check): thư viện kiểm thử theo thuộc tính (property-based testing).
- Ghi chú: mulberry32 chỉ có 32 bit trạng thái nên không thể tự mang một Generation_Seed 64 bit. Giai đoạn thiết kế phải chọn bộ sinh có đủ trạng thái hoặc suy ra các seed con bằng hàm băm; Requirement 13 cố ý không nêu tên thuật toán.

#### A.6 Asset tiên hiệp có sẵn

- Trang thẻ (tag) của itch.io: [asset xianxia xếp theo đánh giá cao](https://itch.io/game-assets/top-rated/tag-xianxia).
- Gói trả phí: [Xianxia Complete Battlers Trilogy, 150 nhân vật](https://itch.io/s/213709/xianxia-complete-battlers-trilogy-150-characters), gồm ảnh tĩnh PNG nền trong suốt.
- Sprite visual novel miễn phí: [bộ sưu tập Xianxia/Wuxia Ancient China character packs](https://itch.io/c/2006928/xianxia-wuxia-ancient-china-character-packs). Một bộ sưu tập liên quan có chứa một gói theo giấy phép CC BY-NC-SA, nên mỗi gói phải được kiểm tra giấy phép riêng.
- Kết luận: không tìm thấy bộ tiên hiệp nào vừa đẹp, vừa chia lớp, vừa thay được theo trang bị. Đây là một lần tìm kiếm hạn chế, không chứng minh rằng bộ như vậy không tồn tại.
- Gói ảnh tĩnh phù hợp cho NPC, Bestiary và ảnh minh họa thẻ (card art), không phù hợp cho việc ghép lớp theo trang bị.

#### A.7 Tạo ảnh AI và giấy phép

- `FLUX.1 [dev]`: trọng số chỉ được dùng phi thương mại, còn model card ghi rằng ảnh đầu ra có thể dùng thương mại ([LICENSE.md](https://huggingface.co/black-forest-labs/FLUX.1-dev/blob/main/LICENSE.md)). Một nguồn thứ cấp ([localaimaster.com](https://localaimaster.com/blog/best-local-anime-image-model)) đưa ra kết luận khác về việc chạy trọng số trong quy trình tạo doanh thu.
- `FLUX.1 [schnell]`: giấy phép Apache 2.0 ([model card](https://huggingface.co/black-forest-labs/FLUX.1-schnell)).
- Cũng trên trang so sánh của localaimaster.com, các checkpoint SDXL anime: Animagine XL 4.0 theo OpenRAIL++-M; NoobAI XL 1.1 được ghi là cấm dùng thương mại; Illustrious cần kiểm tra tệp giấy phép theo từng phiên bản.
- Midjourney ([hướng dẫn dùng ảnh và video cho mục đích thương mại](https://docs.midjourney.com/hc/en-us/articles/27870375276557-Using-Images-Videos-Commercially)): gói trả phí có quyền thương mại; doanh nghiệp có doanh thu trên 1 triệu USD cần gói Pro hoặc Mega.
- NovelAI ([điều khoản sử dụng](https://novelai.net/terms)): người dùng giữ quyền đối với nội dung của mình.
- Các mô hình ảnh của OpenAI hỗ trợ PNG và WebP nền trong suốt; mô hình mới nhất vẫn ở dạng xem trước (preview) ([hướng dẫn công cụ tạo ảnh](https://developers.openai.com/api/docs/guides/tools-image-generation)).
- Văn phòng Bản quyền Hoa Kỳ (US Copyright Office), tháng 1/2025: sản phẩm hoàn toàn do AI tạo ra không được bảo hộ, phần do con người sáng tạo thì được bảo hộ ([bản tin](https://copyright.gov/newsnet/2025/1060.html)).

#### A.8 Kỹ thuật ảnh và hiển thị

- LayerDiffuse tạo được các lớp ảnh trong suốt ([bài báo trên arXiv](https://arxiv.org/pdf/2402.17113v3)).
- Quy trình giữ phong cách ảnh nhất quán ([iTechGuides](https://www.itechguides.com/how-to-fix-inconsistent-ai-generated-game-art-and-character-designs/)).
- Giấy phép của Spine ([trang mua Spine](https://esotericsoftware.com/spine-purchase)) và của Live2D ([giấy phép SDK](https://www.live2d.com/en/sdk/license/)).
- Một ví dụ LoRA phong cách tiên hiệp ([Civitai](https://civitai.com/models/2979853/chinese-fantasy-xianxia-style-lora-or)).

#### A.9 Pháp lý dữ liệu và hiệu năng web

- Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 của Việt Nam có hiệu lực từ 2026-01-01, kèm Nghị định 356/2025/NĐ-CP ([bài tổng hợp trên vietnam.vn](https://www.vietnam.vn/en/bao-ve-du-lieu-ca-nhan-trong-hoat-dong-kinh-doanh-trach-nhiem-cua-doanh-nghiep-va-ho-kinh-doanh-trong-thoi-dai-so)).
- Core Web Vitals ở phân vị p75: LCP 2.5 s, INP 200 ms, CLS 0.1 ([web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)).

#### A.10 Chưa kiểm chứng bằng tìm kiếm

- Cách phân hạng linh căn (từ 1 đến 5 linh căn, kèm linh căn biến dị) và vòng tương khắc Ngũ Hành lấy từ kiến thức chung.
- Một số cách đọc giấy phép đến từ blog thứ cấp; việc NoobAI bị cấm dùng thương mại và cách đọc quyền thương mại của NovelAI là hai ví dụ.
- Phép tính pity được kiểm tra bằng script (không phải bằng tìm kiếm) ngày 2026-11-11. Với đường dốc tuyến tính của soft pity P(c) = p + (1 − p) × clamp((c − S) / (H − S), 0, 1), trong đó c là số lần thử thất bại liên tiếp trước lần thử đang xét, kỳ vọng số Monster_Instance cho đến khi gặp một Dị Biến là khoảng 2630.6 (p = 1/4096, S = 4096, H = 12288) và kỳ vọng số lần rơi cho đến khi có một Item_Instance từ hạng Thiên trở lên là khoảng 176.3 (p = 0.005, S = 400, H = 800).

### Appendix B: Tham số Balance_Config mặc định

Mọi giá trị dưới đây là điểm khởi đầu, cần chỉnh khi chơi thử; yêu cầu chỉ tham chiếu tên tham số.

| Tham số | Đơn vị | Mặc định | Dùng ở | Ghi chú |
|---|---|---|---|---|
| Password_Min_Length | ký tự | 8 | Requirement 1 | Áp dụng khi đăng ký và khi đặt lại mật khẩu. |
| Session_Lifetime | giây | 2592000 | Requirement 1 | 30 ngày kể từ yêu cầu xác thực gần nhất của Session. |
| Max_Active_Sessions | Session | 5 | Requirement 1 | Khi vượt mức, Session có yêu cầu xác thực gần nhất cũ nhất bị thu hồi. |
| Password_Reset_Lifetime | giờ | 1 | Requirement 1 | Hiệu lực của liên kết đặt lại mật khẩu. |
| Request_Retention_Period | giờ | 24 | Requirement 2 | Thời gian giữ Request_Id để nhận ra yêu cầu gửi lặp. |
| Tick_Interval | giây | 5 | Glossary (Tick), Requirement 3, 4, 6 | Độ dài của một Tick. |
| Recovery_Regen_Rate | tỉ lệ Max_HP mỗi Tick | 0.04 | Requirement 3 | 4% Max_HP mỗi Tick ở Recovery_State và Retreat_Mode. |
| Adventure_Regen_Rate | tỉ lệ Max_HP mỗi Tick | 0.005 | Requirement 3 | 0.5% Max_HP mỗi Tick ở Adventure_Mode ngoài Recovery_State. |
| Epiphany_Probability | xác suất mỗi Tick | 0.02 | Glossary (Đốn_Ngộ), Requirement 3 | Chỉ áp dụng ở Retreat_Mode; nằm trong khoảng [0, 1]. |
| Epiphany_Multiplier | hệ số nhân | 5 | Glossary (Đốn_Ngộ), Requirement 3 | Phải lớn hơn 1. |
| Online_Poll_Interval | giây | 10 | Requirement 4 | Khoảng cách tối đa giữa hai yêu cầu cập nhật của Game_Client ở nền trước. |
| Min_Offline_Seconds | giây | 120 | Requirement 4 | Từ ngưỡng này trở lên, Settlement là ngoại tuyến và tạo Offline_Report. |
| Offline_Cap | giờ | 12 | Glossary, Requirement 4, 5 | Các tiêu chí dùng 3600 × Offline_Cap giây. |
| Highlight_Min_Rarity | Rarity_Tier | Địa | Requirement 4 | Item_Instance từ hạng này trở lên đủ điều kiện làm Highlight. |
| Report_Highlight_Limit | Highlight | 10 | Requirement 4 | Số Highlight tối đa trong một Offline_Report. |
| Highlight_Priority | danh sách có thứ tự | Item hạng Tiên > Dị Biến > Item hạng Thiên > Breakthrough > Item hạng Địa > Kỳ_Ngộ hiếm > các loại còn lại | Glossary (Highlight), Requirement 4 | Xếp từ ưu tiên cao đến thấp. Các loại còn lại (loài lần đầu thu phục, Đốn_Ngộ, Kỳ_Ngộ không hiếm, lên Sub_Stage) cùng mức thấp nhất. Kỳ_Ngộ hiếm là Kỳ_Ngộ chọn từ Event_Template mang cờ "hiếm" trong Content_Catalog (Glossary). |
| Offline_Report_History_Size | Offline_Report | 20 | Requirement 4 | Số báo cáo mới hơn làm một báo cáo chưa xem hết hạn lưu. |
| Playable_Level_Cap | Level | 20 | Requirement 6, 19, 20, 22 | Hóa Thần Đỉnh Phong (giả định A3). |
| Phenomenon_Slot_Duration | giây | 10800 | Requirement 6 | 3 giờ. Requirement 6 tính độ dài ô bằng giây. |
| Phenomenon_Probability | xác suất mỗi ô | 0.35 | Requirement 6 | Áp dụng cho Zone có danh sách Zone_Phenomenon không rỗng. |
| World_Seed | số nguyên 64 bit, lưu dạng chuỗi | Không có giá trị cố định trong mã; đọc từ cấu hình môi trường. Kiểm thử dùng một giá trị mẫu cố định. | Glossary, Requirement 6 | Glossary xếp World_Seed vào Balance_Config; giá trị thực được nạp từ cấu hình môi trường. Dạng chuỗi tránh mất độ chính xác của số 64 bit trong JavaScript. |
| Event_Distinct_Window | Kỳ_Ngộ | 6 | Requirement 7 | Mỗi Level trong một Zone cần ít nhất ngần này Event_Template. |
| Activity_Feed_Size | bản ghi | 50 | Requirement 7 | Số bản ghi Encounter gần nhất được lưu cho mỗi Account. |
| Max_Party_Beasts | Spirit_Beast | 3 | Glossary (Party), Requirement 8 | Số Spirit_Beast tối đa trong Party. |
| Max_Combat_Rounds | hiệp | 30 | Glossary (Battle_Outcome), Requirement 8 | Đạt giới hạn mà chưa bên nào thắng thì kết quả là Draw. |
| Min_Damage | điểm sát thương | 1 | Requirement 8 | Sát thương tối thiểu của mỗi đòn trúng. |
| Crit_Rate_Cap | xác suất | 0.75 | Requirement 8 | Trần của Crit_Rate hiệu dụng. |
| Damage_Variance | tỉ lệ | 0.10 | Requirement 8 | Hệ số ngẫu nhiên của sát thương nằm trong khoảng [0.90, 1.10]. |
| Max_Consecutive_Control_Rounds | hiệp | 2 | Requirement 8 | Số hiệp liên tiếp tối đa một bên mất lượt vì Khống Chế. |
| Combat_Log_Retention | trận | 100 | Requirement 8 | Số trận gần nhất được giữ Combat_Log; trận sinh Highlight vẫn được giữ. |
| Taming_Min_Probability | xác suất | 0.02 | Requirement 9 | Sàn của xác suất thu phục. |
| Taming_Max_Probability | xác suất | 0.95 | Requirement 9 | Trần của xác suất thu phục. |
| Pen_Capacity | Spirit_Beast | 100 | Requirement 9 | Sức chứa tối đa của Spirit_Beast_Pen. |
| Overflow_Capacity | Item_Instance | 50 | Glossary (Overflow_Stash), Requirement 21 | Sức chứa của Overflow_Stash. |
| Pity_Enabled | boolean | true | Requirement 10, 11 | Chỉ đặt false trong môi trường kiểm thử, khi cần kiểm tra thống kê của xác suất cơ bản. |
| Mutation_Probability | xác suất mỗi Monster_Instance | 1/4096 | Requirement 10, 11 | Xác suất cơ bản của Mutation (Dị Biến). Khi tắt pity, N = 1.000.000 Monster_Instance cho kỳ vọng khoảng 244.1 Mutation và khoảng ±4 độ lệch chuẩn xấp xỉ từ 182 đến 307. N = 100.000 quá nhỏ cho xác suất này (khoảng từ 5 đến 44). |
| Mutation_Soft_Pity_Start | giá trị Pity_Counter | 4096 | Requirement 10 | Từ giá trị này, xác suất Dị Biến tăng dần (soft pity). Phụ lục A.10 tính theo đường dốc tuyến tính. |
| Mutation_Hard_Pity_Count | giá trị Pity_Counter | 12288 | Requirement 10 | Tại giá trị này Dị Biến được bảo đảm (hard pity). Kỳ vọng khoảng 2630.6 Monster_Instance cho một Dị Biến (Phụ lục A.10). |
| Item_Soft_Pity_Start | giá trị Pity_Counter | 400 | Requirement 10 | Từ giá trị này, xác suất rơi Item_Instance từ hạng Thiên trở lên tăng dần (soft pity). Phụ lục A.10 dùng p = 0.005, là xác suất khi không có thưởng Luck; khi chơi, p đã tính Luck (Requirement 10 tiêu chí 5). |
| Item_Hard_Pity_Count | giá trị Pity_Counter | 800 | Requirement 10 | Tại giá trị này Item_Instance từ hạng Thiên trở lên được bảo đảm (hard pity). Kỳ vọng khoảng 176.3 lần rơi (Phụ lục A.10). |
| Mutation_Stat_Bonus | hệ số nhân | 0.15 | Requirement 11 | Hệ số nhân cộng thêm vào mỗi Stat chính của Mutation. |
| Strong_Multiplier | hệ số nhân sát thương | 1.5 | Requirement 14 | Áp dụng khi Element_Matrix cho Strong. Phải lớn hơn Neutral_Multiplier. |
| Neutral_Multiplier | hệ số nhân sát thương | 1.0 | Requirement 14 | Áp dụng khi Element_Matrix cho Neutral, và cho Skill trung tính và đòn đánh thường. |
| Weak_Multiplier | hệ số nhân sát thương | 0.67 | Requirement 14 | Áp dụng khi Element_Matrix cho Weak. Phải lớn hơn 0 và nhỏ hơn Neutral_Multiplier. |
| Same_Element_Bonus | hệ số nhân sát thương | 1.2 | Requirement 14 | Chỉ cho Skill nhóm Tấn Công có Element trùng một Element của bên tấn công. Phải lớn hơn hoặc bằng 1. Cùng Strong_Multiplier cho hệ số cao nhất 1.8. |
| Linh_Can_Count_Weights | trọng số cho 1, 2, 3, 4, 5 Element | 2, 8, 20, 30, 40 | Requirement 15 | Số Element càng ít càng hiếm nên dãy không giảm. Tương ứng 2%, 8%, 20%, 30%, 40%. |
| Linh_Can_Speed_By_Count | hệ số nhân tốc độ tu luyện cho 1, 2, 3, 4, 5 Element | 2.0, 1.6, 1.3, 1.1, 1.0 | Glossary (Linh_Can_Speed_Factor, Linh_Can_Multiplier), Requirement 15, 22 | Giảm ngặt khi số Element tăng. Requirement 22 nhân Linh_Can_Speed_Factor với độ thuần của Linh_Can thành Linh_Can_Multiplier khi tính Cultivation_Points, nên với giá trị mặc định Linh_Can_Multiplier nằm trong khoảng từ 0.5 (5 Element, độ thuần 0.5) đến 2.0 (1 Element, độ thuần 1.0). |
| Personality_Max_Deviation | tỉ lệ | 0.10 | Requirement 15 | Độ lệch Stat tối đa của một Personality, trong khoảng từ −0.10 đến +0.10. |
| Cultivator_Stat_Variance | tỉ lệ | 0.05 | Requirement 15 | Phương sai của Stat chính quanh Base_Stat(L), trong khoảng từ 0.95 đến 1.05 lần. |
| Starting_Skill_Count | Skill | 2 | Requirement 15 | Số Skill khởi đầu. Phải nhỏ hơn hoặc bằng số Skill_Slot của Realm 1 (Requirement 18). |
| Epithet_Probability | xác suất | 0.3 | Requirement 15 | Xác suất một Cultivator được gắn Đạo_Hiệu. |
| Retreat_Threshold | % Max_HP | 30 | Glossary, Requirement 1, 3 | Giá trị mặc định của cài đặt người chơi. Cặp mặc định thỏa 0 < Retreat_Threshold < Resume_Threshold ≤ 100 (Requirement 3 tiêu chí 15). |
| Resume_Threshold | % Max_HP | 80 | Glossary, Requirement 1, 3 | Giá trị mặc định của cài đặt người chơi. Với Recovery_Regen_Rate mặc định, hồi từ ngay dưới 30% lên 80% cần khoảng 13 Tick, và hồi từ HP bằng 1 sau Defeat cần khoảng 20 Tick ở Recovery_State. |
| Auto_Pill, Auto_Tame, Auto_Breakthrough (mặc định) | boolean | true, false, false | Glossary, Requirement 1, 3 | Đề xuất, cần xác nhận: Requirement 1 tiêu chí 8 cần giá trị mặc định cho cả ba cài đặt nhưng chưa có dòng nào. Auto_Breakthrough mặc định tắt theo Glossary. |
| Aptitude_Min | hệ số nhân | 0.80 | Requirement 16 | Phải lớn hơn 0 và không lớn hơn Aptitude_Max. |
| Aptitude_Max | hệ số nhân | 1.20 | Requirement 16 | Mỗi hệ số Aptitude lấy đều trong [Aptitude_Min, Aptitude_Max]. Với N = 100.000 và 10 khoảng bằng nhau, mỗi khoảng kỳ vọng 10000 và cửa sổ ±4 độ lệch chuẩn là ±380 (độ lệch chuẩn khoảng 94.87). |
| Monster_Skill_Count_Min | Skill | 2 | Glossary (Monster_Skill_Count), Requirement 16 | Phải từ 1 trở lên và không lớn hơn Monster_Skill_Count_Max. |
| Monster_Skill_Count_Max | Skill | 4 | Glossary (Monster_Skill_Count), Requirement 16 | Nhóm Skill của mỗi Monster_Species cần có ít nhất ngần này Skill. |
| Size_Mean | hệ số nhân | 1.0 | Requirement 17 | Trung bình của phân bố chuẩn gốc trước khi cắt cụt. Sau khi cắt cụt vào [Size_Min, Size_Max], trung bình thực là 1.01378 và độ lệch chuẩn thực là 0.23531 (đã kiểm tra bằng script). |
| Size_Sigma | hệ số nhân | 0.25 | Requirement 17 | Độ lệch chuẩn của phân bố chuẩn gốc; phải dương. |
| Size_Min | hệ số nhân | 0.5 | Requirement 17 | Cận dưới của Size_Scale; phải dương. |
| Size_Max | hệ số nhân | 2.0 | Requirement 17 | Cận trên của Size_Scale. |
| Size_Class_Thresholds | bốn ngưỡng tăng ngặt | 0.65, 0.85, 1.15, 1.5 | Glossary (Size_Class), Requirement 17 | Xác suất của năm Size_Class là 5.94% (Tí Hon), 19.80% (Nhỏ), 46.20% (Vừa), 25.74% (Lớn), 2.32% (Khổng Lồ). Với N = 100.000, số kỳ vọng và cửa sổ ±4 độ lệch chuẩn là 5936 ± 299, 19801 ± 504, 46202 ± 631, 25737 ± 553, 2325 ± 191. Cửa sổ ±4 sai số chuẩn của trung bình mẫu Size_Scale là 1.01378 ± 0.00298. Các số này đã kiểm tra bằng script cho phân bố đã cắt cụt. |
| Size_HP_Coefficient | hệ số | 0.30 | Requirement 17 | Hệ số kích thước của Max_HP bằng 1 + 0.30 × (Size_Scale − 1), từ 0.85 tại Size_Min đến 1.30 tại Size_Max. Phải không âm và giữ hệ số dương trên cả khoảng. |
| Size_Speed_Coefficient | hệ số | 0.20 | Requirement 17 | Hệ số kích thước của Speed bằng 1 − 0.20 × (Size_Scale − 1), từ 1.10 tại Size_Min đến 0.80 tại Size_Max. Phải không âm và nhỏ hơn 1 ÷ (Size_Max − 1) để hệ số còn dương. |
| Skill_Slots_By_Realm | số Skill_Slot cho Realm 1 đến 9 | 3, 4, 5, 6, 6, 7, 7, 8, 8 | Glossary (Skill_Slot), Requirement 18, 22 | Không giảm theo Realm; MVP chỉ chơi đến Realm 5. Giá trị của Realm 1 phải lớn hơn hoặc bằng Starting_Skill_Count (Requirement 15 tiêu chí 7). |
| Off_Element_Penalty | hệ số nhân | 0.7 | Requirement 18 | Nhân vào Skill_Power của Skill lệch Element của bên dùng; nằm trong khoảng (0, 1). |
| Min_Skills_Per_Category | Skill | 3 | Requirement 18 | Số Skill tối thiểu của mỗi nhóm trong sáu nhóm Skill. |
| Method_Affinity_Bonus | tỉ lệ | 0.20 | Requirement 18 | Cộng thêm vào Method_Speed_Factor khi Element của Cultivation_Method thuộc Linh_Can. Phải không âm. |
| Method_Stat_Bias | tỉ lệ | 0.10 | Requirement 18, 21 | Phần trăm cộng thêm cho mỗi Stat chính mà Cultivation_Method đang dùng chỉ định. Phải không âm. |
| Max_Prefix_Count | Affix | 3 | Requirement 19 | Số tiền tố tối đa trên một Item_Instance. |
| Max_Suffix_Count | Affix | 3 | Requirement 19 | Số hậu tố tối đa trên một Item_Instance. |
| Affix_Count_By_Tier | khoảng [min, max] cho Phàm, Hoàng, Huyền, Địa, Thiên, Tiên | 0–0, 1–2, 2–3, 3–4, 4–5, 5–6 | Requirement 19 | Giá trị lớn nhất không vượt Max_Prefix_Count + Max_Suffix_Count. |
| Roll_Floor_By_Tier | tỉ lệ cho Phàm, Hoàng, Huyền, Địa, Thiên, Tiên | 0, 0, 0.10, 0.25, 0.45, 0.65 | Glossary (Roll_Floor), Requirement 19 | Giá trị lăn của Affix nằm trong khoảng từ cận dưới + sàn × (cận trên − cận dưới) đến cận trên. |
| Item_Power_Weights | điểm mỗi đơn vị Stat | Max_HP 0.1; Max_Spirit 0.2; Attack 1.0; Defense 1.0; Speed 1.5; Crit_Rate 0.5; Crit_Damage 0.1; Luck 0.002; Cultivation_Speed 0.5 | Glossary (Item_Power_Score), Requirement 19 | Dòng cố định của Stat chính nhân 1; dòng phần trăm của Stat chính nhân Base_Stat(Level của Item_Instance, Stat đó); dòng của Stat phụ nhân Base_Stat(Level của Item_Instance, Attack) (Requirement 19 tiêu chí 9). Giá trị khởi điểm, cần chỉnh khi chơi thử. |
| Effect_Overlay_Min_Rarity | Rarity_Tier | Địa | Requirement 19 | Item_Instance từ hạng này trở lên có Effect_Overlay. Hạng Tiên luôn dùng Effect_Overlay của Tiên_Văn. |
| Rarity_Weights | trọng số trên 10000 cho Phàm, Hoàng, Huyền, Địa, Thiên, Tiên | 6000, 2800, 900, 250, 49, 1 | Glossary (Rarity_Tier), Requirement 20 | Tổng mặc định bằng 10000. Khi Pity_Enabled là false và Luck hiệu dụng bằng 0, N = 100.000 Item_Instance cho số kỳ vọng 60000, 28000, 9000, 2500, 490, 10 và cửa sổ ±4 độ lệch chuẩn (làm tròn lên) 620, 568, 362, 198, 89, 13. Xác suất cơ bản từ Thiên trở lên là (49 + 1) ÷ 10000 = 0.5% chỉ khi Luck không cộng thêm (Phụ lục A.10 dùng p = 0.005). Cửa sổ của hạng Tiên với N = 100.000 chứa 0, nên kiểm thử riêng hạng này nên dùng N = 1.000.000 (kỳ vọng 100, cửa sổ ±40). |
| Luck_Rarity_Gain | hệ số mỗi điểm Luck | 0.005 | Requirement 20 | Với Luck hiệu dụng x, trọng số của hạng thứ k (k = 0 cho Phàm đến k = 5 cho Tiên) nhân (1 + 0.005 × x)^k. Xác suất chọn từ Thiên trở lên, chưa kể Thiên_Đạo_Bảo_Hộ, là 0.50% khi x = 0, khoảng 1.07% khi x = 50 và khoảng 1.92% khi x = 100 (đã kiểm tra bằng script). Phải không âm. |
| Luck_Cap | điểm Luck | 100 | Requirement 20 | Trần của Luck hiệu dụng; tổng Luck từ trần trở lên không làm xác suất tăng thêm. Phải không âm. |
| Item_Level_Spread | Level | 2 | Requirement 20 | Level của Item_Instance lệch tối đa ngần này so với Level nguồn, trong khoảng từ 1 đến Playable_Level_Cap. Phải là số nguyên không âm. |
| Drop_Roll_Count | lần rơi mỗi trận Victory | 2 | Requirement 20 | Phải là số nguyên lớn hơn hoặc bằng 1. |
| Bag_Capacity | ô | 100 | Glossary (Storage_Bag), Requirement 21 | Chỉ Item_Instance chiếm ô; vật phẩm xếp chồng không chiếm ô. |
| Auto_Equip (mặc định) | boolean | true | Glossary (Auto_Equip), Requirement 1, 21 | Bật để nhân vật mới tự mặc đồ, kể cả khi người chơi vắng mặt. |
| Auto_Dissolve_Max_Rarity (mặc định) | Rarity_Tier hoặc "tắt" | Huyền | Glossary (Auto_Dissolve_Max_Rarity), Requirement 1, 21 | Đề xuất. Auto_Equip chạy trước, nên chỉ Item_Instance không phải bản nâng cấp từ hạng Huyền trở xuống mới bị phân giải; Item_Instance ở Equipment_Slot đang trống và Item_Instance từ hạng Địa trở lên được giữ lại. |
| Base_Cultivation_Rate | Cultivation_Points mỗi Tick, theo Level | Bảng B.2 | Requirement 22 | Bảng B.2 tạo bằng cách làm tròn 20 × 1.10^(Level − 1). Không giảm khi Level tăng. |
| Cultivation_Threshold | Cultivation_Points, theo Level | Bảng B.2 | Requirement 22 | Số Cultivation_Points cần có để rời Level; tăng ngặt theo Level. Công thức tạo bảng ở B.2. |
| Adventure_Cultivation_Factor | hệ số nhân | 1.0 | Requirement 22 | Dùng ở Adventure_Mode và Recovery_State. Phải dương. |
| Retreat_Cultivation_Factor | hệ số nhân | 2.0 | Requirement 22 | Dùng ở Retreat_Mode. Đốn_Ngộ kỳ vọng nhân thêm 1 + Epiphany_Probability × (Epiphany_Multiplier − 1) = 1.08, nên Bế Quan nhanh khoảng 2.16 lần Lịch Luyện ở cùng điều kiện. Phải dương. |
| Base_Stat | Stat chính theo Level | Bảng B.1 | Glossary (Base_Stat), Requirement 15, 16, 22 | Bảng B.1 tạo bằng cách làm tròn Giá trị Level 1 × 1.10^(Level − 1) × 1.25^(Realm − 1), với giá trị Level 1 là Max_HP 100, Max_Spirit 60, Attack 14, Defense 10, Speed 10. |
| Base_Secondary_Stats | Crit_Rate, Crit_Damage, Luck, Cultivation_Speed | 0.05, 1.5, 0, 0 | Requirement 22 | Đề xuất. Crit_Damage là hệ số nhân sát thương khi bạo kích; Cultivation_Speed là tỉ lệ cộng thêm vào tốc độ tu luyện (0 nghĩa là không tăng); Luck tính theo điểm. |
| Breakthrough_Base_Probability | xác suất, theo Realm đích 2, 3, 4, 5 | 0.90, 0.75, 0.60, 0.50 | Requirement 23 | Giá trị khởi điểm, chưa chơi thử. Mỗi giá trị nằm trong [0, 1] và giảm dần theo Realm đích. Với Breakthrough_Purity_Bonus mặc định và độ thuần trong [0.5, 1.0], Breakthrough_Probability khi không dùng Breakthrough_Pill là 0.95 (Realm 2, bị Breakthrough_Probability_Max giới hạn), 0.80–0.85 (Realm 3), 0.65–0.70 (Realm 4) và 0.55–0.60 (Realm 5); khi dùng Breakthrough_Pill là 0.95, 0.95, 0.80–0.85 và 0.70–0.75 (tính tay). Đây là xác suất của lần tung, chưa tính xác suất vượt qua Tribulation. |
| Breakthrough_Purity_Bonus | xác suất cộng thêm cho độ thuần 1.0 | 0.10 | Requirement 23 | Cộng Breakthrough_Purity_Bonus × độ thuần của Linh_Can; độ thuần nằm trong [0.5, 1.0] nên cộng từ 0.05 đến 0.10. Phải không âm. |
| Breakthrough_Pill_Bonus | xác suất cộng thêm | 0.15 | Glossary (Breakthrough_Pill), Requirement 23 | Cộng khi lần thử dùng một Breakthrough_Pill. Phải không âm. |
| Breakthrough_Probability_Min | xác suất | 0.05 | Glossary (Breakthrough_Probability), Requirement 23 | Cận dưới của Breakthrough_Probability. Nằm trong [0, 1] và nhỏ hơn hoặc bằng Breakthrough_Probability_Max. |
| Breakthrough_Probability_Max | xác suất | 0.95 | Glossary (Breakthrough_Probability), Requirement 23 | Cận trên của Breakthrough_Probability, nên mỗi lần tung còn ít nhất 5% thất bại. Nằm trong [0, 1]. |
| Tribulation_Realms | tập chỉ số Realm đích | 3, 4, 5 | Glossary (Tribulation), Requirement 23 | Kim Đan, Nguyên Anh, Hóa Thần. Breakthrough vào Realm 2 (Trúc Cơ) không có Tribulation. Phải là tập con của các Realm từ 2 đến 5. |
| Tribulation_Wave_Count_By_Realm | số Tribulation_Wave, cho Realm đích 3, 4, 5 | 3, 4, 5 | Glossary (Tribulation_Wave), Requirement 23 | Giá trị khởi điểm. Mỗi giá trị là số nguyên lớn hơn hoặc bằng 1 và có mặt cho mọi Realm thuộc Tribulation_Realms. |
| Tribulation_Wave_Strength | hệ số nhân | 0.60 | Glossary (Tribulation_Wave), Requirement 23 | Nhân vào Base_Stat của Level đích để ra mỗi Stat chính của kẻ địch ở mỗi Tribulation_Wave. Chưa được kiểm chứng bằng mô phỏng chiến đấu; cần mô phỏng ở giai đoạn thiết kế, với Player_Character ở Đỉnh Phong có trang bị điển hình, trước khi chốt. Phải dương. |
| Tribulation_Talisman_Reduction | tỉ lệ sát thương được giảm | 0.30 | Glossary (Tribulation_Talisman), Requirement 23 | Sát thương Player_Character nhận ở mọi Tribulation_Wave của lần thử được nhân với 0.70. Chưa được kiểm chứng bằng mô phỏng chiến đấu. Nằm trong [0, 1). |
| Breakthrough_Failure_Loss | tỉ lệ Cultivation_Points hiện có | 0.15 | Requirement 23 | Mất ⌊Cultivation_Points × 0.15⌋ khi Breakthrough_Attempt thất bại. Ở Bình_Cảnh, Cultivation_Points bằng Cultivation_Threshold(Level), nên mất khoảng 15% ngưỡng. Nằm trong [0, 1). |
| Heart_Demon_Duration | Tick | 720 | Glossary (Heart_Demon), Requirement 23 | 1 giờ ở Tick_Interval mặc định (720 × 5 giây = 3600 giây). Phải là số nguyên lớn hơn hoặc bằng 1. |
| Heart_Demon_Cultivation_Factor | hệ số nhân | 0.5 | Glossary (Heart_Demon_Factor), Requirement 22, 23 | Trong 720 Tick, Cultivation_Points nhận được bằng nửa mức thường, tương đương mất 360 Tick tu luyện (30 phút ở Tick_Interval mặc định). Nằm trong (0, 1]. |
| Auto_Breakthrough_Min_HP | tỉ lệ Max_HP | 0.8 | Glossary (Auto_Breakthrough), Requirement 23 | Auto_Breakthrough chỉ thử khi HP lớn hơn hoặc bằng 80% Max_HP. Nằm trong [0, 1]. |
| Auto_Breakthrough_Min_Probability | xác suất | 0.5 | Glossary (Auto_Breakthrough), Requirement 23 | Với các giá trị mặc định ở trên, Breakthrough_Probability khi không dùng Breakthrough_Pill luôn từ 0.55 trở lên (Realm 5, độ thuần 0.5), nên ngưỡng này chưa chặn Auto_Breakthrough nào; cần chỉnh khi chơi thử. Nằm trong [0, 1]. |
| Spirit_Stone_Max | Spirit_Stone | 1000000000000 | Glossary, Requirement 24 | Giá trị khởi điểm (10^12). Nhỏ hơn 2^53 − 1, nên mọi số dư và mọi tích giá nhân số lượng (lớn nhất 100000 × 999) là số nguyên an toàn của JavaScript. Phải là số nguyên lớn hơn hoặc bằng 1. |
| Stack_Max | vật phẩm mỗi loại | 9999 | Glossary, Requirement 24 | Giá trị khởi điểm. Chỉ chặn yêu cầu mua (tiêu chí 11 và 13); phần thưởng cấp ngoài yêu cầu mua vẫn cộng dồn theo Requirement 21 tiêu chí 1. Phải là số nguyên lớn hơn hoặc bằng Max_Purchase_Quantity. |
| Max_Purchase_Quantity | vật phẩm mỗi yêu cầu mua | 999 | Requirement 24 | Giá trị khởi điểm. Phải là số nguyên từ 1 đến Stack_Max. |
| Starting_Spirit_Stone | Spirit_Stone | 100 | Requirement 1, 24 | Giá trị khởi điểm. Chưa gồm phần thưởng khởi đầu của Origin (Requirement 15 tiêu chí 10). Phải là số nguyên từ 0 đến Spirit_Stone_Max. |
| Starting_Taming_Talisman_Count | Taming_Talisman hạng Hoàng | 10 | Requirement 1, 24 | Giá trị khởi điểm. Phải là số nguyên từ 0 đến Stack_Max. |
| Starting_HP_Pill_Count | HP_Pill hạng 1 | 5 | Requirement 1, 24 | Giá trị khởi điểm. Phải là số nguyên từ 0 đến Stack_Max. |
| Victory_Reward_Per_Level | Spirit_Stone mỗi Level của kẻ địch | 3 | Requirement 7, 24 | Giá trị khởi điểm. Một Victory trước kẻ địch Level L cho 3 × L Spirit_Stone (xem B.3). Phải là số nguyên lớn hơn hoặc bằng 1. |
| Dissolve_Value_By_Tier | Spirit_Stone mỗi Level của Item_Instance, theo Phàm, Hoàng, Huyền, Địa, Thiên, Tiên | 1, 3, 10, 40, 200, 1000 | Requirement 21, 24 | Giá trị khởi điểm. Giá trị phân giải bằng giá trị của hạng nhân Level của Item_Instance, nên lớn nhất là 1000 × 20 = 20000 với Playable_Level_Cap mặc định. Sáu số nguyên dương, không giảm khi Rarity_Tier tăng. |
| Release_Base | Spirit_Stone | 2 | Requirement 9, 24 | Đề xuất. Giá trị thả bằng ⌊Release_Base × Level × Aptitude_Total × Release_Size_Class_Factors × hệ số Mutation⌋. Với giá trị mặc định, Aptitude_Min và Aptitude_Max, giá trị thả nhỏ nhất là 1 (Level 1, Aptitude_Total 0.8, Tí Hon, không Mutation) và lớn nhất là 360 (Level 20, Aptitude_Total 1.2, Khổng Lồ, có Mutation). Phải dương. |
| Release_Size_Class_Factors | hệ số nhân, theo Tí Hon, Nhỏ, Vừa, Lớn, Khổng Lồ | 0.8, 0.9, 1.0, 1.2, 1.5 | Glossary (Size_Class), Requirement 24 | Đề xuất. Năm số dương, không giảm khi Size_Class tăng, nên giá trị thả không giảm khi Spirit_Beast lớn hơn. |
| Release_Mutation_Factor | hệ số nhân | 5 | Requirement 24 | Đề xuất. Áp dụng khi Spirit_Beast có Mutation; Spirit_Beast không có Mutation dùng hệ số 1. Phải lớn hơn hoặc bằng 1. |
| Shop_Prices | Spirit_Stone mỗi đơn vị | Taming_Talisman: Hoàng 10, Huyền 50, Địa 250, Thiên 1250. HP_Pill: hạng 1 là 20, hạng 2 là 60, hạng 3 là 200. Breakthrough_Pill cho Realm đích 2, 3, 4, 5: 200, 2000, 15000, 100000. Tribulation_Talisman: 2000. | Glossary (Phường_Thị), Requirement 24 | Giá khởi điểm cho mười hai mặt hàng. Giá Breakthrough_Pill và Tribulation_Talisman là đề xuất, tính ở B.3 theo nhịp Cultivation_Threshold (B.2). Mỗi giá là số nguyên dương, tăng ngặt theo hạng trong từng họ. Giá bán lại tính theo Sell_Back_Ratio. |
| Pill_HP_Restore_By_Grade | tỉ lệ Max_HP, theo HP_Pill hạng 1, 2, 3 | 0.30, 0.60, 1.00 | Requirement 24 | Giá trị khởi điểm. Lượng HP hồi bằng ⌊tỉ lệ × Max_HP⌋ và HP không vượt Max_HP. Ba giá trị tăng ngặt theo hạng, nằm trong khoảng (0, 1]. |
| Sell_Back_Ratio | tỉ lệ giá mua | 0.5 | Glossary (Phường_Thị), Requirement 24 | Giá trị khởi điểm. Giá bán lại một đơn vị bằng ⌊0.5 × giá mua⌋ (ví dụ Taming_Talisman hạng Hoàng mua 10, bán lại 5). Nằm trong khoảng [0, 1). |
| Economy_Ledger_Retention | ngày | 90 | Glossary (Economy_Ledger), Requirement 24 | Giá trị khởi điểm. Dòng ghi cũ hơn ngần này ngày được gộp vào số dư kiểm tra và dòng tổng hợp theo ngày. Phải là số nguyên lớn hơn hoặc bằng 1 và, quy ra giờ, không nhỏ hơn Request_Retention_Period (24 giờ). |
| Size_Bucket_Width | hệ số nhân (Size_Scale) | 0.05 | Glossary (Diversity_Fingerprint), Requirement 25 | Độ rộng một khoảng Size_Scale trong Diversity_Fingerprint của Monster_Instance. Phải dương. |
| Aptitude_Bucket_Count | khoảng | 4 | Glossary (Diversity_Fingerprint), Requirement 25 | Số khoảng bằng nhau chia [Aptitude_Min, Aptitude_Max] cho mỗi Stat chính. Phải là số nguyên lớn hơn hoặc bằng 1. |
| Purity_Bucket_Count | khoảng | 5 | Glossary (Diversity_Fingerprint), Requirement 25 | Số khoảng bằng nhau chia độ thuần của Linh_Can trong [0.5, 1.0]. Phải là số nguyên lớn hơn hoặc bằng 1. Đề xuất, cần xác nhận: giá trị 5 chưa nằm trong các giả định mô phỏng ở B.5. |
| Roll_Bucket_Count | khoảng | 2 | Glossary (Diversity_Fingerprint), Requirement 25 | Số khoảng bằng nhau chia khoảng lăn được của Implicit_Stat hoặc của một Affix. Phải là số nguyên lớn hơn hoặc bằng 1. |
| Max_Duplicate_Rate_By_Kind | tỉ lệ theo loại đo | Monster_Instance 0.01; Cultivator 0.01; Phàm không áp dụng (chỉ báo cáo); Hoàng 0.20; Huyền 0.01; Địa 0.01; Thiên 0.01; Tiên 0.01 | Glossary (Duplicate_Rate), Requirement 25 | Sáu hạng sau Cultivator là Item_Instance theo Rarity_Tier. Mỗi ngưỡng nằm trong khoảng [0, 1] và không tăng khi Rarity_Tier tăng từ Hoàng đến Tiên. Hạng Phàm không có Affix (Affix_Count_By_Tier 0–0) nên chỉ được báo cáo. Giá trị khởi điểm, đối chiếu với B.5; cần chỉnh khi có Content_Catalog thật. |
| Min_Distinct_Name_Ratio | tỉ lệ theo loại đo | Cultivator 0.95; Item_Instance hạng Thiên 0.95; Item_Instance hạng Tiên 0.98 | Glossary (Distinct_Name_Ratio), Requirement 25 | Mỗi giá trị nằm trong khoảng (0, 1]. Giá trị khởi điểm, đối chiếu với B.5. |
| Max_Share_Factor | hệ số nhân | 1.5 | Glossary (Chiều phân bố), Requirement 25 | Phải lớn hơn 1. |
| Launch_Content_Minimums | số mục tối thiểu theo loại nội dung | Bảng ở B.4 | Glossary, Requirement 25 | Giá trị khởi điểm nằm ở B.4. CI_Pipeline so Content_Catalog với bảng này. |
| Equip_Redraw_Budget | ms | 150 | Requirement 26 (criterion 7, 16) | Giá trị khởi đầu. Thời gian tối đa từ lúc Game_Client nhận Game_State mới đến khi vẽ xong ảnh ghép mới, gồm cả cross-fade. |
| Max_Upscale_Factor | lần | 1.5 | Requirement 26 (criterion 11, 16); Requirement 27 (criterion 10) | Giá trị khởi đầu. Hệ số phóng đại tối đa so với kích thước gốc của ảnh. |
| Ambient_Animation_Min_FPS | khung hình/giây | 30 | Requirement 26 (criterion 12, 16) | Giá trị khởi đầu. Đo trên thiết bị tham chiếu tầm trung của Requirement 32. |
| Max_Layers_Per_Character | lớp | 20 | Requirement 26 (criterion 13, 16) | Giá trị khởi đầu. Số Art_Layer tối đa trong ảnh ghép của một nhân vật. |
| Display_Min_Fraction | tỷ lệ chiều cao khung | 0.35 | Requirement 27 (criterion 2, 16) | Giá trị khởi đầu. Phải thỏa 0 < Display_Min_Fraction < Display_Max_Fraction ≤ 1. |
| Display_Max_Fraction | tỷ lệ chiều cao khung | 0.95 | Requirement 27 (criterion 2, 16) | Giá trị khởi đầu. Ràng buộc xem ở Display_Min_Fraction. |
| Human_Reference_Height_Cm | cm | 170 | Requirement 27 (criterion 4, 16) | Giá trị khởi đầu. Chiều cao của hình bóng người tham chiếu; phải lớn hơn 0. |
| Composite_Cache_Size | mục | 64 | Requirement 26 (criterion 13, 16) | Giá trị khởi đầu. Số ảnh ghép tối đa trong bộ nhớ đệm. |
| Max_Layer_File_KB | KB | 250 | Requirement 28 (criterion 5, 16) | Giá trị khởi đầu. Dung lượng tệp tối đa của một Art_Layer nhân vật. |
| Max_Monster_File_KB | KB | 300 | Requirement 28 (criterion 5, 16) | Giá trị khởi đầu. Dung lượng tệp tối đa của một ảnh quái. |
| Max_Background_File_KB | KB | 600 | Requirement 28 (criterion 5, 16) | Giá trị khởi đầu. Dung lượng tệp tối đa của một ảnh nền Zone. |
| Style_Anchor_Min_Count | ảnh | 6 | Requirement 29 (criterion 3, 16) | Giá trị khởi đầu. Số Style_Anchor đã duyệt tối thiểu trước đợt tạo ảnh đầu tiên. |
| Max_Alignment_Error_Px | px | 4 | Requirement 29 (criterion 4, 16) | Giá trị khởi đầu. Độ lệch tối đa của một Candidate_Asset so với hình bóng Body_Template, đo trên Reference_Canvas. |
| Max_Generations_Per_Batch | lượt tạo | 200 | Requirement 29 (criterion 11, 16) | Giá trị khởi đầu. Số lần gọi tạo ảnh tối đa trong một đợt, kể cả tạo lại. |
| Batch_Size | ảnh | 24 | Requirement 29 (criterion 12, 16) | Giá trị khởi đầu. Số Candidate_Asset mỗi đợt trước khi dừng để Human_Review. |
| Rejection_Pause_Threshold | tỉ lệ | 0.7 | Requirement 29 (criterion 12, 16) | Giá trị khởi đầu. Tỉ lệ từ chối của một đợt; vượt mức này thì Art_Pipeline tạm dừng. |
| Allowed_Licenses | danh sách | CC0; CC BY; MIT; Apache-2.0; OpenRAIL++-M kèm xác nhận cho phép dùng thương mại; license thương mại đã mua; giấy phép bằng văn bản; điều khoản dịch vụ cho phép dùng thương mại | Requirement 30 (criterion 4, 13, 14) | Giá trị khởi đầu. Danh sách license được chấp nhận; license ngoài danh sách chỉ được dùng khi License_Record kèm bằng chứng mua license hoặc giấy phép bằng văn bản. Danh sách không được rỗng. |
| Denied_License_Patterns | danh sách mẫu | "NC" (khớp nguyên thành phần); "NonCommercial"; "Non-Commercial"; "research only" | Requirement 30 (criterion 4, 13, 14) | Giá trị khởi đầu. So khớp không phân biệt hoa thường. Tên license được tách thành các thành phần tại mọi ký tự không phải chữ hoặc số; "NC" chỉ khớp khi bằng nguyên một thành phần (CC BY-NC-SA khớp, "licence" không khớp). Ba mẫu còn lại khớp như chuỗi con của tên license. Mỗi mẫu phải hợp lệ. |
| Asset_License_Recheck_Months | tháng | 12 | Requirement 30 (criterion 8, 13, 14) | Giá trị khởi đầu. Số tháng tối đa kể từ ngày kiểm tra license; quá hạn thì bản dựng phát triển cảnh báo và bản dựng phát hành thất bại. Phải là số nguyên dương. |
| Confirm_Purchase_Threshold | Spirit_Stone | 1000 | Requirement 31 (criterion 10, 17) | Giá trị khởi đầu. Mức giá mà một lần mua phải vượt quá thì Game_Client yêu cầu xác nhận rõ ràng trước khi gửi yêu cầu mua. Phải là số nguyên dương; nếu không, CI_Pipeline báo lỗi bản build. |
| UI_Max_Tap_Depth | lần chạm | 2 | Requirement 31 (criterion 3, 17) | Giá trị khởi đầu. Số lần chạm tối đa trên điện thoại để mở một màn hình từ Dashboard. Phải là số nguyên ≥ 1; nếu không, CI_Pipeline báo lỗi bản build. |
| Min_Touch_Target_CSS_Px | CSS px | 44 | Requirement 31 (criterion 14, 17) | Giá trị khởi đầu. Cạnh tối thiểu của một vùng chạm trong Game_Client. Phải là số dương; nếu không, CI_Pipeline báo lỗi bản build. |

Khi tham số đổi, Generator_Version hoặc phiên bản Balance_Config phải đổi theo (Requirement 34).

#### B.1 Bảng Base_Stat(L)

Bảng dưới là giá trị khởi điểm của tham số Base_Stat, tạo bằng script từ công thức ghi ở dòng Base_Stat của bảng tham số. Cả năm Stat chính tăng ngặt theo Level, và mức tăng ở mỗi ranh giới Realm (Level 4 sang 5, 8 sang 9, 12 sang 13, 16 sang 17) lớn hơn mọi mức tăng giữa hai Sub_Stage liên tiếp của Realm đứng trước ranh giới đó (đã kiểm tra bằng script).

| Level | Cảnh giới | Max_HP | Max_Spirit | Attack | Defense | Speed |
|---|---|---|---|---|---|---|
| 1 | Luyện Khí Sơ Kỳ | 100 | 60 | 14 | 10 | 10 |
| 2 | Luyện Khí Trung Kỳ | 110 | 66 | 15 | 11 | 11 |
| 3 | Luyện Khí Hậu Kỳ | 121 | 73 | 17 | 12 | 12 |
| 4 | Luyện Khí Đỉnh Phong | 133 | 80 | 19 | 13 | 13 |
| 5 | Trúc Cơ Sơ Kỳ | 183 | 110 | 26 | 18 | 18 |
| 6 | Trúc Cơ Trung Kỳ | 201 | 121 | 28 | 20 | 20 |
| 7 | Trúc Cơ Hậu Kỳ | 221 | 133 | 31 | 22 | 22 |
| 8 | Trúc Cơ Đỉnh Phong | 244 | 146 | 34 | 24 | 24 |
| 9 | Kim Đan Sơ Kỳ | 335 | 201 | 47 | 33 | 33 |
| 10 | Kim Đan Trung Kỳ | 368 | 221 | 52 | 37 | 37 |
| 11 | Kim Đan Hậu Kỳ | 405 | 243 | 57 | 41 | 41 |
| 12 | Kim Đan Đỉnh Phong | 446 | 267 | 62 | 45 | 45 |
| 13 | Nguyên Anh Sơ Kỳ | 613 | 368 | 86 | 61 | 61 |
| 14 | Nguyên Anh Trung Kỳ | 674 | 405 | 94 | 67 | 67 |
| 15 | Nguyên Anh Hậu Kỳ | 742 | 445 | 104 | 74 | 74 |
| 16 | Nguyên Anh Đỉnh Phong | 816 | 490 | 114 | 82 | 82 |
| 17 | Hóa Thần Sơ Kỳ | 1122 | 673 | 157 | 112 | 112 |
| 18 | Hóa Thần Trung Kỳ | 1234 | 740 | 173 | 123 | 123 |
| 19 | Hóa Thần Hậu Kỳ | 1357 | 814 | 190 | 136 | 136 |
| 20 | Hóa Thần Đỉnh Phong | 1493 | 896 | 209 | 149 | 149 |

#### B.2 Bảng Base_Cultivation_Rate, Cultivation_Threshold và nhịp tiến độ (mục tiêu khởi điểm)

Bảng dưới là giá trị khởi điểm của Base_Cultivation_Rate và Cultivation_Threshold, kèm nhịp tiến độ tính bằng script. Đây là mục tiêu khởi điểm để chỉnh khi chơi thử, không phải cam kết cố định.

- Điều kiện tham chiếu: Linh_Can_Multiplier, Method_Speed_Factor, hệ số Cultivation_Points của Zone_Phenomenon và Heart_Demon_Factor bằng 1; Cultivation_Speed bằng 0; Spirit_Qi_Density bằng 1; Tick_Interval mặc định (720 Tick mỗi giờ).
- Cột Lịch Luyện dùng Adventure_Cultivation_Factor mặc định. Cột Bế Quan dùng Retreat_Cultivation_Factor mặc định nhân với kỳ vọng Đốn_Ngộ 1.08, tổng cộng 2.16 lần.
- Cách tạo Cultivation_Threshold(L): lấy thời gian mục tiêu của Level L là 5 phút × 1.5^(L − 1), nhân thêm 1.5 ở Level chia hết cho 4 (Đỉnh Phong), đổi sang điểm bằng 720 Tick mỗi giờ × Base_Cultivation_Rate(L), rồi làm tròn đến bội của 10. Khi Tick_Interval hoặc một thừa số tham chiếu đổi, cần tính lại bảng.
- Thời gian chỉ gồm việc tích đủ điểm, chưa gồm thời gian Breakthrough và rủi ro thất bại của Requirement 23.
- Ở điều kiện tham chiếu, đạt Level 20 mất khoảng 392 giờ liên tục ở Lịch Luyện (khoảng 16.3 ngày) hoặc khoảng 182 giờ ở Bế Quan (khoảng 7.6 ngày). Linh_Can_Multiplier, Method_Speed_Factor, Spirit_Qi_Density và Cultivation_Speed cao hơn làm tiến độ nhanh hơn.
- Dòng Level 20: Cultivation_Threshold là mức trần của Cultivation_Points tại Playable_Level_Cap (Requirement 22 tiêu chí 9 và 10), nên không có thời gian rời Level.

| Level | Cảnh giới | Base_Cultivation_Rate (điểm mỗi Tick) | Cultivation_Threshold (điểm) | Giờ rời Level, Lịch Luyện | Giờ rời Level, Bế Quan | Cộng dồn đến Level kế, Lịch Luyện (giờ) | Cộng dồn đến Level kế, Bế Quan (giờ) |
|---|---|---|---|---|---|---|---|
| 1 | Luyện Khí Sơ Kỳ | 20 | 1200 | 0.08 | 0.04 | 0.1 | 0.0 |
| 2 | Luyện Khí Trung Kỳ | 22 | 1980 | 0.12 | 0.06 | 0.2 | 0.1 |
| 3 | Luyện Khí Hậu Kỳ | 24 | 3240 | 0.19 | 0.09 | 0.4 | 0.2 |
| 4 | Luyện Khí Đỉnh Phong | 27 | 8200 | 0.42 | 0.20 | 0.8 | 0.4 |
| 5 | Trúc Cơ Sơ Kỳ | 29 | 8810 | 0.42 | 0.20 | 1.2 | 0.6 |
| 6 | Trúc Cơ Trung Kỳ | 32 | 14580 | 0.63 | 0.29 | 1.9 | 0.9 |
| 7 | Trúc Cơ Hậu Kỳ | 35 | 23920 | 0.95 | 0.44 | 2.8 | 1.3 |
| 8 | Trúc Cơ Đỉnh Phong | 39 | 59970 | 2.14 | 0.99 | 5.0 | 2.3 |
| 9 | Kim Đan Sơ Kỳ | 43 | 66120 | 2.14 | 0.99 | 7.1 | 3.3 |
| 10 | Kim Đan Trung Kỳ | 47 | 108410 | 3.20 | 1.48 | 10.3 | 4.8 |
| 11 | Kim Đan Hậu Kỳ | 52 | 179910 | 4.81 | 2.22 | 15.1 | 7.0 |
| 12 | Kim Đan Đỉnh Phong | 57 | 443730 | 10.81 | 5.01 | 25.9 | 12.0 |
| 13 | Nguyên Anh Sơ Kỳ | 63 | 490440 | 10.81 | 5.01 | 36.7 | 17.0 |
| 14 | Nguyên Anh Trung Kỳ | 69 | 805720 | 16.22 | 7.51 | 52.9 | 24.5 |
| 15 | Nguyên Anh Hậu Kỳ | 76 | 1331200 | 24.33 | 11.26 | 77.3 | 35.8 |
| 16 | Nguyên Anh Đỉnh Phong | 84 | 3310480 | 54.74 | 25.34 | 132.0 | 61.1 |
| 17 | Hóa Thần Sơ Kỳ | 92 | 3625760 | 54.74 | 25.34 | 186.7 | 86.5 |
| 18 | Hóa Thần Trung Kỳ | 101 | 5970680 | 82.11 | 38.01 | 268.9 | 124.5 |
| 19 | Hóa Thần Hậu Kỳ | 111 | 9842760 | 123.16 | 57.02 | 392.0 | 181.5 |
| 20 | Hóa Thần Đỉnh Phong | 122 | 24340880 | không áp dụng | không áp dụng | không áp dụng | không áp dụng |

#### B.3 Pacing kinh tế (mục tiêu khởi điểm)

Phần này ước lượng thu nhập Spirit_Stone mỗi giờ so với chi phí thử thu phục tự động, tính bằng script từ các tham số ở bảng tham số và từ B.2. Đây là mục tiêu khởi điểm để chỉnh khi chơi thử, không phải cam kết cố định, và chưa được kiểm chứng bằng mô phỏng chiến đấu.

- Đầu vào lấy từ yêu cầu: Tick_Interval 5 giây (720 Tick mỗi giờ); đúng một Encounter mỗi Tick khi Player_Character ở Adventure_Mode ngoài Recovery_State (Requirement 3 tiêu chí 8); Victory_Reward_Per_Level 3; giá Taming_Talisman trong Shop_Prices.
- Đầu vào giả định, chưa có trong Balance_Config và cần xác nhận khi có dữ liệu Zone: trọng số Encounter_Type nằm trong Content_Catalog theo từng Zone, nên tạm giả định Monster 0.60, NPC_Cultivator 0.15, Resource 0.15 và Kỳ_Ngộ 0.10; 0.85 số trận kết thúc với Victory; 0.80 số Tick nằm ngoài Recovery_State; Level của kẻ địch bằng Level của Player_Character; Auto_Tame không lọc, mỗi Victory trước Monster_Instance dùng đúng một Taming_Talisman (trường hợp chi nhiều nhất).
- Kết quả trung gian: 576 Tick mỗi giờ ngoài Recovery_State, 432 trận mỗi giờ, 367.2 Victory mỗi giờ, trong đó 293.76 Victory trước Monster_Instance. Thu nhập chỉ tính phần thưởng Victory và bỏ qua Spirit_Stone từ Drop_Table, Kỳ_Ngộ, phân giải, bán Material và thả Spirit_Beast, nên là ước lượng thấp.
- Chi phí mỗi giờ của Auto_Tame không lọc, không đổi theo Level: 2937.6 với Hoàng, 14688 với Huyền, 73440 với Địa, 367200 với Thiên.

| Level | Thu nhập mỗi giờ từ Victory | Thu nhập ÷ chi phí, Hoàng | Thu nhập ÷ chi phí, Huyền | Thu nhập ÷ chi phí, Địa | Thu nhập ÷ chi phí, Thiên |
|---|---|---|---|---|---|
| 1 | 1101.6 | 0.375 | 0.075 | 0.015 | 0.003 |
| 5 | 5508 | 1.875 | 0.375 | 0.075 | 0.015 |
| 10 | 11016 | 3.75 | 0.75 | 0.15 | 0.03 |
| 20 | 22032 | 7.5 | 1.5 | 0.3 | 0.06 |

- Hoàng: thu nhập từ Victory trả đủ mọi lần thử từ Level 3 (tỉ lệ 1.125). Ở Level 1 và 2, thu nhập chỉ trả 37.5% và 75% số lần thử, thiếu khoảng 245 Spirit_Stone trong 0.21 giờ đầu của Lịch Luyện (B.2). Vốn khởi đầu dùng được cho thu phục là 200 (Starting_Spirit_Stone 100 cộng 10 Taming_Talisman hạng Hoàng trị giá 100), nên còn thiếu khoảng 45 nếu người chơi bật Auto_Tame không lọc ngay từ Level 1. Auto_Tame mặc định tắt (bảng tham số) và có bộ lọc (Requirement 9), nên thiếu hụt này chỉ xảy ra trong cấu hình xấu nhất đó.
- Các hạng cao vẫn là khoản chi lớn: Huyền chỉ được trả đủ mọi lần thử từ Level 14 (0.075 × 14 = 1.05); ở Level 20, thu nhập Victory chỉ trả được tối đa 30% số lần thử bằng Địa và 6% bằng Thiên.
- Breakthrough_Pill: giá xấp xỉ 10% thu nhập Victory kiếm được trong lúc rời Level Đỉnh Phong ngay trước Breakthrough, làm tròn lên số tròn, nên tăng cùng nhịp B.2 (Lịch Luyện). Giờ rời Level hiển thị đã làm tròn; thu nhập tính từ giá trị chưa làm tròn.

| Realm đích | Level Đỉnh Phong trước Breakthrough | Giờ rời Level | Thu nhập Victory mỗi giờ | Thu nhập Victory trong thời gian đó | Giá Breakthrough_Pill | Giá ÷ thu nhập |
|---|---|---|---|---|---|---|
| 2 | 4 | 0.42 | 4406.4 | 1858.7 | 200 | 10.8% |
| 3 | 8 | 2.14 | 8812.8 | 18821.4 | 2000 | 10.6% |
| 4 | 12 | 10.81 | 13219.2 | 142927.8 | 15000 | 10.5% |
| 5 | 16 | 54.74 | 17625.6 | 964768.5 | 100000 | 10.4% |

- Tribulation_Talisman có một giá chung 2000, bằng giá Breakthrough_Pill vào Realm 3 (Realm đầu tiên thuộc Tribulation_Realms), tương ứng khoảng 10.6%, 1.4% và 0.2% thu nhập Victory trong lúc rời Level Đỉnh Phong trước Realm 3, 4 và 5.
- Tổng giá một Breakthrough_Pill cho mỗi Realm đích từ 2 đến 5 và một Tribulation_Talisman cho mỗi Realm đích từ 3 đến 5 là 123200 Spirit_Stone, khoảng 1.7% tổng thu nhập Victory ước lượng từ Level 1 đến Level 19 (khoảng 7295682). Vì vậy Đan Dược và Độ Kiếp Phù là khoản chi nhỏ; khoản chi chính là Taming_Talisman hạng cao.
- Release_Base: giá trị thả điển hình ở Level 10 (Aptitude_Total 1.0, Size_Class Vừa, không Mutation) là 20, thấp hơn 30 của một Victory ở cùng Level.

#### B.4 Launch_Content_Minimums

Bảng dưới là giá trị khởi điểm của tham số Launch_Content_Minimums: số mục tối thiểu của từng loại nội dung trong Content_Catalog khi ra mắt. CI_Pipeline kiểm tra bảng này (Requirement 25 tiêu chí 14). Các phép đo ở B.5 dựa trên các số này; riêng hình dạng của một Zone nêu ở B.5. Số lượng tối thiểu của asset hình ảnh không nằm ở đây mà được thêm ở Requirement 28.

| Loại nội dung | Số mục tối thiểu | Điều kiện đi kèm |
|---|---|---|
| Monster_Species | 24 | không có |
| Personality | 12 | không có |
| Origin | 6 | không có |
| Skill | 72 | Mỗi nhóm trong sáu nhóm Skill có ít nhất 12 Skill (cao hơn Min_Skills_Per_Category của Requirement 18). |
| Cultivation_Method | 12 | Có ít nhất 4 Cultivation_Method hạng Hoàng. |
| Item_Template | 44 | Mỗi Equipment_Slot trong sáu ô nhìn thấy được có ít nhất 6 Item_Template (36 mục), Ring có ít nhất 4 và Talisman có ít nhất 4. |
| Affix | 48 | Có ít nhất 6 Affix_Group tiền tố và 6 Affix_Group hậu tố, mỗi Affix_Group có ít nhất 4 Affix. |
| Tiên_Văn | 8 | không có |
| Event_Template | 24 | không có |
| Zone | 6 | không có |
| Họ Hán-Việt của tên Cultivator | 60 | không có |
| Bảng âm tiết tên gọi của Cultivator | 2 bảng | Mỗi bảng có ít nhất 60 âm tiết. |
| Đạo_Hiệu | 40 | không có |
| Bảng âm Hán-Việt của tên riêng Item_Instance hạng Thiên và Tiên | 2 bảng | Mỗi bảng có ít nhất 60 âm. |

#### B.5 Đo độ đa dạng

Phần này ghi kết quả mô phỏng ngày 2026-11-11 cho thấy các ngưỡng khởi điểm của Max_Duplicate_Rate_By_Kind và Min_Distinct_Name_Ratio đạt được. Mô phỏng chạy trên hình dạng Content_Catalog giả định ghi bên dưới, không phải trên Content_Catalog thật, với mỗi mẫu N = 10000. Diversity_Report trong CI_Pipeline phải tái tạo các phép đo tương ứng trên Content_Catalog thật (Requirement 25 tiêu chí 5); khi kết quả thật khác, chỉnh nội dung hoặc chỉnh ngưỡng. Mô phỏng chỉ gồm Duplicate_Rate và Distinct_Name_Ratio; kiểm tra phân bố ở Requirement 25 tiêu chí 11 và 12 chưa có kết quả mô phỏng. Đây là mục tiêu khởi điểm để chỉnh khi chơi thử, không phải cam kết cố định.

- Monster_Instance: một Zone có 6 Monster_Species và khoảng Level gồm 3 Level; 12 Personality; mỗi Monster_Species có nhóm 6 Skill và mỗi Monster_Instance có từ 2 đến 4 Skill (Monster_Skill_Count_Min, Monster_Skill_Count_Max); Size_Bucket_Width 0.05; Aptitude_Bucket_Count 4. Số Monster_Species và số Level của một Zone ở đây là hình dạng mẫu, chưa phải mức tối thiểu của B.4.
- Cultivator: số Element của Linh_Can theo Linh_Can_Count_Weights 2, 8, 20, 30, 40; 12 Personality; 6 Origin; 4 Cultivation_Method hạng Hoàng; Base_Appearance gồm 2 Body_Template, 4 khuôn mặt, 6 kiểu tóc, 8 màu tóc, 6 màu mắt và 5 sắc da. Giá trị Purity_Bucket_Count của mô phỏng chưa được ghi lại, nên giá trị mặc định 5 chỉ là đề xuất.
- Item_Instance: Rarity_Tier bắt buộc; 44 Item_Template; mỗi Item_Template cho phép 4 Affix_Group tiền tố và 4 Affix_Group hậu tố trong 6 + 6 Affix_Group, mỗi Affix_Group có 4 Affix; 5 Level (Item_Level_Spread 2); Roll_Bucket_Count 2.
- Tên: 60 họ Hán-Việt; hai bảng âm tiết tên gọi, mỗi bảng 60 âm tiết; hai bảng âm Hán-Việt của tên riêng Item_Instance, mỗi bảng 60 âm; 44 Item_Template; 8 Tiên_Văn.

Kết quả Duplicate_Rate, mỗi mẫu 10000 thực thể. Cột thứ hai dùng Fingerprint của Requirement 19 tiêu chí 13, cột thứ ba dùng Diversity_Fingerprint của Requirement 25 tiêu chí 1 đến 3.

| Loại đo | Duplicate_Rate với Fingerprint của Requirement 19 | Duplicate_Rate với Diversity_Fingerprint | Ngưỡng Max_Duplicate_Rate_By_Kind |
|---|---|---|---|
| Monster_Instance | không áp dụng | 0.00% (10000 Diversity_Fingerprint khác nhau) | 0.01 |
| Cultivator | không áp dụng | 0.00% (10000 Diversity_Fingerprint khác nhau) | 0.01 |
| Item_Instance hạng Phàm | 100% | 100% | không áp dụng (chỉ báo cáo) |
| Item_Instance hạng Hoàng | 60.6% | 10.5% | 0.20 |
| Item_Instance hạng Huyền | 15.5% | 0.32% | 0.01 |
| Item_Instance hạng Địa | 2.4% | 0.00% | 0.01 |
| Item_Instance hạng Thiên | 0.60% | 0.00% | 0.01 |
| Item_Instance hạng Tiên | 0.30% | 0.00% | 0.01 |

- Fingerprint của Requirement 19 một mình để Hoàng, Huyền và Địa ở 60.6%, 15.5% và 2.4%. Vì vậy Diversity_Fingerprint thêm Level và khoảng giá trị lăn, đưa ba hạng này xuống 10.5%, 0.32% và 0.00%.
- Hạng Phàm không có Affix. Với 44 Item_Template, 5 Level và 2 khoảng lăn của Implicit_Stat, hạng Phàm chỉ có tối đa 440 giá trị Diversity_Fingerprint cho 10000 mẫu, nên 100% là hệ quả của cấu tạo và hạng Phàm chỉ được báo cáo.

Kết quả Distinct_Name_Ratio, mỗi mẫu 10000 thực thể.

| Loại đo | Cấu trúc tên mô phỏng | Số tổ hợp tên | Distinct_Name_Ratio | Ngưỡng Min_Distinct_Name_Ratio |
|---|---|---|---|---|
| Cultivator | 60 họ, tên gọi hai âm tiết từ hai bảng 60 | 216000 | 97.76% | 0.95 |
| Cultivator, cấu trúc bị loại | 60 họ, tên gọi lấy từ một bảng 120 | 7200 | 53.9% | 0.95 (không đạt) |
| Item_Instance hạng Thiên | hai bảng âm 60 ghép với tên của một trong 44 Item_Template | 158400 | 97.12% | 0.95 |
| Item_Instance hạng Tiên | như hạng Thiên, thêm tên của một trong 8 Tiên_Văn | 1267200 | 99.58% | 0.98 |

- Cấu trúc tên gọi lấy từ một bảng 120 chỉ đạt 53.9%, thấp hơn ngưỡng của Cultivator, nên Requirement 25 tiêu chí 9 bắt buộc tên gọi hai âm tiết từ hai bảng.
- Độ đa dạng của Kỳ_Ngộ không được đo ở đây mà do Event_Distinct_Window bảo đảm (Requirement 7).

#### B.6 Launch_Asset_Minimums và Pilot_Asset_Minimums

Các bảng dưới là giá trị khởi đầu của hai tham số Launch_Asset_Minimums và Pilot_Asset_Minimums: số asset tối thiểu của từng Asset_Class trong Launch_Asset_Set và Pilot_Asset_Set. CI_Pipeline kiểm tra Launch_Asset_Minimums bằng Asset_Coverage_Report (Requirement 28 criterion 15, 16), và Art_Pipeline dùng Pilot_Asset_Minimums để tạo Pilot_Asset_Set (Requirement 29 criterion 1, 16). Số Item_Template, Monster_Species, Zone và Tiên_Văn lấy từ Launch_Content_Minimums (B.4). Đây là giá trị khởi đầu để chỉnh sau khi duyệt pilot, không phải cam kết cố định.

**Launch_Asset_Minimums: Art_Layer nhân vật.** Cột "Tính theo" cho biết số tối thiểu áp dụng cho toàn bộ hay cho từng Body_Template. Cột "Art_Layer mỗi đơn vị" là quy ước đếm để tính tổng; số lớp của lớp thân và của Default_Outfit là giả định, cần đối chiếu với Z_Order_Table.

| Asset_Class | Số tối thiểu | Tính theo | Art_Layer mỗi đơn vị | Ghi chú |
| --- | --- | --- | --- | --- |
| Body_Template | 2 | toàn bộ | 1 | Mỗi Body_Template có một Art_Layer thân. |
| Khuôn mặt | 4 | mỗi Body_Template | 1 | Một Art_Layer mỗi khuôn mặt. |
| Kiểu tóc | 6 | mỗi Body_Template | 2 | hair_back và hair_front. |
| Default_Outfit | 1 | mỗi Body_Template | 3 | Giả định tính như một Robe: robe_back, robe_front, sleeves. |
| Art base Robe | 6 | mỗi Body_Template | 3 | robe_back, robe_front, sleeves. |
| Art base Weapon | 6 | mỗi Body_Template | 1 | |
| Art base Headwear | 6 | mỗi Body_Template | 1 | |
| Art base Footwear | 6 | mỗi Body_Template | 1 | |
| Art base Back | 6 | mỗi Body_Template | 1 | |
| Art base Accessory | 6 | mỗi Body_Template | 1 | |

Mỗi art base ứng với một Item_Template hiển thị và có art_base_id riêng, nên có 6 slot × 6 = 36 art_base_id, mỗi art_base_id có một tệp cho từng Body_Template.

Tổng Art_Layer nhân vật, tính từ bảng trên:

- Mỗi Body_Template: 1 (thân) + 4 (khuôn mặt) + 6 × 2 = 12 (kiểu tóc) + 1 × 3 = 3 (Default_Outfit) + 6 × 3 = 18 (Robe) + 5 × 6 = 30 (Weapon, Headwear, Footwear, Back, Accessory) = 68.
- Hai Body_Template: 2 × 68 = 136 Art_Layer nhân vật, trong đó 134 lớp không kể lớp thân.

**Launch_Asset_Minimums: palette.**

| Asset_Class | Số tối thiểu | Ghi chú |
| --- | --- | --- |
| Palette màu tóc | 8 | Áp lên hair_back và hair_front qua Palette_Mask. |
| Palette màu mắt | 6 | Áp lên khuôn mặt qua Palette_Mask. |
| Palette tông da | 5 | Áp lên lớp thân và khuôn mặt qua Palette_Mask. |
| Palette vật phẩm theo (Rarity_Tier, Element chủ đạo hoặc trung tính) | 54 | 6 Rarity_Tier × 9 (8 Element và trung tính), theo Requirement 19 criterion 12. Tạo bằng đổi màu xác định, không tạo lại bằng mô hình sinh ảnh. |
| Palette_Mask | 1 mỗi Art_Layer có thể đổi màu | Gồm art base trang bị, kiểu tóc, khuôn mặt và lớp thân. |

**Launch_Asset_Minimums: Effect_Overlay.**

| Asset_Class | Số tối thiểu | Ghi chú |
| --- | --- | --- |
| Aura Element và trung tính | 9 | Hai biến thể front và back, tổng 18 tệp. |
| Overlay Tiên_Văn | 8 | Một overlay mỗi Tiên_Văn. |
| Aura Dị Biến dùng chung | 9 | Một aura mỗi Element và một aura trung tính. |

Tổng Effect_Overlay: 18 + 8 + 9 = 35 tệp.

**Launch_Asset_Minimums: quái, nền, icon và asset dùng chung.** Icon Skill được ghép từ Element emblem và category glyph, icon của Item_Template hiển thị được dựng từ Art_Layer, nên hai nhóm này không có dòng riêng (Requirement 28 criterion 8).

| Asset_Class | Số tối thiểu | Ghi chú |
| --- | --- | --- |
| Ảnh quái | 24 | Một ảnh mỗi Monster_Species. Mỗi ảnh có ít nhất 2 palette thường và 1 palette Dị Biến, tức ít nhất 24 × 3 = 72 biến thể màu tạo bằng đổi màu xác định. |
| Ảnh nền Zone | 6 | Một ảnh mỗi Zone. |
| Icon Ring | 4 | Một icon mỗi Item_Template Ring. |
| Icon Talisman | 4 | Một icon mỗi Item_Template Talisman. |
| Icon Taming_Talisman | 4 | |
| Icon HP_Pill | 3 | |
| Icon Breakthrough_Pill | 4 | |
| Icon Tribulation_Talisman | 1 | |
| Icon Skill_Book | 1 | |
| Icon Material | theo Content_Catalog | Một icon mỗi loại Material trong Content_Catalog. |
| Element emblem | 9 | 8 Element và trung tính. |
| Category glyph | 6 | |
| Rarity frame | 6 | Một khung mỗi Rarity_Tier. |
| Size_Class badge | 5 | Một huy hiệu mỗi Size_Class. |

Icon cần vẽ riêng, chưa kể Material: 4 + 4 + 4 + 3 + 4 + 1 + 1 = 21. Asset dùng chung: 9 + 6 + 6 + 5 = 26.

**Pilot_Asset_Minimums.** Pilot dùng một Body_Template; các dòng tính theo Body_Template áp dụng cho Body_Template đó, với cùng quy ước đếm lớp như trên.

| Asset_Class | Số tối thiểu | Ghi chú |
| --- | --- | --- |
| Body_Template | 1 | |
| Khuôn mặt | 2 | |
| Kiểu tóc | 2 | |
| Default_Outfit | 1 | |
| Art base Robe | 2 | |
| Art base Weapon | 2 | |
| Art base Headwear | 1 | |
| Art base Footwear | 1 | |
| Art base Back | 1 | |
| Art base Accessory | 1 | |
| Biến thể palette | 3 mỗi art base, cho 2 art base | Tổng 6 biến thể, tạo bằng đổi màu xác định. |
| Effect_Overlay | 3 | |
| Ảnh quái | 3 | Kèm 1 palette Dị Biến. |
| Ảnh nền Zone | 1 | |
| Style_Anchor | Style_Anchor_Min_Count | Số ảnh theo tham số. |

Art_Layer nhân vật của pilot: 1 (thân) + 2 (khuôn mặt) + 2 × 2 = 4 (kiểu tóc) + 1 × 3 = 3 (Default_Outfit) + 2 × 3 = 6 (Robe) + 2 + 1 + 1 + 1 + 1 = 6 (Weapon, Headwear, Footwear, Back, Accessory) = 22.
