// ---------------------------------------------------------------------------
// Sample data seeder (spec section 29).
//
// Run with: npm run seed
//
// This populates the connected Google Sheet with sample products, boxes,
// customers, and orders so you can verify the calculation engine end to
// end before handing the app to Mom. Every sample record's name/notes is
// prefixed with "[SAMPLE]" so it's easy to find and delete later.
//
// This script talks to the real Google Sheets API, so it needs network
// access and a valid .env.local — it will not run in a sandboxed/offline
// environment.
// ---------------------------------------------------------------------------

import { config } from "dotenv";
config({ path: ".env.local" });

import { appendRow, appendRows } from "../src/lib/sheets";
import { Box, BoxContent, Customer, Order, OrderItem, Product } from "../src/lib/types";

async function main() {
  console.log("Seeding sample data into the connected Google Sheet...\n");

  // ---- Products ----
  const productDefs: Omit<Product, "product_id">[] = [
    { name: "Laddoo", price: 20, active: true, category: "Sweets" },
    { name: "Mysore Pak", price: 25, active: true, category: "Sweets" },
    { name: "Halwa", price: 18, active: true, category: "Sweets" },
    { name: "Mixture", price: 15, active: true, category: "Snacks" },
    { name: "Banana Chips", price: 12, active: true, category: "Snacks" },
  ];
  const products: Product[] = [];
  for (const p of productDefs) {
    const created = await appendRow<Product>("Products", { product_id: "", ...p } as Product);
    products.push(created);
    console.log(`  + Product: ${created.name} (${created.product_id})`);
  }
  const byName = (name: string) => products.find((p) => p.name === name)!;

  // ---- Boxes ----
  const regularBox = await appendRow<Box>("Boxes", {
    box_id: "",
    name: "[SAMPLE] Regular Diwali Box",
    price: 250,
    description: "Laddoo, Halwa, and Mixture — a simple everyday box.",
    active: true,
  } as Box);
  console.log(`  + Box: ${regularBox.name} (${regularBox.box_id})`);

  const premiumBox = await appendRow<Box>("Boxes", {
    box_id: "",
    name: "[SAMPLE] Premium Diwali Box",
    price: 450,
    description: "Laddoo, Mysore Pak, and Halwa — our festive best-seller.",
    active: true,
  } as Box);
  console.log(`  + Box: ${premiumBox.name} (${premiumBox.box_id})`);

  await appendRows<BoxContent>("BoxContents", [
    { box_id: regularBox.box_id, product_id: byName("Laddoo").product_id, quantity: 3, unit_label: "" },
    { box_id: regularBox.box_id, product_id: byName("Halwa").product_id, quantity: 2, unit_label: "" },
    { box_id: regularBox.box_id, product_id: byName("Mixture").product_id, quantity: 1, unit_label: "" },
    { box_id: premiumBox.box_id, product_id: byName("Laddoo").product_id, quantity: 4, unit_label: "" },
    { box_id: premiumBox.box_id, product_id: byName("Mysore Pak").product_id, quantity: 4, unit_label: "" },
    { box_id: premiumBox.box_id, product_id: byName("Halwa").product_id, quantity: 2, unit_label: "" },
  ]);
  console.log("  + Box contents defined for both boxes");

  // ---- Customers ----
  const customerDefs = [
    { name: "[SAMPLE] Rahul", phone: "9000000001", address: "12 Gandhi Street" },
    { name: "[SAMPLE] Anu", phone: "9000000002", address: "4 Lake View Road" },
    { name: "[SAMPLE] Sree", phone: "9000000003", address: "88 Temple Street" },
    { name: "[SAMPLE] Priya", phone: "9000000004", address: "21 Market Road" },
    { name: "[SAMPLE] Kumar", phone: "9000000005", address: "5 Church Street" },
  ];
  const customers: Customer[] = [];
  const timestamp = new Date().toISOString();
  for (const c of customerDefs) {
    const created = await appendRow<Customer>("Customers", {
      customer_id: "",
      ...c,
      created_at: timestamp,
      updated_at: timestamp,
    } as Customer);
    customers.push(created);
    console.log(`  + Customer: ${created.name} (${created.customer_id})`);
  }

  // ---- Orders (mix of boxes, individual, and both — spec Test A-G coverage) ----
  const today = new Date().toISOString().slice(0, 10);

  type OrderPlan = {
    customer: Customer;
    boxes: { box: Box; qty: number }[];
    individual: { product: Product; qty: number }[];
  };

  const plans: OrderPlan[] = [
    { customer: customers[0], boxes: [{ box: premiumBox, qty: 5 }], individual: [{ product: byName("Laddoo"), qty: 10 }] },
    { customer: customers[1], boxes: [{ box: regularBox, qty: 3 }], individual: [] },
    { customer: customers[2], boxes: [], individual: [{ product: byName("Mixture"), qty: 8 }, { product: byName("Banana Chips"), qty: 4 }] },
    { customer: customers[3], boxes: [{ box: premiumBox, qty: 2 }, { box: regularBox, qty: 2 }], individual: [{ product: byName("Halwa"), qty: 5 }] },
    { customer: customers[4], boxes: [{ box: premiumBox, qty: 1 }], individual: [] },
    { customer: customers[0], boxes: [], individual: [{ product: byName("Mysore Pak"), qty: 6 }] },
    { customer: customers[1], boxes: [{ box: premiumBox, qty: 4 }], individual: [] },
    { customer: customers[2], boxes: [{ box: regularBox, qty: 1 }], individual: [{ product: byName("Laddoo"), qty: 3 }] },
    { customer: customers[3], boxes: [], individual: [{ product: byName("Banana Chips"), qty: 10 }] },
    { customer: customers[4], boxes: [{ box: regularBox, qty: 6 }], individual: [{ product: byName("Mixture"), qty: 2 }] },
  ];

  for (const plan of plans) {
    const order = await appendRow<Order>("Orders", {
      order_id: "",
      customer_id: plan.customer.customer_id,
      order_date: today,
      fulfillment_type: "Pickup",
      fulfillment_date: today,
      status: "New",
      payment_status: "Pending",
      payment_method: "",
      notes: "[SAMPLE] seeded order",
      created_at: timestamp,
      updated_at: timestamp,
    } as Order);

    const items: Omit<OrderItem, "order_item_id">[] = [
      ...plan.boxes.map((b) => ({
        order_id: order.order_id,
        item_type: "box" as const,
        product_id: "",
        box_id: b.box.box_id,
        quantity: b.qty,
        unit_price: b.box.price,
        unit_label: "",
      })),
      ...plan.individual.map((i) => ({
        order_id: order.order_id,
        item_type: "product" as const,
        product_id: i.product.product_id,
        box_id: "",
        quantity: i.qty,
        unit_price: i.product.price,
        unit_label: "",
      })),
    ];

    await appendRows<OrderItem>("OrderItems", items.map((i) => ({ order_item_id: "", ...i })));
    console.log(`  + Order for ${plan.customer.name}: ${order.order_id}`);
  }

  console.log("\nDone. Sample data is prefixed with [SAMPLE] — delete those rows any time.");
}

main().catch((err) => {
  console.error("\nSeeding failed:", err.message ?? err);
  process.exit(1);
});
