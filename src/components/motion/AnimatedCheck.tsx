"use client";

import { motion } from "framer-motion";

/** Circle pops in, then the tick draws itself. For "saved" / "done" moments. */
export default function AnimatedCheck({ size = 64 }: { size?: number }) {
  return (
    <motion.div
      className="rounded-full bg-leaf-500/15 flex items-center justify-center text-leaf-600"
      style={{ width: size, height: size }}
      initial={{ scale: 0, rotate: -40 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }}
        />
      </svg>
    </motion.div>
  );
}
