"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PlanString = "free" | "basic" | "pro" | "unlimited" | "vip";

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [mailboxes, setMailboxes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal Langganan
    const [showBilling, setShowBilling] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);

    // Modal Custom Alias
    const [showCustom, setShowCustom] = useState(false);
    const [customAlias, setCustomAlias] = useState("");
    const [customExpiry, setCustomExpiry] = useState("2");
    const [customLoading, setCustomLoading] = useState(false);

    useEffect(() => {
        fetchSession();
    }, []);

    async function fetchSession() {
        try {
            const res = await fetch("/api/auth");
            const data = await res.json();
            if (!data.authenticated || !data.user) {
                router.push("/");
                return;
            }
            setUser(data.user);
            fetchMailboxes();
        } catch (e) {
            router.push("/");
        }
    }

    async function fetchMailboxes() {
        try {
            const res = await fetch("/api/mailbox");
            const data = await res.json();
            setMailboxes(data.mailboxes || []);
        } finally {
            setLoading(false);
        }
    }

    async function handleCheckout(plan: string) {
        setBillingLoading(true);
        try {
            const res = await fetch("/api/payment/qris", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan }),
            });
            const data = await res.json();
            if (data.redirectUrl) {
                // Navigate to Pakasir gateway
                window.location.href = data.redirectUrl + "&redirect=" + encodeURIComponent(window.location.origin + "/dashboard");
            } else {
                alert(data.error || "Gagal membuka checkout");
            }
        } catch (e) {
            alert("Terjadi kesalahan jaringan");
        } finally {
            setBillingLoading(false);
        }
    }

    async function handleLogout() {
        await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "logout" }),
        });
        router.push("/");
    }

    async function handleDeleteMailbox(id: string) {
        if (!confirm("Hapus kotak masuk ini?")) return;
        await fetch("/api/mailbox", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mailboxId: id }),
        });
        fetchMailboxes();
    }

    async function handleCreateCustom() {
        setCustomLoading(true);
        try {
            const res = await fetch("/api/mailbox", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customAlias: customAlias,
                    customExpiryHours: parseInt(customExpiry)
                })
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Gagal membuat email");
            } else {
                setShowCustom(false);
                setCustomAlias("");
                fetchSession(); // to refresh limit counter
            }
        } catch (e) {
            alert("Terjadi kesalahan jaringan");
        } finally {
            setCustomLoading(false);
        }
    }

    if (loading || !user) {
        return <div style={{ padding: 40, textAlign: "center" }}>Memuat Dashboard...</div>;
    }

    const isPremium = user.plan !== "free";
    let maxDaily = 3;
    if (user.plan === "basic") maxDaily = 250;
    if (user.plan === "pro") maxDaily = 500;

    return (
        <main style={{ padding: "40px 24px", maxWidth: 900, margin: "0 auto", fontFamily: "var(--font)" }}>
            <div style={{
                display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: 40, gap: 16
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 32, color: "var(--primary)" }}>dashboard</span>
                    <h1 className="hero-title" style={{ fontSize: "clamp(24px, 5vw, 32px)", margin: 0 }}>Dashboard</h1>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link href="/" className="btn-outline" style={{ borderRadius: 9999, padding: "10px 20px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                        Kembali
                    </Link>
                    <button onClick={handleLogout} className="btn-ghost" style={{ borderRadius: 9999, padding: "10px 20px", background: "var(--surface-lowest)" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                        Keluar
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, marginBottom: 48 }}>
                {/* Profil Akun Card */}
                <div className="note-card" style={{ background: "var(--note-blue)", borderRadius: 32, padding: 32, transform: "rotate(-1deg)" }}>
                    <div className="paper-border" style={{ width: 48, height: 48, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <span className="material-symbols-outlined icon-filled" style={{ color: "var(--primary)" }}>person</span>
                    </div>
                    <h3 style={{ margin: "0 0 16px 0", fontSize: 22, fontWeight: 800 }}>Profil Akun</h3>
                    <p style={{ margin: "8px 0", color: "var(--on-surface-variant)", fontSize: 15 }}>
                        Email: <strong style={{ color: "var(--on-surface)" }}>{user.email}</strong>
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                        <span style={{ color: "var(--on-surface-variant)", fontSize: 15 }}>Paket:</span>
                        <span className="chip" style={{ background: isPremium ? "var(--note-yellow)" : "var(--surface)", fontWeight: 800, color: isPremium ? "var(--primary)" : "var(--on-surface-variant)" }}>
                            {user.plan === "free" ? "Gratis" : user.plan.toUpperCase()}
                        </span>
                    </div>
                    {isPremium && user.vipUntil && (
                        <p style={{ margin: "8px 0 0 0", color: "var(--on-surface-variant)", fontSize: 14 }}>
                            Aktif s/d: <strong>{new Date(user.vipUntil).toLocaleDateString("id-ID")}</strong>
                        </p>
                    )}

                    <div style={{ marginTop: 24 }}>
                        <button className="btn-primary" style={{ width: "100%", borderRadius: 9999, padding: "14px 24px" }} onClick={() => setShowBilling(true)}>
                            {isPremium ? "Perpanjang / Upgrade Paket" : "Langganan Premium"}
                        </button>
                    </div>
                </div>

                {/* Kuota Card */}
                <div className="note-card" style={{ background: "var(--note-yellow)", borderRadius: 32, padding: 32, transform: "rotate(1deg)" }}>
                    <div className="paper-border" style={{ width: 48, height: 48, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                        <span className="material-symbols-outlined icon-filled" style={{ color: "var(--primary)" }}>data_usage</span>
                    </div>
                    <h3 style={{ margin: "0 0 16px 0", fontSize: 22, fontWeight: 800 }}>Kuota Hari Ini</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>Telah Dibuat</span>
                        <span style={{ fontSize: 15, fontWeight: 800 }}>{user.generationCountToday} / {maxDaily === 9999 ? "∞" : maxDaily}</span>
                    </div>
                    {/* Progress bar made of paper */}
                    <div style={{ width: "100%", height: 16, background: "rgba(255,255,255,0.6)", borderRadius: 9999, overflow: "hidden", border: "2px solid var(--outline)" }}>
                        <div style={{
                            width: `${Math.min((user.generationCountToday / (maxDaily === 9999 ? 1 : maxDaily)) * 100, 100)}%`,
                            height: "100%",
                            background: "var(--primary)",
                            borderRadius: 9999
                        }} />
                    </div>

                    <div style={{ marginTop: 32 }}>
                        {isPremium ? (
                            <button className="btn-primary" onClick={() => setShowCustom(true)} style={{ width: "100%", borderRadius: 9999, padding: "14px 24px", background: "var(--on-surface)", color: "white" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
                                Buat Email Kustom
                            </button>
                        ) : (
                            <p style={{ fontSize: 14, color: "var(--on-surface-variant)", lineHeight: 1.5, margin: 0, padding: "12px", background: "rgba(255,255,255,0.5)", borderRadius: 16 }}>
                                💡 Upgrade ke Premium untuk membuat alamat kustom menggunakan namamu sendiri.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Email Aktif */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <span className="material-symbols-outlined icon-filled" style={{ fontSize: 28, color: "var(--primary)" }}>inbox</span>
                <h2 style={{ fontSize: 24, margin: 0, fontWeight: 800 }}>Daftar Email Aktif Kamu</h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                {mailboxes.length === 0 && (
                    <div className="paper-border" style={{ textAlign: "center", padding: "64px 20px", background: "var(--surface)", borderRadius: 32 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--outline)", marginBottom: 16 }}>drafts</span>
                        <p style={{ color: "var(--on-surface-variant)", fontSize: 18, fontWeight: 600 }}>Belum ada email yang aktif</p>
                    </div>
                )}
                {mailboxes.map((mb, idx) => (
                    <div key={mb.id} className="paper-border" style={{
                        background: idx % 2 === 0 ? "var(--note-pink)" : "var(--surface-lowest)",
                        borderRadius: 24,
                        padding: "24px",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16
                    }}>
                        <div>
                            <h3 style={{ fontSize: 20, margin: "0 0 8px 0", fontWeight: 800, wordBreak: "break-all" }}>{mb.address}</h3>
                            <p style={{ fontSize: 14, color: "var(--on-surface-variant)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                                Berakhir: <strong>{new Date(mb.expiresAt).toLocaleString("id-ID")}</strong>
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <Link href={`/inbox/${mb.id}`} className="btn-primary" style={{ padding: "10px 24px", borderRadius: 9999, textDecoration: "none" }}>
                                Buka Kotak Masuk
                            </Link>
                            <button onClick={() => handleDeleteMailbox(mb.id)} className="btn-outline" style={{ padding: "10px 20px", borderRadius: 9999, color: "var(--error)", borderColor: "var(--error)" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom Alias Modal */}
            {showCustom && (
                <div className="modal-overlay" onClick={() => setShowCustom(false)}>
                    <div className="modal-content paper-border" style={{ borderRadius: 32, padding: 32 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 800 }}>Buat Email Kustom</h2>

                        <div className="paper-border" style={{ display: "flex", alignItems: "center", marginBottom: 24, background: "var(--surface-lowest)", borderRadius: 9999, padding: "8px 24px" }}>
                            <input
                                type="text"
                                style={{ flex: 1, border: "none", background: "transparent", fontSize: 18, outline: "none", fontWeight: 600 }}
                                placeholder="namakamu"
                                value={customAlias}
                                onChange={e => setCustomAlias(e.target.value)}
                            />
                            <span style={{ fontWeight: 700, color: "var(--on-surface-variant)" }}>@flashmail.qzz.io</span>
                        </div>

                        <h3 style={{ fontSize: 16, marginBottom: 12, fontWeight: 700 }}>Pilih Masa Aktif</h3>
                        <select className="input" style={{ marginBottom: 32, width: "100%", borderRadius: 9999, padding: "14px 24px", fontSize: 16 }} value={customExpiry} onChange={e => setCustomExpiry(e.target.value)}>
                            <option value="1">1 Jam</option>
                            <option value="2">2 Jam</option>
                            <option value="24">1 Hari</option>
                            <option value="72">3 Hari</option>
                            <option value="168">7 Hari</option>
                            <option value="720">30 Hari</option>
                        </select>

                        <button className="btn-primary" style={{ width: "100%", borderRadius: 9999, padding: "16px 24px", fontSize: 18 }} onClick={handleCreateCustom} disabled={customLoading}>
                            {customLoading ? "Generasi..." : "Klaim Email"}
                        </button>
                    </div>
                </div>
            )}

            {/* Billing Modal */}
            {showBilling && (
                <div className="modal-overlay" onClick={() => setShowBilling(false)}>
                    <div className="modal-content paper-border" style={{ maxWidth: 600, borderRadius: 32, padding: 32 }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
                            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Langganan Premium</h2>
                            <button onClick={() => setShowBilling(false)} className="btn-outline" style={{ padding: "8px 16px", borderRadius: 9999 }}>Tutup</button>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div className="paper-border" style={{ padding: "24px", background: "var(--note-pink)", borderRadius: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                                <div>
                                    <h3 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 800 }}>Paket Basic</h3>
                                    <p style={{ margin: 0, color: "var(--on-surface-variant)", fontSize: 15 }}>Tulis nama email bebas.<br />Batas <strong>250 email</strong> per hari.</p>
                                </div>
                                <button className="btn-primary" style={{ borderRadius: 9999, padding: "14px 32px", fontSize: 18 }} onClick={() => handleCheckout("basic")} disabled={billingLoading}>
                                    {billingLoading ? "Loading..." : "Rp 25rb"}
                                </button>
                            </div>
                            <div className="paper-border" style={{ padding: "24px", background: "var(--note-yellow)", borderRadius: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                                <div>
                                    <div style={{ display: "inline-block", background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 800, marginBottom: 8 }}>REKOMENDASI</div>
                                    <h3 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 800 }}>Paket Pro</h3>
                                    <p style={{ margin: 0, color: "var(--on-surface-variant)", fontSize: 15 }}>Cocok untuk ternak akun.<br />Batas <strong>500 email</strong> per hari.</p>
                                </div>
                                <button className="btn-primary" style={{ borderRadius: 9999, padding: "14px 32px", fontSize: 18 }} onClick={() => handleCheckout("pro")} disabled={billingLoading}>
                                    {billingLoading ? "Loading..." : "Rp 50rb"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
