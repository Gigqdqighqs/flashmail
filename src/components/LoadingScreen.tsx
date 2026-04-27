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
            <div className="envelope-wrapper">
                <div className="envelope-flap"></div>
                <div className="letter">
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--primary)" }}>
                        electric_bolt
                    </span>
                </div>
            </div>
            
            <div className="splash-branding">
                <div className="splash-logo">FlashMail</div>
                <div className="splash-sub">R-Universe Labs</div>
            </div>
        </div>
    );
}
