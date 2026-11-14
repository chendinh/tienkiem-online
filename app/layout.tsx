import './globals.css';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { FxProvider } from '@/components/fx/FxProvider';
import { TooltipHost } from '@/components/ds/TooltipHost';

export const metadata = { title: 'Tiên Kiếm', description: 'Game tu tiên treo máy — bản thử nghiệm trực quan' };
export const viewport: Viewport = { themeColor: '#060d14', colorScheme: 'dark' };

// Sets the effects level before the first paint (saved choice, or off when the system asks for reduced motion), so nothing flashes.
const FX_INIT = "try{var s=localStorage.getItem('tutien-fx'),m=matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.fx=s||(m?'off':'mid')}catch(e){}";
const FONTS = ['spectral-normal-500-latin', 'spectral-normal-500-vietnamese', 'cormorant-garamond-normal-500_700-latin', 'cormorant-garamond-normal-500_700-vietnamese'];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" data-fx="mid" suppressHydrationWarning>
      <head>
        {FONTS.map((f) => <link key={f} rel="preload" as="font" type="font/woff2" crossOrigin="anonymous" href={`/fonts/${f}.woff2`} />)}
        <script dangerouslySetInnerHTML={{ __html: FX_INIT }} />
      </head>
      <body>
        <FxProvider>
          {children}
          <TooltipHost />
        </FxProvider>
        <Analytics />
      </body>
    </html>
  );
}
