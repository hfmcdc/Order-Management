import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails } from "@/lib/calculations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Everything the compact receipts need for many orders, in ONE read of the
// sheet (calling /api/orders/[id] once per order would hit Google Sheets
// many times). GET /api/receipts?ids=ORD0001,ORD0002
export async function GET(req: NextRequest) {
  try {
    const ids = (req.nextUrl.searchParams.get("ids") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return NextResponse.json({ orders: [] });

    const { customers, products, boxes, boxContents, orders, orderItems } = await getAllData();

    const result = ids
      .map((id) => orders.find((o) => o.order_id === id))
      .filter((o): o is NonNullable<typeof o> => Boolean(o))
      .map((order) => {
        const rawItems = orderItems.filter((i) => i.order_id === order.order_id);
        const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
        const detailed = computeOrderWithDetails(order, rawItems, customer, boxContents);

        // Same naming rule as /api/orders/[id]: box name, or product name
        // with its unit (e.g. "Halwa (250g)").
        const items = rawItems.map((item) => {
          let name: string;
          if (item.item_type === "box") {
            name = boxes.find((b) => b.box_id === item.box_id)?.name ?? "Box";
          } else {
            const base = products.find((p) => p.product_id === item.product_id)?.name ?? "Product";
            name = item.unit_label ? `${base} (${item.unit_label})` : base;
          }
          return {
            order_item_id: item.order_item_id,
            name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          };
        });

        return {
          order_id: order.order_id,
          order_date: order.order_date,
          customer: customer ? { name: customer.name, phone: customer.phone } : null,
          items,
          total: detailed.total,
        };
      });

    return NextResponse.json({ orders: result });
  } catch (err) {
    return handleApiError(err);
  }
}
