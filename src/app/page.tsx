"use client";

import Link from "next/link";
import Image from "next/image";
import { useApi } from "@/lib/useApi";
import SummaryCard from "@/components/SummaryCard";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { ProductionRow } from "@/lib/types";

interface RecentOrder {
  order_id: string;
  customerName: string;
  boxCount: number;
  itemCount: number;
  total: number;
  created_at: string;
}

interface DashboardResponse {
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalBoxes: number;
    totalIndividualItems: number;
    totalItems: number;
    totalOrderValue: number;
  };
  payments: {
    cash: number;
    upi: number;
    unspecified: number;
    total: number;
  };
  production: ProductionRow[];
  recentOrders: RecentOrder[];
  topProducts: ProductionRow[];
  todaysProduction: ProductionRow[];
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useApi<DashboardResponse>("/api/dashboard");

  return (
    <div className="flex flex-col gap-6">
      {/* Hero banner */}
      <div className="relative rounded-card overflow-hidden bg-maroon-800 px-5 py-6 md:px-8 md:py-8 flex items-center gap-4">
        <div className="w-16 h-16 md:w-20 md:h-20 relative shrink-0">
          <Image src="/logo.png" alt="Vaiga Sweets & Snacks" fill sizes="80px" />
        </div>
        <div>
          <h1 className="font-display font-700 text-xl md:text-2xl text-ivory">Welcome back!</h1>
          <p className="text-marigold-100/80 text-sm mt-0.5">Let&apos;s make this Diwali sweeter.</p>
        </div>
      </div>

      {loading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="Total orders" value={data.summary.totalOrders} accent />
            <SummaryCard label="Total customers" value={data.summary.totalCustomers} />
            <SummaryCard label="Total items (incl. box contents)" value={data.summary.totalItems} />
            <SummaryCard label="Order value" value={`₹${data.summary.totalOrderValue}`} />
          </div>

          {/* Quick actions */}
          <section className="flex flex-wrap gap-2">
            <Link
              href="/orders/new"
              className="touch-target flex items-center rounded-full bg-marigold-500 text-white font-semibold px-5 shadow-sm hover:bg-marigold-600 transition-colors"
            >
              + New Order
            </Link>
            <Link
              href="/orders"
              className="touch-target flex items-center rounded-full bg-white border border-clay-300 text-maroon-800 font-medium px-5"
            >
              View Orders
            </Link>
            <Link
              href="/customers"
              className="touch-target flex items-center rounded-full bg-white border border-clay-300 text-maroon-800 font-medium px-5"
            >
              Customers
            </Link>
            <Link
              href="/production"
              className="touch-target flex items-center rounded-full bg-white border border-clay-300 text-maroon-800 font-medium px-5"
            >
              Production
            </Link>
          </section>

          {/* Payments received */}
          <section className="flex flex-col gap-2">
            <h2 className="font-display font-600 text-lg text-maroon-800">Payments received</h2>
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Cash" value={`₹${data.payments.cash}`} />
              <SummaryCard label="UPI" value={`₹${data.payments.upi}`} />
              <SummaryCard label="Total received" value={`₹${data.payments.total}`} accent />
            </div>
            {data.payments.unspecified > 0 && (
              <p className="text-xs text-maroon-700/60">
                Includes ₹{data.payments.unspecified} marked Paid without a recorded method (from
                before this was tracked, or via the Payment buttons directly).
              </p>
            )}
          </section>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent orders */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-600 text-lg text-maroon-800">Recent orders</h2>
                <Link href="/orders" className="text-sm text-marigold-600 font-medium">
                  View all →
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <EmptyState title="No orders yet" hint="They'll show up here as soon as one is saved." />
              ) : (
                <div className="rounded-card border border-clay-300/70 bg-white divide-y divide-clay-300/50">
                  {data.recentOrders.map((o) => (
                    <Link
                      key={o.order_id}
                      href={`/orders/${o.order_id}`}
                      className="px-4 py-2.5 flex items-center justify-between text-sm hover:bg-clay-100/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-maroon-800 truncate">{o.customerName}</p>
                        <p className="text-xs text-maroon-700/60">
                          {o.boxCount > 0 ? `${o.boxCount} box${o.boxCount === 1 ? "" : "es"} · ` : ""}
                          {o.itemCount} items
                        </p>
                      </div>
                      <span className="font-semibold text-maroon-800 shrink-0">₹{o.total}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Top products */}
            <section className="flex flex-col gap-2">
              <h2 className="font-display font-600 text-lg text-maroon-800">Top products</h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="No production data yet" />
              ) : (
                <div className="rounded-card border border-clay-300/70 bg-white divide-y divide-clay-300/50">
                  {data.topProducts.map((p, i) => (
                    <div key={p.product_id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <span className="text-maroon-800">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-marigold-100 text-marigold-600 text-xs font-semibold mr-2">
                          {i + 1}
                        </span>
                        {p.name}
                      </span>
                      <span className="font-semibold text-maroon-800">{p.total}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Today's production */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-600 text-lg text-maroon-800">Today&apos;s production</h2>
              <Link href="/production" className="text-sm text-marigold-600 font-medium">
                Full production page →
              </Link>
            </div>
            {data.todaysProduction.length === 0 ? (
              <EmptyState title="Nothing scheduled for today yet" />
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
                    {data.todaysProduction.map((row) => (
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
