"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
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

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (loading) return <LoadingState label="Loading customer…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return null;

  const { totals, orders } = data;

  function startEditing() {
    setForm({
      name: totals.customer.name,
      phone: totals.customer.phone,
      address: totals.customer.address ?? "",
    });
    setSaveError(null);
    setEditing(true);
  }

  async function saveCustomer() {
    setSaveError(null);
    if (!form.name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error);
      setEditing(false);
      refresh();
    } catch (err: any) {
      setSaveError(err.message ?? "Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <button
        onClick={() => router.push("/customers")}
        className="self-start text-sm text-marigold-600 font-medium touch-target"
      >
        ← Back to customers
      </button>

      {!editing ? (
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-700 text-2xl text-maroon-800">{totals.customer.name}</h1>
            <p className="text-maroon-700/70 text-sm mt-0.5">
              {totals.customer.phone}
              {totals.customer.address ? ` · ${totals.customer.address}` : ""}
            </p>
          </div>
          <button
            onClick={startEditing}
            className="touch-target text-sm text-marigold-600 font-medium px-2 shrink-0"
          >
            Edit
          </button>
        </header>
      ) : (
        <div className="rounded-card border border-clay-300 bg-white p-4 flex flex-col gap-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />
          {saveError && <ErrorState message={saveError} />}
          <div className="flex gap-2">
            <button
              onClick={saveCustomer}
              disabled={saving}
              className="touch-target flex-1 rounded-full bg-marigold-500 text-white font-medium"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="touch-target px-4 rounded-full bg-clay-100 text-maroon-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
