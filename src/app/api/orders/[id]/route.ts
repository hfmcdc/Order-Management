import { NextRequest, NextResponse } from "next/server";
import {
  cancelOrder,
  getOrderWithDetails,
  restoreOrder,
  updateOrderDetails,
} from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrderWithDetails(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    if (body.action === "cancel") {
      await cancelOrder(params.id);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "restore") {
      await restoreOrder(params.id);
      return NextResponse.json({ ok: true });
    }

    const { status, payment_status, fulfillment_type, fulfillment_date, notes, items } = body;
    await updateOrderDetails(
      params.id,
      { status, payment_status, fulfillment_type, fulfillment_date, notes },
      items
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
