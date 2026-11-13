import { NextRequest, NextResponse } from "next/server";
import { bulkUpdateOrders } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { parseBulkRequest } from "@/lib/bulk-orders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/orders/bulk
 * body: { ids: string[], status?, payment_status?, payment_method? }
 * Applies one change to many orders with a single sheet write.
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { ids, patch } = parseBulkRequest(body);
    const { updated, missing } = await bulkUpdateOrders(ids, patch);

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "None of the selected orders could be found. They may have been deleted — please refresh." },
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, updated: updated.length, missing });
  } catch (err) {
    return handleApiError(err);
  }
}
