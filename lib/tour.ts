// The hints a new player sees at the moment something happens for the first time, and the same words as the pages of the Cẩm nang (the guide).
// `hint` is one or two short sentences shown once in a card; `guide` is the longer text of the Cẩm nang page. A topic with no `hint` is only in the guide.
// The ids the player has seen are saved with the character (Player.tour); the server accepts only ids listed here.
export interface Topic { id: string; title: string; hint?: string; guide: string }
export const TOPICS: Topic[] = [
  { id: 'idle', title: 'Game chạy như thế nào',
    guide: 'Nhân vật tự tu luyện, giao chiến và nhặt đồ theo từng nhịp của máy chủ, kể cả khi ngươi đóng game. Khi quay lại, bảng “Chào mừng trở lại” cho biết đã xảy ra những gì. Thời gian vắng mặt được tính tối đa {offline} giờ.' },
  { id: 'modes', title: 'Lịch Luyện và Bế Quan',
    guide: 'Lịch Luyện: nhân vật ra ngoài săn linh thú và nhặt pháp khí. Bế Quan: ngồi tu một chỗ, tu vi tăng gấp đôi nhưng không gặp yêu thú, không nhặt đồ. Máu xuống thấp thì nhân vật tự vào trạng thái Điều Tức để hồi phục rồi mới đi tiếp.' },
  { id: 'tame', title: 'Thu phục linh thú',
    hint: 'Game dừng lại hỏi: thu phục con này không? Bấm nút hạng Khế Ước Phù để thu phục, hoặc “Bỏ qua”. Để quá {tameSec} giây là tự bỏ qua. Muốn game tự quyết, bật “Tự thu phục” trong Cài đặt.',
    guide: 'Sau mỗi trận thắng, nếu có linh thú đáng giữ, game dừng lại hỏi. Mỗi nút là một hạng Khế Ước Phù kèm xác suất thành công và số phù còn lại. Phù hạng cao có xác suất cao hơn. Quá {tameSec} giây không chọn thì tự bỏ qua. Bật “Tự thu phục” trong Cài đặt để game tự bắt theo kiểu ngươi chọn.' },
  { id: 'mut', title: 'Dị Biến',
    hint: 'Một Dị Biến! Linh thú hiếm mang hình dáng riêng, rất đáng thu phục. Hãy dùng phù hạng cao nhất để có xác suất tốt nhất.',
    guide: 'Dị Biến là linh thú hiếm, có hình dáng khác thường và mỗi loài có nhiều kiểu. Chúng có thể thu phục như thú thường và là món sưu tầm đáng giá. Khi tự thu phục, game luôn dùng phù cao nhất cho Dị Biến, ở mọi kiểu bắt.' },
  { id: 'npc', title: 'Gặp Tu Sĩ',
    hint: 'Một tu sĩ lạ chặn đường: Giao chiến hay Tránh đi? Bật “Tự giao chiến với Tu Sĩ” trong Cài đặt nếu muốn game tự quyết.',
    guide: 'Đôi khi nhân vật gặp một tu sĩ chặn đường. Ngươi chọn Giao chiến hoặc Tránh đi. Khi đang chờ ngươi chọn, hành trình dừng lại. Bật “Tự giao chiến với Tu Sĩ” trong Cài đặt để game tự quyết.' },
  { id: 'item', title: 'Pháp khí và trang bị',
    hint: 'Ngươi vừa nhặt pháp khí đầu tiên. Mở Kho báu, kéo món vào ô trang bị để mặc. Bấm vào món để khóa món muốn giữ: món khóa không bị tự thay hay phân giải.',
    guide: 'Pháp khí nhặt được nằm trong túi. Mặc đồ bằng cách kéo món vào ô trang bị trong Kho báu, hoặc bật “Tự mặc đồ mạnh hơn”. Món đã khóa thì game không tự thay và không tự phân giải. Hiếm càng cao, chỉ số càng mạnh. Hình nhân vật chỉ đổi khi ngươi bấm “Vẽ lại”.' },
  { id: 'recovery', title: 'Điều Tức và đan dược',
    hint: 'Máu xuống thấp nên nhân vật dừng đánh để Điều Tức. Hồi Khí Đan giúp hồi nhanh, game tự dùng và tự mua đan nếu ngươi bật trong Cài đặt.',
    guide: 'Khi máu xuống dưới ngưỡng, nhân vật ngừng giao chiến để hồi phục, và quay lại khi đủ máu. Hồi Khí Đan hồi máu ngay sau trận. Cài đặt có “Tự dùng Hồi Khí Đan” và “Tự mua Hồi Khí Đan khi hết” (chỉ mua hạng 1 và 2). Ngưỡng nghỉ và ngưỡng đi tiếp chỉnh được trong Cài đặt.' },
  { id: 'break', title: 'Đột phá cảnh giới',
    hint: 'Tu vi đã đủ để đột phá. Xác suất thành công hiện sẵn trong bảng đột phá, Phá Cảnh Đan giúp tăng thêm. Chưa sẵn sàng thì bấm “Để sau”.',
    guide: 'Đủ tu vi thì game báo “Đã tới Bình Cảnh”. Đột phá có thể thất bại, và Phá Cảnh Đan cộng thêm xác suất. Linh căn càng thuần càng dễ đột phá, nhưng Tâm Ma lâu hơn và Thiên Kiếp nặng hơn. “Để sau” ẩn câu hỏi một lúc. Bật “Tự đột phá khi đủ an toàn” nếu muốn game tự làm.' },
  { id: 'bag', title: 'Túi và kho',
    hint: 'Túi gần đầy ({bag} chỗ). Bán bớt món thừa ở Phường Thị, và khóa món quý để game không tự thay hay phân giải nó.',
    guide: 'Túi chứa được {bag} món, kho phụ {stash} món. Hãy bán hoặc phân giải món thừa trong Kho báu và Phường Thị, khóa những món ngươi muốn giữ.' },
  { id: 'pen', title: 'Chuồng Linh Thú',
    hint: 'Chuồng Linh Thú gần đầy ({pen} chỗ). Chuồng đầy thì không thu phục thêm được. Mở Linh Thú để bán bớt con yếu.',
    guide: 'Chuồng chứa tối đa {pen} linh thú. Đầy thì các nút thu phục bị khóa. Mở Linh Thú để xem từng con, bán con yếu lấy linh thạch và giữ chỗ cho con tốt hơn.' },
  { id: 'auto', title: 'Các cài đặt tự động',
    guide: 'Mặc định game hỏi ngươi ở những chuyện lớn (thu phục, gặp Tu Sĩ, đột phá, mặc đồ). Trong Cài đặt, mục “Tự động” và “Tự thu phục” cho game tự quyết thay ngươi. Chỉ cần chọn đúng kiểu ngươi muốn rồi bấm Lưu thay đổi.' },
  { id: 'guest', title: 'Khách và tài khoản',
    guide: 'Chơi với tư cách khách thì nhân vật gắn với trình duyệt này. Liên kết email để giữ nhân vật khi đổi máy hoặc xóa dữ liệu trình duyệt, và để họa sư vẽ riêng một diện mạo cho ngươi.' },
];
export const TOUR_IDS = TOPICS.map((t) => t.id);
export const fill = (s: string, v: Record<string, number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
