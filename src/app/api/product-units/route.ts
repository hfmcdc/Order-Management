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
    const unit = await createProductUnit({
      product_id: body.product_id,
      label: body.label.trim(),
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
