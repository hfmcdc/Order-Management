import { NextResponse } from "next/server";
import { listProducts } from "@/lib/repo";
import { handleApiError } from "@/lib/api-utils";
import { csvResponseHeaders, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const products = await listProducts();
    const headers = ["Name", "Price", "Active"];
    const rows = products.map((p) => [p.name, p.price, p.active ? "Yes" : "No"]);
    const csv = toCsv(headers, rows);
    const filename = `vaiga-products-${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err) {
    return handleApiError(err);
  }
}
