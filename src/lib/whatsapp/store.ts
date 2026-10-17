// The real OrderStore: a thin adapter over the app's existing data layer
// (repo.ts / calculations.ts). It stores nothing itself and adds no new
// tabs or APIs — it reads and updates the same Orders rows the UI does.

import { getAllData, updateOrderDetails } from "../repo";
import { computeOrderWithDetails } from "../calculations";
import { publicOrderCode } from "../public-order-code";
import type { OrderPatch, OrderStore, OrderSummary } from "./handler";

export const sheetsOrderStore: OrderStore = {
  async findOrders(code: string): Promise<OrderSummary[]> {
    const { customers, orders, orderItems, boxContents } = await getAllData();
    return orders
      .filter((o) => o.order_id === code || publicOrderCode(o.order_id) === code)
      .map((order) => {
        const items = orderItems.filter((i) => i.order_id === order.order_id);
        const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
        const detailed = computeOrderWithDetails(order, items, customer, boxContents);
        return {
          order_id: order.order_id,
          public_code: publicOrderCode(order.order_id),
          customerName: customer?.name ?? null,
          total: detailed.total,
          status: order.status,
          payment_status: order.payment_status,
          payment_method: order.payment_method,
          notes: order.notes ?? "",
        };
      });
  },

  async applyPatch(orderId: string, patch: OrderPatch): Promise<void> {
    // Same function the Order Detail page's PATCH route uses.
    await updateOrderDetails(orderId, patch);
  },
};
