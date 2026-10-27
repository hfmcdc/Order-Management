import { NextRequest, NextResponse } from "next/server";
import { getReminders } from "@/lib/reminders";
import { handleApiError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Sends a phone notification (via the free ntfy.sh app) listing overdue,
// due-today and unpaid orders. Called on a schedule by Vercel Cron
// (see vercel.json). Needs two env vars: NTFY_TOPIC and CRON_SECRET.
//
// To test by hand, open in a browser:
//   https://YOUR-APP.vercel.app/api/cron/reminders?key=YOUR_CRON_SECRET&force=1
// (force=1 sends even when there is nothing to remind about.)

function names(rows: { customerName: string }[], max = 4): string {
  const list = rows.slice(0, max).map((r) => r.customerName);
  const more = rows.length - max;
  return list.join(", ") + (more > 0 ? ` +${more} more` : "");
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    const topic = process.env.NTFY_TOPIC;
    if (!secret || !topic) {
      return NextResponse.json(
        { error: "Set NTFY_TOPIC and CRON_SECRET in your Vercel environment variables." },
        { status: 500 }
      );
    }

    // Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically.
    // The ?key= form is only for testing from a browser.
    const authorized =
      req.headers.get("authorization") === `Bearer ${secret}` ||
      req.nextUrl.searchParams.get("key") === secret;
    if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const r = await getReminders();
    const force = req.nextUrl.searchParams.get("force") === "1";
    if (r.count === 0 && !force) return NextResponse.json({ sent: false, reason: "Nothing pending" });

    const lines: string[] = [];
    if (r.overdue.length) lines.push(`Overdue (${r.overdue.length}): ${names(r.overdue)}`);
    if (r.dueToday.length) lines.push(`Due today (${r.dueToday.length}): ${names(r.dueToday)}`);
    if (r.unpaid.length)
      lines.push(`Payment pending (${r.unpaid.length}): ₹${r.unpaidAmount} - ${names(r.unpaid)}`);
    if (lines.length === 0) lines.push("Nothing pending. All clear!");

    const headers: Record<string, string> = {
      // HTTP headers must be plain ASCII, so no ₹ symbol here.
      Title: `${r.count} order${r.count === 1 ? "" : "s"} need attention`,
      Priority: r.overdue.length ? "high" : "default",
      Tags: r.overdue.length ? "warning" : "bell",
    };
    // Tapping the notification opens your app.
    if (process.env.APP_URL) headers.Click = process.env.APP_URL;

    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers,
      body: lines.join("\n"),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `ntfy responded ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ sent: true, count: r.count });
  } catch (err) {
    return handleApiError(err);
  }
}
