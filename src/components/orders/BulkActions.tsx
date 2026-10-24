"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "@/components/motion/Modal";
import SegmentedPills from "@/components/motion/SegmentedPills";
import {
  ORDER_STATUSES,
  OrderStatus,
  OrderWithDetails,
  PAYMENT_STATUSES,
  PaymentStatus,
} from "@/lib/types";

type Pending =
  | { kind: "status"; value: OrderStatus; total: number; unchanged: number }
  | { kind: "payment"; value: PaymentStatus; total: number; unchanged: number };

const METHODS = ["Cash", "UPI"] as const;
type Method = (typeof METHODS)[number] | "";

export interface BulkResult {
  message: string;
  warning?: string;
}

/**
 * Floating action bar shown while orders are selected, plus the
 * "are you sure?" dialog every bulk change must go through.
 */
export default function BulkActions({
  selected,
  onClear,
  onApplied,
  onExport,
  exporting,
}: {
  selected: OrderWithDetails[];
  onClear: () => void;
  onApplied: (result: BulkResult) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [method, setMethod] = useState<Method>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = selected.length;

  // Keep showing the last dialog content while it animates out.
  const lastPending = useRef<Pending | null>(null);
  if (pending) lastPending.current = pending;
  const view = pending ?? lastPending.current;

  function openConfirm(kind: "status" | "payment", value: string) {
    setError(null);
    setMethod("");
    if (kind === "status") {
      const unchanged = selected.filter((o) => o.status === value).length;
      setPending({ kind, value: value as OrderStatus, total: count, unchanged });
    } else {
      const unchanged = selected.filter((o) => o.payment_status === value).length;
      setPending({ kind, value: value as PaymentStatus, total: count, unchanged });
    }
  }

  function close() {
    if (busy) return;
    setPending(null);
    setError(null);
  }

  const needsMethod = pending?.kind === "payment" && pending.value === "Paid";
  const viewNeedsMethod = view?.kind === "payment" && view.value === "Paid";
  const canConfirm = !busy && (!needsMethod || method !== "");

  async function apply() {
    if (!pending || !canConfirm) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selected.map((o) => o.order_id),
          ...(pending.kind === "status"
            ? { status: pending.value }
            : { payment_status: pending.value, ...(pending.value === "Paid" ? { payment_method: method } : {}) }),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Couldn't update the orders. Nothing was changed — please try again.");

      const n: number = body.updated ?? pending.total;
      const what =
        pending.kind === "status"
          ? `marked ${pending.value}`
          : pending.value === "Paid"
          ? `marked Paid (${method})`
          : `set to ${pending.value} payment`;
      const missing: string[] = body.missing ?? [];
      setPending(null);
      onApplied({
        message: `${n} ${n === 1 ? "order" : "orders"} ${what}.`,
        warning: missing.length
          ? `${missing.length} selected ${missing.length === 1 ? "order was" : "orders were"} not found and ${missing.length === 1 ? "was" : "were"} skipped (${missing.join(", ")}).`
          : undefined,
      });
    } catch (e: any) {
      setError(e?.message ?? "Couldn't update the orders. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const willChange = view ? view.total - view.unchanged : 0;
  const noun = (n: number) => (n === 1 ? "order" : "orders");

  const selectClass =
    "min-h-[40px] rounded-full bg-ivory text-maroon-800 px-4 text-sm font-medium border border-clay-300 cursor-pointer hover:border-marigold-400";

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            key="bulk-bar"
            role="region"
            aria-label="Bulk actions for selected orders"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="no-print sticky bottom-4 z-20 mt-5 flex flex-wrap items-center gap-3 rounded-card border border-marigold-500/30 bg-gradient-to-r from-wine-900 to-wine-800 px-4 py-3 text-cream shadow-2xl shadow-black/60"
          >
            <p className="mr-2 font-medium" aria-live="polite">
              <motion.span
                key={count}
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="inline-block font-display font-700 text-lg text-gold-300 tabular-nums"
              >
                {count}
              </motion.span>{" "}
              selected
            </p>

            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Change status of selected orders</span>
              <select
                value=""
                onChange={(e) => e.target.value && openConfirm("status", e.target.value)}
                className={selectClass}
              >
                <option value="">Set status…</option>
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">Change payment status of selected orders</span>
              <select
                value=""
                onChange={(e) => e.target.value && openConfirm("payment", e.target.value)}
                className={selectClass}
              >
                <option value="">Set payment…</option>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <div className="ml-auto flex items-center gap-2">
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onExport}
                disabled={exporting}
                className="min-h-[40px] rounded-full border border-cream/30 px-4 text-sm font-medium hover:bg-cream/10 disabled:opacity-60"
              >
                {exporting ? "Exporting…" : "Export selected"}
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={onClear}
                className="min-h-[40px] rounded-full px-4 text-sm font-medium text-cream/80 hover:text-cream hover:bg-cream/10"
              >
                Clear
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal open={pending !== null} onClose={close} label="Confirm bulk update">
        {view && (
          <>
            <h3 className="font-display font-700 text-lg text-maroon-800">
              Update {view.total} {noun(view.total)}?
            </h3>
            <p className="text-sm text-maroon-800">
              {view.kind === "status" ? (
                <>
                  Set status to <strong>{view.value}</strong>.
                </>
              ) : view.value === "Paid" ? (
                <>
                  Mark payment as <strong>Paid</strong>.
                </>
              ) : (
                <>
                  Set payment status to <strong>{view.value}</strong>.
                </>
              )}
            </p>
            <p className="text-sm text-maroon-700/70">
              {willChange === 0
                ? `All ${view.total} already have this ${view.kind === "status" ? "status" : "payment status"}.`
                : view.unchanged > 0
                ? `${willChange} will change · ${view.unchanged} already ${view.value}.`
                : `${willChange} ${noun(willChange)} will change.`}
            </p>

            {view.kind === "status" && view.value === "Cancelled" && (
              <p className="rounded-xl bg-maroon-900/10 px-3 py-2 text-sm text-maroon-800">
                Cancelled orders are left out of production and sales totals. You can restore them later by changing
                their status again.
              </p>
            )}

            {viewNeedsMethod && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-maroon-800" id="bulk-method-label">
                  How were they paid?
                </p>
                <SegmentedPills
                  options={METHODS}
                  value={method as (typeof METHODS)[number]}
                  onSelect={(m) => setMethod(m)}
                  ariaLabel="Payment method"
                  disabled={busy}
                />
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", x: [0, -6, 6, -4, 4, 0] }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-red-400/40 bg-maroon-900/10 px-3 py-2 text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="mt-1 flex flex-col gap-2">
              <motion.button
                type="button"
                onClick={apply}
                disabled={!canConfirm}
                whileTap={{ scale: 0.97 }}
                className="touch-target rounded-full bg-wine-700 text-white font-medium disabled:opacity-50"
              >
                {busy ? "Updating…" : `Update ${view.total} ${noun(view.total)}`}
              </motion.button>
              <motion.button
                type="button"
                data-autofocus
                onClick={close}
                disabled={busy}
                whileTap={{ scale: 0.97 }}
                className="touch-target rounded-full bg-clay-100 text-maroon-800 font-medium disabled:opacity-50"
              >
                Cancel
              </motion.button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
