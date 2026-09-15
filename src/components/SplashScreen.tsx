"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "vaiga-splash-shown";
const VISIBLE_MS = 1600;
const FADE_MS = 500;

export default function SplashScreen() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    // Only show once per browser tab session — repeat page navigations
    // within the app shouldn't retrigger it, only a fresh visit/reload.
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    setPhase("visible");

    const fadeTimer = setTimeout(() => setPhase("fading"), VISIBLE_MS);
    const removeTimer = setTimeout(() => setPhase("hidden"), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-maroon-900 transition-opacity"
      style={{
        opacity: phase === "fading" ? 0 : 1,
        transitionDuration: `${FADE_MS}ms`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <div
        className="w-28 h-28 relative"
        style={{ animation: "splash-flicker 1.4s ease-in-out infinite" }}
      >
        <Image src="/logo.png" alt="Vaiga Sweets & Snacks" fill sizes="112px" priority />
      </div>
      <p
        className="font-display font-700 text-2xl text-gold-300 tracking-wide mt-4"
        style={{ animation: "splash-rise 0.6s ease-out" }}
      >
        Vaiga Sweets &amp; Snacks
      </p>
      <p
        className="text-marigold-100/80 text-sm mt-1"
        style={{ animation: "splash-rise 0.6s ease-out 0.1s both" }}
      >
        Diwali 2026 Order Management
      </p>
    </div>
  );
}
