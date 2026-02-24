import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import NavigationProvider from "@/components/NavigationProvider";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Dokon",
  description: "Biznesni tizimlashtirish",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#020617] text-white`}>
        {/* NavigationProvider hamma narsani o'rab oladi va F5 bosilganda holatni saqlaydi */}
        <NavigationProvider>
          <Navbar /> 
          <main className="min-h-screen">
            {children}
          </main>
        </NavigationProvider>
      </body>
    </html>
  );
}