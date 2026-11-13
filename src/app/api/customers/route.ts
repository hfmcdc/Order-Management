import { NextRequest, NextResponse } from "next/server";
import { createCustomer, findOrCreateCustomerByName, searchCustomers } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") ?? "";
    const customers = await searchCustomers(q);
    return NextResponse.json({ customers });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.name?.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }
    // find_or_create: reuse the customer if the name (or phone) already
    // exists, otherwise create them from the name alone.
    if (body.find_or_create) {
      const result = await findOrCreateCustomerByName({
        name: body.name,
        phone: body.phone ?? "",
        address: body.address ?? "",
      });
      if (result.ambiguous) {
        return NextResponse.json(
          {
            error: `More than one customer is named "${body.name.trim()}". Please pick the right one.`,
            matches: result.ambiguous,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { customer: result.customer, created: result.created },
        { status: result.created ? 201 : 200 }
      );
    }

    const customer = await createCustomer({
      name: body.name,
      phone: body.phone ?? "",
      address: body.address ?? "",
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
