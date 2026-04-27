"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";

interface Mailbox {
  id: string;
  address: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
}

interface Email {
  id: string;
  mailboxId: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  isRead: boolean;
  receivedAt: string;
}

interface User {
  id: string;
  email: string | null;
  plan: "free" | "vip";
}

function HomeContent() {
  const searchParams = useSearchParams();
  const mailboxIdFromUrl = searchParams.get("mailbox");

  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<Mailbox | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [countdown, setCountdown] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Fetch session
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (data.authenticated) setUser(data.user);
    } catch { }
  }, []);

  // Fetch mailboxes
  const fetchMailboxes = useCallback(async () => {
    try {
      const res = await fetch("/api/mailbox");
      const data = await res.json();
      const fetchedMailboxes = data.mailboxes || [];
      setMailboxes(fetchedMailboxes);

      if (fetchedMailboxes.length > 0 && !selectedMailbox) {
        // Priority: Mailbox from URL > First mailbox
        const urlMailbox = fetchedMailboxes.find((m: Mailbox) => m.id === mailboxIdFromUrl);
        setSelectedMailbox(urlMailbox || fetchedMailboxes[0]);
      }
    } catch { }
  }, [selectedMailbox, mailboxIdFromUrl]);

  // Fetch emails for selected mailbox
  const fetchEmails = useCallback(async () => {
    if (!selectedMailbox) return;
    try {
      const res = await fetch(`/api/emails?mailbox=${selectedMailbox.id}`);
      const data = await res.json();
      setEmails(data.emails || []);
    } catch { }
  }, [selectedMailbox]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      await fetchSession();
      await fetchMailboxes();
      setLoading(false);
    };
    init();
  }, []);

  // Auto-refresh emails every 5 seconds
  useEffect(() => {
    if (!selectedMailbox) return;
    fetchEmails();
    const interval = setInterval(fetchEmails, 5000);
    return () => clearInterval(interval);
  }, [selectedMailbox, fetchEmails]);

  // Countdown timer
  useEffect(() => {
    if (!selectedMailbox) return;
    const update = () => {
      const exp = new Date(selectedMailbox.expiresAt).getTime();
      const now = Date.now();
      const diff = exp - now;
      if (diff <= 0) {
        setCountdown("Kedaluwarsa");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${h}j ${m}m ${s}d`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [selectedMailbox]);

  // Generate new mailbox
  const generateMailbox = async () => {
    if (!user) {
      showToast("Kamu harus login/daftar (gratis) untuk membuat email.");
      setAuthMode("register");
      setShowAuth(true);
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/mailbox", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showToast(data.error);
      } else {
        await fetchMailboxes();
        setSelectedMailbox(data.mailbox);
        showToast("Email baru berhasil dibuat");
      }
    } catch {
      showToast("Gagal membuat email baru");
    }
    setCreating(false);
  };

  // Copy to clipboard
  const copyAddress = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      showToast("Tersalin ke clipboard! 📋");
    } catch {
      showToast("Gagal menyalin");
    }
  };

  // Delete mailbox
  const handleDeleteMailbox = async (id: string) => {
    try {
      await fetch("/api/mailbox", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailboxId: id }),
      });
      const updated = mailboxes.filter((m) => m.id !== id);
      setMailboxes(updated);
      if (selectedMailbox?.id === id) {
        setSelectedMailbox(updated[0] || null);
      }
      showToast("Mailbox dihapus");
    } catch { }
  };

  // Delete email
  const handleDeleteEmail = async (emailId: string) => {
    try {
      await fetch("/api/emails", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      if (selectedEmail?.id === emailId) setSelectedEmail(null);
      showToast("Email dihapus");
    } catch { }
  };

  // Auth
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: authMode,
          email: authEmail,
          password: authPassword,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else {
        setShowAuth(false);
        await fetchSession();
        await fetchMailboxes();
        showToast(authMode === "login" ? "Berhasil masuk" : "Akun berhasil dibuat");
      }
    } catch {
      setAuthError("Terjadi kesalahan");
    }
    setAuthLoading(false);
  };

  // Logout
  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setUser(null);
    setMailboxes([]);
    setSelectedMailbox(null);
    setEmails([]);
    showToast("Berhasil keluar");
  };

  // Format time
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    if (diff < 60000) return "Baru saja";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
    return new Date(date).toLocaleDateString("id-ID");
  };

  return (
    <>
      {/* ─── Header ─── */}
      <header
        style={{
          position: "sticky",
          top: 16,
          zIndex: 50,
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <nav
          className="paper-border"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
            background: "var(--surface-lowest)",
            borderRadius: 9999,
            boxShadow: "6px 6px 0px 0px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className="material-symbols-outlined icon-filled"
              style={{ color: "var(--primary-container)", fontSize: 28 }}
            >
              electric_bolt
            </span>
            <span
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: "var(--primary)",
                letterSpacing: "-0.02em",
              }}
            >
              FlashMail
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href="/panduan" className="btn-ghost hide-mobile" style={{ textDecoration: "none" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>help</span>
              Panduan
            </a>
            {user?.email ? (
              <>
                <a href="/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>dashboard</span>
                  <span className="hide-mobile">Dashboard</span>
                </a>
                <button className="btn-ghost" onClick={handleLogout}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    logout
                  </span>
                  <span className="hide-mobile">Keluar</span>
                </button>
              </>
            ) : (
              <button className="btn-outline" onClick={() => setShowAuth(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  person
                </span>
                Masuk
              </button>
            )}
          </div>
        </nav>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        {/* ─── Hero Section (shown when no mailbox) ─── */}
        {mailboxes.length === 0 && !loading && (
          <section style={{ textAlign: "center", padding: "80px 0 40px", position: "relative" }}>
            {/* Floating Background Effects */}
            <div className="hide-mobile animate-float-1" style={{ position: "absolute", top: "10%", left: "5%", zIndex: -1, opacity: 0.6, fontSize: 48 }}>✉️</div>
            <div className="hide-mobile animate-float-2" style={{ position: "absolute", top: "20%", right: "10%", zIndex: -1, opacity: 0.5, fontSize: 64 }}>🛡️</div>
            <div className="hide-mobile animate-float-3" style={{ position: "absolute", bottom: "10%", left: "15%", zIndex: -1, opacity: 0.4, fontSize: 56 }}>💨</div>
            <div className="hide-mobile animate-float-4" style={{ position: "absolute", bottom: "20%", right: "5%", zIndex: -1, opacity: 0.5, fontSize: 40 }}>🔒</div>
            <h1
              style={{
                fontSize: "clamp(32px, 6vw, 48px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: 20,
              }}
            >
              Buat Email Sementara,
              <br />
              <span style={{ color: "var(--primary-container)", position: "relative" }}>
                Lebih Cepat & Aman
                <svg
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: 12,
                    bottom: -4,
                    left: 0,
                  }}
                  fill="none"
                  preserveAspectRatio="none"
                  viewBox="0 0 200 12"
                >
                  <path
                    d="M2 9.5C50 -1.5 150 -1.5 198 9.5"
                    stroke="var(--secondary-container)"
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
              </span>
            </h1>
            <p
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: "var(--on-surface-variant)",
                maxWidth: 560,
                margin: "0 auto 40px",
                lineHeight: 1.6,
              }}
            >
              Dapatkan email sementara dalam hitungan detik. Hindari spam, dan lindungi
              privasi kamu
            </p>
            <button
              className="btn-primary"
              onClick={generateMailbox}
              disabled={creating}
              style={{ fontSize: 16, padding: "16px 32px" }}
            >
              <span className="material-symbols-outlined icon-filled">
                {creating ? "hourglass_top" : "add_circle"}
              </span>
              {creating ? "Membuat..." : "Buat Email Sementara"}
            </button>

            {/* Features */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 20,
                marginTop: 64,
                textAlign: "left",
              }}
            >
              {[
                {
                  icon: "bolt",
                  title: "Cepat & Instan",
                  desc: "Tidak perlu mendaftar. Buka halaman, email siap digunakan",
                  bg: "var(--note-yellow)",
                  rotate: "-2deg",
                },
                {
                  icon: "masks",
                  title: "Sepenuhnya Anonim",
                  desc: "Kami tidak melacak IP atau menyimpan data pribadi Kamu",
                  bg: "var(--note-blue)",
                  rotate: "1deg",
                },
                {
                  icon: "delete_sweep",
                  title: "Hapus Otomatis",
                  desc: "Semua email dihapus secara permanen setelah beberapa jam",
                  bg: "var(--note-rose)",
                  rotate: "-1deg",
                },
              ].map((f, i) => (
                <div key={i} className="note-card" style={{ background: f.bg, transform: `rotate(${f.rotate})`, position: "relative" }}>
                  <div className="tape" style={{ top: -12, left: "50%", transform: "translateX(-50%) rotate(-1deg)", width: 60 }}></div>
                  <div
                    className="paper-border"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "var(--surface-lowest)",
                      marginBottom: 16,
                    }}
                  >
                    <span className="material-symbols-outlined icon-filled">{f.icon}</span>
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: "var(--on-surface-variant)", fontSize: 14, lineHeight: 1.6 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Premium Section Advertisement */}
            <div style={{ marginTop: 80, marginBottom: 80, padding: 40, borderRadius: 24, background: "var(--surface)", border: "2px dashed var(--outline)", position: "relative" }} className="paper-shadow-lg glass-panel">
              <div className="tape" style={{ top: -12, left: "50%", transform: "translateX(-50%) rotate(-2deg)", width: 140 }}></div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <span className="chip chip-info" style={{ marginBottom: 16 }}>🌟 KENAPA HARUS PREMIUM?</span>
                <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Batasan Terlalu Ketat?</h2>
                <p style={{ fontSize: 16, color: "var(--on-surface-variant)" }}>Dapatkan lebih banyak kuota setiap hari, kustomisasi email keren, dan masa aktif lebih leluasa.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
                <div className="paper-border" style={{ background: "var(--surface-lowest)", padding: 24, borderRadius: 16, transform: "rotate(-1deg)" }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800 }}>Gratis</h3>
                  <p style={{ fontSize: 32, fontWeight: 800, margin: "16px 0", color: "var(--on-surface-variant)" }}>Rp0</p>
                  <ul style={{ listStyle: "none", padding: 0, gap: 12, display: "flex", flexDirection: "column", fontSize: 13, color: "var(--on-surface-variant)" }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--error)", fontSize: 18 }}>close</span> 3 email/hari</li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--error)", fontSize: 18 }}>close</span> Email acak sistem</li>
                  </ul>
                </div>
                <div className="paper-border" style={{ background: "var(--note-pink)", padding: 24, borderRadius: 16 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800 }}>Basic</h3>
                  <p style={{ fontSize: 32, fontWeight: 800, margin: "16px 0", color: "var(--on-surface-variant)" }}>Rp25rb<span style={{ fontSize: 12 }}>/bln</span></p>
                  <ul style={{ listStyle: "none", padding: 0, gap: 12, display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 18 }}>check_circle</span> 250 email/hari</li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 18 }}>check_circle</span> Alamat custom</li>
                  </ul>
                  <button className="btn-primary" style={{ width: "100%", fontSize: 13, padding: "12px", borderRadius: 9999, marginTop: 16 }} onClick={() => { setAuthMode("register"); setShowAuth(true); }}>
                    Pilih Basic
                  </button>
                </div>
                <div className="paper-border" style={{ background: "var(--note-blue)", padding: 26, borderRadius: 16, transform: "scale(1.05) rotate(1deg)", position: "relative", zIndex: 10 }}>
                  <div style={{ position: "absolute", top: -12, right: -12, background: "var(--primary)", color: "white", padding: "4px 12px", borderRadius: 9999, fontWeight: 800, fontSize: 11, border: "2px solid var(--ink)" }}>PALING LARIS 🔥</div>
                  <h3 style={{ fontSize: 20, fontWeight: 800 }}>Pro</h3>
                  <p style={{ fontSize: 32, fontWeight: 800, margin: "12px 0", color: "var(--primary)" }}>Rp50rb<span style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>/bln</span></p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "16px 0", gap: 12, display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 600 }}>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 18 }}>check_circle</span> 500 email/hari</li>
                    <li style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 18 }}>check_circle</span> Alamat custom</li>
                  </ul>
                  <button className="btn-primary" style={{ width: "100%", fontSize: 14, padding: "12px", borderRadius: 9999 }} onClick={() => { setAuthMode("register"); setShowAuth(true); }}>
                    Pilih Pro
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Loading ─── */}
        {loading && (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <div className="skeleton" style={{ width: 200, height: 24, margin: "0 auto 16px" }} />
            <div className="skeleton" style={{ width: 300, height: 16, margin: "0 auto" }} />
          </div>
        )}

        {/* ─── Active Mailbox Section ─── */}
        {mailboxes.length > 0 && !loading && (
          <section style={{ paddingTop: 32 }}>
            {/* Current email card */}
            <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
              {/* Tape decoration */}
              <div
                className="tape"
                style={{ top: -10, left: "50%", transform: "translateX(-50%) rotate(2deg)", width: 100 }}
              />
              <div
                className="paper-border"
                style={{
                  background: "var(--note-yellow)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  boxShadow: "8px 8px 0px 0px rgba(0,0,0,0.15)",
                  transform: "rotate(0.5deg)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 16,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "var(--on-surface-variant)",
                    }}
                  >
                    Email Kamu Saat Ini
                  </span>
                  <div className="chip chip-active">
                    <span
                      className="pulse-dot"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: "var(--surface-lowest)",
                        display: "inline-block",
                      }}
                    />
                    Aktif
                  </div>
                </div>

                <div
                  className="paper-border paper-shadow-sm responsive-email-card"
                  style={{
                    background: "var(--surface-lowest)",
                    borderRadius: 12,
                    padding: 16,
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span
                      className="material-symbols-outlined icon-filled"
                      style={{ color: "var(--primary)", fontSize: 24 }}
                    >
                      mail
                    </span>
                    <span
                      className="email-address-text"
                      style={{
                        fontWeight: 700,
                        fontSize: "clamp(15px, 3vw, 20px)",
                      }}
                    >
                      {selectedMailbox?.address}
                    </span>
                  </div>
                  <button className="btn-primary" onClick={() => copyAddress(selectedMailbox?.address || "")} style={{ padding: "10px 24px" }}>
                    <span className="material-symbols-outlined icon-filled" style={{ fontSize: 18 }}>
                      content_copy
                    </span>
                    Salin
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    marginTop: 14,
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--on-surface-variant)",
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    timer
                  </span>
                  Otomatis terhapus dalam{" "}
                  <span style={{ color: "var(--primary)", fontWeight: 700 }}>{countdown}</span>
                </div>
              </div>

              {/* Decorative shapes */}
              <div
                className="paper-border paper-shadow"
                style={{
                  position: "absolute",
                  bottom: -20,
                  right: -20,
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "var(--secondary-container)",
                  zIndex: -1,
                }}
              />
              <div
                className="paper-border paper-shadow"
                style={{
                  position: "absolute",
                  top: -24,
                  left: -16,
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "var(--tertiary-fixed)",
                  zIndex: -1,
                  transform: "rotate(-12deg)",
                }}
              />
            </div>

            {/* Mailbox tabs + actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 40,
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                {selectedMailbox && (
                  <button
                    key={selectedMailbox.id}
                    className="btn-primary"
                    style={{ fontSize: 12, padding: "8px 14px", flexShrink: 0 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      mail
                    </span>
                    {selectedMailbox.address.split("@")[0]}
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-outline" onClick={generateMailbox} disabled={creating} style={{ fontSize: 13, padding: "8px 16px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    add
                  </span>
                  {creating ? "..." : "Baru"}
                </button>
                {selectedMailbox && (
                  <button className="btn-danger" onClick={() => handleDeleteMailbox(selectedMailbox.id)} style={{ padding: "8px 14px" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      delete
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* ─── Inbox ─── */}
            <div
              className="paper-border"
              style={{
                background: "var(--surface-lowest)",
                borderRadius: 16,
                padding: 4,
                boxShadow: "6px 6px 0px 0px rgba(0,0,0,0.12)",
                minHeight: 300,
              }}
            >
              {/* Inbox header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px 12px",
                  borderBottom: "2px dashed var(--bg-dim)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="material-symbols-outlined icon-filled" style={{ color: "var(--primary)" }}>
                    inbox
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Kotak Masuk</span>
                  {emails.length > 0 && (
                    <span className="chip chip-active" style={{ fontSize: 11 }}>
                      {emails.length}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <button
                    className="btn-ghost"
                    onClick={fetchEmails}
                    title="Refresh manual"
                    style={{ padding: "4px 8px", fontSize: 12, gap: 4 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      refresh
                    </span>
                    Refresh
                  </button>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: "var(--on-surface-variant)",
                    }}
                  >
                    <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                    Auto-refresh
                  </div>
                </div>
              </div>

              {/* Email list or empty state */}
              {emails.length === 0 ? (
                <div style={{ padding: "60px 24px", textAlign: "center" }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 56, color: "var(--outline-variant)", marginBottom: 16, display: "block" }}
                  >
                    mark_email_unread
                  </span>
                  <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Belum ada email masuk</p>
                  <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>
                    Email yang dikirim ke <strong>{selectedMailbox?.address}</strong> akan muncul di sini
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: 4 }}>
                  {emails.map((email) => (
                    <div
                      key={email.id}
                      className={`email-item ${!email.isRead ? "unread" : ""}`}
                      onClick={() => setSelectedEmail(email)}
                      style={{ position: "relative" }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          background: "var(--surface)",
                          border: "2px solid var(--ink)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 16,
                          flexShrink: 0,
                          color: "var(--primary)",
                        }}
                      >
                        {(email.fromName || email.fromAddress)[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: email.isRead ? 500 : 700,
                              fontSize: 14,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {email.fromName || email.fromAddress}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--outline)", flexShrink: 0, marginLeft: 8 }}>
                            {timeAgo(email.receivedAt)}
                          </span>
                        </div>
                        <p
                          style={{
                            fontWeight: email.isRead ? 400 : 600,
                            fontSize: 14,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            marginBottom: 2,
                          }}
                        >
                          {email.subject}
                        </p>
                        <p
                          style={{
                            fontSize: 13,
                            color: "var(--on-surface-variant)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {email.bodyText?.substring(0, 100)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ─── Email Detail Modal ─── */}
      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "85vh", overflow: "auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1 }}>
                <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, lineHeight: 1.3 }}>
                  {selectedEmail.subject}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="chip chip-info" style={{ fontSize: 11 }}>
                    {selectedEmail.fromName || selectedEmail.fromAddress}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--outline)" }}>
                    {new Date(selectedEmail.receivedAt).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-danger" onClick={() => handleDeleteEmail(selectedEmail.id)} style={{ padding: "6px 12px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                </button>
                <button className="btn-ghost" onClick={() => setSelectedEmail(null)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div
              className="paper-border"
              style={{
                background: "var(--surface-lowest)",
                borderRadius: 12,
                padding: 20,
                boxShadow: "inset 2px 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              {selectedEmail.bodyHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                  style={{ fontSize: 14, lineHeight: 1.7, overflowWrap: "break-word" }}
                />
              ) : (
                <pre style={{ fontFamily: "var(--font)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
                  {selectedEmail.bodyText}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Auth Modal ─── */}
      {showAuth && (
        <div className="modal-overlay" onClick={() => setShowAuth(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span
                className="material-symbols-outlined icon-filled"
                style={{ fontSize: 40, color: "var(--primary-container)", marginBottom: 8, display: "block" }}
              >
                local_fire_department
              </span>
              <h2 style={{ fontWeight: 700, fontSize: 22 }}>
                {authMode === "login" ? "Masuk ke FireMail" : "Daftar Akun Baru"}
              </h2>
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14, marginTop: 4 }}>
                {authMode === "login"
                  ? "Simpan mailbox kamu di semua perangkat"
                  : "Buat akun untuk akses lebih lanjut"}
              </p>
            </div>

            {authError && (
              <div
                style={{
                  background: "#FFDAD6",
                  border: "2px solid var(--error)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "var(--error)",
                  fontWeight: 600,
                  marginBottom: 16,
                }}
              >
                {authError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <input
                type="email"
                className="input"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <input
                type="password"
                className="input"
                placeholder="Kata Sandi"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
              />
              <button className="btn-primary" onClick={handleAuth} disabled={authLoading} style={{ width: "100%", padding: 14 }}>
                {authLoading ? "Memproses..." : authMode === "login" ? "Masuk" : "Daftar"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                <div style={{ flex: 1, height: 2, background: "var(--outline-variant)" }} />
                <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: 600 }}>ATAU</span>
                <div style={{ flex: 1, height: 2, background: "var(--outline-variant)" }} />
              </div>

              <a
                href="/api/auth/google"
                className="paper-border"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  width: "100%",
                  padding: 14,
                  background: "var(--surface)",
                  color: "var(--on-surface)",
                  fontWeight: 700,
                  textDecoration: "none",
                  borderRadius: 12,
                  boxShadow: "4px 4px 0px 0px rgba(0,0,0,0.1)",
                }}
              >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
                Lanjutkan dengan Google
              </a>
            </div>

            <p style={{ textAlign: "center", marginTop: 16, fontSize: 14, color: "var(--on-surface-variant)" }}>
              {authMode === "login" ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
              <button
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login");
                  setAuthError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font)",
                  fontSize: 14,
                }}
              >
                {authMode === "login" ? "Daftar" : "Masuk"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* ─── Toast ─── */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center" }}>Memuat...</div>}>
      <HomeContent />
    </Suspense>
  );
}
