"use client";

import { useParams, useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/StatusBadge";
import { OrderWithDetails, OrderItem, ORDER_STATUSES, PAYMENT_STATUSES, PaymentMethod } from "@/lib/types";
import { useState } from "react";
import EditOrderItems from "@/components/EditOrderItems";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { BUSINESS_ADDRESS, BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/business-info";
import { publicOrderCode } from "@/lib/public-order-code";

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
  const [showCancelChoice, setShowCancelChoice] = useState(false);
  const [sharing, setSharing] = useState(false);
  // "ask-paid" = "was this paid?" step; "ask-method" = "cash or UPI?" step
  const [deliveredPrompt, setDeliveredPrompt] = useState<"ask-paid" | "ask-method" | null>(null);

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
      if (body.action === "delete") {
        router.push("/orders");
        return;
      }
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

  async function shareOnWhatsApp() {
    setSharing(true);
    setActionError(null);
    try {
      const pdfFile = await buildInvoicePdf(order);
      const shareText = `${BUSINESS_NAME} — Order ${publicOrderCode(order.order_id)} for ${order.customer?.name ?? ""}, total ₹${order.total}`;

      // Mobile browsers (Android Chrome, iOS Safari) support sharing files
      // directly — this opens the native share sheet, where WhatsApp (and
      // picking which contact/group to send to) is handled by the OS/app
      // itself, not by this website.
      const canShareFile =
        typeof navigator !== "undefined" &&
        "share" in navigator &&
        "canShare" in navigator &&
        (navigator as any).canShare?.({ files: [pdfFile] });

      if (canShareFile) {
        await (navigator as any).share({
          files: [pdfFile],
          title: `Vaiga Order ${publicOrderCode(order.order_id)}`,
          text: shareText,
        });
        return;
      }

      // Desktop/laptop browsers can't attach files into WhatsApp Web via a
      // link — no website can do that, it's a WhatsApp Web restriction, not
      // something specific to this app. Best available flow: download the
      // PDF for them, then open WhatsApp Web with the text pre-filled so
      // they just need to attach the file that was just downloaded.
      const blobUrl = URL.createObjectURL(pdfFile);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = pdfFile.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);

      const phone = order.customer?.phone?.replace(/\D/g, "");
      const text = encodeURIComponent(shareText);
      const url = phone
        ? `https://web.whatsapp.com/send?phone=${phone}&text=${text}`
        : `https://web.whatsapp.com/send?text=${text}`;
      window.open(url, "_blank");
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setActionError("Couldn't prepare the WhatsApp share. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  }

  function handleStatusClick(s: string) {
    if (s === "Delivered") {
      setDeliveredPrompt("ask-paid");
      return;
    }
    patchOrder({ status: s });
  }

  function markDeliveredUnpaid() {
    setDeliveredPrompt(null);
    patchOrder({ status: "Delivered" });
  }

  function markDeliveredPaid(method: PaymentMethod) {
    setDeliveredPrompt(null);
    patchOrder({ status: "Delivered", payment_status: "Paid", payment_method: method });
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
        <h1 className="font-display font-700 text-2xl text-maroon-900">{BUSINESS_NAME.toUpperCase()}</h1>
        <p className="text-sm text-maroon-800">{BUSINESS_ADDRESS}</p>
        <p className="text-sm text-maroon-800">Phone: {BUSINESS_PHONE}</p>
        <hr className="my-3 border-maroon-900/30" />
        <p><strong>Order:</strong> {publicOrderCode(order.order_id)}</p>
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
              disabled={sharing}
              className="touch-target rounded-full bg-leaf-500 text-white text-sm font-medium px-4 disabled:opacity-60"
            >
              {sharing ? "Preparing…" : "WhatsApp"}
            </button>
          </div>
        </div>

        <header className="flex items-start justify-between gap-3">
          <div>
            <h1
              className={`font-display font-700 text-2xl text-maroon-800 ${
                order.status === "Delivered" && order.payment_status === "Paid" ? "line-through decoration-1" : ""
              }`}
            >
              {order.order_id}
            </h1>
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
          {order.payment_method && <Info label="Paid via" value={order.payment_method} />}
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
                onClick={() => handleStatusClick(s)}
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
                onClick={() => setShowCancelChoice(true)}
                className="touch-target rounded-full bg-maroon-900/10 text-maroon-800 font-medium px-5"
              >
                Cancel order
              </button>
            )}
          </div>
        </section>

        {actionError && <ErrorState message={actionError} />}
      </div>

      {deliveredPrompt === "ask-paid" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
          <div className="w-full md:w-96 rounded-card bg-white p-5 flex flex-col gap-3">
            <h3 className="font-display font-700 text-lg text-maroon-800">Was this order paid?</h3>
            <p className="text-sm text-maroon-700/70">You&apos;re marking {order.order_id} as Delivered.</p>
            <button
              disabled={busy}
              onClick={() => setDeliveredPrompt("ask-method")}
              className="touch-target rounded-full bg-leaf-500 text-white font-medium"
            >
              Paid
            </button>
            <button
              disabled={busy}
              onClick={markDeliveredUnpaid}
              className="touch-target rounded-full bg-white border border-clay-300 text-maroon-800 font-medium"
            >
              Not yet
            </button>
            <button
              onClick={() => setDeliveredPrompt(null)}
              className="touch-target rounded-full bg-clay-100 text-maroon-800 font-medium"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {deliveredPrompt === "ask-method" && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
          <div className="w-full md:w-96 rounded-card bg-white p-5 flex flex-col gap-3">
            <h3 className="font-display font-700 text-lg text-maroon-800">Paid by cash or UPI?</h3>
            <button
              disabled={busy}
              onClick={() => markDeliveredPaid("Cash")}
              className="touch-target rounded-full bg-maroon-800 text-white font-medium"
            >
              Cash
            </button>
            <button
              disabled={busy}
              onClick={() => markDeliveredPaid("UPI")}
              className="touch-target rounded-full bg-maroon-800 text-white font-medium"
            >
              UPI
            </button>
            <button
              onClick={() => setDeliveredPrompt(null)}
              className="touch-target rounded-full bg-clay-100 text-maroon-800 font-medium"
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {showCancelChoice && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 px-4 pb-4 md:pb-0">
          <div className="w-full md:w-96 rounded-card bg-white p-5 flex flex-col gap-3">
            <h3 className="font-display font-700 text-lg text-maroon-800">What should happen to this order?</h3>
            <p className="text-sm text-maroon-700/70">
              You can mark it as Cancelled (kept in your records, excluded from production) or delete it
              permanently (can&apos;t be undone).
            </p>
            <button
              disabled={busy}
              onClick={() => {
                setShowCancelChoice(false);
                patchOrder({ action: "cancel" });
              }}
              className="touch-target rounded-full bg-maroon-800 text-white font-medium"
            >
              Mark as Cancelled
            </button>
            <button
              disabled={busy}
              onClick={() => {
                setShowCancelChoice(false);
                patchOrder({ action: "delete" });
              }}
              className="touch-target rounded-full bg-white border border-red-300 text-red-600 font-medium"
            >
              Delete permanently
            </button>
            <button
              onClick={() => setShowCancelChoice(false)}
              className="touch-target rounded-full bg-clay-100 text-maroon-800 font-medium"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
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
