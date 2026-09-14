"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/useApi";
import { ErrorState, LoadingState } from "@/components/StateViews";
import QuantitySelector from "@/components/QuantitySelector";
import { Box, OrderWithDetails, Product } from "@/lib/types";
import clsx from "clsx";

interface Props {
  order: OrderWithDetails;
  onCancel: () => void;
  onSaved: () => void;
}

export default function EditOrderItems({ order, onCancel, onSaved }: Props) {
  const { data: boxData, loading: boxesLoading, error: boxesError } = useApi<{ boxes: Box[] }>(
    "/api/boxes"
  );
  const { data: productData, loading: productsLoading, error: productsError } = useApi<{
    products: Product[];
  }>("/api/products");

  const [boxQuantities, setBoxQuantities] = useState<Record<string, number>>({});
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState(order.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Pre-fill quantities from the order's existing items once loaded.
  useEffect(() => {
    const boxQ: Record<string, number> = {};
    const productQ: Record<string, number> = {};
    for (const item of order.items) {
      if (item.item_type === "box") boxQ[item.box_id] = item.quantity;
      else productQ[item.product_id] = item.quantity;
    }
    setBoxQuantities(boxQ);
    setProductQuantities(productQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.order_id]);

  // Show active boxes/products, plus any inactive ones already on this order
  // (so editing an old order doesn't silently drop a discontinued item).
  const boxes = useMemo(() => {
    const all = boxData?.boxes ?? [];
    const orderedIds = new Set(order.items.filter((i) => i.item_type === "box").map((i) => i.box_id));
    return all.filter((b) => b.active || orderedIds.has(b.box_id));
  }, [boxData, order.items]);

  const products = useMemo(() => {
    const all = productData?.products ?? [];
    const orderedIds = new Set(
      order.items.filter((i) => i.item_type === "product").map((i) => i.product_id)
    );
    return all.filter((p) => p.active || orderedIds.has(p.product_id));
  }, [productData, order.items]);

  const total = useMemo(() => {
    const boxTotal = boxes.reduce((sum, b) => sum + (boxQuantities[b.box_id] ?? 0) * b.price, 0);
    const productTotal = products.reduce(
      (sum, p) => sum + (productQuantities[p.product_id] ?? 0) * p.price,
      0
    );
    return boxTotal + productTotal;
  }, [boxes, products, boxQuantities, productQuantities]);

  async function save() {
    setSaveError(null);
    const items = [
      ...boxes
        .filter((b) => (boxQuantities[b.box_id] ?? 0) > 0)
        .map((b) => ({
          item_type: "box" as const,
          box_id: b.box_id,
          quantity: boxQuantities[b.box_id],
          unit_price: b.price,
        })),
      ...products
        .filter((p) => (productQuantities[p.product_id] ?? 0) > 0)
        .map((p) => ({
          item_type: "product" as const,
          product_id: p.product_id,
          quantity: productQuantities[p.product_id],
          unit_price: p.price,
        })),
    ];

    if (items.length === 0) {
      setSaveError("An order needs at least one box or product — cancel the order instead if it's empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${order.order_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          items,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error);
      onSaved();
    } catch (err: any) {
      setSaveError(err.message ?? "Unable to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs text-maroon-700/60 -mt-2">
        Prices use the current Products/Boxes prices, not the original order&apos;s prices.
      </p>

      <section className="flex flex-col gap-2">
        <h3 className="font-display font-600 text-base text-maroon-800">Diwali boxes</h3>
        {boxesLoading && <LoadingState label="Loading boxes…" />}
        {boxesError && <ErrorState message={boxesError} />}
        <div className="flex flex-col gap-2">
          {boxes.map((box) => (
            <div
              key={box.box_id}
              className={clsx(
                "rounded-card border px-4 py-3 flex items-center justify-between gap-3 bg-white",
                (boxQuantities[box.box_id] ?? 0) > 0 ? "border-marigold-400" : "border-clay-300/70"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-maroon-800 truncate">{box.name}</p>
                <p className="text-xs text-maroon-700/60">₹{box.price}</p>
              </div>
              <QuantitySelector
                value={boxQuantities[box.box_id] ?? 0}
                onChange={(v) => setBoxQuantities({ ...boxQuantities, [box.box_id]: v })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-display font-600 text-base text-maroon-800">Individual products</h3>
        {productsLoading && <LoadingState label="Loading products…" />}
        {productsError && <ErrorState message={productsError} />}
        <div className="flex flex-col gap-2">
          {products.map((product) => (
            <div
              key={product.product_id}
              className={clsx(
                "rounded-card border px-4 py-3 flex items-center justify-between gap-3 bg-white",
                (productQuantities[product.product_id] ?? 0) > 0
                  ? "border-marigold-400"
                  : "border-clay-300/70"
              )}
            >
              <div className="min-w-0">
                <p className="font-medium text-maroon-800 truncate">{product.name}</p>
                <p className="text-xs text-maroon-700/60">₹{product.price}</p>
              </div>
              <QuantitySelector
                value={productQuantities[product.product_id] ?? 0}
                onChange={(v) =>
                  setProductQuantities({ ...productQuantities, [product.product_id]: v })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-display font-600 text-base text-maroon-800">Notes</h3>
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-card border border-clay-300 px-4 py-3 bg-white min-h-[80px]"
        />
      </section>

      {saveError && <ErrorState message={saveError} />}

      <div className="sticky bottom-20 md:bottom-4 bg-ivory/95 backdrop-blur border border-clay-300 rounded-card px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs text-maroon-700/60">New order total</p>
          <p className="font-display font-700 text-xl text-maroon-800">₹{total}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="touch-target rounded-full bg-clay-100 text-maroon-800 font-medium px-5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="touch-target rounded-full bg-marigold-500 text-white font-semibold px-6 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
