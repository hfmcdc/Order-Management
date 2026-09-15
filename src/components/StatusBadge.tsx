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

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-medium", STATUS_STYLES[status])}>
      {status}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span className={clsx("inline-block rounded-full px-3 py-1 text-xs font-medium", PAYMENT_STYLES[status])}>
      {status}
    </span>
  );
}
