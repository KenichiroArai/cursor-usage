import type { Metadata } from 'next';
import Script from 'next/script';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@/styles/fc001-common.css';

export const metadata: Metadata = {
  title: 'Cursor使用記録',
  description:
    'Cursorの使用状況をまとめたダッシュボード。使用記録、サマリー、Usage Eventsを確認できます。',
  openGraph: {
    title: 'Cursor使用記録ダッシュボード',
    type: 'website',
    locale: 'ja_JP',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-light">
        {children}
        <Script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
