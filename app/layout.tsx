import "./globals.css";
import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import { Providers } from "./providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "PUBLI*CAT",
  description: "Plataforma de vídeo per a centres educatius",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca" className={`${montserrat.variable} ${inter.variable}`}>
      <body className="bg-[#F9FAFB] text-[#111827]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
