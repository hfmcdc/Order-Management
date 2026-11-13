"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * A real <input type="checkbox"> (so keyboard, screen readers and forms just
 * work) dressed with the app's gold look and a tick that draws itself.
 * `indeterminate` is the "some selected" dash used by select-all.
 */
export default function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  /** Required: describes the checkbox for screen readers. */
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const on = checked || indeterminate;

  return (
    // generous hit area (≈40px) around a 20px box
    <label className="relative inline-flex items-center justify-center w-10 h-10 -m-2.5 cursor-pointer">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0"
      />
      <motion.span
        aria-hidden
        animate={{ scale: on ? [1, 1.18, 1] : 1 }}
        transition={{ duration: 0.28 }}
        className={clsx(
          "pointer-events-none w-5 h-5 rounded-[6px] border flex items-center justify-center transition-colors duration-150",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-marigold-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-ivory",
          on ? "bg-marigold-500 border-marigold-500" : "bg-transparent border-clay-300 hover:border-marigold-400"
        )}
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" className="text-ink">
          {indeterminate && !checked ? (
            <motion.path
              d="M3.5 8h9"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2 }}
            />
          ) : (
            <motion.path
              d="M3 8.5l3.2 3.2L13 4.8"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
          )}
        </svg>
      </motion.span>
    </label>
  );
}
