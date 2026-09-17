import { NextRequest, NextResponse } from "next/server";
import { createProduct, deleteProduct, listProducts, updateProduct } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await listProducts();
    return NextResponse.json({ products });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name || body?.price === undefined) {
      return NextResponse.json({ error: "Name and price are required." }, { status: 400 });
    }
    const product = await createProduct({
      name: body.name,
      price: Number(body.price),
      active: body.active ?? true,
      category: body.category ?? "",
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.product_id) {
      return NextResponse.json({ error: "product_id is required." }, { status: 400 });
    }
    const { product_id, ...patch } = body;
    await updateProduct(product_id, patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.product_id) {
      return NextResponse.json({ error: "product_id is required." }, { status: 400 });
    }
    await deleteProduct(body.product_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
