// ---------------------------------------------------------------------------
// Sales report for a date range. Pure function over the same flat lists the
// rest of the app uses (no Google Sheets calls, no React) so it is unit-tested
// and always agrees with the dashboard/production numbers: it reuses
// computeOrderTotals and computeProductionRows rather than re-deriving them.
//
// Money rules (same as the existing dashboard):
//   • Cancelled orders never count towards sales, payments or outstanding.
//   • "Received" = the full total of orders marked Paid. The app records only
//     Pending / Partial / Paid — never a partial AMOUNT — so a Partial order
//     can't be split and is treated as outstanding in full.
//   • outstanding = sales − received.
// ---------------------------------------------------------------------------

import {
  Box,
  BoxContent,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  ORDER_STATUSES,
} from "./types";
import { computeOrderTotals, computeProductionRows, isOrderActive } from "./calculations";
import { addDaysIso, daysInclusive, formatMonth, formatShort, mondayOf } from "./date-ranges";

export type SalesBasis = "order" | "fulfillment";
export type Granularity = "day" | "week" | "month";

export interface TrendPoint {
  key: string; // bucket start date (day/week) or YYYY-MM (month)
  label: string; // short axis label
  rangeLabel: string; // longer label for tooltips, e.g. "12 Oct – 18 Oct"
  orders: number;
  sales: number;
  received: number;
}

export interface SalesReport {
  range: { from: string | null; to: string | null; basis: SalesBasis };
  totals: {
    orders: number;
    cancelledOrders: number;
    salesTotal: number;
    received: number;
    outstanding: number;
    averageOrder: number;
    unpaidOrders: number;
  };
  trend: { granularity: Granularity; points: TrendPoint[] };
  paymentMethods: { key: "Cash" | "UPI" | "Unspecified" | "Unpaid"; label: string; amount: number; orders: number }[];
  orderStatuses: { status: OrderStatus; orders: number; amount: number }[];
  topProducts: { product_id: string; unit_label: string; name: string; total: number; fromBoxes: number; individual: number }[];
  topBoxes: { box_id: string; name: string; quantity: number; revenue: number }[];
  outstandingOrders: {
    order_id: string;
    customerName: string;
    total: number;
    status: OrderStatus;
    payment_status: string;
    date: string;
  }[];
}

export interface SalesInput {
  orders: Order[];
  orderItems: OrderItem[];
  customers: Customer[];
  products: Product[];
  boxes: Box[];
  boxContents: BoxContent[];
  from?: string;
  to?: string;
  basis?: SalesBasis;
  topN?: number;
}

function orderDate(o: Order, basis: SalesBasis): string {
  return String((basis === "fulfillment" ? o.fulfillment_date : o.order_date) ?? "").slice(0, 10);
}

function pickGranularity(days: number): Granularity {
  if (days <= 62) return "day";
  if (days <= 180) return "week";
  return "month";
}

