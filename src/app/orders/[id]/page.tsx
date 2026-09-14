"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { OrderWithDetails, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/types";
import { useState } from "react";
import EditOrderItems from "@/components/EditOrderItems";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refresh } = useApi<{ order: OrderWithDetails }>(
    `/api/orders/${params.id}`
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingItems, setEditingItems] = useState(false);

  async function patchOrder(body: Record<string, any>) {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error);
      refresh();
    } catch (err: any) {
      setActionError(err.message ?? "Unable to update the order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading order…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const order = data.order;

  if (editingItems) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <button
          onClick={() => setEditingItems(false)}
          className="self-start text-sm text-marigold-600 font-medium touch-target"
        >
          ← Back to order
        </button>
        <h1 className="font-display font-700 text-2xl text-maroon-800">Edit {order.order_id}</h1>
        <EditOrderItems
          order={order}
          onCancel={() => setEditingItems(false)}
          onSaved={() => {
            setEditingItems(false);
            refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={() => router.push("/orders")}
        className="self-start text-sm text-marigold-600 font-medium touch-target"
      >
        ← Back to orders
      </button>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">{order.order_id}</h1>
          <p className="text-maroon-700/70 text-sm mt-0.5">
            {order.customer?.name} · {order.customer?.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} />
        </div>
      </header>

      <section className="rounded-card bg-white border border-clay-300/70 p-4 grid grid-cols-2 gap-4 text-sm">
        <Info label="Order date" value={order.order_date} />
        <Info label="Boxes" value={String(order.totalBoxes)} />
        <Info label="Individual items" value={String(order.totalIndividualItems)} />
        <Info label="Total items" value={String(order.totalItems)} />
        <Info label="Order total" value={`₹${order.total}`} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-600 text-lg text-maroon-800">Items</h2>
          {order.status !== "Cancelled" && (
            <button
              onClick={() => setEditingItems(true)}
              className="text-sm text-marigold-600 font-medium touch-target px-2"
            >
              Edit items
            </button>
          )}
        </div>
        <div className="rounded-card bg-white border border-clay-300/70 divide-y divide-clay-300/50">
          {order.items.map((item) => (
            <div key={item.order_item_id} className="px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="capitalize text-maroon-800">
                {item.item_type === "box" ? "📦 " : "• "}
                {item.item_type} × {item.quantity}
              </span>
              <span className="text-maroon-700/70">₹{item.unit_price * item.quantity}</span>
            </div>
          ))}
        </div>
      </section>

      {order.notes && (
        <section>
          <h2 className="font-display font-600 text-lg text-maroon-800 mb-1">Notes</h2>
          <p className="text-sm text-maroon-700/80 bg-white rounded-card border border-clay-300/70 p-3">
            {order.notes}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">Update status</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.filter((s) => s !== "Cancelled").map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => patchOrder({ status: s })}
              className={`touch-target px-4 rounded-full text-sm font-medium border ${
                order.status === s
                  ? "bg-maroon-800 text-white border-maroon-800"
                  : "bg-white text-maroon-800 border-clay-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <h2 className="font-display font-600 text-lg text-maroon-800 mt-2">Payment</h2>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => patchOrder({ payment_status: s })}
              className={`touch-target px-4 rounded-full text-sm font-medium border ${
                order.payment_status === s
                  ? "bg-maroon-800 text-white border-maroon-800"
                  : "bg-white text-maroon-800 border-clay-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-2">
          {order.status === "Cancelled" ? (
            <button
              disabled={busy}
              onClick={() => patchOrder({ action: "restore" })}
              className="touch-target rounded-full bg-leaf-500 text-white font-medium px-5"
            >
              Restore order
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => {
                if (confirm("Cancel this order? It will be removed from production totals.")) {
                  patchOrder({ action: "cancel" });
                }
              }}
              className="touch-target rounded-full bg-maroon-900/10 text-maroon-800 font-medium px-5"
            >
              Cancel order
            </button>
          )}
        </div>
      </section>

      {actionError && <ErrorState message={actionError} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-maroon-700/60">{label}</p>
      <p className="font-medium text-maroon-800">{value}</p>
    </div>
  );
}
