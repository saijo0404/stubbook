import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'StubBook (票根手帳) - 演唱會歷程與資訊記錄',
  description: '精準售票網頁解析管線 × 結構化個人回憶資料庫 × 跨平台擬真手帳',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'StubBook',
  },
};

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="antialiased selection:bg-indigo-500 selection:text-white">
        <ServiceWorkerRegister />
        <header className="border-b border-gray-800/80 bg-gray-950/60 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🎟️</span>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                  StubBook
                </span>
                <span className="ml-2 text-xs text-gray-400 hidden sm:inline-block border border-gray-700/60 px-2 py-0.5 rounded-full">
                  票根手帳 v1.2.0
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <span className="inline-flex items-center text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                KKTIX & 拓元 解析在線
              </span>
              <a
                href="https://github.com/saijo0404/stubbook"
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-gray-800/60 py-8 text-center text-xs text-gray-500">
          StubBook (票根手帳) · 跨平台演唱會歷程與資訊記錄系統
        </footer>
      </body>
    </html>
  );
}
