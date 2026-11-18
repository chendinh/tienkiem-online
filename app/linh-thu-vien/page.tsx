import { Zoo } from '@/components/zoo/Zoo';
import './zoo.css';

export const metadata = { title: 'Linh Thú Viên · Tiên Kiếm', robots: { index: false, follow: false } };
// A page of its own (not a window of the game): the game is not loaded here, so its timers, canvases and music are not running and the phone's whole power goes to the creatures.
export default function LinhThuVienPage() { return <Zoo />; }