export function computeSalesReport(input: SalesInput): SalesReport {
  const basis: SalesBasis = input.basis ?? "order";
  const from = input.from || "";
  const to = input.to || "";
  const topN = input.topN ?? 10;

  // Group line items by order once (avoids an O(orders × items) scan).
  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of input.orderItems) {
    const list = itemsByOrder.get(item.order_id);
    if (list) list.push(item);
    else itemsByOrder.set(item.order_id, [item]);
  }
  const customerById = new Map(input.customers.map((c) => [c.customer_id, c]));

  // Orders that fall inside the chosen period.
  const inPeriod = input.orders.filter((o) => {
    const d = orderDate(o, basis);
    if (from || to) {
      if (!d) return false; // an undated order can't be placed inside a range
      if (from && d < from) return false;
      if (to && d > to) return false;
    }
    return true;
  });

  const rows = inPeriod.map((order) => {
    const totals = computeOrderTotals(itemsByOrder.get(order.order_id) ?? []);
    return { order, total: totals.total, date: orderDate(order, basis) };
  });
  const active = rows.filter((r) => isOrderActive(r.order));

  // ---- headline numbers ----
  const salesTotal = active.reduce((s, r) => s + r.total, 0);
  const received = active.filter((r) => r.order.payment_status === "Paid").reduce((s, r) => s + r.total, 0);
  const unpaid = active.filter((r) => r.order.payment_status !== "Paid");

  // ---- payment methods ----
  const pm = { Cash: { amount: 0, orders: 0 }, UPI: { amount: 0, orders: 0 }, Unspecified: { amount: 0, orders: 0 }, Unpaid: { amount: 0, orders: 0 } };
  for (const r of active) {
    const bucket =
      r.order.payment_status !== "Paid"
        ? pm.Unpaid
        : r.order.payment_method === "Cash"
        ? pm.Cash
        : r.order.payment_method === "UPI"
        ? pm.UPI
        : pm.Unspecified;
    bucket.amount += r.total;
    bucket.orders += 1;
  }
  const paymentMethods: SalesReport["paymentMethods"] = [
    { key: "Cash", label: "Cash", ...pm.Cash },
    { key: "UPI", label: "UPI", ...pm.UPI },
    { key: "Unspecified", label: "Paid (method not recorded)", ...pm.Unspecified },
    { key: "Unpaid", label: "Not paid yet", ...pm.Unpaid },
  ];

  // ---- statuses (every status, including Cancelled, so the picture is complete) ----
  const orderStatuses = ORDER_STATUSES.map((status) => {
    const list = rows.filter((r) => r.order.status === status);
    return { status, orders: list.length, amount: list.reduce((s, r) => s + r.total, 0) };
  });

  // ---- trend ----
  let trendFrom = from;
  let trendTo = to;
  const dated = active.filter((r) => r.date);
  if (!trendFrom && dated.length) trendFrom = dated.reduce((m, r) => (r.date < m ? r.date : m), dated[0].date);
  if (!trendTo && dated.length) trendTo = dated.reduce((m, r) => (r.date > m ? r.date : m), dated[0].date);
  if (trendFrom && !trendTo) trendTo = trendFrom;
  if (trendTo && !trendFrom) trendFrom = trendTo;

  let granularity: Granularity = "day";
  const points: TrendPoint[] = [];
  if (trendFrom && trendTo) {
    granularity = pickGranularity(daysInclusive(trendFrom, trendTo));
    const keyOf = (d: string) =>
      granularity === "day" ? d : granularity === "week" ? mondayOf(d) : d.slice(0, 7);

    // zero-filled buckets so quiet days still show as gaps in the chart
    if (granularity === "day") {
      for (let d = trendFrom; d <= trendTo; d = addDaysIso(d, 1)) {
        points.push({ key: d, label: formatShort(d), rangeLabel: formatShort(d, true), orders: 0, sales: 0, received: 0 });
      }
    } else if (granularity === "week") {
      for (let d = mondayOf(trendFrom); d <= trendTo; d = addDaysIso(d, 7)) {
        points.push({
          key: d,
          label: formatShort(d),
          rangeLabel: `${formatShort(d)} – ${formatShort(addDaysIso(d, 6))}`,
          orders: 0, sales: 0, received: 0,
        });
      }
    } else {
      let [y, m] = trendFrom.split("-").map(Number);
      const [ey, em] = trendTo.split("-").map(Number);
      while (y < ey || (y === ey && m <= em)) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        points.push({ key, label: formatMonth(key), rangeLabel: formatMonth(key), orders: 0, sales: 0, received: 0 });
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
    }

    const byKey = new Map(points.map((p) => [p.key, p]));
    for (const r of dated) {
      const p = byKey.get(keyOf(r.date));
      if (!p) continue;
      p.orders += 1;
      p.sales += r.total;
      if (r.order.payment_status === "Paid") p.received += r.total;
    }
  }

  // ---- top products (units) — reuses the production engine on just this period ----
  const periodOrders = inPeriod;
  const periodIds = new Set(periodOrders.map((o) => o.order_id));
  const periodItems = input.orderItems.filter((i) => periodIds.has(i.order_id));
  const topProducts = computeProductionRows({
    orders: periodOrders,
    orderItems: periodItems,
    boxContents: input.boxContents,
    products: input.products,
  })
    .slice(0, topN)
    .map((r) => ({
      product_id: r.product_id,
      unit_label: r.unit_label,
      name: r.name,
      total: r.total,
      fromBoxes: r.fromBoxes,
      individual: r.individual,
    }));

  // ---- top boxes (quantity + revenue; box revenue is exact, unlike box contents) ----
  const activeIds = new Set(active.map((r) => r.order.order_id));
  const boxAgg = new Map<string, { quantity: number; revenue: number }>();
  for (const item of periodItems) {
    if (item.item_type !== "box" || !activeIds.has(item.order_id)) continue;
    const cur = boxAgg.get(item.box_id) ?? { quantity: 0, revenue: 0 };
    cur.quantity += item.quantity;
    cur.revenue += item.quantity * item.unit_price;
    boxAgg.set(item.box_id, cur);
  }
  const topBoxes = [...boxAgg.entries()]
    .map(([box_id, v]) => ({
      box_id,
      name: input.boxes.find((b) => b.box_id === box_id)?.name ?? "(unknown box)",
      ...v,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, topN);

  // ---- who still owes us ----
  const outstandingOrders = [...unpaid]
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map((r) => ({
      order_id: r.order.order_id,
      customerName: customerById.get(r.order.customer_id)?.name ?? "Unknown customer",
      total: r.total,
      status: r.order.status,
      payment_status: r.order.payment_status,
      date: r.date,
    }));

  return {
    range: { from: from || null, to: to || null, basis },
    totals: {
      orders: active.length,
      cancelledOrders: rows.length - active.length,
      salesTotal,
      received,
      outstanding: salesTotal - received,
      averageOrder: active.length ? Math.round(salesTotal / active.length) : 0,
      unpaidOrders: unpaid.length,
    },
    trend: { granularity, points },
    paymentMethods,
    orderStatuses,
    topProducts,
    topBoxes,
    outstandingOrders,
  };
}
