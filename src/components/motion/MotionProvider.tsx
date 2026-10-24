"use client";

import { MotionConfig } from "framer-motion";

/**
 * App-wide motion defaults.
 * - reducedMotion="user": anyone with "Reduce motion" turned on in their OS
 *   automatically gets fades instead of movement. No per-component work needed.
 * - default spring: snappy but not bouncy, so it feels the same everywhere.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
    >
      {children}
    </MotionConfig>
  );
}
