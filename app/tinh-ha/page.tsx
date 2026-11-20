import { Galaxy } from '@/components/galaxy/Galaxy';
import './galaxy.css';

export const metadata = { title: 'Vạn Giới Tinh Đồ · Tiên Kiếm', robots: { index: false, follow: false } };
// A page of its own, like Linh Thú Viên: the game is not loaded here, so its timers and canvases are not running and the whole device goes to the star chart.
export default function TinhHaPage() { return <Galaxy />; }
