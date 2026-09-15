import { NextResponse } from "next/server";
import { listCustomers } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const customers = await listCustomers();
    const headers = ["Name", "Phone", "Address"];
    const rows = customers.map((c) => [c.name, c.phone, c.address]);
    const csv = toCsv(headers, rows);
    const filename = `vaiga-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err) {
    return handleApiError(err);
  }
}
