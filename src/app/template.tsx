"use client";

import { motion } from "framer-motion";

/**
 * Unlike layout.tsx, a template re-mounts on every navigation — so every page
 * change gets a soft fade + rise. (Modals/confetti render in portals, so the
 * transform on this wrapper can't affect their position: fixed.)
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
