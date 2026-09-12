"use client";

import { useState } from "react";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { ProductionRow } from "@/lib/types";

interface ProductionResponse {
  rows: ProductionRow[];
  boxTotals: { box_id: string; name: string; total: number }[];
}

export default function ProductionPage() {
  const [date, setDate] = useState<string>("");
  const url = date ? `/api/production?date=${date}` : "/api/production";
  const { data, loading, error, refresh } = useApi<ProductionResponse>(url);

  const sweets = data?.rows.filter((r) => r.category === "Sweets") ?? [];
  const snacks = data?.rows.filter((r) => r.category === "Snacks") ?? [];
  const other = data?.rows.filter((r) => !r.category) ?? [];

  return (
    <div className="flex flex-col gap-5 pb-8">
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

      <div className="no-print flex items-center gap-3">
        <label className="text-sm text-maroon-700/70">Fulfillment date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="touch-target rounded-card border border-clay-300 px-4 bg-white"
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
              <div className="rounded-card border border-clay-300/70 bg-white divide-y divide-clay-300/50">
                {data.boxTotals.map((b) => (
                  <div key={b.box_id} className="px-4 py-2.5 flex justify-between text-sm">
                    <span className="text-maroon-800">{b.name}</span>
                    <span className="font-semibold text-maroon-800">{b.total}</span>
                  </div>
                ))}
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
      <div className="rounded-card border border-clay-300/70 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-clay-100/60 text-maroon-700/70 text-left">
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium text-right">From boxes</th>
              <th className="px-4 py-2.5 font-medium text-right">Individual</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_id} className="border-t border-clay-300/50">
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
