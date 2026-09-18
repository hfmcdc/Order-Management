"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { OrderWithDetails, ORDER_STATUSES } from "@/lib/types";

export default function OrdersPage() {
  const { data, loading, error, refresh } = useApi<{ orders: OrderWithDetails[] }>("/api/orders");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.orders;
    if (statusFilter !== "All") rows = rows.filter((o) => o.status === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((o) =>
        [o.order_id, o.customer?.name, o.customer?.phone]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(q))
      );
    }
    return rows;
  }, [data, query, statusFilter]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">Orders</h1>
          <p className="text-maroon-700/70 text-sm mt-1">Every order, searchable and filterable.</p>
        </div>
        <Link
          href="/orders/new"
          className="hidden md:flex touch-target items-center rounded-full bg-marigold-500 text-white font-semibold px-5 shadow-md shadow-marigold-500/25 hover:bg-marigold-600 transition-colors"
        >
          + New Order
        </Link>
      </header>

      <div className="flex flex-col md:flex-row gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or order ID"
          className="touch-target flex-1 rounded-2xl bg-white px-4 shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="touch-target rounded-2xl bg-white px-4 shadow-sm"
        >
          <option value="All">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingState label="Loading orders…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && filtered.length === 0 && (
        <EmptyState title="No orders found" hint="Try a different search or filter." />
      )}

      {data && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => {
            const isCompleted = order.status === "Delivered" && order.payment_status === "Paid";
            return (
              <Link
                key={order.order_id}
                href={`/orders/${order.order_id}`}
                className={`card px-5 py-4 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform ${
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
            );
          })}
        </div>
      )}
    </div>
  );
}
