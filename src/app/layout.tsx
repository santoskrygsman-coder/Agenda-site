import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BookingProvider } from "@/context/BookingContext";

export const metadata: Metadata = {
  title: "Emile Lash Designer • Agendamento Online",
  description:
    "Extensão de cílios, sobrancelha, Brow Lamination e Lash Lifting em Posto da Mata.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Agendamento",
  },
};

export const viewport: Viewport = {
  themeColor: "#F6EFEA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var clean=function(){document.querySelectorAll('script[data-nf-variant],[data-netlify-site-id],iframe[srcdoc]').forEach(function(e){e.remove()});};clean();new MutationObserver(clean).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <BookingProvider>{children}</BookingProvider>
      </body>
    </html>
  );
}
