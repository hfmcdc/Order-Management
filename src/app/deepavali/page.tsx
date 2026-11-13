"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import SummaryCard from "@/components/SummaryCard";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { formatShort } from "@/lib/date-ranges";
import type { ProductionRow } from "@/lib/types";

interface DeepavaliResponse {
  season: string;
  cutoff: string;
  summary: {
    totalOrders: number;
    cancelledOrders: number;
    deliveredOrders: number;
    totalCustomers: number;
    totalBoxes: number;
    totalValue: number;
  };
  payments: {
    cash: number;
    upi: number;
    unspecified: number;
    received: number;
    pendingAmount: number;
    unpaidCount: number;
    unpaid: {
      order_id: string;
      customerName: string;
      phone: string;
      total: number;
      payment_status: string;
      fulfillment_date: string;
    }[];
  };
  byDay: { date: string; orders: number; value: number; received: number }[];
  topProducts: ProductionRow[];
}

const rupee = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function DeepavaliPage() {
  const { data, loading, error, refresh } = useApi<DeepavaliResponse>("/api/deepavali");

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-[22px] bg-gradient-to-br from-wine-900 via-wine-800 to-wine-700 px-6 py-6 md:px-8 shadow-lg shadow-wine-900/25">
        <p className="text-cream/70 text-xs uppercase tracking-wide">Season report</p>
        <h1 className="font-display font-700 text-2xl md:text-3xl text-cream mt-1">Deepavali Sweets 2026</h1>
        <p className="text-cream/80 text-sm mt-1">
          Money received, cash and UPI for every order placed up to {formatShort(data?.cutoff ?? "2026-11-13", true)}.
        </p>
      </div>

      {loading && !data && <LoadingState label="Loading Deepavali report…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <Stagger className="flex flex-col gap-8">
          <StaggerItem className="flex flex-col gap-3">
            <h2 className="font-display font-600 text-lg text-maroon-800">Money</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
              <SummaryCard label="Total received" value={rupee(data.payments.received)} accent />
              <SummaryCard label="Cash" value={rupee(data.payments.cash)} />
              <SummaryCard label="UPI" value={rupee(data.payments.upi)} />
              <SummaryCard label="Still pending" value={rupee(data.payments.pendingAmount)} hint={`${data.payments.unpaidCount} unpaid orders`} />
              <SummaryCard label="Total order value" value={rupee(data.summary.totalValue)} />
              {data.payments.unspecified > 0 && (
                <SummaryCard label="Paid, method not noted" value={rupee(data.payments.unspecified)} />
              )}
            </div>
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-3">
            <h2 className="font-display font-600 text-lg text-maroon-800">Season totals</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <SummaryCard label="Orders" value={data.summary.totalOrders} />
              <SummaryCard label="Delivered" value={`${data.summary.deliveredOrders} / ${data.summary.totalOrders}`} />
              <SummaryCard label="Customers" value={data.summary.totalCustomers} />
              <SummaryCard label="Boxes" value={data.summary.totalBoxes} />
            </div>
            {data.summary.cancelledOrders > 0 && (
              <p className="text-xs text-maroon-700/60">
                {data.summary.cancelledOrders} cancelled orders are not counted.
              </p>
            )}
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-3">
            <h2 className="font-display font-600 text-lg text-maroon-800">Day by day</h2>
            {data.byDay.length === 0 ? (
              <EmptyState title="No Deepavali orders found" />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-maroon-700/70">
                      <th className="px-5 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold text-right">Orders</th>
                      <th className="px-3 py-3 font-semibold text-right">Value</th>
                      <th className="px-5 py-3 font-semibold text-right">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-clay-100">
                    {data.byDay.map((d) => (
                      <tr key={d.date}>
                        <td className="px-5 py-3 text-maroon-800">{d.date ? formatShort(d.date, true) : "No date"}</td>
                        <td className="px-3 py-3 text-right text-maroon-800">{d.orders}</td>
                        <td className="px-3 py-3 text-right text-maroon-800">{rupee(d.value)}</td>
                        <td className="px-5 py-3 text-right font-semibold text-maroon-800">{rupee(d.received)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </StaggerItem>

          <StaggerItem className="flex flex-col gap-3">
            <h2 className="font-display font-600 text-lg text-maroon-800">
              Still to collect{" "}
              <span className="text-maroon-700/50 font-normal text-sm">(not marked Paid)</span>
            </h2>
            {data.payments.unpaid.length === 0 ? (
              <EmptyState title="Everything is paid" />
            ) : (
              <div className="card divide-y divide-clay-100 overflow-hidden">
                {data.payments.unpaid.map((o) => (
                  <Link
                    key={o.order_id}
                    href={`/orders/${o.order_id}`}
                    className="px-5 py-3.5 flex items-center justify-between text-sm transition-colors hover:bg-clay-100/40"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-maroon-800 truncate">{o.customerName}</p>
                      <p className="text-xs text-maroon-700/60 mt-0.5">
                        {o.phone ? `${o.phone} · ` : ""}
                        {o.payment_status}
                        {o.fulfillment_date ? ` · ${formatShort(o.fulfillment_date)}` : ""}
                      </p>
                    </div>
                    <span className="font-semibold text-maroon-800 shrink-0">{rupee(o.total)}</span>
                  </Link>
                ))}
              </div>
            )}
          </StaggerItem>

          {data.topProducts.length > 0 && (
            <StaggerItem className="flex flex-col gap-3">
              <h2 className="font-display font-600 text-lg text-maroon-800">Best sellers</h2>
              <div className="card divide-y divide-clay-100 overflow-hidden">
                {data.topProducts.map((p, i) => (
                  <div key={`${p.product_id}::${p.unit_label}`} className="px-5 py-3.5 flex items-center justify-between text-sm">
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
            </StaggerItem>
          )}
        </Stagger>
      )}
    </div>
  );
}
