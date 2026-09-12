"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { Box, BoxContent, Product } from "@/lib/types";
import QuantitySelector from "@/components/QuantitySelector";

export default function BoxesPage() {
  const { data, loading, error, refresh } = useApi<{ boxes: Box[]; boxContents: BoxContent[] }>(
    "/api/boxes"
  );
  const { data: productData } = useApi<{ products: Product[] }>("/api/products");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [contents, setContents] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const products = productData?.products.filter((p) => p.active) ?? [];

  async function addBox() {
    setFormError(null);
    const contentsList = Object.entries(contents)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));

    if (!form.name.trim() || !form.price) {
      setFormError("Please enter a name and price.");
      return;
    }
    if (contentsList.length === 0) {
      setFormError("Add at least one product to the box contents.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/boxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          price: Number(form.price),
          description: form.description,
          contents: contentsList,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setForm({ name: "", price: "", description: "" });
      setContents({});
      setShowForm(false);
      refresh();
    } catch (err: any) {
      setFormError(err.message ?? "Unable to add box.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(box: Box) {
    await fetch("/api/boxes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ box_id: box.box_id, active: !box.active }),
    });
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">Boxes</h1>
          <p className="text-maroon-700/70 text-sm mt-0.5">Define what goes inside each Diwali box.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="touch-target rounded-full bg-marigold-500 text-white font-semibold px-5"
        >
          + Add
        </button>
      </header>

      {showForm && (
        <div className="rounded-card border border-clay-300 bg-white p-4 flex flex-col gap-3">
          <input
            placeholder="Box name (e.g. Premium Diwali Box)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />
          <input
            placeholder="Price (₹)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="touch-target rounded-card border border-clay-300 px-4"
          />

          <p className="text-sm font-medium text-maroon-800 mt-1">Contents</p>
          <div className="flex flex-col gap-2">
            {products.map((p) => (
              <div key={p.product_id} className="flex items-center justify-between">
                <span className="text-sm text-maroon-800">{p.name}</span>
                <QuantitySelector
                  value={contents[p.product_id] ?? 0}
                  onChange={(v) => setContents({ ...contents, [p.product_id]: v })}
                />
              </div>
            ))}
          </div>

          {formError && <ErrorState message={formError} />}
          <button
            onClick={addBox}
            disabled={saving}
            className="touch-target rounded-full bg-marigold-500 text-white font-medium"
          >
            {saving ? "Saving…" : "Save box"}
          </button>
        </div>
      )}

      {loading && <LoadingState label="Loading boxes…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <div className="flex flex-col gap-2">
          {data.boxes.map((box) => {
            const boxContents = data.boxContents.filter((bc) => bc.box_id === box.box_id);
            return (
              <div key={box.box_id} className="rounded-card bg-white border border-clay-300/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-maroon-800">
                      {box.name} {!box.active && <span className="text-xs text-maroon-700/50">(inactive)</span>}
                    </p>
                    <p className="text-sm text-maroon-700/60">₹{box.price}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(box)}
                    className="text-xs text-marigold-600 font-medium touch-target px-2"
                  >
                    {box.active ? "Disable" : "Enable"}
                  </button>
                </div>
                {boxContents.length > 0 && (
                  <ul className="mt-2 text-sm text-maroon-700/70 flex flex-wrap gap-x-4 gap-y-1">
                    {boxContents.map((bc, i) => {
                      const product = productData?.products.find((p) => p.product_id === bc.product_id);
                      return (
                        <li key={i}>
                          {product?.name ?? bc.product_id} × {bc.quantity}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
