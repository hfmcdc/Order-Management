"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import Checkbox from "@/components/motion/Checkbox";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { OrderWithDetails } from "@/lib/types";
import { SortKey, SortState } from "@/lib/order-table";
import { addDaysIso, formatShort } from "@/lib/date-ranges";

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "order_id", label: "Order" },
  { key: "customer", label: "Customer" },
  { key: "fulfillment_date", label: "Fulfilment" },
  { key: "items", label: "Boxes / items" },
  { key: "total", label: "Total", align: "right" },
  { key: "status", label: "Status" },
  { key: "payment_status", label: "Payment" },
];

function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <motion.svg
      aria-hidden
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      animate={{ rotate: dir === "desc" ? 180 : 0, opacity: dir ? 1 : 0.3 }}
      transition={{ type: "spring", stiffness: 500, damping: 26 }}
      className={dir ? "text-marigold-600" : ""}
    >
      <path d="M6 10V2.5M3 5.2 6 2l3 3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </motion.svg>
  );
}

function Fulfilment({ order, todayIso }: { order: OrderWithDetails; todayIso: string }) {
  const d = String(order.fulfillment_date ?? "").slice(0, 10);
  if (!d) return <span className="text-maroon-700/40">—</span>;
  const closed = order.status === "Delivered" || order.status === "Cancelled";
  let tag = "";
  if (!closed && todayIso) {
    if (d === todayIso) tag = "Today";
    else if (d === addDaysIso(todayIso, 1)) tag = "Tomorrow";
    else if (d < todayIso) tag = "Overdue";
  }
  return (
    <div className="flex flex-col leading-tight">
      <span className="whitespace-nowrap">{formatShort(d, true)}</span>
      {tag && (
        <span className={clsx("text-[11px] font-medium", tag === "Overdue" ? "text-red-400" : "text-marigold-600")}>
          {tag}
        </span>
      )}
    </div>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export default function OrdersTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  sort,
  onSort,
  todayIso,
}: {
  rows: OrderWithDetails[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  todayIso: string;
}) {
  const selectedCount = rows.reduce((n, r) => n + (selected.has(r.order_id) ? 1 : 0), 0);
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  // Rows glide when you sort/filter. Past ~80 rows that gets heavy, so very
  // long lists simply re-render without the per-row layout animation.
  const animateRows = rows.length <= 80;

  const headCell = "sticky top-0 z-10 bg-ivory px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-maroon-700/70 shadow-[inset_0_-1px_0_rgba(241,230,210,0.14)]";

  return (
    <div className="rounded-card border border-clay-300/70 bg-ivory overflow-x-auto xl:overflow-visible">
      <table className="w-full text-sm">
        <caption className="sr-only">Orders. Use the column headings to sort the table.</caption>
        <thead>
          <tr>
            <th scope="col" className={clsx(headCell, "w-12 pl-4 pr-1 rounded-tl-card")}>
              <Checkbox
                checked={allSelected}
                indeterminate={selectedCount > 0 && !allSelected}
                onChange={onToggleAll}
                label={allSelected ? "Deselect all orders" : "Select all orders"}
              />
            </th>
            {COLUMNS.map((col, i) => {
              const dir = sort?.key === col.key ? sort.dir : null;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                  className={clsx(headCell, col.align === "right" && "text-right", i === COLUMNS.length - 1 && "rounded-tr-card")}
                >
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={clsx(
                      "group inline-flex items-center gap-1.5 uppercase tracking-wide rounded-md -mx-1 px-1 py-1 transition-colors",
                      "hover:text-maroon-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400",
                      dir && "text-marigold-600",
                      col.align === "right" && "flex-row-reverse"
                    )}
                  >
                    {col.label}
                    <SortIcon dir={dir} />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((order, i) => {
            const isSelected = selected.has(order.order_id);
            const isCompleted = order.status === "Delivered" && order.payment_status === "Paid";
            const cancelled = order.status === "Cancelled";
            const Row: any = animateRows ? motion.tr : "tr";
            const motionProps = animateRows
              ? {
                  layout: "position",
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                  transition: { type: "spring", stiffness: 360, damping: 32, delay: Math.min(i, 12) * 0.022 },
                }
              : {};
            return (
              <Row
                key={order.order_id}
                {...motionProps}
                aria-selected={isSelected}
                className={clsx(
                  "border-t border-clay-300/40 transition-colors duration-150",
                  isSelected
                    ? "bg-marigold-500/10 shadow-[inset_3px_0_0_#D9A441]"
                    : "hover:bg-clay-100/50"
                )}
              >
                <td className="pl-4 pr-1 py-3 align-middle">
                  <Checkbox
                    checked={isSelected}
                    onChange={() => onToggle(order.order_id)}
                    label={`Select order ${order.order_id}`}
                  />
                </td>
                <td className={clsx("px-3 py-3 align-middle whitespace-nowrap", isCompleted && "opacity-60")}>
                  <Link
                    href={`/orders/${order.order_id}`}
                    className="font-medium text-marigold-600 rounded-md hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400"
                  >
                    {order.order_id}
                  </Link>
                </td>
                <td className={clsx("px-3 py-3 align-middle max-w-[16rem]", isCompleted && "opacity-60")}>
                  <Link
                    href={`/orders/${order.order_id}`}
                    className={clsx(
                      "block truncate font-medium text-maroon-800 rounded-md hover:text-marigold-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400",
                      (isCompleted || cancelled) && "line-through decoration-1"
                    )}
                  >
                    {order.customer?.name ?? "Unknown customer"}
                  </Link>
                  {order.customer?.phone && (
                    <span className="block truncate text-xs text-maroon-700/60">{order.customer.phone}</span>
                  )}
                </td>
                <td className={clsx("px-3 py-3 align-middle text-maroon-800", isCompleted && "opacity-60")}>
                  <Fulfilment order={order} todayIso={todayIso} />
                </td>
                <td className={clsx("px-3 py-3 align-middle text-maroon-800 whitespace-nowrap", isCompleted && "opacity-60")}>
                  {order.totalBoxes > 0 && <span>{plural(order.totalBoxes, "box", "boxes")}</span>}
                  {order.totalBoxes > 0 && order.totalIndividualItems > 0 && (
                    <span className="text-maroon-700/40"> · </span>
                  )}
                  {order.totalIndividualItems > 0 && (
                    <span>{plural(order.totalIndividualItems, "item", "items")}</span>
                  )}
                  {order.totalBoxes === 0 && order.totalIndividualItems === 0 && (
                    <span className="text-maroon-700/40">—</span>
                  )}
                </td>
                <td
                  className={clsx(
                    "px-3 py-3 align-middle text-right font-medium tabular-nums text-maroon-800 whitespace-nowrap",
                    (cancelled || isCompleted) && "opacity-60",
                    cancelled && "line-through"
                  )}
                >
                  ₹{order.total}
                </td>
                <td className="px-3 py-3 align-middle">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-3 py-3 align-middle">
                  <PaymentStatusBadge status={order.payment_status} />
                </td>
              </Row>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
