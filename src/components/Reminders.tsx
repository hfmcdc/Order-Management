"use client";

import Link from "next/link";
import { useApi } from "@/lib/useApi";
import type { ReminderOrder } from "@/lib/types";

interface RemindersResponse {
  count: number;
  overdue: ReminderOrder[];
  dueToday: ReminderOrder[];
  unpaid: ReminderOrder[];
  unpaidAmount: number;
}

const MAX_ROWS = 5;

function Group({
  title,
  tone,
  rows,
  showDate,
}: {
  title: string;
  tone: string;
  rows: ReminderOrder[];
  showDate?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col">
      <p className={`px-5 pt-3.5 pb-1.5 text-xs font-semibold uppercase tracking-wide ${tone}`}>
        {title} ({rows.length})
      </p>
      {rows.slice(0, MAX_ROWS).map((o) => (
        <Link
          key={o.order_id}
          href={`/orders/${o.order_id}`}
          className="px-5 py-3 flex items-center justify-between text-sm transition-colors hover:bg-clay-100/40 active:bg-clay-100/60"
        >
          <span className="text-maroon-800">
            {o.customerName}
            {showDate && (
              <span className="text-maroon-700/55 text-xs ml-2">due {o.fulfillment_date}</span>
            )}
          </span>
          <span className="font-semibold text-maroon-800">₹{o.total}</span>
        </Link>
      ))}
      {rows.length > MAX_ROWS && (
        <Link href="/orders" className="px-5 pb-3 text-xs text-marigold-600 font-medium">
          +{rows.length - MAX_ROWS} more →
        </Link>
      )}
    </div>
  );
}

/** Dashboard card: overdue, due-today and unpaid orders in one place. */
export default function Reminders() {
  const { data } = useApi<RemindersResponse>("/api/reminders");
  if (!data || data.count === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display font-600 text-lg text-maroon-800">
        Reminders{" "}
        <span className="text-maroon-700/50 font-normal text-sm">
          (₹{data.unpaidAmount} unpaid)
        </span>
      </h2>
      <div className="card divide-y divide-clay-100 overflow-hidden">
        <Group title="Overdue" tone="text-red-700" rows={data.overdue} showDate />
        <Group title="Due today" tone="text-marigold-600" rows={data.dueToday} />
        <Group title="Payment pending" tone="text-maroon-700" rows={data.unpaid} />
      </div>
    </section>
  );
}
