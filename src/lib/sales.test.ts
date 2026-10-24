import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSalesReport } from "./sales";
import type { Order, OrderItem, Customer, Product, Box, BoxContent } from "./types";

// Test fixtures only — the app itself never contains sample business data.
const customers: Customer[] = [
  { customer_id: "C1", name: "Asha", phone: "1", address: "", created_at: "", updated_at: "" },
  { customer_id: "C2", name: "Ben", phone: "2", address: "", created_at: "", updated_at: "" },
];
const products: Product[] = [
  { product_id: "P1", name: "Laddoo", price: 20, active: true },
  { product_id: "P2", name: "Murukku", price: 30, active: true },
];
const boxes: Box[] = [{ box_id: "B1", name: "Gift Box", price: 500, description: "", active: true }];
const boxContents: BoxContent[] = [{ box_id: "B1", product_id: "P1", quantity: 6, unit_label: "" }];

function order(id: string, o: Partial<Order>): Order {
  return {
    order_id: id, customer_id: "C1", order_date: "2026-10-10", fulfillment_type: "Pickup",
    fulfillment_date: "2026-10-20", status: "New", payment_status: "Pending", payment_method: "",
    notes: "", created_at: "", updated_at: "", ...o,
  };
}
function item(orderId: string, o: Partial<OrderItem>): OrderItem {
  return {
    order_item_id: `${orderId}-${Math.random()}`, order_id: orderId, item_type: "product",
    product_id: "P1", box_id: "", quantity: 1, unit_price: 20, unit_label: "", ...o,
  };
}

const orders: Order[] = [
  order("O1", { order_date: "2026-10-10", payment_status: "Paid", payment_method: "Cash", status: "Delivered" }),
  order("O2", { order_date: "2026-10-11", payment_status: "Paid", payment_method: "UPI", customer_id: "C2" }),
  order("O3", { order_date: "2026-10-11", payment_status: "Partial" }),
  order("O4", { order_date: "2026-10-12", status: "Cancelled", payment_status: "Pending" }),
  order("O5", { order_date: "2026-11-30", fulfillment_date: "2026-12-05", payment_status: "Paid" }), // outside, paid with no method
];
const orderItems: OrderItem[] = [
  item("O1", { item_type: "box", product_id: "", box_id: "B1", quantity: 2, unit_price: 500 }), // 1000
  item("O2", { quantity: 5, unit_price: 20 }), // 100
  item("O3", { product_id: "P2", quantity: 10, unit_price: 30 }), // 300
  item("O4", { quantity: 100, unit_price: 20 }), // cancelled, must not count
  item("O5", { quantity: 1, unit_price: 20 }),
];
const base = { orders, orderItems, customers, products, boxes, boxContents };

test("headline totals ignore cancelled orders and respect the range", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-10", to: "2026-10-12" });
  assert.equal(r.totals.orders, 3);
  assert.equal(r.totals.cancelledOrders, 1);
  assert.equal(r.totals.salesTotal, 1400);
  assert.equal(r.totals.received, 1100); // O1 + O2 are Paid
  assert.equal(r.totals.outstanding, 300); // O3 (Partial) counts as outstanding
  assert.equal(r.totals.unpaidOrders, 1);
  assert.equal(r.totals.averageOrder, Math.round(1400 / 3));
});

test("payment methods add up to sales total; Partial is unpaid", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-10", to: "2026-10-12" });
  const get = (k: string) => r.paymentMethods.find((p) => p.key === k)!;
  assert.equal(get("Cash").amount, 1000);
  assert.equal(get("UPI").amount, 100);
  assert.equal(get("Unpaid").amount, 300);
  assert.equal(get("Unspecified").amount, 0);
  assert.equal(r.paymentMethods.reduce((s, p) => s + p.amount, 0), r.totals.salesTotal);
});

test("statuses include cancelled so the picture is complete", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-10", to: "2026-10-12" });
  const get = (s: string) => r.orderStatuses.find((x) => x.status === s)!;
  assert.equal(get("Cancelled").orders, 1);
  assert.equal(get("Delivered").orders, 1);
  assert.equal(get("New").orders, 2);
});

test("trend is zero-filled per day and sums to the total", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-10", to: "2026-10-13" });
  assert.equal(r.trend.granularity, "day");
  assert.deepEqual(r.trend.points.map((p) => p.key), ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]);
  assert.deepEqual(r.trend.points.map((p) => p.sales), [1000, 400, 0, 0]);
  assert.equal(r.trend.points[0].received, 1000);
  assert.equal(r.trend.points.reduce((s, p) => s + p.sales, 0), r.totals.salesTotal);
});

test("long ranges switch to weekly then monthly buckets", () => {
  const weekly = computeSalesReport({ ...base, from: "2026-08-01", to: "2026-11-30" });
  assert.equal(weekly.trend.granularity, "week");
  const monthly = computeSalesReport({ ...base, from: "2025-01-01", to: "2026-11-30" });
  assert.equal(monthly.trend.granularity, "month");
  assert.equal(monthly.trend.points.length, 23);
  assert.equal(monthly.trend.points.find((p) => p.key === "2026-10")!.sales, 1400);
});

test("all time uses the data's own span and counts every active order", () => {
  const r = computeSalesReport(base);
  assert.equal(r.totals.orders, 4);
  assert.equal(r.totals.salesTotal, 1420);
  assert.equal(r.range.from, null);
  // O5 is Paid with no method
  assert.equal(r.paymentMethods.find((p) => p.key === "Unspecified")!.amount, 20);
});

test("top products expand boxes and merge individual sales; top boxes carry revenue", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-10", to: "2026-10-12" });
  const laddoo = r.topProducts.find((p) => p.product_id === "P1")!;
  assert.equal(laddoo.fromBoxes, 12); // 2 boxes × 6
  assert.equal(laddoo.individual, 5);
  assert.equal(laddoo.total, 17);
  assert.equal(r.topProducts.find((p) => p.product_id === "P2")!.total, 10);
  assert.deepEqual(r.topBoxes, [{ box_id: "B1", name: "Gift Box", quantity: 2, revenue: 1000 }]);
});

test("fulfillment basis filters on the fulfillment date instead", () => {
  const r = computeSalesReport({ ...base, from: "2026-10-20", to: "2026-10-20", basis: "fulfillment" });
  // O1–O3 fulfil on the 20th; O4 is cancelled; O5 fulfils in December.
  assert.equal(r.totals.orders, 3);
  const byOrderDate = computeSalesReport({ ...base, from: "2026-10-20", to: "2026-10-20" });
  assert.equal(byOrderDate.totals.orders, 0); // nothing was PLACED that day
});

test("outstanding list is biggest first and names customers", () => {
  const r = computeSalesReport(base);
  assert.equal(r.outstandingOrders[0].order_id, "O3");
  assert.equal(r.outstandingOrders[0].customerName, "Asha");
});

test("empty period gives zeros, not errors", () => {
  const r = computeSalesReport({ ...base, from: "2030-01-01", to: "2030-01-31" });
  assert.equal(r.totals.orders, 0);
  assert.equal(r.totals.salesTotal, 0);
  assert.equal(r.topProducts.length, 0);
});
