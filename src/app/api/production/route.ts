import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeBoxTotals, computeProductionRows } from "@/lib/calculations";

export async function GET(req: NextRequest) {
  try {
    const { products, boxes, boxContents, orders, orderItems } = await getAllData();
    const date = req.nextUrl.searchParams.get("date") ?? undefined;

    const rows = computeProductionRows({
      orders,
      orderItems,
      boxContents,
      products,
      fulfillmentDate: date,
    });
    const boxTotals = computeBoxTotals({ orders, orderItems, boxes, fulfillmentDate: date });

    return NextResponse.json({ rows, boxTotals });
  } catch (err) {
    return handleApiError(err);
  }
}
