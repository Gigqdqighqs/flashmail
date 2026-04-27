"use client";

import { useState, useEffect } from "react";

export default function LoadingScreen() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="loading-container">
            <div className="envelope-scene">
                <div className="envelope-wrapper">
                    {/* Belakang amplop */}
                    <div className="envelope-back"></div>
                    
                    {/* Surat yang muncul */}
                    <div className="letter">
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 32, color: "var(--primary)" }}>
                            mail
                        </span>
                    </div>
                    
                    {/* Bagian depan amplop (lipatan \ / ) */}
                    <svg className="envelope-front" viewBox="0 0 120 80">
                        <path d="M 0,0 L 60,45 L 120,0 L 120,80 L 0,80 Z" fill="var(--surface-high)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
                        <path d="M 0,80 L 60,45 L 120,80 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
                    </svg>
                    
                    {/* Penutup atas amplop */}
                    <svg className="envelope-flap" viewBox="0 0 120 60">
                        <path d="M 0,0 L 60,45 L 120,0 Z" fill="var(--surface-highest)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
            
            <div className="splash-branding">
                <div className="splash-logo">FlashMail</div>
                <div className="splash-sub">R-Universe Labs</div>
            </div>
        </div>
    );
}
