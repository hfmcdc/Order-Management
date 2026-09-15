import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderTotals, computeProductionRows, isOrderActive } from "@/lib/calculations";

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
      return sum + computeOrderTotals(items).total;
    }, 0);

    const recentOrders = [...activeOrders]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        const totals = computeOrderTotals(items);
        const customer = customers.find((c) => c.customer_id === order.customer_id);
        return {
          order_id: order.order_id,
          customerName: customer?.name ?? "Unknown customer",
          itemCount: totals.totalBoxes + totals.totalIndividualItems,
          total: totals.total,
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
      production,
      recentOrders,
      topProducts,
      todaysProduction,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
