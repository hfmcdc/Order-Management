// Core domain types. These mirror the Google Sheets tabs 1:1 so that
// reading/writing rows can stay a thin, predictable mapping.

export type OrderStatus =
  | "New"
  | "Confirmed"
  | "Preparing"
  | "Packed"
  | "Delivered"
  | "Cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "New",
  "Confirmed",
  "Preparing",
  "Packed",
  "Delivered",
  "Cancelled",
];

export type PaymentStatus = "Pending" | "Partial" | "Paid";
export const PAYMENT_STATUSES: PaymentStatus[] = ["Pending", "Partial", "Paid"];

export type PaymentMethod = "Cash" | "UPI" | "";
export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI"];

export type FulfillmentType = "Pickup" | "Delivery";

export type OrderItemType = "box" | "product";

export interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  product_id: string;
  name: string;
  price: number;
  active: boolean;
  category?: string; // optional, used to group Production page ("Sweets"/"Snacks")
}

export interface Box {
  box_id: string;
  name: string;
  price: number;
  description: string;
  active: boolean;
}

export interface BoxContent {
  box_id: string;
  product_id: string;
  quantity: number;
}

export interface Order {
  order_id: string;
  customer_id: string;
  order_date: string; // ISO date the order was placed
  fulfillment_type: FulfillmentType;
  fulfillment_date: string; // ISO date the order is needed by
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod; // set when payment_status is Paid
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  item_type: OrderItemType;
  product_id: string; // set when item_type === "product"
  box_id: string; // set when item_type === "box"
  quantity: number;
  unit_price: number; // snapshot of price at time of order
}

// ---- Composite / view-model types used by the UI ----

export interface OrderWithDetails extends Order {
  customer: Customer | null;
  items: OrderItem[];
  boxSubtotal: number;
  individualSubtotal: number;
  total: number;
  totalBoxes: number;
  totalIndividualItems: number;
  totalItems: number; // totalIndividualItems + items contained inside boxes
}

export interface ProductionRow {
  product_id: string;
  name: string;
  category?: string;
  fromBoxes: number;
  individual: number;
  total: number;
}

export interface CustomerTotals {
  customer: Customer;
  orderCount: number;
  totalBoxes: number;
  totalIndividualItems: number;
  totalItems: number; // includes items contained in boxes
  totalAmount: number;
}
