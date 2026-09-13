import { NextRequest, NextResponse } from "next/server";
import { getAllData, getCustomerTotals, updateCustomer } from "@/lib/repo";
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body?.name?.trim() && !body?.phone?.trim() && body?.address === undefined) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }
    await updateCustomer(params.id, {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.phone !== undefined ? { phone: body.phone.trim() } : {}),
      ...(body.address !== undefined ? { address: body.address } : {}),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
