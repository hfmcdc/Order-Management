import { test } from "node:test";
import assert from "node:assert/strict";
import { filterOrders, sortOrders, nextSort, EMPTY_FILTERS, activeFilterCount } from "./order-table";
import type { OrderWithDetails } from "./types";

function o(id: string, p: Partial<OrderWithDetails>): OrderWithDetails {
  return {
    order_id: id, customer_id: "C", order_date: "2026-10-01", fulfillment_type: "Pickup",
    fulfillment_date: "2026-10-20", status: "New", payment_status: "Pending", payment_method: "",
    notes: "", created_at: "", updated_at: "",
    customer: { customer_id: "C", name: "Asha", phone: "99", address: "", created_at: "", updated_at: "" },
    items: [], boxSubtotal: 0, individualSubtotal: 0, total: 100, totalBoxes: 1, totalIndividualItems: 1, totalItems: 1,
    ...p,
  };
}
const rows = [
  o("ORD0002", { total: 500, status: "Delivered", payment_status: "Paid", fulfillment_date: "2026-10-22" }),
  o("ORD0010", { total: 100, status: "New", fulfillment_date: "" }),
  o("ORD0001", { total: 300, status: "Packed", payment_status: "Partial", fulfillment_date: "2026-10-18",
    customer: { customer_id: "D", name: "ben", phone: "55", address: "", created_at: "", updated_at: "" } }),
];

test("filters combine: status, payment, date range, search", () => {
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, status: "Delivered" }).length, 1);
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, payment: "Partial" })[0].order_id, "ORD0001");
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, from: "2026-10-19", to: "2026-10-22" }).length, 1);
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, query: "BEN" })[0].order_id, "ORD0001");
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, query: "55" }).length, 1);
  assert.equal(filterOrders(rows, { ...EMPTY_FILTERS, status: "New", payment: "Paid" }).length, 0);
});

test("a date filter excludes orders that have no date", () => {
  const r = filterOrders(rows, { ...EMPTY_FILTERS, from: "2026-01-01" });
  assert.ok(!r.some((x) => x.order_id === "ORD0010"));
});

test("sorting: numeric ids, totals, status order, undated last, stable", () => {
  assert.deepEqual(sortOrders(rows, { key: "order_id", dir: "asc" }).map((x) => x.order_id), ["ORD0001", "ORD0002", "ORD0010"]);
  assert.deepEqual(sortOrders(rows, { key: "total", dir: "desc" }).map((x) => x.total), [500, 300, 100]);
  assert.deepEqual(sortOrders(rows, { key: "status", dir: "asc" }).map((x) => x.status), ["New", "Packed", "Delivered"]);
  assert.equal(sortOrders(rows, { key: "fulfillment_date", dir: "asc" }).at(-1)!.order_id, "ORD0010");
  assert.equal(sortOrders(rows, { key: "fulfillment_date", dir: "desc" }).at(-1)!.order_id, "ORD0010");
  assert.equal(sortOrders(rows, null), rows);
});

test("header clicks cycle asc → desc → default", () => {
  let s = nextSort(null, "total");
  assert.deepEqual(s, { key: "total", dir: "asc" });
  s = nextSort(s, "total");
  assert.deepEqual(s, { key: "total", dir: "desc" });
  assert.equal(nextSort(s, "total"), null);
  assert.deepEqual(nextSort(s, "status"), { key: "status", dir: "asc" });
});

test("activeFilterCount ignores the search box", () => {
  assert.equal(activeFilterCount({ ...EMPTY_FILTERS, query: "x" }), 0);
  assert.equal(activeFilterCount({ ...EMPTY_FILTERS, status: "New", from: "2026-01-01" }), 2);
});
