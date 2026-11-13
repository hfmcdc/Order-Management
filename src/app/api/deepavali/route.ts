import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails, computeProductionRows, isOrderActive } from "@/lib/calculations";
import { DEEPAVALI_CUTOFF, isDeepavaliOrder } from "@/lib/season";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Deepavali 2026 summary: the whole season in one read-only report. */
export async function GET() {
  try {
    const { customers, products, boxContents, orders, orderItems } = await getAllData();

    const seasonOrders = orders.filter(isDeepavaliOrder);
    const active = seasonOrders.filter(isOrderActive);
    const cancelled = seasonOrders.length - active.length;
    const ids = new Set(active.map((o) => o.order_id));
    const items = orderItems.filter((i) => ids.has(i.order_id));

    const detailed = active.map((o) => {
      const its = orderItems.filter((i) => i.order_id === o.order_id);
      const c = customers.find((x) => x.customer_id === o.customer_id) ?? null;
      return computeOrderWithDetails(o, its, c, boxContents);
    });

    let cash = 0, upi = 0, unspecified = 0;
    const unpaid: {
      order_id: string; customerName: string; phone: string; total: number;
      payment_status: string; fulfillment_date: string;
    }[] = [];
    const byDay = new Map<string, { orders: number; value: number; received: number }>();

    for (const d of detailed) {
      const day = byDay.get(d.fulfillment_date) ?? { orders: 0, value: 0, received: 0 };
      day.orders += 1;
      day.value += d.total;
      if (d.payment_status === "Paid") {
        day.received += d.total;
        if (d.payment_method === "Cash") cash += d.total;
        else if (d.payment_method === "UPI") upi += d.total;
        else unspecified += d.total;
      } else {
        unpaid.push({
          order_id: d.order_id,
          customerName: d.customer?.name ?? "Unknown customer",
          phone: d.customer?.phone ?? "",
          total: d.total,
          payment_status: d.payment_status,
          fulfillment_date: d.fulfillment_date,
        });
      }
      byDay.set(d.fulfillment_date, day);
    }
    unpaid.sort((a, b) => b.total - a.total);

    const totalValue = detailed.reduce((s, d) => s + d.total, 0);
    const received = cash + upi + unspecified;
    const pendingAmount = unpaid.reduce((s, o) => s + o.total, 0);

    const production = computeProductionRows({ orders: seasonOrders, orderItems, boxContents, products });

    return NextResponse.json({
      season: "Deepavali 2026",
      cutoff: DEEPAVALI_CUTOFF,
      summary: {
        totalOrders: active.length,
        cancelledOrders: cancelled,
        deliveredOrders: active.filter((o) => o.status === "Delivered").length,
        totalCustomers: new Set(active.map((o) => o.customer_id)).size,
        totalBoxes: items.filter((i) => i.item_type === "box").reduce((s, i) => s + i.quantity, 0),
        totalValue,
      },
      payments: { cash, upi, unspecified, received, pendingAmount, unpaidCount: unpaid.length, unpaid },
      byDay: [...byDay.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
      topProducts: production.slice(0, 8),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
