import { NextRequest, NextResponse } from "next/server";
import { deleteCustomer, getAllData, updateCustomer } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeCustomerTotals, computeOrderWithDetails } from "@/lib/calculations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    // Single read of everything, reused for both the totals and the order
    // history below — this used to call getAllData() twice (once inside
    // getCustomerTotals, once here), doubling Google Sheets API calls for
    // every visit to this page.
    const { customers, orders, orderItems, boxContents } = await getAllData();

    const customer = customers.find((c) => c.customer_id === params.id);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const customerOrders = orders.filter((o) => o.customer_id === params.id);
    const totals = computeCustomerTotals({ customer, orders: customerOrders, orderItems, boxContents });

    const orderHistory = customerOrders
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        return computeOrderWithDetails(order, items, customer, boxContents);
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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteCustomer(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
