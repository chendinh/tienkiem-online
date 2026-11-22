import { Anh18Lab } from '@/components/lab/Anh18Lab';
import './anh18.css';

export const metadata = { title: 'Ảnh 18+ · thử model · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's lab. The page holds no data: it asks /api/lab/anh18 with the key the owner types (the same ADMIN_KEY as /admin).
export default function Anh18LabPage() { return <Anh18Lab />; }
