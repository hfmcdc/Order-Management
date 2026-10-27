import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { getReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(await getReminders());
  } catch (err) {
    return handleApiError(err);
  }
}
