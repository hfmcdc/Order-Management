import clsx from "clsx";
import { OrderStatus, PaymentStatus } from "@/lib/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  New: "bg-clay-100 text-maroon-800",
  Confirmed: "bg-marigold-100 text-marigold-600",
  Preparing: "bg-marigold-100 text-marigold-600",
  Packed: "bg-leaf-500/10 text-leaf-600",
  Delivered: "bg-leaf-500/15 text-leaf-600",
  Cancelled: "bg-maroon-900/10 text-maroon-900/70 line-through",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  Pending: "bg-maroon-900/10 text-maroon-800",
  Partial: "bg-marigold-100 text-marigold-600",
  Paid: "bg-leaf-500/15 text-leaf-600",
};

// Statuses that mean "something still needs attention" get a live pulse dot.
const LIVE_STATUS: OrderStatus[] = ["New", "Preparing"];

function PulseDot() {
  return (
    <span className="relative flex h-1.5 w-1.5 mr-1.5" aria-hidden>
      <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

// `key={status}` re-mounts the span when the status changes, which replays
// the CSS pop animation — so a status change is visible, not silent.
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      key={status}
      className={clsx(
        "badge-pop inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {LIVE_STATUS.includes(status) && <PulseDot />}
      {status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      key={status}
      className={clsx(
        "badge-pop inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        PAYMENT_STYLES[status]
      )}
    >
      {status === "Paid" && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className="mr-1" aria-hidden>
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status}
    </span>
  );
}
