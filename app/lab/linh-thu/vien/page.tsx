import { ZooSpots } from '@/components/lab/ZooSpots';
import '../lab.css';

export const metadata = { title: 'Linh Thú Viên · chỗ đứng · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's demo: creatures standing at fixed spots of one background, each moving in place the way the spot suits (drinking, eating, resting).
export default function LinhThuVienLabPage() { return <ZooSpots />; }
