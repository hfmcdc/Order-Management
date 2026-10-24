"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

export interface NoticeState {
  id: number; // change it to replay the animation for a repeat message
  type: "success" | "error";
  message: string;
}

/**
 * Inline banner that announces the result of an action. Success messages
 * dismiss themselves after a few seconds; errors stay until closed so they
 * can't be missed. role=status / role=alert so screen readers read them out.
 */
export default function Notice({
  notice,
  onDismiss,
}: {
  notice: NoticeState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!notice || notice.type !== "success") return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [notice, onDismiss]);

  return (
    <AnimatePresence initial={false}>
      {notice && (
        <motion.div
          key={notice.id}
          role={notice.type === "error" ? "alert" : "status"}
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className="overflow-hidden"
        >
          <div
            className={clsx(
              "flex items-start gap-3 rounded-card border px-4 py-3 text-sm",
              notice.type === "success"
                ? "bg-leaf-500/10 border-leaf-500/30 text-leaf-600"
                : "bg-maroon-900/5 border-red-400/40 text-red-400"
            )}
          >
            <span aria-hidden className="mt-0.5 font-bold">
              {notice.type === "success" ? "✓" : "!"}
            </span>
            <p className="flex-1">{notice.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss message"
              className="press -m-2 p-2 rounded-full opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
