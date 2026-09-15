import { NextRequest, NextResponse } from "next/server";
import {
  cancelOrder,
  getOrderWithDetails,
  listBoxes,
  listProducts,
  restoreOrder,
  updateOrderDetails,
} from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const order = await getOrderWithDetails(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Attach a human-readable name to each line item (box/product name), so
    // the UI, print view, and WhatsApp message don't have to show raw IDs.
    const [boxes, products] = await Promise.all([listBoxes(), listProducts()]);
    const itemsWithNames = order.items.map((item) => ({
      ...item,
      name:
        item.item_type === "box"
          ? boxes.find((b) => b.box_id === item.box_id)?.name ?? "Box"
          : products.find((p) => p.product_id === item.product_id)?.name ?? "Product",
    }));

    return NextResponse.json({ order: { ...order, items: itemsWithNames } });
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
