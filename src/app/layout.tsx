import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashMail — Email Sementara yang Estetis",
  description:
    "Dapatkan email sementara dalam hitungan detik. Privat, anonim, dan cantik. Lindungi privasi kamu dari spam.",
  keywords: ["temp mail", "email sementara", "disposable email", "privacy", "anonymous email", "flashmail"],
  openGraph: {
    title: "FlashMail — Email Sementara yang Estetis",
    description: "Dapatkan email sementara dalam hitungan detik. Privat, anonim, dan cantik.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
