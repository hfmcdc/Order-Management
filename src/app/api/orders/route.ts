import { NextRequest, NextResponse } from "next/server";
import { createOrder, getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeOrderWithDetails } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const { customers, orders, orderItems, boxContents } = await getAllData();

    const status = req.nextUrl.searchParams.get("status");
    const customerId = req.nextUrl.searchParams.get("customer_id");
    const dateFrom = req.nextUrl.searchParams.get("date_from");
    const dateTo = req.nextUrl.searchParams.get("date_to");

    let filtered = orders;
    if (status) filtered = filtered.filter((o) => o.status === status);
    if (customerId) filtered = filtered.filter((o) => o.customer_id === customerId);
    if (dateFrom) filtered = filtered.filter((o) => o.fulfillment_date >= dateFrom);
    if (dateTo) filtered = filtered.filter((o) => o.fulfillment_date <= dateTo);

    const detailed = filtered
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
        return computeOrderWithDetails(order, items, customer, boxContents);
      })
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    return NextResponse.json({ orders: detailed });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.customer_id) {
      return NextResponse.json({ error: "Please select a customer." }, { status: 400 });
    }
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Add at least one box or product before saving." },
        { status: 400 }
      );
    }

    const order = await createOrder({
      customer_id: body.customer_id,
      order_date: body.order_date ?? new Date().toISOString().slice(0, 10),
      fulfillment_type: body.fulfillment_type ?? "Pickup",
      fulfillment_date: body.fulfillment_date ?? new Date().toISOString().slice(0, 10),
      notes: body.notes ?? "",
      items: body.items,
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
