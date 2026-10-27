import { getAllData } from "@/lib/repo";
import { computeOrderWithDetails, isOrderActive } from "@/lib/calculations";
import type { ReminderOrder } from "@/lib/types";

export interface Reminders {
  today: string;
  count: number;
  overdue: ReminderOrder[];
  dueToday: ReminderOrder[];
  unpaid: ReminderOrder[];
  unpaidAmount: number;
}

// Today's date in India (YYYY-MM-DD). Vercel servers run in UTC, so without
// this an order due "today" would flip to "overdue" at 5:30am IST.
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/** Orders that need attention: overdue, due today, and not fully paid. */
export async function getReminders(): Promise<Reminders> {
  const { customers, orders, orderItems, boxContents } = await getAllData();
  const today = todayIST();

  const toRow = (order: (typeof orders)[number]): ReminderOrder => {
    const items = orderItems.filter((i) => i.order_id === order.order_id);
    const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
    const total = computeOrderWithDetails(order, items, customer, boxContents).total;
    return {
      order_id: order.order_id,
      customerName: customer?.name ?? "Unknown customer",
      total,
      fulfillment_date: order.fulfillment_date,
      status: order.status,
      payment_status: order.payment_status,
    };
  };

  const active = orders.filter(isOrderActive);
  const notDelivered = active.filter((o) => o.status !== "Delivered");

  const overdue = notDelivered
    .filter((o) => o.fulfillment_date && o.fulfillment_date < today)
    .sort((a, b) => (a.fulfillment_date < b.fulfillment_date ? -1 : 1))
    .map(toRow);
  const dueToday = notDelivered.filter((o) => o.fulfillment_date === today).map(toRow);
  const unpaid = active
    .filter((o) => o.payment_status !== "Paid")
    .map(toRow)
    .sort((a, b) => b.total - a.total);

  const unpaidAmount = unpaid.reduce((sum, o) => sum + o.total, 0);
  const count = new Set([...overdue, ...dueToday, ...unpaid].map((o) => o.order_id)).size;
  return { today, count, overdue, dueToday, unpaid, unpaidAmount };
}
