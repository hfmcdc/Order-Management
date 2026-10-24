"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import { percent } from "@/lib/format";

export interface BreakdownItem {
  key: string;
  label: string;
  amount: number;
  orders: number;
  /** Tailwind classes for the bar, e.g. "bg-leaf-500". */
  barClass: string;
  muted?: boolean;
}

/**
 * Horizontal bars that grow in, each with its label, amount, share and order
 * count written out (the bars are decoration — nothing relies on colour).
 */
export default function BreakdownBars({
  items,
  total,
  emptyText = "Nothing to show for this period.",
}: {
  items: BreakdownItem[];
  total: number;
  emptyText?: string;
}) {
  const visible = items.filter((i) => i.orders > 0 || i.amount > 0);
  if (visible.length === 0) return <p className="text-sm text-maroon-700/60">{emptyText}</p>;

  return (
    <ul className="flex flex-col gap-3.5">
      {visible.map((item, i) => {
        const pct = percent(item.amount, total);
        return (
          <li key={item.key} className={clsx(item.muted && "opacity-70")}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium text-maroon-800">{item.label}</span>
              <span className="tabular-nums text-maroon-800">
                ₹{item.amount} <span className="text-maroon-700/60">· {pct}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-clay-100" aria-hidden>
              <motion.div
                className={clsx("h-full rounded-full", item.barClass)}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, item.amount > 0 ? 2 : 0)}%` }}
                transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.1 + i * 0.07 }}
              />
            </div>
            <p className="mt-1 text-xs text-maroon-700/60">
              {item.orders} {item.orders === 1 ? "order" : "orders"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
