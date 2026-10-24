"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";

const COLORS = ["#D9A441", "#EBC273", "#F1E6D2", "#8CCB9B", "#D9B77E", "#C2546D"];
const COUNT = 34;

/**
 * Small celebratory burst (gold + cream + a little green/rose).
 * Fire it by changing `burstKey` to any new non-zero number.
 * Used when an order becomes Delivered + Paid, and when a new order is saved.
 */
export default function ConfettiBurst({ burstKey }: { burstKey: number }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!burstKey) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), 2200);
    return () => clearTimeout(t);
  }, [burstKey]);

  // Random values are generated once per burst, on the client only.
  const pieces = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.5;
        const power = 110 + Math.random() * 170;
        return {
          id: i,
          x: Math.cos(angle) * power,
          // launch upward first, then gravity pulls it down
          peak: Math.sin(angle) * power * 0.8 - 60,
          fall: 140 + Math.random() * 120,
          rotate: (Math.random() - 0.5) * 720,
          size: 6 + Math.random() * 6,
          color: COLORS[i % COLORS.length],
          round: Math.random() > 0.55,
          delay: Math.random() * 0.08,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burstKey]
  );

  if (!mounted || !active || reduce) return null;

  return createPortal(
    <div
      aria-hidden
      className="no-print pointer-events-none fixed inset-x-0 top-[38%] z-[70] flex justify-center"
    >
      {pieces.map((p) => (
        <motion.span
          key={`${burstKey}-${p.id}`}
          className="absolute block"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            borderRadius: p.round ? 999 : 2,
            background: p.color,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.x,
            y: [0, p.peak, p.peak + p.fall],
            opacity: [1, 1, 0],
            scale: 1,
            rotate: p.rotate,
          }}
          transition={{
            x: { duration: 1.6, delay: p.delay, ease: "easeOut" },
            // up (decelerating) then down (accelerating) = gravity
            y: { duration: 1.6, delay: p.delay, times: [0, 0.4, 1], ease: ["easeOut", "easeIn"] },
            opacity: { duration: 1.6, delay: p.delay, times: [0, 0.7, 1] },
            scale: { duration: 0.25, delay: p.delay },
            rotate: { duration: 1.6, delay: p.delay, ease: "easeOut" },
          }}
        />
      ))}
    </div>,
    document.body
  );
}
