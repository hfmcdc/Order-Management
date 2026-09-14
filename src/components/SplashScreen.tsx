"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "vaiga-splash-shown";
const VISIBLE_MS = 1400;
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
      <svg
        width="72"
        height="72"
        viewBox="0 0 100 100"
        className="mb-4"
        style={{ animation: "splash-flicker 1.1s ease-in-out infinite" }}
      >
        <ellipse cx="50" cy="62" rx="30" ry="11" fill="#F0A93A" />
        <path
          d="M50 12 C56 24 62 34 62 42 C62 49 56.5 54 50 54 C43.5 54 38 49 38 42 C38 34 44 24 50 12 Z"
          fill="#FFD680"
        />
      </svg>
      <p className="font-display font-700 text-2xl text-ivory tracking-wide" style={{ animation: "splash-rise 0.6s ease-out" }}>
        Vaiga
      </p>
      <p className="text-marigold-100/80 text-sm mt-1" style={{ animation: "splash-rise 0.6s ease-out 0.1s both" }}>
        Sweets &amp; Snacks — Diwali 2026
      </p>
    </div>
  );
}
