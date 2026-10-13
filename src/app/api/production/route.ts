import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeBoxTotals, computeProductionRows, isOrderActive } from "@/lib/calculations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { customers, products, boxes, boxContents, orders, orderItems } = await getAllData();
    const date = req.nextUrl.searchParams.get("date") ?? undefined;

    const rows = computeProductionRows({
      orders,
      orderItems,
      boxContents,
      products,
      fulfillmentDate: date,
    });
    const boxTotals = computeBoxTotals({ orders, orderItems, boxes, fulfillmentDate: date });

    // One row per active order: customer name on the left, a plain-text
    // summary of what they ordered on the right — meant as a printable
    // packing checklist alongside the production totals above.
    const relevantOrders = orders
      .filter(isOrderActive)
      .filter((o) => !date || o.fulfillment_date === date);

    const customerOrders = relevantOrders
      .map((order) => {
        const customer = customers.find((c) => c.customer_id === order.customer_id);
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        const summary = items
          .map((item) => {
            if (item.item_type === "box") {
              const box = boxes.find((b) => b.box_id === item.box_id);
              return `${box?.name ?? "Box"} × ${item.quantity}`;
            }
            const product = products.find((p) => p.product_id === item.product_id);
            const name = product?.name ?? "Product";
            return `${item.unit_label ? `${name} (${item.unit_label})` : name} × ${item.quantity}`;
          })
          .join(", ");
        return {
          order_id: order.order_id,
          customerName: customer?.name ?? "Unknown customer",
          summary,
        };
      })
      .sort((a, b) => a.customerName.localeCompare(b.customerName));

    return NextResponse.json({ rows, boxTotals, customerOrders });
  } catch (err) {
    return handleApiError(err);
  }
}
