"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import clsx from "clsx";

export default function QuantitySelector({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
}) {
  const bump = useAnimationControls();
  const first = useRef(true);

  // The number "bumps" every time it changes (but not on first paint).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    bump.start({
      scale: [1, 1.3, 1],
      transition: { duration: 0.28, ease: "easeOut" },
    });
  }, [value, bump]);

  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        whileTap={{ scale: 0.82 }}
        whileHover={{ scale: 1.06 }}
        className="touch-target w-11 h-11 rounded-full bg-clay-100 text-maroon-800 text-xl font-semibold flex items-center justify-center"
        aria-label="Decrease quantity"
      >
        −
      </motion.button>
      <motion.div animate={bump}>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
          className={clsx(
            "w-14 text-center font-display font-700 text-lg border-none bg-transparent transition-colors duration-200",
            value > 0 ? "text-marigold-600" : "text-maroon-800"
          )}
        />
      </motion.div>
      <motion.button
        type="button"
        onClick={() => onChange(value + 1)}
        whileTap={{ scale: 0.82, rotate: 90 }}
        whileHover={{ scale: 1.06 }}
        className="touch-target w-11 h-11 rounded-full bg-marigold-500 text-ink text-xl font-semibold flex items-center justify-center"
        aria-label="Increase quantity"
      >
        +
      </motion.button>
    </div>
  );
}
