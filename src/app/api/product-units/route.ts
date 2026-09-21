import { NextRequest, NextResponse } from "next/server";
import { createProductUnit, deleteProductUnit, listProductUnits } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const units = await listProductUnits();
    return NextResponse.json({ units });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.product_id || !body?.label?.trim() || !body?.context) {
      return NextResponse.json(
        { error: "product_id, label, and context are required." },
        { status: 400 }
      );
    }
    if (body.context !== "box" && body.context !== "individual") {
      return NextResponse.json({ error: "context must be 'box' or 'individual'." }, { status: 400 });
    }

    const label = body.label.trim();

    // Prevent the exact bug this app hit once already: a retried failed
    // save (e.g. from a transient network error) silently creating a
    // second unit with the same label, where the wrong one could then get
    // picked up at order time and save a ₹0 price. If one already exists
    // for this product+label, this is very likely a retry of the same
    // add — update its price/context instead of creating a duplicate.
    const existing = await listProductUnits();
    const duplicate = existing.find(
      (u) => u.product_id === body.product_id && u.label.trim().toLowerCase() === label.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json(
        {
          error: `A unit labeled "${label}" already exists for this product (₹${duplicate.price}). Remove it first if you want to replace it, or use a different label.`,
        },
        { status: 409 }
      );
    }

    const unit = await createProductUnit({
      product_id: body.product_id,
      label,
      context: body.context,
      price: Number(body.price) || 0,
      active: body.active ?? true,
    });
    return NextResponse.json({ unit }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.unit_id) {
      return NextResponse.json({ error: "unit_id is required." }, { status: 400 });
    }
    await deleteProductUnit(body.unit_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
