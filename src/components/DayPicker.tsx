"use client";

import { addDaysIso, formatShort, toLocalIso } from "@/lib/date-ranges";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "Today", "Tomorrow", "Yesterday" or the weekday name. */
export function dayLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Today";
  if (iso === addDaysIso(todayIso, 1)) return "Tomorrow";
  if (iso === addDaysIso(todayIso, -1)) return "Yesterday";
  return weekdayOf(iso);
}

/**
 * One-day switcher: ‹ Today · 12 Nov 2026 ›, plus a native date input and a
 * "Today" shortcut. `value` is always a concrete YYYY-MM-DD.
 */
export default function DayPicker({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const todayIso = toLocalIso(new Date());
  const btn =
    "press touch-target w-11 flex items-center justify-center rounded-full bg-ivory text-maroon-800 shadow-sm hover:bg-clay-100 text-lg";
  return (
    <div className={`no-print flex flex-wrap items-center gap-2 ${className}`}>
      <button type="button" aria-label="Previous day" className={btn} onClick={() => onChange(addDaysIso(value, -1))}>
        ‹
      </button>
      <label className="touch-target relative flex flex-col justify-center rounded-2xl bg-ivory px-4 shadow-sm min-w-[10.5rem] cursor-pointer">
        <span className="text-[11px] leading-tight text-maroon-700/70">{dayLabel(value, todayIso)}</span>
        <span className="text-sm font-semibold leading-tight text-maroon-800">{formatShort(value, true)}</span>
        <input
          type="date"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pick a day"
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
      <button type="button" aria-label="Next day" className={btn} onClick={() => onChange(addDaysIso(value, 1))}>
        ›
      </button>
      {value !== todayIso && (
        <button
          type="button"
          onClick={() => onChange(todayIso)}
          className="press text-sm text-marigold-600 font-medium px-2"
        >
          Back to today
        </button>
      )}
    </div>
  );
}
