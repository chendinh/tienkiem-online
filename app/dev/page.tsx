import { notFound } from 'next/navigation';
import { DevTools } from '@/components/dev/DevTools';

export const metadata = { title: 'Dev · Tiên Kiếm', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';
// Buttons for the developer, only on your own machine (npm run dev). They need no database and no admin key; on Vercel / in production this page is a 404.
export default function DevPage() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) notFound();
  return <DevTools />;
}
