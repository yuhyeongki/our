import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '김해영운고등학교 1:1 개별 상담 및 비밀 건의함',
  description:
    '선생님과 학생들이 안전하고 따뜻하게 소통할 수 있는 학급 전용 개별 상담 신청 및 비밀 건의함 플랫폼입니다.',
  keywords: ['상담신청', '비밀건의함', '학급소통', '김해영운고등학교'],
  authors: [{ name: '김해영운고등학교' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FDFBF7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col bg-warm-50 font-sans text-warm-900 selection:bg-sage-200 selection:text-sage-900">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
