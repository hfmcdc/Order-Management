// Turns a WhatsApp text into an action on an order and a friendly reply.
// All data access goes through the OrderStore interface, so this file is
// pure logic (tested with an in-memory store) and the real implementation
// (store.ts) just calls the app's existing data layer.

import type { OrderStatus, PaymentMethod, PaymentStatus } from "../types";
import { parseCommand, type PaymentChoice } from "./commands";

export interface OrderSummary {
  order_id: string; // ORD0002
  public_code: string; // VG-4821 (printed on receipts)
  customerName: string | null;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  notes: string;
}

export interface OrderPatch {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: PaymentMethod;
  notes: string; // full new notes value (existing notes + audit line)
}

export interface OrderStore {
  /** Orders matching an ORD#### id or a VG-#### receipt code (usually 0 or 1). */
  findOrders(code: string): Promise<OrderSummary[]>;
  applyPatch(orderId: string, patch: OrderPatch): Promise<void>;
}

export const HELP_TEXT = [
  "*Vaiga order bot*",
  "",
  "Commands:",
  "• *status ORD0002* – customer, total, delivery and payment",
  "• *delivered ORD0002* – mark as delivered",
  "• *paid ORD0002 cash* – mark paid by cash",
  "• *paid ORD0002 upi* – mark paid by UPI",
  "• *help* – show this list",
].join("\n");

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

function deliveryLine(o: OrderSummary): string {
  if (o.status === "Delivered") return "Delivered";
  if (o.status === "Cancelled") return "Cancelled";
  return `Not delivered yet (${o.status})`;
}

function paymentLine(o: OrderSummary): string {
  if (o.payment_status === "Paid") {
    return o.payment_method ? `Paid (${o.payment_method})` : "Paid";
  }
  return o.payment_status;
}

function who(o: OrderSummary): string {
  return o.customerName ? `${o.order_id} (${o.customerName})` : o.order_id;
}

/** One line appended to the order's notes for every change made by WhatsApp. */
export function auditLine(sender: string, action: string, at: Date): string {
  return `[WhatsApp ${at.toISOString()} from +${sender}] ${action}`;
}

function appendNote(existing: string, line: string): string {
  const base = (existing ?? "").trimEnd();
  return base ? `${base}\n${line}` : line;
}

export async function runCommand(
  text: string,
  sender: string, // digits only, e.g. 919876543210
  store: OrderStore,
  now: () => Date = () => new Date()
): Promise<string> {
  const cmd = parseCommand(text);

  switch (cmd.kind) {
    case "help":
      return HELP_TEXT;

    case "unknown": {
      const shown = cmd.text.length > 40 ? `${cmd.text.slice(0, 40)}…` : cmd.text;
      return shown
        ? `Sorry, I didn't understand "${shown}". Send *help* to see what I can do.`
        : "Send *help* to see what I can do.";
    }

    case "error":
      switch (cmd.reason) {
        case "usage":
          return cmd.command === "paid"
            ? "Please use: *paid ORD0002 cash* or *paid ORD0002 upi*"
            : `Please include the order code, like: *${cmd.command} ORD0002*`;
        case "bad_code":
          return `"${cmd.given}" doesn't look like an order code. Codes look like *ORD0002*.`;
        case "missing_method":
          return `Was ${cmd.code} paid by cash or UPI? Reply *paid ${cmd.code} cash* or *paid ${cmd.code} upi*.`;
        case "invalid_method":
          return `"${cmd.given}" isn't a payment method I know. Please use *cash* or *upi*, e.g. *paid ${cmd.code} upi*.`;
      }
  }

  // status / delivered / paid all start by finding the order.
  const matches = await store.findOrders(cmd.code);
  if (matches.length === 0) {
    return `I couldn't find order ${cmd.code}. Please check the code and try again.`;
  }
  if (matches.length > 1) {
    return `More than one order matches ${cmd.code}. Please use the order code that starts with ORD, like *ORD0002*.`;
  }
  const order = matches[0];

  if (cmd.kind === "status") {
    return [
      `*${order.order_id}* (${order.public_code})`,
      `Customer: ${order.customerName ?? "—"}`,
      `Total: ${money(order.total)}`,
      `Delivery: ${deliveryLine(order)}`,
      `Payment: ${paymentLine(order)}`,
    ].join("\n");
  }

  if (order.status === "Cancelled") {
    return `${who(order)} is cancelled, so I can't change it. Restore it in the app first if that was a mistake.`;
  }

  const at = now();

  if (cmd.kind === "delivered") {
    if (order.status === "Delivered") {
      return `${who(order)} is already marked *Delivered* – nothing changed.`;
    }
    await store.applyPatch(order.order_id, {
      status: "Delivered",
      notes: appendNote(order.notes, auditLine(sender, `Marked Delivered (was ${order.status})`, at)),
    });
    const reply = `✅ ${who(order)} marked *Delivered*.`;
    return order.payment_status === "Paid"
      ? reply
      : `${reply}\nPayment is still *${order.payment_status}*. Reply *paid ${order.order_id} cash* or *paid ${order.order_id} upi* once it's paid.`;
  }

  // cmd.kind === "paid"
  const method: PaymentChoice = cmd.method;
  if (order.payment_status === "Paid" && order.payment_method === method) {
    return `${who(order)} is already marked *Paid* by ${method} – nothing changed.`;
  }
  const was =
    order.payment_status === "Paid"
      ? `payment method changed ${order.payment_method || "unknown"} → ${method}`
      : `Marked Paid via ${method} (was ${order.payment_status})`;
  await store.applyPatch(order.order_id, {
    payment_status: "Paid",
    payment_method: method,
    notes: appendNote(order.notes, auditLine(sender, was.charAt(0).toUpperCase() + was.slice(1), at)),
  });
  return `✅ ${who(order)} marked *Paid* by ${method}. Total ${money(order.total)}.`;
}
