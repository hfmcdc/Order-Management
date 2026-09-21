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
    pendingAmount: number;
    pendingOrders: { order_id: string; customerName: string; total: number; payment_status: string }[];
  };
  production: ProductionRow[];
  recentOrders: RecentOrder[];
  topProducts: ProductionRow[];
  todaysProduction: ProductionRow[];
}

export default function DashboardPage() {
  const { data, loading, error, refresh } = useApi<DashboardResponse>("/api/dashboard");

  return (
    <div className="flex flex-col gap-8">
      {/* Hero banner */}
      <div className="relative rounded-[26px] overflow-hidden bg-gradient-to-br from-maroon-900 via-maroon-800 to-maroon-700 px-6 py-7 md:px-8 md:py-9 flex items-center gap-4 shadow-lg shadow-maroon-900/15">
        {/* subtle rangoli-inspired decoration, kept low-opacity so it never fights the text */}
        <svg
          className="absolute -right-6 -top-6 w-40 h-40 md:w-56 md:h-56 opacity-[0.08] pointer-events-none"
          viewBox="0 0 200 200"
          fill="none"
        >
          <circle cx="100" cy="100" r="90" stroke="#F6D77A" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="65" stroke="#F6D77A" strokeWidth="1.5" />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1="100"
              y1="100"
              x2={100 + 90 * Math.cos((i * Math.PI) / 6)}
              y2={100 + 90 * Math.sin((i * Math.PI) / 6)}
              stroke="#F6D77A"
              strokeWidth="1.5"
            />
          ))}
        </svg>
        <div className="w-16 h-16 md:w-20 md:h-20 relative shrink-0 z-10">
          <Image src="/logo.png" alt="Vaiga Sweets & Snacks" fill sizes="80px" />
        </div>
        <div className="z-10">
          <h1 className="font-display font-700 text-xl md:text-2xl text-ivory">Welcome back!</h1>
          <p className="text-marigold-100/80 text-sm mt-1">Let&apos;s make this Diwali sweeter.</p>
        </div>
      </div>

      {loading && <LoadingState label="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
            <SummaryCard label="Total orders" value={data.summary.totalOrders} accent />
            <SummaryCard label="Total customers" value={data.summary.totalCustomers} />
            <SummaryCard label="Total no. of boxes" value={data.summary.totalBoxes} />
          </div>

          {/* Quick actions */}
          <section className="flex flex-wrap gap-2.5">
            <Link
              href="/orders/new"
              className="touch-target flex items-center rounded-full bg-marigold-500 text-white font-semibold px-5 shadow-md shadow-marigold-500/25 hover:bg-marigold-600 transition-colors"
            >
              + New Order
            </Link>
            <Link
              href="/orders"
              className="touch-target flex items-center rounded-full bg-white text-maroon-800 font-medium px-5 shadow-sm"
            >
              View Orders
            </Link>
            <Link
              href="/customers"
              className="touch-target flex items-center rounded-full bg-white text-maroon-800 font-medium px-5 shadow-sm"
            >
              Customers
            </Link>
            <Link
              href="/production"
              className="touch-target flex items-center rounded-full bg-white text-maroon-800 font-medium px-5 shadow-sm"
            >
              Production
            </Link>
          </section>

          {/* Payments received */}
          <section className="flex flex-col gap-3">
            <h2 className="font-display font-600 text-lg text-maroon-800">Payments received</h2>
            <div className="grid grid-cols-3 gap-3.5">
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

          {/* Pending payment — delivered but not yet paid */}
          {data.payments.pendingOrders.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display font-600 text-lg text-maroon-800">
                Pending payment <span className="text-maroon-700/50 font-normal text-sm">(delivered, not yet paid)</span>
              </h2>
              <SummaryCard label="Amount owed" value={`₹${data.payments.pendingAmount}`} />
              <div className="card divide-y divide-clay-100 overflow-hidden">
                {data.payments.pendingOrders.map((o) => (
                  <Link
                    key={o.order_id}
                    href={`/orders/${o.order_id}`}
                    className="px-5 py-3.5 flex items-center justify-between text-sm active:bg-clay-100/40"
                  >
                    <span className="text-maroon-800">{o.customerName}</span>
                    <span className="font-semibold text-maroon-800">₹{o.total}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Recent orders */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-600 text-lg text-maroon-800">Recent orders</h2>
                <Link href="/orders" className="text-sm text-marigold-600 font-medium">
                  View all →
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <EmptyState title="No orders yet" hint="They'll show up here as soon as one is saved." />
              ) : (
                <div className="card divide-y divide-clay-100 overflow-hidden">
                  {data.recentOrders.map((o) => (
                    <Link
                      key={o.order_id}
                      href={`/orders/${o.order_id}`}
                      className="px-5 py-3.5 flex items-center justify-between text-sm active:bg-clay-100/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-maroon-800 truncate">{o.customerName}</p>
                        <p className="text-xs text-maroon-700/60 mt-0.5">
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
            <section className="flex flex-col gap-3">
              <h2 className="font-display font-600 text-lg text-maroon-800">Top products</h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="No production data yet" />
              ) : (
                <div className="card divide-y divide-clay-100 overflow-hidden">
                  {data.topProducts.map((p, i) => (
                    <div key={p.product_id} className="px-5 py-3.5 flex items-center justify-between text-sm">
                      <span className="text-maroon-800 flex items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-marigold-100 text-marigold-600 text-xs font-semibold mr-3 shrink-0">
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
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-600 text-lg text-maroon-800">Today&apos;s production</h2>
              <Link href="/production" className="text-sm text-marigold-600 font-medium">
                Full production page →
              </Link>
            </div>
            {data.todaysProduction.length === 0 ? (
              <EmptyState title="Nothing scheduled for today yet" />
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-clay-100/50 text-maroon-700/70 text-left">
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="px-5 py-3 font-medium text-right">From boxes</th>
                      <th className="px-5 py-3 font-medium text-right">Individual</th>
                      <th className="px-5 py-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.todaysProduction.map((row) => (
                      <tr key={row.product_id} className="border-t border-clay-100">
                        <td className="px-5 py-3">{row.name}</td>
                        <td className="px-5 py-3 text-right">{row.fromBoxes}</td>
                        <td className="px-5 py-3 text-right">{row.individual}</td>
                        <td className="px-5 py-3 text-right font-semibold text-maroon-800">
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
