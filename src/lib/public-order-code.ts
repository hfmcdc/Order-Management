/**
 * The real order_id (ORD0001, ORD0002, ...) is sequential, so showing it to
 * a customer on a printed invoice or WhatsApp message would let them guess
 * roughly how many total orders the business has received this season.
 * This derives a short, deterministic, non-sequential-looking code from the
 * same ID instead — same order always gets the same code, but the codes
 * don't reveal order volume. Used only on customer-facing outputs
 * (print/PDF/WhatsApp); the real order_id keeps being used everywhere
 * inside the app for staff.
 */
export function publicOrderCode(orderId: string): string {
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = (hash * 31 + orderId.charCodeAt(i)) >>> 0;
  }
  const code = 1000 + (hash % 9000); // always a 4-digit number, 1000-9999
  return `VG-${code}`;
}
