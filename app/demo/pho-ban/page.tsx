import { RaidDemo } from '@/components/lab/RaidDemo';
import './demo.css';

export const metadata = { title: 'Phó Bản · demo · Tiên Kiếm', robots: { index: false, follow: false } };
// The Phó Bản demo: a fight made up in the browser, started at any time with as many cultivators as asked. It holds no data and asks the server for nothing.
export default function RaidDemoPage() { return <RaidDemo />; }
