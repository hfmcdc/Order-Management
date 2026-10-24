// Validation for the bulk order update request. Kept separate from the route
// so the rules can be unit-tested without a server or Google Sheets.

import {
  ORDER_STATUSES,
  OrderStatus,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export const MAX_BULK_ORDERS = 200;

export interface BulkOrderPatch {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
}

/** Throws an Error with a message that is safe to show to the user. */
export function parseBulkRequest(body: any): { ids: string[]; patch: BulkOrderPatch } {
  const rawIds = body?.ids;
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new Error("Select at least one order to update.");
  }
  const ids = [...new Set(rawIds.map((v: unknown) => String(v ?? "").trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error("Select at least one order to update.");
  if (ids.length > MAX_BULK_ORDERS) {
    throw new Error(`You can update up to ${MAX_BULK_ORDERS} orders at a time. Please select fewer orders.`);
  }

  const patch: BulkOrderPatch = {};
  if (body.status !== undefined && body.status !== null && body.status !== "") {
    if (!ORDER_STATUSES.includes(body.status)) throw new Error("That order status isn't valid.");
    patch.status = body.status;
  }
  if (body.payment_status !== undefined && body.payment_status !== null && body.payment_status !== "") {
    if (!PAYMENT_STATUSES.includes(body.payment_status)) throw new Error("That payment status isn't valid.");
    patch.payment_status = body.payment_status;
  }
  if (!patch.status && !patch.payment_status) {
    throw new Error("Choose a status or payment status to apply.");
  }

  if (patch.payment_status === "Paid") {
    if (!PAYMENT_METHODS.includes(body.payment_method)) {
      throw new Error("Choose Cash or UPI to mark these orders as Paid.");
    }
    patch.payment_method = body.payment_method;
  } else if (body.payment_method) {
    throw new Error("A payment method only applies when marking orders as Paid.");
  }

  return { ids, patch };
}
