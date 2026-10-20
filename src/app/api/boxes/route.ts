import { NextRequest, NextResponse } from "next/server";
import { createBox, deleteBox, listBoxContents, listBoxes, replaceBoxContents, updateBox } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const [boxes, boxContents] = await Promise.all([listBoxes(), listBoxContents()]);
    return NextResponse.json({ boxes, boxContents });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name || body?.price === undefined || !Array.isArray(body?.contents)) {
      return NextResponse.json(
        { error: "Name, price, and contents are required." },
        { status: 400 }
      );
    }
    const box = await createBox(
      {
        name: body.name,
        price: Number(body.price),
        description: body.description ?? "",
        active: body.active ?? true,
      },
      body.contents
    );
    return NextResponse.json({ box }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.box_id) {
      return NextResponse.json({ error: "box_id is required." }, { status: 400 });
    }

    // Validate everything first so a bad request changes nothing.
    const patch: { name?: string; price?: number; description?: string; active?: boolean } = {};
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
      }
      patch.name = body.name.trim();
    }
    if (body.price !== undefined) {
      const price = Number(body.price);
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: "Price must be a number, 0 or more." }, { status: 400 });
      }
      patch.price = price;
    }
    if (typeof body.description === "string") patch.description = body.description.trim();
    if (typeof body.active === "boolean") patch.active = body.active;

    let contents: { product_id: string; quantity: number; unit_label: string }[] | null = null;
    if (body.contents !== undefined) {
      if (!Array.isArray(body.contents)) {
        return NextResponse.json({ error: "contents must be a list." }, { status: 400 });
      }
      const list = body.contents.map((c: any) => ({
        product_id: String(c?.product_id ?? ""),
        quantity: Number(c?.quantity),
        unit_label: String(c?.unit_label ?? ""),
      }));
      if (
        list.length === 0 ||
        list.some((c: { product_id: string; quantity: number }) => !c.product_id || !Number.isFinite(c.quantity) || c.quantity <= 0)
      ) {
        return NextResponse.json(
          { error: "A box needs at least one product, each with a quantity above 0." },
          { status: 400 }
        );
      }
      contents = list;
    }

    await updateBox(body.box_id, patch);
    if (contents) await replaceBoxContents(body.box_id, contents);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.box_id) {
      return NextResponse.json({ error: "box_id is required." }, { status: 400 });
    }
    await deleteBox(body.box_id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
