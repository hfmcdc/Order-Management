"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { ProductionRow } from "@/lib/types";
import { BUSINESS_NAME } from "@/lib/business-info";

interface ProductionResponse {
  rows: ProductionRow[];
  boxTotals: { box_id: string; name: string; total: number }[];
  customerOrders: { order_id: string; customerName: string; summary: string }[];
}

export default function ProductionPage() {
  const [date, setDate] = useState<string>("");
  const [query, setQuery] = useState("");
  const url = date ? `/api/production?date=${date}` : "/api/production";
  const { data, loading, error, refresh } = useApi<ProductionResponse>(url);

  const sweets = data?.rows.filter((r) => r.category === "Sweets") ?? [];
  const snacks = data?.rows.filter((r) => r.category === "Snacks") ?? [];
  const other = data?.rows.filter((r) => !r.category) ?? [];

  const searchMatches =
    query.trim() && data
      ? data.rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
      : [];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="hidden print:block mb-2">
        <h1 className="font-display font-700 text-xl text-maroon-900">{BUSINESS_NAME.toUpperCase()}</h1>
        <p className="text-sm text-maroon-800">Production list — {date || "all upcoming"}</p>
      </div>

      <header className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-700 text-2xl text-maroon-800">Production</h1>
          <p className="text-maroon-700/70 text-sm mt-0.5">
            What needs to be made, based on active orders.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="touch-target rounded-full bg-maroon-800 text-white font-medium px-5"
        >
          Print production list
        </button>
      </header>

      {/* Quick product lookup */}
      <div className="no-print flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a product (e.g. Halwa) for its total…"
          className="touch-target rounded-2xl bg-ivory px-4 shadow-sm"
        />
        {query.trim() && (
          <div className="flex flex-col gap-2">
            {searchMatches.length === 0 ? (
              <p className="text-sm text-maroon-700/60 px-1">No product matches &quot;{query}&quot;.</p>
            ) : (
              searchMatches.map((row) => (
                <div key={`${row.product_id}::${row.unit_label}`} className="card px-5 py-4">
                  <p className="font-display font-600 text-maroon-800 mb-2">{row.name}</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-maroon-700/60">From boxes</p>
                      <p className="font-display font-700 text-lg text-maroon-800">{row.fromBoxes}</p>
                    </div>
                    <div>
                      <p className="text-xs text-maroon-700/60">Individual</p>
                      <p className="font-display font-700 text-lg text-maroon-800">{row.individual}</p>
                    </div>
                    <div>
                      <p className="text-xs text-maroon-700/60">Total</p>
                      <p className="font-display font-700 text-lg text-marigold-600">{row.total}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="no-print flex items-center gap-3">
        <label className="text-sm text-maroon-700/70">Fulfillment date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="touch-target rounded-2xl bg-ivory px-4 shadow-sm"
        />
        {date && (
          <button onClick={() => setDate("")} className="text-sm text-marigold-600 font-medium">
            Clear (show all)
          </button>
        )}
      </div>

      {loading && <LoadingState label="Calculating production…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && data.rows.length === 0 && data.boxTotals.length === 0 && (
        <EmptyState title="Nothing to produce" hint="No active orders for this date yet." />
      )}

      {data && (
        <div className="flex flex-col gap-5">
          <ProductionGroup title="Sweets" rows={sweets} />
          <ProductionGroup title="Snacks" rows={snacks} />
          {other.length > 0 && <ProductionGroup title="Other products" rows={other} />}

          {data.boxTotals.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display font-600 text-lg text-maroon-800">Boxes</h2>
              <div className="card divide-y divide-clay-100">
                {data.boxTotals.map((b) => (
                  <div key={b.box_id} className="px-4 py-2.5 flex justify-between text-sm">
                    <span className="text-maroon-800">{b.name}</span>
                    <span className="font-semibold text-maroon-800">{b.total}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.customerOrders.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="font-display font-600 text-lg text-maroon-800">Customer orders</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-clay-100/50 text-maroon-700/70 text-left">
                      <th className="px-4 py-2.5 font-medium w-1/3">Customer</th>
                      <th className="px-4 py-2.5 font-medium">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.customerOrders.map((co) => (
                      <tr key={co.order_id} className="border-t border-clay-100 align-top">
                        <td className="px-4 py-2.5 font-medium text-maroon-800">{co.customerName}</td>
                        <td className="px-4 py-2.5 text-maroon-700/80">{co.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ProductionGroup({ title, rows }: { title: string; rows: ProductionRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display font-600 text-lg text-maroon-800">{title}</h2>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-clay-100/50 text-maroon-700/70 text-left">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium text-right">From boxes</th>
              <th className="px-4 py-2.5 font-medium text-right">Individual</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.product_id}::${row.unit_label}`} className="border-t border-clay-100">
                <td className="px-4 py-2.5">{row.name}</td>
                <td className="px-4 py-2.5 text-right">{row.fromBoxes}</td>
                <td className="px-4 py-2.5 text-right">{row.individual}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-maroon-800">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
