// Small display helpers for charts (kept free of React so they can be tested).

/** ₹1.5k, ₹2.4L (lakh), ₹1.2Cr — compact labels for chart axes. */
export function compactInr(n: number): string {
  const trim = (v: number) => String(Math.round(v * 10) / 10).replace(/\.0$/, "");
  if (n >= 1e7) return `₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `₹${trim(n / 1e3)}k`;
  return `₹${Math.round(n)}`;
}

/** A "nice" axis maximum + step so gridlines land on round numbers. */
export function niceScale(maxValue: number, intervals = 4): { max: number; step: number } {
  if (!(maxValue > 0)) return { max: intervals, step: 1 };
  const rough = maxValue / intervals;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  const step = nf * pow;
  return { step, max: step * intervals };
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
