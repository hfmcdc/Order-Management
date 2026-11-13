"use client";

import { motion } from "framer-motion";

/**
 * Skeleton placeholders instead of a bare "Loading…" line: the page keeps
 * its shape while data arrives, which feels faster than it is.
 * `label` is still announced to screen readers.
 */
export function LoadingState({ label = "Loading…", rows = 4 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-[68px] w-full"
          style={{ animationDelay: `${i * 0.12}s`, opacity: 1 - i * 0.14 }}
        />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      // a short horizontal shake draws the eye to the problem
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: 1, x: [0, -7, 7, -5, 5, 0] }}
      transition={{ duration: 0.5 }}
      className="rounded-card bg-maroon-900/5 border border-maroon-900/10 px-4 py-4 text-maroon-800 text-sm flex flex-col gap-3"
    >
      <p>{message}</p>
      {onRetry && (
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={onRetry}
          className="self-start rounded-full bg-wine-700 text-white text-sm px-4 py-2 touch-target"
        >
          Try again
        </motion.button>
      )}
    </motion.div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-card border border-dashed border-clay-300 px-4 py-10 text-center text-maroon-700/60"
    >
      <motion.div
        aria-hidden
        className="mx-auto mb-3 w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center text-marigold-600"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        ✦
      </motion.div>
      <p className="font-medium">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
    </motion.div>
  );
}
