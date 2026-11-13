import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function buildOrdersCsv(onlyIds?: Set<string>) {
  const { customers, boxes, products, orders, orderItems } = await getAllData();

  const headers = [
    "Order ID",
    "Customer name",
    "Customer phone",
    "Products",
    "Quantities",
    "Total",
    "Status",
    "Payment status",
    "Date",
    // appended last so any existing spreadsheet that reads these columns by
    // position keeps working
    "Fulfillment date",
  ];

  const rows = orders
    .filter((order) => !onlyIds || onlyIds.has(order.order_id))
    .map((order) => {
      const customer = customers.find((c) => c.customer_id === order.customer_id);
      const items = orderItems.filter((i) => i.order_id === order.order_id);
      const productNames = items
        .map((i) => {
          if (i.item_type === "box") return boxes.find((b) => b.box_id === i.box_id)?.name ?? "Box";
          const name = products.find((p) => p.product_id === i.product_id)?.name ?? "Product";
          return i.unit_label ? `${name} (${i.unit_label})` : name;
        })
        .join("; ");
      const quantities = items.map((i) => i.quantity).join("; ");
      const total = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

      return [
        order.order_id,
        customer?.name ?? "",
        customer?.phone ?? "",
        productNames,
        quantities,
        total,
        order.status,
        order.payment_status,
        order.order_date,
        order.fulfillment_date,
      ];
    });

  const csv = toCsv(headers, rows);
  return { csv, count: rows.length };
}

// Settings page: every order.
export async function GET() {
  try {
    const { csv } = await buildOrdersCsv();
    const filename = `vaiga-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err) {
    return handleApiError(err);
  }
}

// Orders table: only the orders currently filtered/selected on screen.
// (POST rather than a long query string, so a few hundred ids are no problem.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "There are no orders to export." }, { status: 400 });
    }
    const ids = new Set<string>(body.ids.map((v: unknown) => String(v)));
    const { csv } = await buildOrdersCsv(ids);
    const filename = `vaiga-orders-filtered-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err) {
    return handleApiError(err);
  }
}
