import { GenAiAdmin } from '@/components/admin/GenAiAdmin';
import './gaadmin.css';

export const metadata = { title: 'Quản lý Tiên Dung Họa Quán · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's page for /gen-ai. It holds no data: it asks /api/admin/gen-ai with the same key as /admin (kept in this tab).
export default function GenAiAdminPage() { return <GenAiAdmin />; }
