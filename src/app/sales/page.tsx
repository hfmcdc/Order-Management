"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useApi } from "@/lib/useApi";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import SummaryCard from "@/components/SummaryCard";
import { OrderStatusBadge } from "@/components/StatusBadge";
import SegmentedPills from "@/components/motion/SegmentedPills";
import ConfettiBurst from "@/components/motion/ConfettiBurst";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import DateRangePicker from "@/components/sales/DateRangePicker";
import SalesTrendChart from "@/components/sales/SalesTrendChart";
import BreakdownBars, { BreakdownItem } from "@/components/sales/BreakdownBars";
import type { SalesBasis, SalesReport } from "@/lib/sales";
import { RangePreset, resolveRange, toLocalIso } from "@/lib/date-ranges";
import type { OrderStatus } from "@/lib/types";

const METHOD_BAR: Record<string, string> = {
  Cash: "bg-leaf-500",
  UPI: "bg-marigold-500",
  Unspecified: "bg-gold-300",
  Unpaid: "bg-maroon-700/50",
};
const STATUS_BAR: Record<OrderStatus, string> = {
  New: "bg-clay-300",
  Confirmed: "bg-marigold-400",
  Preparing: "bg-marigold-500",
  Packed: "bg-leaf-500/70",
  Delivered: "bg-leaf-500",
  Cancelled: "bg-maroon-700/40",
};

