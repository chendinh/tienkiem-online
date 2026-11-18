import { SceneLab } from '@/components/lab/SceneLab';
import '../lab.css';

export const metadata = { title: 'Cảnh thử · Linh Thú · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's scene: cut-out creatures walking on a background picture. Asks /api/lab/anim with the key the owner types (the same ADMIN_KEY as /admin).
export default function LinhThuSceneLabPage() { return <SceneLab />; }
