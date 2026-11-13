"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Counts smoothly from its previous value to the new one (first render
 * counts up from 0). Keeps the app's plain number formatting — no commas —
 * so it matches every other ₹ figure on screen.
 */
export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  duration = 0.9,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();
  const decimals = String(value).includes(".") ? String(value).split(".")[1].length : 0;

  const format = (n: number) => `${prefix}${n.toFixed(decimals)}${suffix}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) {
      shown.current = value;
      el.textContent = format(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        shown.current = latest;
        el.textContent = format(latest);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, reduce]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(reduce ? value : shown.current)}
    </span>
  );
}
