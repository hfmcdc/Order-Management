"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApi } from "@/lib/useApi";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import OrdersTable from "@/components/orders/OrdersTable";
import BulkActions, { BulkResult } from "@/components/orders/BulkActions";
import Notice, { NoticeState } from "@/components/motion/Notice";
import AnimatedNumber from "@/components/motion/AnimatedNumber";
import { OrderWithDetails, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/types";
import {
  EMPTY_FILTERS,
  OrderFilters,
  SortKey,
  SortState,
  filterOrders,
  isDefaultFilters,
  nextSort,
  sortOrders,
} from "@/lib/order-table";
import { addDaysIso, formatShort, mondayOf, toLocalIso } from "@/lib/date-ranges";
import { downloadCsv } from "@/lib/download";

export default function OrdersPage() {
  const { data, loading, error, refresh } = useApi<{ orders: OrderWithDetails[] }>("/api/orders");
  // Laptop-and-up gets the dense table + extra filters; everything smaller
  // keeps the original order cards and the original two filters.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [todayIso, setTodayIso] = useState("");
  useEffect(() => setTodayIso(toLocalIso(new Date())), []);

  const patchFilters = (patch: Partial<OrderFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // On small screens only search + status exist, so only they may filter.
  const effective = useMemo<OrderFilters>(
    () => (isDesktop ? filters : { ...filters, payment: "All", from: "", to: "" }),
    [isDesktop, filters]
  );

  const filtered = useMemo(() => (data ? filterOrders(data.orders, effective) : []), [data, effective]);
  const rows = useMemo(() => (isDesktop ? sortOrders(filtered, sort) : filtered), [filtered, sort, isDesktop]);

  // Selection can only ever contain orders that are visible right now, so a
  // bulk change can never touch a row you can't see.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(rows.map((r) => r.order_id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const selectedOrders = useMemo(() => rows.filter((r) => selected.has(r.order_id)), [rows, selected]);

  const stats = useMemo(() => {
    const live = rows.filter((r) => r.status !== "Cancelled");
    return {
      value: live.reduce((s, r) => s + r.total, 0),
      awaiting: live.filter((r) => r.payment_status !== "Paid").reduce((s, r) => s + r.total, 0),
    };
  }, [rows]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      rows.length > 0 && rows.every((r) => prev.has(r.order_id)) ? new Set() : new Set(rows.map((r) => r.order_id))
    );
  }, [rows]);

  const announce = (type: NoticeState["type"], message: string) =>
    setNotice({ id: Date.now(), type, message });

  async function exportIds(ids: string[]) {
    if (ids.length === 0) return;
    setExporting(true);
    try {
      await downloadCsv("/api/export/orders", ids, "vaiga-orders.csv");
      announce("success", `Exported ${ids.length} ${ids.length === 1 ? "order" : "orders"} to CSV.`);
    } catch (e: any) {
      announce("error", e?.message ?? "Couldn't export right now. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function handleApplied(result: BulkResult) {
    announce("success", result.warning ? `${result.message} ${result.warning}` : result.message);
    setSelected(new Set());
    refresh(); // silent refresh: rows update in place and the badges pop
  }

  // Quick ordered-date shortcuts
  const quickDates = todayIso
    ? [
        { label: "Today", from: todayIso, to: todayIso },
        { label: "Yesterday", from: addDaysIso(todayIso, -1), to: addDaysIso(todayIso, -1) },
        { label: "This week", from: mondayOf(todayIso), to: addDaysIso(mondayOf(todayIso), 6) },
      ]
    : [];

  // Chips describing the active desktop filters
  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.status !== "All") chips.push({ key: "status", label: `Status: ${filters.status}`, clear: () => patchFilters({ status: "All" }) });
  if (filters.payment !== "All") chips.push({ key: "payment", label: `Payment: ${filters.payment}`, clear: () => patchFilters({ payment: "All" }) });
  if (filters.from || filters.to) {
    const label =
      filters.from && filters.to
        ? filters.from === filters.to
          ? formatShort(filters.from, true)
          : `${formatShort(filters.from)} – ${formatShort(filters.to, true)}`
        : filters.from
        ? `from ${formatShort(filters.from, true)}`
        : `until ${formatShort(filters.to, true)}`;
    chips.push({ key: "date", label: `Ordered: ${label}`, clear: () => patchFilters({ from: "", to: "" }) });
  }

  const fieldLabel = "flex flex-col gap-1 text-xs font-medium text-maroon-700/70";
  const fieldControl = "touch-target rounded-2xl bg-ivory px-4 shadow-sm text-sm text-maroon-800 [color-scheme:dark]";

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">Orders</h1>
          <p className="text-maroon-700/70 text-sm mt-1">Every order, searchable and filterable.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => exportIds(rows.map((r) => r.order_id))}
            disabled={exporting || rows.length === 0}
            className="press hidden lg:flex touch-target items-center gap-2 rounded-full border border-clay-300 bg-ivory px-5 font-medium text-maroon-800 hover:border-marigold-400/60 disabled:opacity-50"
          >
            <span aria-hidden>↓</span>
            {exporting ? "Exporting…" : isDefaultFilters(filters) ? "Export CSV" : `Export filtered (${rows.length})`}
          </motion.button>
          <Link
            href="/orders/new"
            className="press btn-shine hidden md:flex touch-target items-center rounded-full bg-marigold-500 text-ink font-semibold px-5 shadow-md shadow-marigold-500/25 hover:bg-marigold-600 transition-colors"
          >
            + New Order
          </Link>
        </div>
      </header>

      <Notice notice={notice} onDismiss={() => setNotice(null)} />

      {/* ---- Phone / tablet filters (unchanged) ---- */}
      <div className="flex flex-col md:flex-row gap-3 lg:hidden">
        <input
          value={filters.query}
          onChange={(e) => patchFilters({ query: e.target.value })}
          placeholder="Search by name, phone, or order ID"
          aria-label="Search orders"
          className="touch-target flex-1 rounded-2xl bg-ivory px-4 shadow-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => patchFilters({ status: e.target.value })}
          aria-label="Filter by order status"
          className="touch-target rounded-2xl bg-ivory px-4 shadow-sm"
        >
          <option value="All">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ---- Laptop filters ---- */}
      <section aria-label="Filter orders" className="hidden lg:flex flex-col gap-3">
        <div className="grid grid-cols-[minmax(14rem,1fr)_auto_auto_auto_auto] items-end gap-3">
          <label className={fieldLabel}>
            Search
            <input
              type="search"
              value={filters.query}
              onChange={(e) => patchFilters({ query: e.target.value })}
              placeholder="Name, phone, or order ID"
              className={fieldControl}
            />
          </label>
          <label className={fieldLabel}>
            Status
            <select value={filters.status} onChange={(e) => patchFilters({ status: e.target.value })} className={fieldControl}>
              <option value="All">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Payment
            <select value={filters.payment} onChange={(e) => patchFilters({ payment: e.target.value })} className={fieldControl}>
              <option value="All">All payments</option>
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className={fieldLabel}>
            Ordered from
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => patchFilters({ from: e.target.value })}
              className={fieldControl}
            />
          </label>
          <label className={fieldLabel}>
            Ordered to
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => patchFilters({ to: e.target.value })}
              className={fieldControl}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-h-[2.25rem]">
          <span className="text-xs text-maroon-700/60 mr-1">Quick dates:</span>
          {quickDates.map((q) => (
            <motion.button
              key={q.label}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => patchFilters({ from: q.from, to: q.to })}
              className="rounded-full border border-clay-300 bg-ivory px-3 py-1.5 text-xs font-medium text-maroon-800 hover:border-marigold-400/60"
            >
              {q.label}
            </motion.button>
          ))}

          <AnimatePresence initial={false}>
            {chips.map((chip) => (
              <motion.span
                key={chip.key}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1.5 rounded-full bg-marigold-100 pl-3 pr-1 py-1 text-xs font-medium text-maroon-800"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.clear}
                  aria-label={`Remove filter ${chip.label}`}
                  className="press flex h-5 w-5 items-center justify-center rounded-full hover:bg-marigold-500/30"
                >
                  ✕
                </button>
              </motion.span>
            ))}
            {!isDefaultFilters(filters) && (
              <motion.button
                key="clear-all"
                layout
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setFilters(EMPTY_FILTERS)}
                className="ml-1 text-xs font-medium text-marigold-600 underline-offset-2 hover:underline"
              >
                Clear all filters
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </section>

      {loading && !data && <LoadingState label="Loading orders…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && rows.length === 0 && (
        <EmptyState title="No orders found" hint="Try a different search or filter." />
      )}

      {/* ---- Laptop: summary strip + sortable, selectable table ---- */}
      {data && rows.length > 0 && isDesktop && (
        <>
          <div className="hidden lg:flex flex-wrap items-center gap-x-8 gap-y-2 px-1 text-sm text-maroon-700/70">
            <p aria-live="polite">
              Showing <strong className="text-maroon-800">{rows.length}</strong> of{" "}
              <strong className="text-maroon-800">{data.orders.length}</strong> orders
            </p>
            <p>
              Order value{" "}
              <strong className="text-maroon-800">
                <AnimatedNumber value={stats.value} prefix="₹" duration={0.5} />
              </strong>
            </p>
            <p>
              Awaiting payment{" "}
              <strong className="text-marigold-600">
                <AnimatedNumber value={stats.awaiting} prefix="₹" duration={0.5} />
              </strong>
            </p>
            <p className="ml-auto text-xs">Click a column heading to sort</p>
          </div>

          <OrdersTable
            rows={rows}
            selected={selected}
            onToggle={toggleOne}
            onToggleAll={toggleAll}
            sort={sort}
            onSort={(key: SortKey) => setSort((s) => nextSort(s, key))}
          />

          <BulkActions
            selected={selectedOrders}
            onClear={() => setSelected(new Set())}
            onApplied={handleApplied}
            onExport={() => exportIds(selectedOrders.map((o) => o.order_id))}
            exporting={exporting}
          />
        </>
      )}

      {/* ---- Phone / tablet: the original order cards (unchanged) ---- */}
      {data && rows.length > 0 && !isDesktop && (
        <div className="relative flex flex-col gap-3">
          {/* Rows glide to their new spot when you search/filter, and leaving
              rows fade out. Layout animation is skipped on very long lists. */}
          <AnimatePresence initial={true} mode="popLayout">
            {rows.map((order, i) => {
              const isCompleted = order.status === "Delivered" && order.payment_status === "Paid";
              return (
                <motion.div
                  key={order.order_id}
                  layout={rows.length <= 60 ? "position" : false}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    type: "spring",
                    stiffness: 340,
                    damping: 30,
                    delay: Math.min(i, 10) * 0.035,
                  }}
                >
                  <Link
                    href={`/orders/${order.order_id}`}
                    className={`card lift px-5 py-4 flex items-center justify-between gap-3 ${
                      isCompleted ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`font-medium text-maroon-800 truncate ${
                          isCompleted ? "line-through decoration-1" : ""
                        }`}
                      >
                        {order.customer?.name ?? "Unknown customer"}
                      </p>
                      <p className="text-xs text-maroon-700/60 mt-1">
                        {order.order_id} · {order.totalBoxes} boxes · {order.totalIndividualItems} individual ·{" "}
                        {order.order_date}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.payment_status} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
