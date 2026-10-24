"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import type { Granularity, TrendPoint } from "@/lib/sales";
import { compactInr, niceScale } from "@/lib/format";

const MARGIN = { top: 14, right: 12, bottom: 34, left: 54 };

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.floor(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * One bar. Its height/position are real SVG attributes driven by a spring
 * (framer's own x/y props mean "transform", not the SVG attribute, so we
 * animate the attributes directly). Bars grow from the baseline on first
 * paint and morph smoothly when the period or data changes.
 */
function Bar({
  x,
  width,
  baseY,
  height,
  delay,
  className,
}: {
  x: number;
  width: number;
  baseY: number;
  height: number;
  delay: number;
  className: string;
}) {
  const ref = useRef<SVGRectElement>(null);
  const shown = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const paint = (h: number) => {
      const v = Math.max(0, h);
      el.setAttribute("height", String(v));
      el.setAttribute("y", String(baseY - v));
    };
    if (reduce) {
      shown.current = height;
      paint(height);
      return;
    }
    const controls = animate(shown.current, height, {
      type: "spring",
      stiffness: 170,
      damping: 22,
      delay,
      onUpdate: (v) => {
        shown.current = v;
        paint(v);
      },
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, baseY, reduce]);

  return <rect ref={ref} x={x} y={baseY} width={width} height={0} rx={Math.min(5, width / 2)} className={className} />;
}

const GRAIN: Record<Granularity, string> = { day: "day", week: "week", month: "month" };

/**
 * Sales per day/week/month as bars, with the part already paid filled in
 * green inside each bar. Hover, touch or use ←/→ to read a bucket; a data
 * table is one click away for screen readers and for exact figures.
 */
export default function SalesTrendChart({
  points,
  granularity,
}: {
  points: TrendPoint[];
  granularity: Granularity;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const height = width < 520 ? 230 : 290;
  const iw = Math.max(10, width - MARGIN.left - MARGIN.right);
  const ih = height - MARGIN.top - MARGIN.bottom;
  const n = points.length;
  const band = iw / Math.max(n, 1);
  const barW = Math.min(44, Math.max(2, band * 0.66));

  const maxSales = useMemo(() => Math.max(...points.map((p) => p.sales), 0), [points]);
  const { max, step } = useMemo(() => niceScale(maxSales), [maxSales]);
  const ticks = [0, 1, 2, 3, 4].map((i) => i * step);
  const y = (v: number) => MARGIN.top + ih - (v / max) * ih;
  const labelEvery = Math.max(1, Math.ceil(64 / band));

  const idxFromX = (clientX: number, svg: SVGSVGElement) => {
    const x = clientX - svg.getBoundingClientRect().left - MARGIN.left;
    return Math.min(n - 1, Math.max(0, Math.floor(x / band)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (n === 0) return;
    if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(n - 1);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const p = active !== null ? points[active] : null;
  const tipX = active !== null ? MARGIN.left + (active + 0.5) * band : 0;
  const tipLeft = Math.min(Math.max(tipX, 100), width - 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-maroon-700/70">
        <ul className="flex items-center gap-4" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-marigold-500/40" /> Sales
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-sm bg-leaf-500" /> Paid
          </li>
        </ul>
        <span>Per {GRAIN[granularity]}</span>
      </div>

      <div
        ref={ref}
        className="relative select-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400"
        tabIndex={0}
        role="group"
        aria-label={`Sales per ${GRAIN[granularity]}. Use the left and right arrow keys to move between ${GRAIN[granularity]}s.`}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block touch-pan-y"
          onPointerMove={(e) => setActive(idxFromX(e.clientX, e.currentTarget))}
          onPointerDown={(e) => setActive(idxFromX(e.clientX, e.currentTarget))}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        >
          {/* grid + y-axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(t)}
                y2={y(t)}
                className={t === 0 ? "stroke-clay-300/70" : "stroke-clay-300/25"}
                strokeDasharray={t === 0 ? undefined : "3 4"}
              />
              <text x={MARGIN.left - 8} y={y(t) + 4} textAnchor="end" className="fill-maroon-700/60 text-[11px]">
                {compactInr(t)}
              </text>
            </g>
          ))}

          {/* hover band */}
          {active !== null && (
            <rect
              x={MARGIN.left + active * band}
              y={MARGIN.top}
              width={band}
              height={ih}
              rx={6}
              className="fill-marigold-500/10"
            />
          )}

          {/* bars */}
          <>
            {points.map((pt, i) => {
              const x = MARGIN.left + i * band + (band - barW) / 2;
              const hSales = (pt.sales / max) * ih;
              const hPaid = (pt.received / max) * ih;
              const delay = Math.min(i, 40) * 0.012;
              return (
                <g key={pt.key}>
                  <Bar
                    x={x}
                    width={barW}
                    baseY={MARGIN.top + ih}
                    height={hSales}
                    delay={delay}
                    className={active === i ? "fill-marigold-500/70" : "fill-marigold-500/40"}
                  />
                  <Bar
                    x={x}
                    width={barW}
                    baseY={MARGIN.top + ih}
                    height={hPaid}
                    delay={delay + 0.1}
                    className="fill-leaf-500"
                  />
                </g>
              );
            })}
          </>

          {/* x labels */}
          {points.map((pt, i) =>
            i % labelEvery === 0 ? (
              <text
                key={pt.key}
                x={MARGIN.left + (i + 0.5) * band}
                y={height - 12}
                textAnchor="middle"
                className={active === i ? "fill-maroon-800 text-[11px] font-medium" : "fill-maroon-700/60 text-[11px]"}
              >
                {pt.label}
              </text>
            ) : null
          )}
        </svg>

        {/* tooltip */}
        <AnimatePresence>
          {p && (
            <motion.div
              key="tip"
              aria-hidden
              initial={{ opacity: 0, y: 6, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%", left: tipLeft }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              className="pointer-events-none absolute top-1 z-10 w-[190px] rounded-xl border border-clay-300/70 bg-ivory px-3 py-2 text-xs shadow-xl shadow-black/50"
              style={{ left: tipLeft }}
            >
              <p className="mb-1 font-semibold text-maroon-800">{p.rangeLabel}</p>
              <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 text-maroon-700/80 tabular-nums">
                <dt>Orders</dt>
                <dd className="text-right text-maroon-800">{p.orders}</dd>
                <dt>Sales</dt>
                <dd className="text-right text-maroon-800">₹{p.sales}</dd>
                <dt>Paid</dt>
                <dd className="text-right text-leaf-600">₹{p.received}</dd>
                <dt>Outstanding</dt>
                <dd className="text-right text-marigold-600">₹{p.sales - p.received}</dd>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="sr-only" aria-live="polite">
          {p
            ? `${p.rangeLabel}: ${p.orders} orders, sales ₹${p.sales}, paid ₹${p.received}, outstanding ₹${p.sales - p.received}.`
            : ""}
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="press text-sm font-medium text-marigold-600 underline-offset-2 hover:underline rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-400"
        >
          {showTable ? "Hide data table" : "View as data table"}
        </button>
        <AnimatePresence initial={false}>
          {showTable && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-clay-300/60">
                <table className="w-full text-sm">
                  <caption className="sr-only">Sales per {GRAIN[granularity]}</caption>
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-maroon-700/70">
                      <th scope="col" className="sticky top-0 bg-ivory px-3 py-2">Period</th>
                      <th scope="col" className="sticky top-0 bg-ivory px-3 py-2 text-right">Orders</th>
                      <th scope="col" className="sticky top-0 bg-ivory px-3 py-2 text-right">Sales</th>
                      <th scope="col" className="sticky top-0 bg-ivory px-3 py-2 text-right">Paid</th>
                      <th scope="col" className="sticky top-0 bg-ivory px-3 py-2 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {points.map((pt) => (
                      <tr key={pt.key} className="border-t border-clay-300/30">
                        <th scope="row" className="px-3 py-2 text-left font-normal text-maroon-800">{pt.rangeLabel}</th>
                        <td className="px-3 py-2 text-right">{pt.orders}</td>
                        <td className="px-3 py-2 text-right">₹{pt.sales}</td>
                        <td className="px-3 py-2 text-right text-leaf-600">₹{pt.received}</td>
                        <td className="px-3 py-2 text-right text-marigold-600">₹{pt.sales - pt.received}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
