import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
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
    ];

    const rows = orders.map((order) => {
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
      ];
    });

    const csv = toCsv(headers, rows);
    const filename = `vaiga-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err) {
    return handleApiError(err);
  }
}