type TopTab = "Products" | "Boxes";
const TOP_TABS: TopTab[] = ["Products", "Boxes"];

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 flex flex-col gap-4 ${className}`}>
      <div>
        <h2 className="font-display font-600 text-lg text-maroon-800">{title}</h2>
        {subtitle && <p className="text-xs text-maroon-700/60 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export default function SalesPage() {
  // Laptop-only: below the tablet breakpoint nothing is fetched or shown.
  const isWideEnough = useMediaQuery("(min-width: 768px)");
  const [today, setToday] = useState("");
  useEffect(() => setToday(toLocalIso(new Date())), []);

  const [preset, setPreset] = useState<RangePreset>("month");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [basis, setBasis] = useState<SalesBasis>("order");
  const [topTab, setTopTab] = useState<TopTab>("Products");

  // "today" etc. come from the browser's own calendar, so a late-evening
  // order in India isn't counted against tomorrow's UTC date.
  const range = useMemo(() => (today ? resolveRange(preset, today, custom) : null), [preset, today, custom]);

  const url = useMemo(() => {
    if (!range || !isWideEnough) return null;
    if (preset === "custom" && !range.from && !range.to) return null; // nothing chosen yet
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    params.set("basis", basis);
    return `/api/sales?${params.toString()}`;
  }, [range, preset, basis, isWideEnough]);

  const { data, loading, error, refresh } = useApi<SalesReport>(url);

  // A little celebration the first time a period turns out to be fully paid.
  // (Once per visit, so flicking through date ranges doesn't become a party.)
  const [burst, setBurst] = useState(0);
  const celebrated = useRef(false);
  useEffect(() => {
    if (!data || loading || celebrated.current) return;
    if (data.totals.orders > 0 && data.totals.outstanding === 0) {
      celebrated.current = true;
      setBurst(1);
    }
  }, [data, loading]);

  function choosePreset(next: RangePreset) {
    if (next === "custom" && today && !custom.from && !custom.to) {
      // start from whatever is on screen so the report never goes blank
      const current = range && (range.from || range.to) ? range : { from: today, to: today };
      setCustom({ from: current.from || today, to: current.to || today });
    }
    setPreset(next);
  }

  const paymentItems: BreakdownItem[] = (data?.paymentMethods ?? []).map((m) => ({
    key: m.key,
    label: m.label,
    amount: m.amount,
    orders: m.orders,
    barClass: METHOD_BAR[m.key],
    muted: m.key === "Unpaid",
  }));
  const statusItems: BreakdownItem[] = (data?.orderStatuses ?? []).map((s) => ({
    key: s.status,
    label: s.status,
    amount: s.amount,
    orders: s.orders,
    barClass: STATUS_BAR[s.status],
    muted: s.status === "Cancelled",
  }));

  const isEmpty = !!data && data.totals.orders === 0 && data.totals.cancelledOrders === 0;
  const topProductMax = Math.max(1, ...(data?.topProducts ?? []).map((p) => p.total));
  const topBoxMax = Math.max(1, ...(data?.topBoxes ?? []).map((b) => b.revenue));

  return (
    <>
      {/* CSS-only switch, so there's no flash of the wrong view on load */}
      <div className="md:hidden flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="font-display font-700 text-xl text-maroon-800">Sales is available on a laptop</h1>
        <p className="max-w-sm text-sm text-maroon-700/70">
          Open Vaiga Order Manager on a laptop or desktop computer to see sales, payments and trends.
        </p>
        <Link href="/" className="press touch-target flex items-center rounded-full bg-marigold-500 px-6 font-semibold text-ink">
          Back to dashboard
        </Link>
      </div>
      <div className="hidden md:flex flex-col gap-6">
      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">Sales</h1>
        <p className="text-maroon-700/70 text-sm mt-1">
          How much you&apos;ve sold, what&apos;s been paid, and what&apos;s still to collect.
        </p>
      </header>

      <DateRangePicker
        preset={preset}
        onPreset={choosePreset}
        custom={custom}
        onCustom={setCustom}
        basis={basis}
        onBasis={setBasis}
        resolved={range ?? { from: "", to: "" }}
        busy={loading && !!data}
      />

      <ConfettiBurst burstKey={burst} />

      {loading && !data && <LoadingState label="Calculating sales…" rows={5} />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && (
        <motion.div
          // while a new period loads, the old figures stay visible but dimmed
          animate={{ opacity: loading ? 0.55 : 1 }}
          transition={{ duration: 0.2 }}
          aria-busy={loading}
        >
          {isEmpty ? (
            <EmptyState
              title="No orders in this period"
              hint="Try a wider date range, or switch which date orders are counted by."
            />
          ) : (
            <Stagger className="flex flex-col gap-6">
              {/* KPIs */}
              <StaggerItem>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <SummaryCard
                    label="Orders"
                    value={data.totals.orders}
                    hint={
                      data.totals.cancelledOrders > 0
                        ? `${data.totals.cancelledOrders} cancelled (not counted)`
                        : "Active orders"
                    }
                  />
                  <SummaryCard
                    label="Sales total"
                    value={`₹${data.totals.salesTotal}`}
                    accent
                    hint={data.totals.orders ? `Avg ₹${data.totals.averageOrder} per order` : undefined}
                  />
                  <SummaryCard
                    label="Payments received"
                    value={`₹${data.totals.received}`}
                    hint={
                      data.totals.orders
                        ? `${data.totals.orders - data.totals.unpaidOrders} of ${data.totals.orders} orders paid`
                        : undefined
                    }
                  />
                  <SummaryCard
                    label="Outstanding"
                    value={`₹${data.totals.outstanding}`}
                    hint={
                      data.totals.unpaidOrders
                        ? `${data.totals.unpaidOrders} unpaid · partial counts as unpaid`
                        : "Everything is paid"
                    }
                  />
                </div>
              </StaggerItem>

              {/* Trend + breakdowns */}
              <StaggerItem className="grid lg:grid-cols-3 gap-6 items-start">
                <Card
                  className="lg:col-span-2"
                  title="Sales trend"
                  subtitle="Gold = sales placed in each period, green = the part already paid"
                >
                  {data.trend.points.some((p) => p.sales > 0) ? (
                    <SalesTrendChart points={data.trend.points} granularity={data.trend.granularity} />
                  ) : (
                    <p className="text-sm text-maroon-700/60">No sales to chart in this period.</p>
                  )}
                </Card>

                <div className="flex flex-col gap-6">
                  <Card title="Payment methods" subtitle="Share of sales by how it was paid">
                    <BreakdownBars items={paymentItems} total={data.totals.salesTotal} />
                  </Card>
                  <Card title="Order statuses" subtitle="Orders in this period, cancelled included">
                    <BreakdownBars
                      items={statusItems}
                      total={statusItems.reduce((s, i) => s + i.amount, 0)}
                    />
                  </Card>
                </div>
              </StaggerItem>

              {/* Top sellers + who owes */}
              <StaggerItem className="grid lg:grid-cols-2 gap-6 items-start">
                <Card
                  title="Top sellers"
                  subtitle={
                    topTab === "Products"
                      ? "Units sold, including what's inside boxes"
                      : "Boxes ranked by revenue"
                  }
                >
                  <SegmentedPills
                    options={TOP_TABS}
                    value={topTab}
                    onSelect={setTopTab}
                    ariaLabel="Show top products or top boxes"
                    size="sm"
                  />
                  {topTab === "Products" ? (
                    data.topProducts.length === 0 ? (
                      <p className="text-sm text-maroon-700/60">No products sold in this period.</p>
                    ) : (
                      <ol className="flex flex-col gap-3">
                        {data.topProducts.map((p, i) => (
                          <li key={`${p.product_id}::${p.unit_label}`} className="flex items-center gap-3">
                            <span className="w-5 text-right text-xs text-maroon-700/50 tabular-nums">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-maroon-800">{p.name}</span>
                                <span className="tabular-nums font-semibold text-maroon-800">{p.total}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-clay-100" aria-hidden>
                                <motion.div
                                  className="h-full rounded-full bg-marigold-500"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(p.total / topProductMax) * 100}%` }}
                                  transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.2 + i * 0.05 }}
                                />
                              </div>
                              <p className="mt-0.5 text-xs text-maroon-700/60">
                                {p.fromBoxes} from boxes · {p.individual} sold individually
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )
                  ) : data.topBoxes.length === 0 ? (
                    <p className="text-sm text-maroon-700/60">No boxes sold in this period.</p>
                  ) : (
                    <ol className="flex flex-col gap-3">
                      {data.topBoxes.map((b, i) => (
                        <li key={b.box_id} className="flex items-center gap-3">
                          <span className="w-5 text-right text-xs text-maroon-700/50 tabular-nums">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                              <span className="truncate font-medium text-maroon-800">{b.name}</span>
                              <span className="tabular-nums font-semibold text-maroon-800">₹{b.revenue}</span>
                            </div>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-clay-100" aria-hidden>
                              <motion.div
                                className="h-full rounded-full bg-marigold-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${(b.revenue / topBoxMax) * 100}%` }}
                                transition={{ type: "spring", stiffness: 110, damping: 20, delay: 0.2 + i * 0.05 }}
                              />
                            </div>
                            <p className="mt-0.5 text-xs text-maroon-700/60">
                              {b.quantity} {b.quantity === 1 ? "box" : "boxes"} sold
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>

                <Card
                  title="Still to collect"
                  subtitle={
                    data.totals.unpaidOrders > 10
                      ? `Largest 10 of ${data.totals.unpaidOrders} unpaid orders`
                      : "Unpaid orders, largest first"
                  }
                >
                  {data.outstandingOrders.length === 0 ? (
                    <p className="text-sm text-maroon-700/60">Nothing outstanding — every order here is paid.</p>
                  ) : (
                    <ul className="-mx-2 flex flex-col">
                      {data.outstandingOrders.map((o) => (
                        <li key={o.order_id}>
                          <Link
                            href={`/orders/${o.order_id}`}
                            className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-clay-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-maroon-800">{o.customerName}</p>
                              <p className="text-xs text-maroon-700/60">
                                {o.order_id} · {o.payment_status}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <OrderStatusBadge status={o.status} />
                              <span className="w-16 text-right text-sm font-semibold tabular-nums text-marigold-600">
                                ₹{o.total}
                              </span>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </StaggerItem>
            </Stagger>
          )}
        </motion.div>
      )}
      </div>
    </>
  );
}
