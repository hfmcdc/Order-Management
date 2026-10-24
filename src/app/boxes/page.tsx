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

interface BoxFormValues {
  name: string;
  price: string;
  description: string;
  contents: Record<string, number>;
}

/**
 * The box form, used both for adding a new box and for editing an existing
 * one (pass `initial` to pre-fill it).
 */
function BoxEditor({
  initial,
  allProducts,
  allUnits,
  submitLabel,
  warning,
  onSubmit,
  onCancel,
}: {
  initial: BoxFormValues;
  allProducts: Product[];
  allUnits: ProductUnit[];
  submitLabel: string;
  warning?: string;
  onSubmit: (payload: {
    name: string;
    price: number;
    description: string;
    contents: { product_id: string; quantity: number; unit_label: string }[];
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: initial.name,
    price: initial.price,
    description: initial.description,
  });
  const [contents, setContents] = useState<Record<string, number>>(initial.contents);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeProducts = allProducts.filter((p) => p.active);

  // Rows we show: every active product (or each of its box units), plus any
  // line this box already has that is no longer offered (inactive product, or
  // a unit that was removed) so saving never drops it by accident.
  const shownKeys = new Set<string>();
  const rows: { key: string; label: React.ReactNode }[] = [];
  for (const p of activeProducts) {
    const boxUnits = allUnits.filter((u) => u.product_id === p.product_id && u.context === "box");
    if (boxUnits.length === 0) {
      const key = contentKey(p.product_id);
      shownKeys.add(key);
      rows.push({ key, label: p.name });
    } else {
      for (const u of boxUnits) {
        const key = contentKey(p.product_id, u.label);
        shownKeys.add(key);
        rows.push({
          key,
          label: (
            <>
              {p.name} <span className="text-maroon-700/50">({u.label})</span>
            </>
          ),
        });
      }
    }
  }
  for (const key of Object.keys(initial.contents)) {
    if (shownKeys.has(key)) continue;
    const { productId, unitLabel } = parseContentKey(key);
    const product = allProducts.find((p) => p.product_id === productId);
    rows.push({
      key,
      label: (
        <>
          {product?.name ?? productId}
          {unitLabel && <span className="text-maroon-700/50"> ({unitLabel})</span>}{" "}
          <span className="text-xs text-maroon-700/50">
            {product && !product.active ? "(inactive)" : "(no longer offered)"}
          </span>
        </>
      ),
    });
  }

  async function submit() {
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
      await onSubmit({
        name: form.name,
        price: Number(form.price),
        description: form.description,
        contents: contentsList,
      });
    } catch (err: any) {
      setFormError(err.message ?? "Unable to save box.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-card border border-clay-300 bg-ivory p-4 flex flex-col gap-3">
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
        {rows.map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <span id={`box-content-${row.key}`} className="text-sm text-maroon-800">
              {row.label}
            </span>
            <QuantitySelector
              value={contents[row.key] ?? 0}
              onChange={(v) => setContents({ ...contents, [row.key]: v })}
            />
          </div>
        ))}
      </fieldset>

      {warning && <p className="text-xs text-maroon-700/70 bg-clay-100/60 rounded-xl px-3 py-2">{warning}</p>}
      {formError && <ErrorState message={formError} />}
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={saving}
          className="press touch-target flex-1 rounded-full bg-marigold-500 text-ink font-medium"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="press touch-target px-5 rounded-full bg-clay-100 text-maroon-800 font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function BoxesPage() {
  const { data, loading, error, refresh } = useApi<{ boxes: Box[]; boxContents: BoxContent[] }>(
    "/api/boxes"
  );
  const { data: productData } = useApi<{ products: Product[] }>("/api/products");
  const { data: unitsData } = useApi<{ units: ProductUnit[] }>("/api/product-units");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const allProducts = productData?.products ?? [];
  const activeProducts = allProducts.filter((p) => p.active);
  const allUnits = dedupeProductUnits(unitsData?.units ?? []);

  async function addBox(payload: {
    name: string;
    price: number;
    description: string;
    contents: { product_id: string; quantity: number; unit_label: string }[];
  }) {
    const res = await fetch("/api/boxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    setShowForm(false);
    refresh();
  }

  async function saveBox(
    boxId: string,
    payload: {
      name: string;
      price: number;
      description: string;
      contents: { product_id: string; quantity: number; unit_label: string }[];
    }
  ) {
    const res = await fetch("/api/boxes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ box_id: boxId, ...payload }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error);
    setEditingId(null);
    refresh();
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
          onClick={() => {
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="press touch-target rounded-full bg-marigold-500 text-ink font-semibold px-5"
        >
          + Add
        </button>
      </header>

      {showForm && activeProducts.length === 0 && (
        <ErrorState message="Add at least one product on the Products page first — a box's contents are built from your existing products." />
      )}

      {showForm && activeProducts.length > 0 && (
        <BoxEditor
          initial={{ name: "", price: "", description: "", contents: {} }}
          allProducts={allProducts}
          allUnits={allUnits}
          submitLabel="Save box"
          onSubmit={addBox}
          onCancel={() => setShowForm(false)}
        />
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

            if (editingId === box.box_id) {
              const initialContents: Record<string, number> = {};
              for (const bc of boxContents) {
                initialContents[contentKey(bc.product_id, bc.unit_label)] = bc.quantity;
              }
              return (
                <BoxEditor
                  key={box.box_id}
                  initial={{
                    name: box.name,
                    price: String(box.price),
                    description: box.description ?? "",
                    contents: initialContents,
                  }}
                  allProducts={allProducts}
                  allUnits={allUnits}
                  submitLabel="Save changes"
                  warning="A price change applies to new orders only. Changing what's inside the box also changes what Production counts for existing orders of this box."
                  onSubmit={(payload) => saveBox(box.box_id, payload)}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            return (
              <div key={box.box_id} className="rounded-card bg-ivory border border-clay-300/70 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-maroon-800">
                      {box.name} {!box.active && <span className="text-xs text-maroon-700/50">(inactive)</span>}
                    </p>
                    <p className="text-sm text-maroon-700/60">₹{box.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(box.box_id);
                      }}
                      className="text-xs text-marigold-600 font-medium touch-target px-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(box)}
                      className="text-xs text-marigold-600 font-medium touch-target px-2"
                    >
                      {box.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => deleteBox(box)}
                      className="text-xs text-red-400 font-medium touch-target px-2"
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
