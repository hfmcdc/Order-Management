// ---------------------------------------------------------------------------
// Repository layer: the functions API routes actually call. Each function
// composes raw sheet reads/writes (sheets.ts) with pure calculations
// (calculations.ts). Keeping this separate from the API routes means the
// route handlers stay thin — just parse the request, call a repo function,
// return JSON.
// ---------------------------------------------------------------------------

import { appendRow, appendRows, readSheet, replaceOrderItems, updateRow } from "./sheets";
import {
  Box,
  BoxContent,
  Customer,
  CustomerTotals,
  Order,
  OrderItem,
  OrderWithDetails,
  Product,
} from "./types";
import {
  computeCustomerTotals,
  computeOrderWithDetails,
} from "./calculations";

function nowIso(): string {
  return new Date().toISOString();
}

// ---- Customers ----

export async function listCustomers(): Promise<Customer[]> {
  return readSheet<Customer>("Customers");
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const customers = await listCustomers();
  const normalized = phone.replace(/\D/g, "");
  return (
    customers.find((c) => c.phone.replace(/\D/g, "") === normalized && normalized.length > 0) ??
    null
  );
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  address: string;
}): Promise<Customer> {
  const existing = await findCustomerByPhone(input.phone);
  if (existing) {
    throw new Error(
      `A customer with phone ${input.phone} already exists (${existing.name}). Use the existing customer instead of creating a duplicate.`
    );
  }
  const timestamp = nowIso();
  return appendRow<Customer>("Customers", {
    customer_id: "",
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    created_at: timestamp,
    updated_at: timestamp,
  } as Customer);
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const customers = await listCustomers();
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  const qDigits = q.replace(/\D/g, "");
  return customers.filter((c) => {
    const nameMatch = c.name.toLowerCase().includes(q);
    const phoneMatch = qDigits.length > 0 && c.phone.replace(/\D/g, "").includes(qDigits);
    return nameMatch || phoneMatch;
  });
}

// ---- Products ----

export async function listProducts(): Promise<Product[]> {
  return readSheet<Product>("Products");
}

export async function createProduct(input: Omit<Product, "product_id">): Promise<Product> {
  return appendRow<Product>("Products", { product_id: "", ...input } as Product);
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  return updateRow<Product>("Products", id, patch);
}

// ---- Boxes ----

export async function listBoxes(): Promise<Box[]> {
  return readSheet<Box>("Boxes");
}

export async function listBoxContents(): Promise<BoxContent[]> {
  return readSheet<BoxContent>("BoxContents");
}

export async function createBox(
  input: Omit<Box, "box_id">,
  contents: { product_id: string; quantity: number }[]
): Promise<Box> {
  const box = await appendRow<Box>("Boxes", { box_id: "", ...input } as Box);
  if (contents.length > 0) {
    await appendRows<BoxContent>(
      "BoxContents",
      contents.map((c) => ({ box_id: box.box_id, product_id: c.product_id, quantity: c.quantity }))
    );
  }
  return box;
}

export async function updateBox(id: string, patch: Partial<Box>): Promise<void> {
  return updateRow<Box>("Boxes", id, patch);
}

// ---- Orders ----

export async function listOrders(): Promise<Order[]> {
  return readSheet<Order>("Orders");
}

export async function listOrderItems(): Promise<OrderItem[]> {
  return readSheet<OrderItem>("OrderItems");
}

export interface NewOrderItemInput {
  item_type: "box" | "product";
  box_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
}

export interface NewOrderInput {
  customer_id: string;
  order_date: string;
  fulfillment_type: "Pickup" | "Delivery";
  fulfillment_date: string;
  notes?: string;
  items: NewOrderItemInput[];
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  if (!input.items || input.items.length === 0) {
    throw new Error("An order must have at least one box or product.");
  }
  const timestamp = nowIso();
  const order = await appendRow<Order>("Orders", {
    order_id: "",
    customer_id: input.customer_id,
    order_date: input.order_date,
    fulfillment_type: input.fulfillment_type,
    fulfillment_date: input.fulfillment_date,
    status: "New",
    payment_status: "Pending",
    notes: input.notes ?? "",
    created_at: timestamp,
    updated_at: timestamp,
  } as Order);

  await appendRows<OrderItem>(
    "OrderItems",
    input.items.map((item) => ({
      order_item_id: "",
      order_id: order.order_id,
      item_type: item.item_type,
      product_id: item.item_type === "product" ? item.product_id ?? "" : "",
      box_id: item.item_type === "box" ? item.box_id ?? "" : "",
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
  );

  return order;
}

export async function updateOrderStatus(orderId: string, status: Order["status"]): Promise<void> {
  await updateRow<Order>("Orders", orderId, { status, updated_at: nowIso() });
}

export async function updateOrderPaymentStatus(
  orderId: string,
  payment_status: Order["payment_status"]
): Promise<void> {
  await updateRow<Order>("Orders", orderId, { payment_status, updated_at: nowIso() });
}

export async function updateOrderDetails(
  orderId: string,
  patch: Partial<
    Pick<Order, "fulfillment_type" | "fulfillment_date" | "notes" | "status" | "payment_status">
  >,
  newItems?: NewOrderItemInput[]
): Promise<void> {
  await updateRow<Order>("Orders", orderId, { ...patch, updated_at: nowIso() });

  if (newItems) {
    await replaceOrderItems<OrderItem>(
      orderId,
      newItems.map((item) => ({
        order_item_id: "",
        order_id: orderId,
        item_type: item.item_type,
        product_id: item.item_type === "product" ? item.product_id ?? "" : "",
        box_id: item.item_type === "box" ? item.box_id ?? "" : "",
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
    );
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, "Cancelled");
}

export async function restoreOrder(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, "New");
}

/**
 * Fetch everything needed to render the full app state in one round of
 * reads. Google Sheets has no joins, so every "detail" view is assembled
 * client-side (in API routes) from these five flat lists.
 */
export async function getAllData() {
  const [customers, products, boxes, boxContents, orders, orderItems] = await Promise.all([
    listCustomers(),
    listProducts(),
    listBoxes(),
    listBoxContents(),
    listOrders(),
    listOrderItems(),
  ]);
  return { customers, products, boxes, boxContents, orders, orderItems };
}

export async function getOrderWithDetails(orderId: string): Promise<OrderWithDetails | null> {
  const { customers, orders, orderItems, boxContents } = await getAllData();
  const order = orders.find((o) => o.order_id === orderId);
  if (!order) return null;
  const items = orderItems.filter((i) => i.order_id === orderId);
  const customer = customers.find((c) => c.customer_id === order.customer_id) ?? null;
  return computeOrderWithDetails(order, items, customer, boxContents);
}

export async function getCustomerTotals(customerId: string): Promise<CustomerTotals | null> {
  const { customers, orders, orderItems, boxContents } = await getAllData();
  const customer = customers.find((c) => c.customer_id === customerId);
  if (!customer) return null;
  const customerOrders = orders.filter((o) => o.customer_id === customerId);
  return computeCustomerTotals({ customer, orders: customerOrders, orderItems, boxContents });
}
