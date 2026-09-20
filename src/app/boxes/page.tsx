"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { Box, BoxContent, Product, ProductUnit } from "@/lib/types";
import { dedupeProductUnits } from "@/lib/product-units";
import QuantitySelector from "@/components/QuantitySelector";

// Contents state is keyed by "productId" for a plain product, or
// "productId::unitLabel" for a specific unit of a multi-unit product —
// this lets one product contribute more than one line (rare, but Halwa
// could in principle have more than one box-context unit).
function contentKey(productId: string, unitLabel?: string) {
  return unitLabel ? `${productId}::${unitLabel}` : productId;
}
function parseContentKey(key: string): { productId: string; unitLabel: string } {
  const idx = key.indexOf("::");
  return idx === -1
    ? { productId: key, unitLabel: "" }
    : { productId: key.slice(0, idx), unitLabel: key.slice(idx + 2) };
}

export default function BoxesPage() {
  const { data, loading, error, refresh } = useApi<{ boxes: Box[]; boxContents: BoxContent[] }>(
    "/api/boxes"
  );
  const { data: productData } = useApi<{ products: Product[] }>("/api/products");
  const { data: unitsData } = useApi<{ units: ProductUnit[] }>("/api/product-units");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", description: "" });
  const [contents, setContents] = useState<Record<string, number>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const products = productData?.products.filter((p) => p.active) ?? [];
  const allUnits = dedupeProductUnits(unitsData?.units ?? []);

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
      .map(([key, quantity]) => {
        const { productId, unitLabel } = parseContentKey(key);
        return { product_id: productId, quantity, unit_label: unitLabel };
      });

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

  async function deleteBox(box: Box) {
    if (
      !confirm(
        `Delete "${box.name}" permanently? Past orders will still show their own record, but this box will no longer appear anywhere to select.`
      )
    ) {
      return;
    }
    await fetch("/api/boxes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ box_id: box.box_id }),
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
            {products.map((p) => {
              const boxUnits = allUnits.filter((u) => u.product_id === p.product_id && u.context === "box");
              if (boxUnits.length === 0) {
                // Plain product — exactly the same single stepper as before.
                const key = contentKey(p.product_id);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span id={`box-content-${key}`} className="text-sm text-maroon-800">
                      {p.name}
                    </span>
                    <QuantitySelector
                      value={contents[key] ?? 0}
                      onChange={(v) => setContents({ ...contents, [key]: v })}
                    />
                  </div>
                );
              }
              // Multi-unit product (e.g. Halwa) — one stepper per box-unit,
              // quantity is specified in THAT unit (e.g. pieces).
              return boxUnits.map((u) => {
                const key = contentKey(p.product_id, u.label);
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span id={`box-content-${key}`} className="text-sm text-maroon-800">
                      {p.name} <span className="text-maroon-700/50">({u.label})</span>
                    </span>
                    <QuantitySelector
                      value={contents[key] ?? 0}
                      onChange={(v) => setContents({ ...contents, [key]: v })}
                    />
                  </div>
                );
              });
            })}
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
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleActive(box)}
                      className="text-xs text-marigold-600 font-medium touch-target px-2"
                    >
                      {box.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteBox(box)}
                      className="text-xs text-red-600 font-medium touch-target px-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {boxContents.length > 0 && (
                  <ul className="mt-2 text-sm text-maroon-700/70 flex flex-wrap gap-x-4 gap-y-1">
                    {boxContents.map((bc, i) => {
                      const product = productData?.products.find((p) => p.product_id === bc.product_id);
                      const name = product?.name ?? bc.product_id;
                      return (
                        <li key={i}>
                          {bc.unit_label ? `${name} (${bc.unit_label})` : name} × {bc.quantity}
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
