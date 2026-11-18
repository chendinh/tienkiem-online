import { ZooLab } from '@/components/lab/ZooLab';
import './lab.css';

export const metadata = { title: 'Linh Thú Viên · thử hoạt ảnh · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's lab. The page holds no data: it asks /api/lab/anim with the key the owner types (the same ADMIN_KEY as /admin).
export default function LinhThuLabPage() { return <ZooLab />; }
