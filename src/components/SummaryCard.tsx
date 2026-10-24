"use client";

import { motion } from "framer-motion";
import AnimatedNumber from "@/components/motion/AnimatedNumber";

// "₹1200" -> { prefix: "₹", number: 1200, suffix: "" }. Anything that isn't a
// plain number (e.g. "12 / 20") falls back to static text.
function splitNumeric(value: string | number) {
  if (typeof value === "number") return { prefix: "", number: value, suffix: "" };
  const m = value.match(/^(\D*?)(-?\d+(?:\.\d+)?)(\D*)$/);
  if (!m) return null;
  return { prefix: m[1], number: parseFloat(m[2]), suffix: m[3] };
}

export default function SummaryCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  const parts = splitNumeric(value);
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      className={
        accent
          ? "sheen rounded-[22px] bg-gradient-to-br from-wine-800 to-wine-900 text-cream px-5 py-5 flex flex-col gap-1.5 shadow-lg shadow-black/40"
          : "card px-5 py-5 flex flex-col gap-1.5"
      }
    >
      <span className={accent ? "text-cream/80 text-[13px]" : "text-maroon-700/60 text-[13px]"}>
        {label}
      </span>
      <span className="font-display font-700 text-[26px] leading-tight">
        {parts ? (
          <AnimatedNumber value={parts.number} prefix={parts.prefix} suffix={parts.suffix} />
        ) : (
          value
        )}
      </span>
    </motion.div>
  );
}
