import { NextRequest, NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeSalesReport, SalesBasis } from "@/lib/sales";
import { isIsoDate } from "@/lib/date-ranges";

// Always read the sheet fresh — never serve a cached sales figure.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&basis=order|fulfillment
 * Omit from/to for "all time". The browser sends its own local dates so
 * "today" and "this week" follow the user's calendar, not the server's.
 */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";
    const basis: SalesBasis = sp.get("basis") === "fulfillment" ? "fulfillment" : "order";

    if ((from && !isIsoDate(from)) || (to && !isIsoDate(to))) {
      return NextResponse.json({ error: "Please choose valid dates." }, { status: 400 });
    }
    if (from && to && from > to) {
      return NextResponse.json({ error: "The start date must be on or before the end date." }, { status: 400 });
    }

    const { customers, products, boxes, boxContents, orders, orderItems } = await getAllData();
    const report = computeSalesReport({
      orders,
      orderItems,
      customers,
      products,
      boxes,
      boxContents,
      from,
      to,
      basis,
    });
    return NextResponse.json(report);
  } catch (err) {
    return handleApiError(err);
  }
}
