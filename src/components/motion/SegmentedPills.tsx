"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

/**
 * Row of pill buttons where ONE highlight glides to whichever is selected
 * (shared-layout animation — the EasyUI "Pill Navigation / Animated Tabs"
 * pattern). Used for order status and payment status.
 */
export default function SegmentedPills<T extends string>({
  options,
  value,
  onSelect,
  disabled,
}: {
  options: readonly T[];
  value: T;
  onSelect: (next: T) => void;
  disabled?: boolean;
}) {
  const groupId = useId();
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <motion.button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt)}
            whileTap={{ scale: 0.93 }}
            className={clsx(
              "relative touch-target px-4 rounded-full text-sm font-medium border transition-colors duration-200 disabled:opacity-70",
              active
                ? "text-white border-wine-700"
                : "bg-ivory text-maroon-800 border-clay-300 hover:border-marigold-400/60"
            )}
          >
            {active && (
              <motion.span
                layoutId={`pill-${groupId}`}
                className="absolute inset-0 rounded-full bg-wine-700 shadow-md shadow-black/40"
                transition={{ type: "spring", stiffness: 450, damping: 34 }}
              />
            )}
            <span className="relative z-10">{opt}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
