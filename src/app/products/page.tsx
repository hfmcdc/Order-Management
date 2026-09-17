"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const { data, loading, error, refresh } = useApi<{ products: Product[] }>("/api/products");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", category: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  function closeForm() {
    setShowForm(false);
    setForm({ name: "", price: "", category: "" });
    setFormError(null);
  }

  async function addProduct() {
    setFormError(null);
    if (!form.name.trim() || !form.price) {
      setFormError("Please enter a name and price.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, price: Number(form.price), category: form.category }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      closeForm();
      refresh();
    } catch (err: any) {
      setFormError(err.message ?? "Unable to add product.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    await fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: product.product_id, active: !product.active }),
    });
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">Products</h1>
          <p className="text-maroon-700/70 text-sm mt-0.5">Manage individual products.</p>
        </div>
        <button
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="touch-target rounded-full bg-marigold-500 text-white font-semibold px-5"
        >
          + Add
        </button>
      </header>

      {showForm && (
        <div className="rounded-card border border-clay-300 bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="product-name" className="text-xs font-medium text-maroon-700/70">
              Product name
            </label>
            <input
              id="product-name"
              placeholder="e.g. Laddoo"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="product-price" className="text-xs font-medium text-maroon-700/70">
              Price (₹)
            </label>
            <input
              id="product-price"
              placeholder="e.g. 20"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="product-category" className="text-xs font-medium text-maroon-700/70">
              Category (optional)
            </label>
            <input
              id="product-category"
              placeholder="e.g. Sweets, Snacks"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>
          {formError && <ErrorState message={formError} />}
          <div className="flex gap-2">
            <button
              onClick={addProduct}
              disabled={saving}
              className="touch-target flex-1 rounded-full bg-marigold-500 text-white font-medium"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <button
              onClick={closeForm}
              className="touch-target px-5 rounded-full bg-clay-100 text-maroon-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <LoadingState label="Loading products…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && data.products.length === 0 && !showForm && (
        <EmptyState
          title="No products yet"
          hint="Add your sweets and snacks here first (name + price) — they'll then be available to pick from when building boxes or adding items to an order."
        />
      )}

      {data && data.products.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.products.map((p) => (
            <div key={p.product_id} className="rounded-card bg-white border border-clay-300/70 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === p.product_id ? null : p.product_id)}
                className="w-full touch-target px-4 py-3 flex items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-maroon-800">
                    {p.name} {!p.active && <span className="text-xs text-maroon-700/50">(inactive)</span>}
                  </p>
                  <p className="text-sm text-maroon-700/60">₹{p.price}{p.category ? ` · ${p.category}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(p);
                    }}
                    className="text-xs text-marigold-600 font-medium"
                  >
                    {p.active ? "Disable" : "Enable"}
                  </button>
                  <span className="text-maroon-700/40">{expanded === p.product_id ? "▲" : "▼"}</span>
                </div>
              </button>
              {expanded === p.product_id && <ProductCustomers productId={p.product_id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCustomers({ productId }: { productId: string }) {
  const { data, loading, error } = useApi<{
    contributions: { customer: { name: string }; quantity: number }[];
  }>(`/api/products/${productId}/customers`);

  return (
    <div className="border-t border-clay-300/60 px-4 py-3 bg-clay-100/40">
      <p className="text-xs text-maroon-700/60 mb-2">Customers who ordered this</p>
      {loading && <p className="text-sm text-maroon-700/60">Loading…</p>}
      {error && <p className="text-sm text-maroon-700/60">{error}</p>}
      {data && data.contributions.length === 0 && (
        <p className="text-sm text-maroon-700/60">No active orders yet.</p>
      )}
      {data && (
        <ul className="flex flex-col gap-1">
          {data.contributions.map((c, i) => (
            <li key={i} className="text-sm flex justify-between">
              <span className="text-maroon-800">{c.customer.name}</span>
              <span className="text-maroon-700/70">{c.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
