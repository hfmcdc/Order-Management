"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { OrderStatusBadge } from "@/components/StatusBadge";
import SummaryCard from "@/components/SummaryCard";
import { CustomerTotals, OrderWithDetails } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refresh } = useApi<{
    totals: CustomerTotals;
    orders: OrderWithDetails[];
  }>(`/api/customers/${params.id}`);

  if (loading) return <LoadingState label="Loading customer…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { totals, orders } = data;

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={() => router.push("/customers")}
        className="self-start text-sm text-marigold-600 font-medium touch-target"
      >
        ← Back to customers
      </button>

      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">{totals.customer.name}</h1>
        <p className="text-maroon-700/70 text-sm mt-0.5">
          {totals.customer.phone}
          {totals.customer.address ? ` · ${totals.customer.address}` : ""}
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Orders" value={totals.orderCount} accent />
        <SummaryCard label="Boxes" value={totals.totalBoxes} />
        <SummaryCard label="Total items" value={totals.totalItems} />
        <SummaryCard label="Total amount" value={`₹${totals.totalAmount}`} />
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-display font-600 text-lg text-maroon-800">Order history</h2>
        {orders.length === 0 && (
          <p className="text-sm text-maroon-700/60">No orders yet.</p>
        )}
        {orders.map((order) => (
          <Link
            key={order.order_id}
            href={`/orders/${order.order_id}`}
            className="rounded-card bg-white border border-clay-300/70 px-4 py-3 flex items-center justify-between hover:border-marigold-400 transition-colors"
          >
            <div>
              <p className="font-medium text-maroon-800">{order.order_id}</p>
              <p className="text-xs text-maroon-700/60">
                {order.totalBoxes} boxes · {order.totalIndividualItems} individual ·{" "}
                {order.fulfillment_date} · ₹{order.total}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </Link>
        ))}
      </section>
    </div>
  );
}
