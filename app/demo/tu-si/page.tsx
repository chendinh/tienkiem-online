import { TusiGallery } from '@/components/lab/TusiGallery';
import './tusi.css';

export const metadata = { title: 'Tạo hình tu sĩ · demo · Tiên Kiếm', robots: { index: false, follow: false } };
// Every cultivator picture drawn by AI (scripts/gen-tusi.ts), to look over before they go into the game. It holds no data and asks the server for nothing.
export default function TusiPage() { return <TusiGallery />; }
