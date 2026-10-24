"use client";

import { AnimatePresence, motion } from "framer-motion";
import SegmentedPills from "@/components/motion/SegmentedPills";
import {
  RANGE_PRESETS,
  RANGE_PRESET_LABELS,
  RangePreset,
  formatRangeLabel,
} from "@/lib/date-ranges";
import type { SalesBasis } from "@/lib/sales";

const BASES: SalesBasis[] = ["order", "fulfillment"];
const BASIS_LABELS: Record<SalesBasis, string> = { order: "Order date", fulfillment: "Fulfilment date" };

export default function DateRangePicker({
  preset,
  onPreset,
  custom,
  onCustom,
  basis,
  onBasis,
  resolved,
  busy,
}: {
  preset: RangePreset;
  onPreset: (p: RangePreset) => void;
  custom: { from: string; to: string };
  onCustom: (c: { from: string; to: string }) => void;
  basis: SalesBasis;
  onBasis: (b: SalesBasis) => void;
  resolved: { from: string; to: string };
  busy: boolean;
}) {
  const swapped = preset === "custom" && custom.from && custom.to && custom.from > custom.to;
  const field = "flex flex-col gap-1 text-xs font-medium text-maroon-700/70";
  const control = "touch-target rounded-2xl bg-ivory border border-clay-300/70 px-4 text-sm text-maroon-800 [color-scheme:dark]";

  return (
    <section aria-label="Choose the period" className="card relative overflow-hidden p-4 flex flex-col gap-4">
      {/* thin progress shimmer while a new period loads */}
      <AnimatePresence>
        {busy && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 top-0 h-[3px] bg-clay-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-marigold-500"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <SegmentedPills
          options={RANGE_PRESETS}
          value={preset}
          onSelect={onPreset}
          labelFor={(p) => RANGE_PRESET_LABELS[p]}
          ariaLabel="Date range"
          size="sm"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-maroon-700/70">Count by</span>
          <SegmentedPills
            options={BASES}
            value={basis}
            onSelect={onBasis}
            labelFor={(b) => BASIS_LABELS[b]}
            ariaLabel="Which date to count orders by"
            size="sm"
          />
        </div>
      </div>

      <AnimatePresence initial={false}>
        {preset === "custom" && (
          <motion.div
            key="custom"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="overflow-hidden -m-1 p-1"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className={field}>
                From
                <input
                  type="date"
                  value={custom.from}
                  max={custom.to || undefined}
                  onChange={(e) => onCustom({ ...custom, from: e.target.value })}
                  className={control}
                />
              </label>
              <label className={field}>
                To
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from || undefined}
                  onChange={(e) => onCustom({ ...custom, to: e.target.value })}
                  className={control}
                />
              </label>
              {!custom.from && !custom.to && (
                <p className="pb-3 text-sm text-maroon-700/70">Pick a start and/or end date.</p>
              )}
              {swapped && (
                <p role="status" className="pb-3 text-sm text-marigold-600">
                  Start was after end, so the dates were swapped.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-sm text-maroon-700/70" aria-live="polite">
        Showing{" "}
        <motion.strong
          key={`${resolved.from}|${resolved.to}`}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-block font-semibold text-maroon-800"
        >
          {formatRangeLabel(resolved.from, resolved.to)}
        </motion.strong>{" "}
        <span className="text-maroon-700/60">· orders counted by {BASIS_LABELS[basis].toLowerCase()}</span>
      </p>
    </section>
  );
}
