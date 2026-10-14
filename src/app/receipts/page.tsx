"use client";

import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import ReceiptSheets, { ReceiptOrder } from "@/components/Receipt";

const SHEET_WIDTH_PX = 794; // 210mm at 96dpi

function ReceiptsInner() {
  const router = useRouter();
  const ids = useSearchParams().get("ids") ?? "";
  const { data, loading, error, refresh } = useApi<{ orders: ReceiptOrder[] }>(
    ids ? `/api/receipts?ids=${encodeURIComponent(ids)}` : null
  );
  const orders = data?.orders;

  // Screen only: scale the sheets down to fit a phone-width screen.
  const viewportRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const vp = viewportRef.current;
    const inner = scaleRef.current;
    if (!vp || !inner) return;
    const update = () => {
      const s = Math.min(1, vp.clientWidth / SHEET_WIDTH_PX);
      setScale(s);
      setScaledHeight(inner.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(vp);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [orders]);

  if (!ids) {
    return <EmptyState title="No receipts selected" hint="Pick orders on the Production page first." />;
  }
  if (loading) return <LoadingState label="Loading receipts…" />;
  if (error || !orders) return <ErrorState message={error ?? "Couldn't load receipts."} onRetry={refresh} />;
  if (orders.length === 0) return <EmptyState title="Nothing to print" hint="Those orders could not be found." />;

  const pages = Math.ceil(orders.length / 8);

  return (
    <div className="receipt-page flex flex-col gap-5 pb-8">
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => router.back()} className="text-sm text-marigold-600 font-medium touch-target">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <p className="text-sm text-maroon-700/70">
            {orders.length} receipt{orders.length === 1 ? "" : "s"}
            {orders.length > 8 ? ` · about ${pages} sheets` : ""}
          </p>
          <button
            onClick={() => window.print()}
            className="touch-target rounded-full bg-wine-700 text-white font-medium px-5"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div ref={viewportRef} className="rc-viewport overflow-hidden" style={{ height: scaledHeight }}>
        <div ref={scaleRef} className="rc-scale" style={{ transform: `scale(${scale})`, width: SHEET_WIDTH_PX }}>
          <ReceiptSheets orders={orders} />
        </div>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading receipts…" />}>
      <ReceiptsInner />
    </Suspense>
  );
}
