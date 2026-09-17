"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
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

  function closeForm() {
    setShowForm(false);
    setForm({ name: "", price: "", description: "" });
    setContents({});
    setFormError(null);
  }

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
      closeForm();
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
          onClick={() => (showForm ? closeForm() : setShowForm(true))}
          className="touch-target rounded-full bg-marigold-500 text-white font-semibold px-5"
        >
          + Add
        </button>
      </header>

      {showForm && products.length === 0 && (
        <ErrorState message="Add at least one product on the Products page first — a box's contents are built from your existing products." />
      )}

      {showForm && products.length > 0 && (
        <div className="rounded-card border border-clay-300 bg-white p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="box-name" className="text-xs font-medium text-maroon-700/70">
              Box name
            </label>
            <input
              id="box-name"
              placeholder="e.g. Premium Diwali Box"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="box-price" className="text-xs font-medium text-maroon-700/70">
              Price (₹)
            </label>
            <input
              id="box-price"
              placeholder="e.g. 450"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="box-description" className="text-xs font-medium text-maroon-700/70">
              Description (optional)
            </label>
            <input
              id="box-description"
              placeholder="e.g. Our festive best-seller"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="touch-target rounded-card border border-clay-300 px-4"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-maroon-800 mt-1 mb-1">Contents</legend>
            {products.map((p) => (
              <div key={p.product_id} className="flex items-center justify-between">
                <span id={`box-content-${p.product_id}`} className="text-sm text-maroon-800">
                  {p.name}
                </span>
                <QuantitySelector
                  value={contents[p.product_id] ?? 0}
                  onChange={(v) => setContents({ ...contents, [p.product_id]: v })}
                />
              </div>
            ))}
          </fieldset>

          {formError && <ErrorState message={formError} />}
          <div className="flex gap-2">
            <button
              onClick={addBox}
              disabled={saving}
              className="touch-target flex-1 rounded-full bg-marigold-500 text-white font-medium"
            >
              {saving ? "Saving…" : "Save box"}
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

      {loading && <LoadingState label="Loading boxes…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && data.boxes.length === 0 && !showForm && (
        <EmptyState
          title="No boxes yet"
          hint="A box bundles several products together (e.g. Laddoo × 4, Halwa × 2) under one price. Add your products first if you haven't, then create a box here."
        />
      )}

      {data && data.boxes.length > 0 && (
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
