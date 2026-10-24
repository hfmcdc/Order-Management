"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

const SESSION_KEY = "vaiga-splash-shown";
const VISIBLE_MS = 2000;

// 12-petal rangoli: the same motif as the dashboard hero, drawn in gold.
const PETALS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return { x: 100 + 88 * Math.cos(a), y: 100 + 88 * Math.sin(a), i };
});

export default function SplashScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only once per browser-tab session. The "seen" flag is written when the
    // splash finishes (not when it starts) so React StrictMode's double-run in
    // development can't leave it stuck on screen.
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    setShow(true);
    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setShow(false);
    }, VISIBLE_MS);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          className="no-print fixed inset-0 z-[100] flex flex-col items-center justify-center bg-wine-900 overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.55, ease: "easeInOut" } }}
        >
          {/* Rangoli draws itself behind the logo */}
          <motion.svg
            className="absolute w-[340px] h-[340px] md:w-[460px] md:h-[460px] opacity-30"
            viewBox="0 0 200 200"
            fill="none"
            initial={{ rotate: -25 }}
            animate={{ rotate: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          >
            {[92, 70, 48].map((r, idx) => (
              <motion.circle
                key={r}
                cx="100"
                cy="100"
                r={r}
                stroke="#D9B77E"
                strokeWidth="1"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: idx * 0.18, ease: "easeInOut" }}
              />
            ))}
            {PETALS.map((p) => (
              <motion.circle
                key={p.i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#D9B77E"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + p.i * 0.05, type: "spring", stiffness: 300, damping: 14 }}
              />
            ))}
          </motion.svg>

          <motion.div
            className="w-28 h-28 relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ scale: [1, 1.06, 1], y: [0, -2, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src="/logo.png" alt="Vaiga Sweets & Snacks" fill sizes="112px" priority />
            </motion.div>
          </motion.div>

          <motion.p
            className="relative font-display font-700 text-2xl text-gold-300 tracking-wide mt-4"
            initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            Vaiga Sweets &amp; Snacks
          </motion.p>
          <motion.p
            className="relative text-cream/80 text-sm mt-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
          >
            Diwali 2026 Order Management
          </motion.p>

          {/* thin gold progress line */}
          <div className="absolute bottom-16 w-32 h-[2px] rounded-full bg-cream/10 overflow-hidden">
            <motion.div
              className="h-full bg-gold-300"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: VISIBLE_MS / 1000, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
