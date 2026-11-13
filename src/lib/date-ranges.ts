// Date helpers shared by the Sales dashboard (client + server).
// All dates in this app are plain ISO "YYYY-MM-DD" strings, compared as text.
// Arithmetic is done in UTC so daylight-saving shifts can never move a day.

export type RangePreset = "today" | "week" | "month" | "last30" | "all" | "custom";

export const RANGE_PRESETS: RangePreset[] = ["today", "week", "month", "last30", "all", "custom"];

export const RANGE_PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  all: "All time",
  custom: "Custom",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** True only for real calendar dates like 2026-10-31 (rejects 2026-02-31). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** A Date's calendar day in the VIEWER's local time zone, as YYYY-MM-DD. */
export function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function formatUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatUtc(d);
}

/** Number of calendar days from..to, both included. */
export function daysInclusive(from: string, to: string): number {
  return Math.round((parseIso(to).getTime() - parseIso(from).getTime()) / 86400000) + 1;
}

/** Monday of the week containing `iso` (the business week runs Mon–Sun). */
export function mondayOf(iso: string): string {
  const d = parseIso(iso);
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return formatUtc(d);
}

export function startOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function endOfMonth(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return formatUtc(new Date(Date.UTC(y, m, 0)));
}

export interface ResolvedRange {
  from: string; // "" = no lower bound
  to: string; // "" = no upper bound
}

/**
 * Turn a preset into concrete dates. `todayIso` is passed in (rather than
 * read here) so callers use the viewer's local "today" and tests stay stable.
 */
export function resolveRange(
  preset: RangePreset,
  todayIso: string,
  custom?: { from: string; to: string }
): ResolvedRange {
  switch (preset) {
    case "today":
      return { from: todayIso, to: todayIso };
    case "week": {
      const mon = mondayOf(todayIso);
      return { from: mon, to: addDaysIso(mon, 6) };
    }
    case "month":
      return { from: startOfMonth(todayIso), to: endOfMonth(todayIso) };
    case "last30":
      return { from: addDaysIso(todayIso, -29), to: todayIso };
    case "all":
      return { from: "", to: "" };
    case "custom": {
      let from = custom?.from ?? "";
      let to = custom?.to ?? "";
      if (from && to && from > to) [from, to] = [to, from]; // forgive a swapped pair
      return { from, to };
    }
  }
}

/** "12 Oct" / "12 Oct 2025" style label for chart axes and summaries. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatShort(iso: string, withYear = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}
export function formatMonth(isoOrYm: string): string {
  const [y, m] = isoOrYm.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Human label for a resolved range: "All time", "24 Oct 2026", "19 Oct – 25 Oct 2026". */
export function formatRangeLabel(from: string, to: string): string {
  if (!from && !to) return "All time";
  if (from && to && from === to) return formatShort(from, true);
  if (from && to) {
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${formatShort(from, !sameYear)} – ${formatShort(to, true)}`;
  }
  return from ? `From ${formatShort(from, true)}` : `Until ${formatShort(to, true)}`;
}
