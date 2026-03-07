import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NavigationProvider from "@/components/NavigationProvider";
import { Suspense } from "react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// METADATA - Fayllaringizni shu yerga bog'laymiz
export const metadata: Metadata = {
  title: "Smart Dokon",
  description: "Biznesni tizimlashtirish",
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
      </body>
    </html>
  );
}