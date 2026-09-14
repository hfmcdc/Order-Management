import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeProductionRows, isOrderActive } from "@/lib/calculations";

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

    return NextResponse.json({
      summary: {
        totalOrders: activeOrders.length,
        totalCustomers: customers.length,
        totalBoxes,
        totalIndividualItems,
        totalItems: totalIndividualItems + totalItemsFromBoxes,
      },
      production,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
