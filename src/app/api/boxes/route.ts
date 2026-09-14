import { NextRequest, NextResponse } from "next/server";
import { createBox, listBoxContents, listBoxes, updateBox } from "@/lib/repo";
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
    const { box_id, contents, ...patch } = body;
    await updateBox(box_id, patch);
    // Note: editing box contents (BoxContents rows) after creation is a
    // rarer operation; for V1, contents are set at box-creation time. If
    // you need to change contents later, delete and recreate the box, or
    // extend this route to diff/replace BoxContents rows the same way
    // replaceOrderItems does for orders.
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
