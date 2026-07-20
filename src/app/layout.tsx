import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ses Asistanı",
  description: "Yapay Zeka Destekli Ses Analiz Programı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}