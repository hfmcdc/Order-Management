import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails, computeProductionRows, isOrderActive } from "@/lib/calculations";

// Always hit Google Sheets fresh — never let Vercel/Next.js cache this
// route's response, or new orders/edits would appear to vanish.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { customers, products, boxes, boxContents, orders, orderItems } = await getAllData();

    const activeOrders = orders.filter(isOrderActive);
    const activeOrderIds = new Set(activeOrders.map((o) => o.order_id));
    const activeItems = orderItems.filter((i) => activeOrderIds.has(i.order_id));

    const totalBoxes = activeItems
      .filter((i) => i.item_type === "box")
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalIndividualItems = activeItems
      .filter((i) => i.item_type === "product")
      .reduce((sum, i) => sum + i.quantity, 0);

    const production = computeProductionRows({
      orders,
      orderItems,
      boxContents,
      products,
    });
    const totalItemsFromBoxes = production.reduce((sum, r) => sum + r.fromBoxes, 0);

    const totalOrderValue = activeOrders.reduce((sum, order) => {
      const items = orderItems.filter((i) => i.order_id === order.order_id);
      const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
      return sum + computeOrderWithDetails(order, items, customer, boxContents).total;
    }, 0);

    // Payments actually received so far, split by method. Distinct from
    // "Order value" above (which is the value of ALL active orders
    // regardless of payment status) — this is money in hand. Orders marked
    // Paid before this feature existed (or via the old Pending/Partial/Paid
    // buttons, which don't ask for a method) have no payment_method — those
    // are counted in the total but kept out of both Cash and UPI rather
    // than being guessed into either one.
    let cashReceived = 0;
    let upiReceived = 0;
    let unspecifiedReceived = 0;
    for (const order of activeOrders) {
      if (order.payment_status !== "Paid") continue;
      const items = orderItems.filter((i) => i.order_id === order.order_id);
      const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
      const total = computeOrderWithDetails(order, items, customer, boxContents).total;
      if (order.payment_method === "Cash") cashReceived += total;
      else if (order.payment_method === "UPI") upiReceived += total;
      else unspecifiedReceived += total;
    }
    const totalReceived = cashReceived + upiReceived + unspecifiedReceived;

    // "Total items" everywhere in this app means the same thing: individual
    // units ordered, PLUS the units contained inside any boxes — i.e. the
    // actual count of sweets/snacks, not a count of order lines. Boxes are
    // reported as their own separate number rather than folded into this,
    // so "1 box + 2 individual items" isn't ambiguously called "3 items"
    // in one place and "4 items" (with box contents expanded) in another.
    const recentOrders = [...activeOrders]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
        const details = computeOrderWithDetails(order, items, customer, boxContents);
        return {
          order_id: order.order_id,
          customerName: customer?.name ?? "Unknown customer",
          boxCount: details.totalBoxes,
          itemCount: details.totalItems,
          total: details.total,
          created_at: order.created_at,
        };
      });

    const topProducts = production.slice(0, 5);

    const todayIso = new Date().toISOString().slice(0, 10);
    const todaysProduction = computeProductionRows({
      orders,
      orderItems,
      boxContents,
      products,
      fulfillmentDate: todayIso,
    }).slice(0, 5);

    return NextResponse.json({
      summary: {
        totalOrders: activeOrders.length,
        totalCustomers: customers.length,
        totalBoxes,
        totalIndividualItems,
        totalItems: totalIndividualItems + totalItemsFromBoxes,
        totalOrderValue,
      },
      payments: {
        cash: cashReceived,
        upi: upiReceived,
        unspecified: unspecifiedReceived,
        total: totalReceived,
      },
      production,
      recentOrders,
      topProducts,
      todaysProduction,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
