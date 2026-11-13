import type { Order } from "./types";

/**
 * Deepavali 2026 was the festival season; the shop now runs day by day.
 * Every order PLACED on or before this date belongs to the Deepavali 2026
 * section (read-only history of money received, cash/UPI, pending).
 * Orders placed after it are normal daily orders.
 *
 * To move the boundary, change this one date (YYYY-MM-DD).
 */
export const DEEPAVALI_CUTOFF = "2026-11-13";

export function placedDate(o: Pick<Order, "order_date" | "created_at">): string {
  return String(o.order_date || o.created_at || "").slice(0, 10);
}

export function isDeepavaliOrder(o: Pick<Order, "order_date" | "created_at">): boolean {
  const d = placedDate(o);
  return d !== "" && d <= DEEPAVALI_CUTOFF;
}
