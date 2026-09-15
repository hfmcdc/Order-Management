"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { OrderWithDetails, OrderItem, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/types";
import { useState } from "react";
import EditOrderItems from "@/components/EditOrderItems";

type NamedOrderItem = OrderItem & { name: string };
type OrderDetail = Omit<OrderWithDetails, "items"> & { items: NamedOrderItem[] };

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refresh } = useApi<{ order: OrderDetail }>(
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

  function shareOnWhatsApp() {
    const lines = [
      "Vaiga Sweets & Snacks",
      "Diwali 2026",
      "",
      `Order: ${order.order_id}`,
      `Customer: ${order.customer?.name ?? ""}`,
      "",
      ...order.items.map((item) => `${item.name} × ${item.quantity}`),
      "",
      `Total: ₹${order.total}`,
    ];
    const text = encodeURIComponent(lines.join("\n"));
    const phone = order.customer?.phone?.replace(/\D/g, "");
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  }

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
      {/* Print-only invoice — hidden on screen, shown only when printing */}
      <div className="hidden print:block">
        <h1 className="font-display font-700 text-2xl text-maroon-900">VAIGA SWEETS &amp; SNACKS</h1>
        <p className="text-sm text-maroon-800">Diwali 2026</p>
        <hr className="my-3 border-maroon-900/30" />
        <p><strong>Order:</strong> {order.order_id}</p>
        <p><strong>Customer:</strong> {order.customer?.name}</p>
        <p><strong>Phone:</strong> {order.customer?.phone}</p>
        <p><strong>Date:</strong> {order.order_date}</p>
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-left border-b border-maroon-900/30">
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Price</th>
              <th className="py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.order_item_id} className="border-b border-maroon-900/10">
                <td className="py-1">{item.name}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">₹{item.unit_price}</td>
                <td className="py-1 text-right">₹{item.unit_price * item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-right font-semibold mt-3 text-lg">Total: ₹{order.total}</p>
      </div>

      <div className="no-print flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/orders")}
            className="self-start text-sm text-marigold-600 font-medium touch-target"
          >
            ← Back to orders
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="touch-target rounded-full bg-white border border-clay-300 text-maroon-800 text-sm font-medium px-4"
            >
              Print
            </button>
            <button
              onClick={shareOnWhatsApp}
              className="touch-target rounded-full bg-leaf-500 text-white text-sm font-medium px-4"
            >
              WhatsApp
            </button>
          </div>
        </div>

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
                <span className="text-maroon-800">
                  {item.item_type === "box" ? "📦 " : "• "}
                  {item.name} × {item.quantity}
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
