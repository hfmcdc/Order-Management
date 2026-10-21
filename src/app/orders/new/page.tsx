"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/lib/useApi";
import QuantitySelector from "@/components/QuantitySelector";
import { LoadingState, ErrorState } from "@/components/StateViews";
import { Box, Customer, Product, ProductUnit } from "@/lib/types";
import { dedupeProductUnits, isSoldIndividually } from "@/lib/product-units";
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
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  // Optional details, only used if a brand-new customer gets created
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [extraDetails, setExtraDetails] = useState({ phone: "", address: "" });
  // Shown when several existing customers share the typed name
  const [sameNameMatches, setSameNameMatches] = useState<Customer[]>([]);

  // Order lines
  const [boxQuantities, setBoxQuantities] = useState<Record<string, number>>({});
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

  const boxes = boxData?.boxes.filter((b) => b.active) ?? [];
  const products = productData?.products.filter((p) => p.active && isSoldIndividually(p)) ?? [];
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

  const typedName = customerQuery.trim().replace(/\s+/g, " ");
  const exactMatches = customerResults.filter(
    (c) => c.name.trim().replace(/\s+/g, " ").toLowerCase() === typedName.toLowerCase()
  );
  const nameLooksValid = /\p{L}/u.test(typedName); // needs at least one letter

  /** Make sure we have a customer: the one picked, or find/create from the typed name. */
  async function resolveCustomer(forceNew = false): Promise<Customer | null> {
    if (selectedCustomer) return selectedCustomer;
    if (!typedName) {
      setSaveError("Please type the customer's name (or pick one from the list).");
      return null;
    }
    if (!nameLooksValid) {
      setSaveError("Please type the customer's name. A phone number on its own can't be used as a name.");
      return null;
    }
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: typedName,
        phone: extraDetails.phone,
        address: extraDetails.address,
        find_or_create: !forceNew,
      }),
    });
    const body = await res.json();
    if (res.status === 409 && Array.isArray(body.matches)) {
      setSameNameMatches(body.matches);
      setSaveError(body.error);
      return null;
    }
    if (!res.ok) throw new Error(body.error);
    if (!body.customer) throw new Error("Something went wrong with the customer. Please try again.");
    setSameNameMatches([]);
    setSelectedCustomer(body.customer);
    return body.customer as Customer;
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
    if (saving) return; // guard against double-tap
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
      const customer = await resolveCustomer();
      if (!customer) return; // message already shown; nothing was saved

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.customer_id,
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
            className="touch-target rounded-full bg-wine-700 text-white px-5 font-medium"
          >
            View order
          </button>
          <button
            onClick={() => window.location.reload()}
            className="touch-target rounded-full bg-marigold-500 text-ink px-5 font-medium"
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
        <p className="text-maroon-700/70 text-sm mt-0.5">Type the customer name, add items, save.</p>
      </header>

      {/* Step 1: Customer */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">1. Customer</h2>

        {selectedCustomer ? (
          <div className="rounded-card bg-marigold-50 border border-marigold-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-medium text-maroon-800">{selectedCustomer.name}</p>
              {selectedCustomer.phone && (
                <p className="text-sm text-maroon-700/70">{selectedCustomer.phone}</p>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setSameNameMatches([]);
              }}
              className="text-sm text-marigold-600 font-medium touch-target px-2"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              value={customerQuery}
              onChange={(e) => {
                setSameNameMatches([]);
                searchCustomers(e.target.value);
              }}
              placeholder="Type customer name"
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
                      setSameNameMatches([]);
                    }}
                    className="touch-target text-left rounded-card border border-clay-300 bg-ivory px-4 flex items-center justify-between hover:border-marigold-400"
                  >
                    <span className="font-medium text-maroon-800">{c.name}</span>
                    <span className="text-sm text-maroon-700/60">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}

            {typedName && !customerSearchLoading && (
              <p className="text-sm text-maroon-700/70">
                {exactMatches.length === 1
                  ? `Will use the existing customer "${exactMatches[0].name}".`
                  : exactMatches.length > 1
                    ? `More than one "${typedName}" exists — pick the right one above.`
                    : `New customer — "${typedName}" will be added when you save the order.`}
              </p>
            )}

            {sameNameMatches.length > 0 && (
              <div className="rounded-card border border-clay-300 bg-ivory p-3 flex flex-col gap-2">
                <p className="text-sm text-maroon-800">Which one is it?</p>
                {sameNameMatches.map((c) => (
                  <button
                    key={c.customer_id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setSameNameMatches([]);
                      setCustomerResults([]);
                      setCustomerQuery("");
                      setSaveError(null);
                    }}
                    className="touch-target text-left rounded-card border border-clay-300 px-4 flex items-center justify-between hover:border-marigold-400"
                  >
                    <span className="font-medium text-maroon-800">{c.name}</span>
                    <span className="text-sm text-maroon-700/60">{c.phone || c.address || "no details"}</span>
                  </button>
                ))}
                <button
                  onClick={async () => {
                    setSaveError(null);
                    try {
                      await resolveCustomer(true);
                      setSameNameMatches([]);
                    } catch (err: any) {
                      setSaveError(err.message ?? "Could not add the customer.");
                    }
                  }}
                  className="self-start text-sm text-marigold-600 font-medium touch-target"
                >
                  None of these — add a new "{typedName}"
                </button>
              </div>
            )}

            {!showExtraDetails ? (
              <button
                onClick={() => setShowExtraDetails(true)}
                className="self-start text-sm text-marigold-600 font-medium touch-target"
              >
                + Add phone / address (optional)
              </button>
            ) : (
              <div className="rounded-card border border-clay-300 bg-ivory p-4 flex flex-col gap-3">
                <p className="text-xs text-maroon-700/60">
                  Only used if this turns out to be a new customer.
                </p>
                <input
                  aria-label="Phone (optional)"
                  placeholder="Phone number (optional)"
                  value={extraDetails.phone}
                  onChange={(e) => setExtraDetails({ ...extraDetails, phone: e.target.value })}
                  className="touch-target rounded-card border border-clay-300 px-4"
                />
                <input
                  aria-label="Address (optional)"
                  placeholder="Address (optional)"
                  value={extraDetails.address}
                  onChange={(e) => setExtraDetails({ ...extraDetails, address: e.target.value })}
                  className="touch-target rounded-card border border-clay-300 px-4"
                />
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
          className="touch-target rounded-full bg-marigold-500 text-ink font-semibold px-6 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save order"}
        </button>
      </div>

      {saveError && <ErrorState message={saveError} />}
    </div>
  );
}
