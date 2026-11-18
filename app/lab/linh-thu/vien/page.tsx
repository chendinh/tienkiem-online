import { Garden } from '@/components/lab/Garden';
import '../lab.css';

export const metadata = { title: 'Linh Thú Viên · vườn thú · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's garden: creatures (one idle clip each, background cut out) dragged onto backgrounds that have a flat ground to stand on.
export default function LinhThuVienLabPage() { return <Garden />; }
