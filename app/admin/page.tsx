import { ReportPage } from '@/components/admin/Report';
export const metadata = { title: 'Báo cáo · Tiên Kiếm', robots: { index: false, follow: false } };
// The owner's report. The page itself holds no data: it asks /api/admin/report with the key the owner types (see lib/server/admin.ts).
export default function AdminPage() { return <ReportPage />; }
