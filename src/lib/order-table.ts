// Filtering + sorting for the desktop Orders table. Pure functions so the
// rules are testable and the table component stays presentational.

import { ORDER_STATUSES, OrderWithDetails, PAYMENT_STATUSES } from "./types";

export type SortKey =
  | "order_id"
  | "customer"
  | "fulfillment_date"
  | "items"
  | "total"
  | "status"
  | "payment_status";
export type SortDir = "asc" | "desc";
export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export interface OrderFilters {
  query: string;
  status: string; // "All" or an OrderStatus
  payment: string; // "All" or a PaymentStatus
  from: string; // fulfillment date, "" = no lower bound
  to: string; // fulfillment date, "" = no upper bound
}

export const EMPTY_FILTERS: OrderFilters = { query: "", status: "All", payment: "All", from: "", to: "" };

export function filterOrders(orders: OrderWithDetails[], f: OrderFilters): OrderWithDetails[] {
  const q = f.query.trim().toLowerCase();
  return orders.filter((o) => {
    if (f.status !== "All" && o.status !== f.status) return false;
    if (f.payment !== "All" && o.payment_status !== f.payment) return false;
    if (f.from || f.to) {
      const d = String(o.fulfillment_date ?? "").slice(0, 10);
      if (!d) return false;
      if (f.from && d < f.from) return false;
      if (f.to && d > f.to) return false;
    }
    if (q) {
      const hit = [o.order_id, o.customer?.name, o.customer?.phone]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
}

/** How many filters (besides the search box) are narrowing the list. */
export function activeFilterCount(f: OrderFilters): number {
  return (f.status !== "All" ? 1 : 0) + (f.payment !== "All" ? 1 : 0) + (f.from || f.to ? 1 : 0);
}

export function isDefaultFilters(f: OrderFilters): boolean {
  return !f.query.trim() && activeFilterCount(f) === 0;
}

function compare(a: OrderWithDetails, b: OrderWithDetails, key: SortKey): number {
  switch (key) {
    case "order_id":
      return a.order_id.localeCompare(b.order_id, undefined, { numeric: true });
    case "customer":
      return (a.customer?.name ?? "").localeCompare(b.customer?.name ?? "", undefined, { sensitivity: "base" });
    case "fulfillment_date":
      return String(a.fulfillment_date ?? "").localeCompare(String(b.fulfillment_date ?? ""));
    case "items":
      return a.totalBoxes + a.totalIndividualItems - (b.totalBoxes + b.totalIndividualItems);
    case "total":
      return a.total - b.total;
    case "status":
      return ORDER_STATUSES.indexOf(a.status) - ORDER_STATUSES.indexOf(b.status);
    case "payment_status":
      return PAYMENT_STATUSES.indexOf(a.payment_status) - PAYMENT_STATUSES.indexOf(b.payment_status);
  }
}

/** `null` keeps the incoming order (the API already returns newest first). */
export function sortOrders(orders: OrderWithDetails[], sort: SortState | null): OrderWithDetails[] {
  if (!sort) return orders;
  const factor = sort.dir === "asc" ? 1 : -1;
  return orders
    .map((o, i) => ({ o, i }))
    .sort((x, y) => {
      // Orders with no date always sink to the bottom, whichever way we sort.
      if (sort.key === "fulfillment_date") {
        const xe = !x.o.fulfillment_date;
        const ye = !y.o.fulfillment_date;
        if (xe !== ye) return xe ? 1 : -1;
      }
      return compare(x.o, y.o, sort.key) * factor || x.i - y.i; // stable
    })
    .map((x) => x.o);
}

/** asc → desc → back to the default order. */
export function nextSort(current: SortState | null, key: SortKey): SortState | null {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}
