import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails, computeProductionRows, isOrderActive } from "@/lib/calculations";
import { todayIST } from "@/lib/reminders";
import { isIsoDate } from "@/lib/date-ranges";
import { isDeepavaliOrder } from "@/lib/season";

// Always hit Google Sheets fresh — never let Vercel/Next.js cache this
// route's response, or new orders/edits would appear to vanish.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Daily dashboard. Everything is scoped to ONE day — the orders whose
 * fulfillment_date is `?date=YYYY-MM-DD` (defaults to today, India time).
 * Two things deliberately look beyond that day because they're money/work
 * still hanging over from earlier: `carryOver` (orders from past days that
 * were never delivered) and `payments.pendingOrders` (delivered but unpaid,
 * from any day).
 */
export async function GET(req: NextRequest) {
  try {
    const { customers, products, boxes, boxContents, orders, orderItems } = await getAllData();

    const requested = req.nextUrl.searchParams.get("date");
    const date = isIsoDate(requested) ? requested : todayIST();

    const activeOrders = orders.filter(isOrderActive);
    const dayOrders = activeOrders.filter((o) => o.fulfillment_date === date);
    const dayOrderIds = new Set(dayOrders.map((o) => o.order_id));
    const dayItems = orderItems.filter((i) => dayOrderIds.has(i.order_id));

    const detailsFor = (order: (typeof orders)[number]) => {
      const items = orderItems.filter((i) => i.order_id === order.order_id);
      const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
      return computeOrderWithDetails(order, items, customer, boxContents);
    };

    const totalBoxes = dayItems
      .filter((i) => i.item_type === "box")
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalIndividualItems = dayItems
      .filter((i) => i.item_type === "product")
      .reduce((sum, i) => sum + i.quantity, 0);

    const production = computeProductionRows({
      orders,
      orderItems,
      boxContents,
      products,
      fulfillmentDate: date,
    });
    const totalItemsFromBoxes = production.reduce((sum, r) => sum + r.fromBoxes, 0);

    const dayDetails = dayOrders.map(detailsFor);
    const totalOrderValue = dayDetails.reduce((sum, d) => sum + d.total, 0);
    const totalCustomers = new Set(dayOrders.map((o) => o.customer_id)).size;

    // Progress for the day: how many of the day's orders are already delivered.
    const deliveredCount = dayOrders.filter((o) => o.status === "Delivered").length;

    // Payments received for this day's orders, split by method. Orders marked
    // Paid without a recorded method are counted in the total but kept out of
    // both Cash and UPI rather than being guessed into either one.
    let cashReceived = 0;
    let upiReceived = 0;
    let unspecifiedReceived = 0;
    for (const d of dayDetails) {
      if (d.payment_status !== "Paid") continue;
      if (d.payment_method === "Cash") cashReceived += d.total;
      else if (d.payment_method === "UPI") upiReceived += d.total;
      else unspecifiedReceived += d.total;
    }
    const totalReceived = cashReceived + upiReceived + unspecifiedReceived;

    // Money owed from ANY day: delivered but still not Paid.
    const unpaidAfterDelivery = activeOrders
      .filter((o) => o.status === "Delivered" && o.payment_status !== "Paid")
      .map((order) => {
        const d = detailsFor(order);
        return {
          order_id: order.order_id,
          customerName: d.customer?.name ?? "Unknown customer",
          total: d.total,
          payment_status: order.payment_status,
          fulfillment_date: order.fulfillment_date,
        };
      })
      .sort((a, b) => b.total - a.total);
    const pendingAmount = unpaidAfterDelivery.reduce((sum, o) => sum + o.total, 0);

    // Earlier-day orders that never got delivered — they'd otherwise vanish
    // from a strictly day-by-day view.
    const today = todayIST();
    const carryOver = activeOrders
      .filter((o) => !isDeepavaliOrder(o)) // Deepavali 2026 has its own section
      .filter((o) => o.status !== "Delivered" && o.fulfillment_date && o.fulfillment_date < date)
      .sort((a, b) => (a.fulfillment_date < b.fulfillment_date ? -1 : 1))
      .map((order) => {
        const d = detailsFor(order);
        return {
          order_id: order.order_id,
          customerName: d.customer?.name ?? "Unknown customer",
          total: d.total,
          fulfillment_date: order.fulfillment_date,
          status: order.status,
        };
      });

    const recentOrders = [...dayDetails]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((d) => ({
        order_id: d.order_id,
        customerName: d.customer?.name ?? "Unknown customer",
        boxCount: d.totalBoxes,
        itemCount: d.totalItems,
        total: d.total,
        status: d.status,
        created_at: d.created_at,
      }));

    return NextResponse.json({
      date,
      isToday: date === today,
      summary: {
        totalOrders: dayOrders.length,
        deliveredOrders: deliveredCount,
        totalCustomers,
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
        pendingAmount,
        pendingOrders: unpaidAfterDelivery,
      },
      carryOver,
      production,
      recentOrders,
      topProducts: production.slice(0, 5),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
