import { NextResponse } from "next/server";
import { getAllData, getCustomerTotals } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails } from "@/lib/calculations";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const totals = await getCustomerTotals(params.id);
    if (!totals) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const { orders, orderItems, boxContents } = await getAllData();
    const orderHistory = orders
      .filter((o) => o.customer_id === params.id)
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        return computeOrderWithDetails(order, items, totals.customer, boxContents);
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return NextResponse.json({ totals, orders: orderHistory });
  } catch (err) {
    return handleApiError(err);
  }
}
