import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Panduan Penggunaan — FlashMail",
    description: "Cara menggunakan layanan email sementara FlashMail.",
};

export default function PanduanPage() {
    return (
        <main style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
            <h1 className="hero-title" style={{ fontSize: 32, marginBottom: 24, textAlign: "left" }}>
                Panduan Penggunaan FlashMail
            </h1>

            <div className="paper-border" style={{ padding: 32, background: "var(--surface)" }}>
                <section style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 700 }}>1. Untuk Pengguna Gratis</h2>
                    <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 12 }}>
                        Kamu bisa membuat hingga 3 alamat email aktif sekaligus
                        Masa aktif email dibatasi selama 2 jam sejak pertama kali dibuat
                        Semua email yang masuk akan dihapus otomatis setelah kotak masuk kadaluarsa
                    </p>
                </section>

                <section style={{ marginBottom: 32 }}>
                    <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 700 }}>2. Untuk Pengguna Premium</h2>
                    <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginBottom: 12 }}>
                        Jika kamu sering butuh email untuk registrasi berbagai hal, kamu bisa upgrade ke paket premium
                        Kamu bebas membuat custom alias email (namakamu@flashmail.qzz.io)
                        Kamu bisa atur masa aktif secara presisi mulai dari hitungan menit, jam, sampai hari
                    </p>
                    <ul style={{ color: "var(--on-surface-variant)", lineHeight: 1.6, marginTop: 12, paddingLeft: 20 }}>
                        <li>Paket Basic: Buat maksimal 50 email kustom setiap harinya</li>
                        <li>Paket Pro: Buat maksimal 200 email kustom setiap harinya</li>
                        <li>Paket Unlimited: Bebas buat sebanyak-banyaknya tanpa khawatir limit harian</li>
                    </ul>
                </section>

                <section>
                    <h2 style={{ fontSize: 20, marginBottom: 16, fontWeight: 700 }}>3. Cara Membeli dan Mengakses Dashboard</h2>
                    <p style={{ color: "var(--on-surface-variant)", lineHeight: 1.6 }}>
                        Silakan daftar akun dengan Email atau klik lanjut dengan Google
                        Klik menu Dashboard yang muncul di pojok kanan atas
                        Klik tombol Langganan dan pilih paket mana yang pas untuk kebutuhan kamu
                        Scan QR Code QRIS yang disediakan untuk membayar
                        Akun kamu otomatis aktif setelah pembayaran berhasil
                    </p>
                </section>
            </div>

            <div style={{ marginTop: 24, textAlign: "center" }}>
                <Link href="/" className="btn-outline" style={{ display: "inline-block" }}>
                    Kembali ke Beranda
                </Link>
            </div>
        </main>
    );
}
