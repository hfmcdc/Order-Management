// ---------------------------------------------------------------------------
// Calculation engine
//
// This file is the single source of truth for every derived number in the
// app: order totals, per-customer totals, and product-wise production
// requirements. Keeping it isolated (no Google Sheets calls, no React) makes
// it directly unit-testable and guarantees the dashboard, production page,
// and customer page can never disagree with each other — they all call the
// same functions over the same data.
// ---------------------------------------------------------------------------

import {
  Box,
  BoxContent,
  Customer,
  CustomerTotals,
  Order,
  OrderItem,
  OrderWithDetails,
  Product,
  ProductionRow,
} from "./types";

export function isOrderActive(order: Pick<Order, "status">): boolean {
  return order.status !== "Cancelled";
}

/**
 * Expand a quantity of a given box into the individual products it contains.
 * Returns a map of product_id -> quantity contributed by this many boxes.
 */
export function expandBoxToProducts(
  boxId: string,
  boxQuantity: number,
  boxContents: BoxContent[]
): Map<string, number> {
  const result = new Map<string, number>();
  const contents = boxContents.filter((bc) => bc.box_id === boxId);
  for (const content of contents) {
    const existing = result.get(content.product_id) ?? 0;
    result.set(content.product_id, existing + content.quantity * boxQuantity);
  }
  return result;
}

/**
 * Total number of individual product units contained inside a box (used to
 * compute "items from boxes" for a single box definition, e.g. for display
 * on the Boxes management page).
 */
export function itemsPerBox(boxId: string, boxContents: BoxContent[]): number {
  return boxContents
    .filter((bc) => bc.box_id === boxId)
    .reduce((sum, bc) => sum + bc.quantity, 0);
}

export interface OrderComputed {
  boxSubtotal: number;
  individualSubtotal: number;
  total: number;
  totalBoxes: number;
  totalIndividualItems: number;
  itemsFromBoxes: number;
  totalItems: number;
}

/**
 * Compute the derived numbers for a single order from its line items.
 * unit_price is always read from the OrderItem snapshot, never from the
 * live Products/Boxes sheet, so historical totals never drift (Test H).
 */
export function computeOrderTotals(items: OrderItem[]): OrderComputed {
  let boxSubtotal = 0;
  let individualSubtotal = 0;
  let totalBoxes = 0;
  let totalIndividualItems = 0;

  for (const item of items) {
    const lineTotal = item.quantity * item.unit_price;
    if (item.item_type === "box") {
      boxSubtotal += lineTotal;
      totalBoxes += item.quantity;
    } else {
      individualSubtotal += lineTotal;
      totalIndividualItems += item.quantity;
    }
  }

  return {
    boxSubtotal,
    individualSubtotal,
    total: boxSubtotal + individualSubtotal,
    totalBoxes,
    totalIndividualItems,
    // itemsFromBoxes needs box contents, filled in by computeOrderWithDetails
    itemsFromBoxes: 0,
    totalItems: 0,
  };
}

export function computeOrderWithDetails(
  order: Order,
  items: OrderItem[],
  customer: Customer | null,
  boxContents: BoxContent[]
): OrderWithDetails {
  const base = computeOrderTotals(items);

  let itemsFromBoxes = 0;
  for (const item of items) {
    if (item.item_type === "box") {
      itemsFromBoxes += itemsPerBox(item.box_id, boxContents) * item.quantity;
    }
  }

  return {
    ...order,
    customer,
    items,
    boxSubtotal: base.boxSubtotal,
    individualSubtotal: base.individualSubtotal,
    total: base.total,
    totalBoxes: base.totalBoxes,
    totalIndividualItems: base.totalIndividualItems,
    totalItems: base.totalIndividualItems + itemsFromBoxes,
  };
}

/**
 * The core production calculation (spec section 6):
 *   TOTAL REQUIRED = quantity from all active box orders + quantity from
 *   active individual product orders.
 * Cancelled orders are excluded entirely. An optional date filter restricts
 * to orders whose fulfillment_date matches (used by the Production page).
 */
export function computeProductionRows(params: {
  orders: Order[];
  orderItems: OrderItem[];
  boxContents: BoxContent[];
  products: Product[];
  fulfillmentDate?: string; // ISO date, optional
}): ProductionRow[] {
  const { orders, orderItems, boxContents, products, fulfillmentDate } = params;

  const relevantOrderIds = new Set(
    orders
      .filter((o) => isOrderActive(o))
      .filter((o) => !fulfillmentDate || o.fulfillment_date === fulfillmentDate)
      .map((o) => o.order_id)
  );

  const fromBoxes = new Map<string, number>();
  const individual = new Map<string, number>();

  for (const item of orderItems) {
    if (!relevantOrderIds.has(item.order_id)) continue;

    if (item.item_type === "box") {
      const expanded = expandBoxToProducts(item.box_id, item.quantity, boxContents);
      for (const [productId, qty] of expanded) {
        fromBoxes.set(productId, (fromBoxes.get(productId) ?? 0) + qty);
      }
    } else {
      individual.set(
        item.product_id,
        (individual.get(item.product_id) ?? 0) + item.quantity
      );
    }
  }

  const productIds = new Set([...fromBoxes.keys(), ...individual.keys()]);

  const rows: ProductionRow[] = [];
  for (const productId of productIds) {
    const product = products.find((p) => p.product_id === productId);
    const fb = fromBoxes.get(productId) ?? 0;
    const ind = individual.get(productId) ?? 0;
    rows.push({
      product_id: productId,
      name: product?.name ?? "(unknown product)",
      category: product?.category,
      fromBoxes: fb,
      individual: ind,
      total: fb + ind,
    });
  }

  return rows.sort((a, b) => b.total - a.total);
}

