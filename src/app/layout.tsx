import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agendamento Estética",
  description: "Agende seu horário conosco",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Agendamento",
  },
};

export const viewport: Viewport = {
  themeColor: "#B98389",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {},
                  function(err) {}
                );
              });
            }
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#FCFAFA] min-h-screen text-gray-900 flex flex-col items-center justify-center p-5`}>
        <div className="bg-white p-10 rounded-[24px] shadow-[0_10px_30px_rgba(0,0,0,0.05)] max-w-md border border-[#F3E8E8] text-center">
          <h1 className="text-[#A76D74] text-2xl font-bold mb-4">✨ Temporariamente Offline</h1>
          <p className="text-[#8B7E7F] text-base leading-relaxed mb-2">
            O sistema de agendamentos está passando por uma manutenção e foi temporariamente desativado.
          </p>
          <p className="text-[#8B7E7F] text-base leading-relaxed">
            Voltaremos em breve! 💕
          </p>
        </div>
      </body>
    </html>
  );
}
