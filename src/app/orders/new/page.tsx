"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import QuantitySelector from "@/components/QuantitySelector";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { Box, Customer, Product, ProductUnit } from "@/lib/types";
import { dedupeProductUnits } from "@/lib/product-units";
import clsx from "clsx";

// Item keys: "productId" for a plain product, or "productId::unitLabel" for
// a specific unit of a multi-unit product (e.g. Halwa "250g").
function itemKey(productId: string, unitLabel?: string) {
  return unitLabel ? `${productId}::${unitLabel}` : productId;
}
function parseItemKey(key: string): { productId: string; unitLabel: string } {
  const idx = key.indexOf("::");
  return idx === -1
    ? { productId: key, unitLabel: "" }
    : { productId: key.slice(0, idx), unitLabel: key.slice(idx + 2) };
}

interface BoxesResponse {
  boxes: Box[];
}
interface ProductsResponse {
  products: Product[];
}

export default function NewOrderPage() {
  const router = useRouter();
  const { data: boxData, loading: boxesLoading, error: boxesError } =
    useApi<BoxesResponse>("/api/boxes");
  const { data: productData, loading: productsLoading, error: productsError } =
    useApi<ProductsResponse>("/api/products");
  const { data: unitsData } = useApi<{ units: ProductUnit[] }>("/api/product-units");

  // Customer step
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // Order lines
  const [boxQuantities, setBoxQuantities] = useState<Record<string, number>>({});
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

  const boxes = boxData?.boxes.filter((b) => b.active) ?? [];
  const products = productData?.products.filter((p) => p.active) ?? [];
  const allUnits = dedupeProductUnits(unitsData?.units.filter((u) => u.active) ?? []);

  function individualUnitsFor(productId: string) {
    return allUnits.filter((u) => u.product_id === productId && u.context === "individual");
  }
  function priceForItemKey(key: string): number {
    const { productId, unitLabel } = parseItemKey(key);
    if (!unitLabel) return products.find((p) => p.product_id === productId)?.price ?? 0;
    return (
      allUnits.find((u) => u.product_id === productId && u.label === unitLabel)?.price ?? 0
    );
  }

  async function searchCustomers(q: string) {
    setCustomerQuery(q);
    if (!q.trim()) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      setCustomerResults(body.customers ?? []);
    } finally {
      setCustomerSearchLoading(false);
    }
  }

  async function createCustomerNow() {
    setSaveError(null);
    if (!newCustomer.name.trim()) {
      setSaveError("Please enter a name.");
      return;
    }
    if (creatingCustomer) return; // guard against double-tap creating duplicates
    setCreatingCustomer(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (!body.customer) {
        throw new Error("Something went wrong creating the customer. Please try again.");
      }
      setSelectedCustomer(body.customer);
      setShowNewCustomerForm(false);
    } catch (err: any) {
      setSaveError(err.message ?? "Could not create customer. Please check your connection and try again.");
    } finally {
      setCreatingCustomer(false);
    }
  }

  const boxSubtotal = useMemo(
    () =>
      boxes.reduce((sum, b) => sum + (boxQuantities[b.box_id] ?? 0) * b.price, 0),
    [boxes, boxQuantities]
  );
  const productSubtotal = useMemo(
    () =>
      Object.entries(productQuantities).reduce(
        (sum, [key, qty]) => sum + qty * priceForItemKey(key),
        0
      ),
    [productQuantities, products, allUnits]
  );
  const total = boxSubtotal + productSubtotal;

  const hasItems =
    Object.values(boxQuantities).some((q) => q > 0) ||
    Object.values(productQuantities).some((q) => q > 0);

  async function saveOrder() {
    setSaveError(null);
    if (!selectedCustomer) {
      setSaveError("Please select or create a customer first.");
      return;
    }
    if (!hasItems) {
      setSaveError("Add at least one box or product before saving.");
      return;
    }

    const items = [
      ...boxes
        .filter((b) => (boxQuantities[b.box_id] ?? 0) > 0)
        .map((b) => ({
          item_type: "box" as const,
          box_id: b.box_id,
          quantity: boxQuantities[b.box_id],
          unit_price: b.price,
        })),
      ...Object.entries(productQuantities)
        .filter(([, qty]) => qty > 0)
        .map(([key, qty]) => {
          const { productId, unitLabel } = parseItemKey(key);
          return {
            item_type: "product" as const,
            product_id: productId,
            quantity: qty,
            unit_price: priceForItemKey(key),
            unit_label: unitLabel,
          };
        }),
    ];

    setSaving(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id,
          notes,
          items,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setSavedOrderId(body.order.order_id);
    } catch (err: any) {
      setSaveError(err.message ?? "Unable to save the order. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (savedOrderId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-leaf-500/15 flex items-center justify-center text-leaf-600 text-3xl">
          ✓
        </div>
        <h1 className="font-display font-700 text-xl text-maroon-800">Order saved</h1>
        <p className="text-maroon-700/70 text-sm">Order {savedOrderId} for {selectedCustomer?.name}</p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => router.push(`/orders/${savedOrderId}`)}
            className="touch-target rounded-full bg-maroon-800 text-white px-5 font-medium"
          >
            View order
          </button>
          <button
            onClick={() => window.location.reload()}
            className="touch-target rounded-full bg-marigold-500 text-white px-5 font-medium"
          >
            + Add another order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">New order</h1>
        <p className="text-maroon-700/70 text-sm mt-0.5">Find the customer, add items, save.</p>
      </header>

      {/* Step 1: Customer */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">1. Customer</h2>

        {selectedCustomer ? (
          <div className="rounded-card bg-marigold-50 border border-marigold-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-maroon-800">{selectedCustomer.name}</p>
              <p className="text-sm text-maroon-700/70">{selectedCustomer.phone}</p>
            </div>
            <button
              onClick={() => setSelectedCustomer(null)}
              className="text-sm text-marigold-600 font-medium touch-target px-2"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={customerQuery}
              onChange={(e) => searchCustomers(e.target.value)}
              placeholder="Search by name or phone"
              className="touch-target rounded-card border border-clay-300 px-4 bg-ivory"
            />
            {customerSearchLoading && <p className="text-sm text-maroon-700/60">Searching…</p>}
            {customerResults.length > 0 && (
              <div className="flex flex-col gap-2">
                {customerResults.map((c) => (
                  <button
                    key={c.customer_id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerResults([]);
                      setCustomerQuery("");
                    }}
                    className="touch-target text-left rounded-card border border-clay-300 bg-ivory px-4 flex items-center justify-between hover:border-marigold-400"
                  >
                    <span className="font-medium text-maroon-800">{c.name}</span>
                    <span className="text-sm text-maroon-700/60">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {!showNewCustomerForm ? (
              <button
                onClick={() => setShowNewCustomerForm(true)}
                className="self-start text-sm text-marigold-600 font-medium touch-target"
              >
                + Create new customer
              </button>
            ) : (
              <div className="rounded-card border border-clay-300 bg-ivory p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-customer-name" className="text-xs font-medium text-maroon-700/70">
                    Name
                  </label>
                  <input
                    id="new-customer-name"
                    placeholder="Customer name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="touch-target rounded-card border border-clay-300 px-4"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-customer-phone" className="text-xs font-medium text-maroon-700/70">
                    Phone (optional)
                  </label>
                  <input
                    id="new-customer-phone"
                    placeholder="Phone number"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="touch-target rounded-card border border-clay-300 px-4"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="new-customer-address" className="text-xs font-medium text-maroon-700/70">
                    Address (optional)
                  </label>
                  <input
                    id="new-customer-address"
                    placeholder="Address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    className="touch-target rounded-card border border-clay-300 px-4"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={createCustomerNow}
                    disabled={creatingCustomer}
                    className="touch-target flex-1 rounded-full bg-marigold-500 text-white font-medium disabled:opacity-60"
                  >
                    {creatingCustomer ? "Saving…" : "Save customer"}
                  </button>
                  <button
                    onClick={() => setShowNewCustomerForm(false)}
                    disabled={creatingCustomer}
                    className="touch-target px-4 rounded-full bg-clay-100 text-maroon-800 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Step 2: Boxes */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">2. Diwali boxes</h2>
        {boxesLoading && <LoadingState label="Loading boxes…" />}
        {boxesError && <ErrorState message={boxesError} />}
        <div className="flex flex-col gap-2">
          {boxes.map((box) => (
            <div
              key={box.box_id}
              className={clsx(
                "rounded-card border px-4 py-3 flex items-center justify-between gap-3 bg-ivory",
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

      {/* Step 3: Individual products */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">3. Individual products</h2>
        {productsLoading && <LoadingState label="Loading products…" />}
        {productsError && <ErrorState message={productsError} />}
        <div className="flex flex-col gap-2">
          {products.map((product) => {
            const units = individualUnitsFor(product.product_id);

            if (units.length === 0) {
              // Plain product — exactly the same single stepper as before.
              const key = itemKey(product.product_id);
              return (
                <div
                  key={key}
                  className={clsx(
                    "rounded-card border px-4 py-3 flex items-center justify-between gap-3 bg-ivory",
                    (productQuantities[key] ?? 0) > 0 ? "border-marigold-400" : "border-clay-300/70"
                  )}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-maroon-800 truncate">{product.name}</p>
                    <p className="text-xs text-maroon-700/60">₹{product.price}</p>
                  </div>
                  <QuantitySelector
                    value={productQuantities[key] ?? 0}
                    onChange={(v) => setProductQuantities({ ...productQuantities, [key]: v })}
                  />
                </div>
              );
            }

            // Multi-unit product (e.g. Halwa) — one stepper per weight/unit,
            // each with its own price, matching how it's actually sold.
            return (
              <div key={product.product_id} className="rounded-card border border-clay-300/70 bg-ivory px-4 py-3 flex flex-col gap-2.5">
                <p className="font-medium text-maroon-800">{product.name}</p>
                {units.map((u) => {
                  const key = itemKey(product.product_id, u.label);
                  return (
                    <div key={key} className="flex items-center justify-between pl-2">
                      <div className="min-w-0">
                        <p className="text-sm text-maroon-800">{u.label}</p>
                        <p className="text-xs text-maroon-700/60">₹{u.price}</p>
                      </div>
                      <QuantitySelector
                        value={productQuantities[key] ?? 0}
                        onChange={(v) => setProductQuantities({ ...productQuantities, [key]: v })}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">4. Notes</h2>
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-card border border-clay-300 px-4 py-3 bg-ivory min-h-[80px]"
        />
      </section>

      {/* Sticky total + save */}
      <div className="sticky bottom-20 md:bottom-4 bg-ivory/95 backdrop-blur border border-clay-300 rounded-card px-4 py-3 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-xs text-maroon-700/60">Order total</p>
          <p className="font-display font-700 text-xl text-maroon-800">₹{total}</p>
        </div>
        <button
          onClick={saveOrder}
          disabled={saving}
          className="touch-target rounded-full bg-marigold-500 text-white font-semibold px-6 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>

      {saveError && <ErrorState message={saveError} />}
    </div>
  );
}