/**
 * Same idea as computeProductionRows but for boxes themselves (how many of
 * each box type were ordered) — used on the Production page's "Boxes"
 * section and the Boxes management page.
 */
export function computeBoxTotals(params: {
  orders: Order[];
  orderItems: OrderItem[];
  boxes: Box[];
  fulfillmentDate?: string;
}): { box_id: string; name: string; total: number }[] {
  const { orders, orderItems, boxes, fulfillmentDate } = params;

  const relevantOrderIds = new Set(
    orders
      .filter((o) => isOrderActive(o))
      .filter((o) => !fulfillmentDate || o.fulfillment_date === fulfillmentDate)
      .map((o) => o.order_id)
  );

  const totals = new Map<string, number>();
  for (const item of orderItems) {
    if (item.item_type !== "box") continue;
    if (!relevantOrderIds.has(item.order_id)) continue;
    totals.set(item.box_id, (totals.get(item.box_id) ?? 0) + item.quantity);
  }

  return [...totals.entries()]
    .map(([box_id, total]) => ({
      box_id,
      name: boxes.find((b) => b.box_id === box_id)?.name ?? "(unknown box)",
      total,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Per-customer rollup used on the Customers page and a customer's detail
 * view (spec section 13 & 18).
 */
export function computeCustomerTotals(params: {
  customer: Customer;
  orders: Order[]; // orders already filtered to this customer
  orderItems: OrderItem[]; // all order items (will be filtered internally)
  boxContents: BoxContent[];
}): CustomerTotals {
  const { customer, orders, orderItems, boxContents } = params;

  const activeOrders = orders.filter(isOrderActive);
  const activeOrderIds = new Set(activeOrders.map((o) => o.order_id));

  let totalBoxes = 0;
  let totalIndividualItems = 0;
  let itemsFromBoxes = 0;
  let totalAmount = 0;

  for (const item of orderItems) {
    if (!activeOrderIds.has(item.order_id)) continue;
    const lineTotal = item.quantity * item.unit_price;
    totalAmount += lineTotal;
    if (item.item_type === "box") {
      totalBoxes += item.quantity;
      itemsFromBoxes += itemsPerBox(item.box_id, boxContents) * item.quantity;
    } else {
      totalIndividualItems += item.quantity;
    }
  }

  return {
    customer,
    orderCount: activeOrders.length,
    totalBoxes,
    totalIndividualItems,
    totalItems: totalIndividualItems + itemsFromBoxes,
    totalAmount,
  };
}

/**
 * For the "which customers ordered this product" filter (spec section 19).
 * Returns each customer's contribution (from boxes + individually) to the
 * given product's total, across active orders only.
 */
export function computeCustomerContributionsForProduct(params: {
  productId: string;
  orders: Order[];
  orderItems: OrderItem[];
  boxContents: BoxContent[];
  customers: Customer[];
}): { customer: Customer; quantity: number }[] {
  const { productId, orders, orderItems, boxContents, customers } = params;

  const activeOrderIds = new Set(
    orders.filter(isOrderActive).map((o) => o.order_id)
  );
  const orderIdToCustomerId = new Map(orders.map((o) => [o.order_id, o.customer_id]));

  const contributions = new Map<string, number>();

  for (const item of orderItems) {
    if (!activeOrderIds.has(item.order_id)) continue;
    const customerId = orderIdToCustomerId.get(item.order_id);
    if (!customerId) continue;

    let qty = 0;
    if (item.item_type === "product" && item.product_id === productId) {
      qty = item.quantity;
    } else if (item.item_type === "box") {
      const expanded = expandBoxToProducts(item.box_id, item.quantity, boxContents);
      qty = expanded.get(productId) ?? 0;
    }
    if (qty > 0) {
      contributions.set(customerId, (contributions.get(customerId) ?? 0) + qty);
    }
  }

  return [...contributions.entries()]
    .map(([customerId, quantity]) => ({
      customer: customers.find((c) => c.customer_id === customerId)!,
      quantity,
    }))
    .filter((c) => c.customer)
    .sort((a, b) => b.quantity - a.quantity);
}
