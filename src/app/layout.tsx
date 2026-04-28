import type { Metadata } from "next";
import "./globals.css";
import LoadingScreen from "@/components/LoadingScreen";

export const metadata: Metadata = {
  title: "FlashMail - Email Sementara Gratis",
  description:
    "Dapatkan email sementara dalam hitungan detik. Privat, dan anonim. Lindungi privasi kamu dari spam",
  keywords: ["temp mail", "email sementara", "disposable email", "privacy", "anonymous email", "flashmail"],
  openGraph: {
    title: "FlashMail — Email Sementara Gratis",
    description: "Dapatkan email sementara dalam hitungan detik. Privat, dan anonim",
    type: "website",
    images: ["/icon.png"],
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
      <body>
        <LoadingScreen />
        {children}
        <footer
          style={{
            textAlign: "center",
            padding: "48px 24px 32px",
            fontSize: 13,
            color: "var(--outline)",
          }}
        >
          <p style={{ marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: "var(--primary)" }}>FlashMail</span> - Email
            sementara yang cepat & aman
          </p>
          <p style={{ fontWeight: 600, opacity: 0.8 }}>2026 © R-Universe Labs</p>
        </footer>
      </body>
    </html>
  );
}
