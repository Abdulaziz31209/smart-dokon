import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NavigationProvider from "@/components/NavigationProvider";
import { Suspense } from "react";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// METADATA - Fayllaringizni shu yerga bog'laymiz
export const metadata: Metadata = {
  title: "Smart-Dokon.Ai - Biznesni boshqarish AI bilan osonroq",
  description: "Biznesni boshqarish AI bilan osonroq. Smart-Dokon.Ai orqali biznesni tizimlashtiring, foydangizni oshiring va raqobatchilarni kuzating.",
  // Icons qismi public papkasidagi fayllaringizni brauzerga tushuntiradi
  icons: {
    icon: [
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  // PWA uchun qo'shimcha meta teglar
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Smart-Dokon',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#020617] text-white`}>
        <Suspense fallback={<div className="min-h-screen bg-[#020617]" />}>
          <NavigationProvider>
            <Navbar /> 
            <main className="min-h-screen">
              {children}
            </main>
          </NavigationProvider>
        </Suspense>
        <PWAInstallPrompt />
      </body>
    </html>
  );
}