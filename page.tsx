"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import SummaryCard from "@/components/SummaryCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { ProductionRow } from "@/lib/types";

interface DashboardResponse {
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalBoxes: number;
    totalIndividualItems: number;
    totalItems: number;
  };
  production: ProductionRow[];
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useApi<DashboardResponse>("/api/dashboard");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">Dashboard</h1>
        <p className="text-maroon-700/70 text-sm mt-0.5">
          Today&apos;s orders at a glance, replacing the paper order book.
        </p>
      </header>

      {loading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <SummaryCard label="Total orders" value={data.summary.totalOrders} accent />
            <SummaryCard label="Total customers" value={data.summary.totalCustomers} />
            <SummaryCard label="Total boxes" value={data.summary.totalBoxes} />
            <SummaryCard label="Individual items" value={data.summary.totalIndividualItems} />
            <SummaryCard label="Total items" value={data.summary.totalItems} />
          </div>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-600 text-lg text-maroon-800">
                Production requirements
              </h2>
              <Link href="/production" className="text-sm text-marigold-600 font-medium">
                Full production page →
              </Link>
            </div>

            {data.production.length === 0 ? (
              <EmptyState
                title="No active orders yet"
                hint="Production totals will appear here as soon as orders are added."
              />
            ) : (
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
                    {data.production.map((row) => (
                      <tr key={row.product_id} className="border-t border-clay-300/50">
                        <td className="px-4 py-2.5">{row.name}</td>
                        <td className="px-4 py-2.5 text-right">{row.fromBoxes}</td>
                        <td className="px-4 py-2.5 text-right">{row.individual}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-maroon-800">
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
