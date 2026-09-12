import { NextResponse } from "next/server";
import { getAllData } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { computeCustomerContributionsForProduct } from "@/lib/calculations";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { customers, orders, orderItems, boxContents } = await getAllData();
    const contributions = computeCustomerContributionsForProduct({
      productId: params.id,
      orders,
      orderItems,
      boxContents,
      customers,
    });
    return NextResponse.json({ contributions });
  } catch (err) {
    return handleApiError(err);
  }
}
