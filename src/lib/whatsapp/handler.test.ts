import { test } from "node:test";
import assert from "node:assert/strict";
import { runCommand, type OrderPatch, type OrderStore, type OrderSummary } from "./handler";

function makeStore(initial: Partial<OrderSummary>[] = [{}]) {
  const orders: OrderSummary[] = initial.map((o, i) => ({
    order_id: `ORD000${i + 2}`,
    public_code: `VG-48${21 + i}`,
    customerName: "Priya Nair",
    total: 2020,
    status: "Packed",
    payment_status: "Pending",
    payment_method: "",
    notes: "",
    ...o,
  }));
  const patches: { id: string; patch: OrderPatch }[] = [];
  const store: OrderStore = {
    async findOrders(code) {
      return orders.filter((o) => o.order_id === code || o.public_code === code);
    },
    async applyPatch(id, patch) {
      patches.push({ id, patch });
    },
  };
  return { store, patches };
}

const SENDER = "919876543210";
const NOW = () => new Date("2026-10-15T09:12:03.000Z");
const run = (text: string, store: OrderStore) => runCommand(text, SENDER, store, NOW);

test("status shows customer, total, delivery and payment, and changes nothing", async () => {
  const { store, patches } = makeStore();
  const reply = await run("status ORD0002", store);
  assert.match(reply, /Priya Nair/);
  assert.match(reply, /₹2,020/);
  assert.match(reply, /Not delivered yet \(Packed\)/);
  assert.match(reply, /Payment: Pending/);
  assert.equal(patches.length, 0);
});

test("delivered updates status and writes an audit note with sender and time", async () => {
  const { store, patches } = makeStore([{ notes: "Call before delivery" }]);
  const reply = await run("delivered ORD0002", store);
  assert.match(reply, /marked \*Delivered\*/);
  assert.match(reply, /Payment is still \*Pending\*/);
  assert.equal(patches.length, 1);
  assert.equal(patches[0].id, "ORD0002");
  assert.equal(patches[0].patch.status, "Delivered");
  const lines = patches[0].patch.notes.split("\n");
  assert.equal(lines[0], "Call before delivery"); // existing note kept
  assert.equal(lines[1], "[WhatsApp 2026-10-15T09:12:03.000Z from +919876543210] Marked Delivered (was Packed)");
});

test("delivered works with the receipt code too", async () => {
  const { store, patches } = makeStore();
  await run("delivered VG-4821", store);
  assert.equal(patches[0].id, "ORD0002");
});

test("delivering an already delivered order changes nothing", async () => {
  const { store, patches } = makeStore([{ status: "Delivered" }]);
  assert.match(await run("delivered ORD0002", store), /already marked \*Delivered\*/);
  assert.equal(patches.length, 0);
});

test("paid cash / upi records status, method and audit", async () => {
  const a = makeStore();
  assert.match(await run("paid ORD0002 cash", a.store), /marked \*Paid\* by Cash/);
  assert.equal(a.patches[0].patch.payment_status, "Paid");
  assert.equal(a.patches[0].patch.payment_method, "Cash");
  assert.match(a.patches[0].patch.notes, /\+919876543210\] Marked Paid via Cash \(was Pending\)/);

  const b = makeStore();
  await run("paid ORD0002 upi", b.store);
  assert.equal(b.patches[0].patch.payment_method, "UPI");
});

test("paid again with the same method is a no-op; a different method is recorded", async () => {
  const same = makeStore([{ payment_status: "Paid", payment_method: "UPI" }]);
  assert.match(await run("paid ORD0002 upi", same.store), /already marked \*Paid\* by UPI/);
  assert.equal(same.patches.length, 0);

  const diff = makeStore([{ payment_status: "Paid", payment_method: "Cash" }]);
  await run("paid ORD0002 upi", diff.store);
  assert.equal(diff.patches[0].patch.payment_method, "UPI");
  assert.match(diff.patches[0].patch.notes, /Payment method changed Cash → UPI/);
});

test("invalid payment method is rejected without touching the order", async () => {
  const { store, patches } = makeStore();
  assert.match(await run("paid ORD0002 gpay", store), /cash\* or \*upi/);
  assert.match(await run("paid ORD0002", store), /cash or UPI/);
  assert.equal(patches.length, 0);
});

test("missing order, cancelled order, unknown command, help", async () => {
  const { store, patches } = makeStore([{ status: "Cancelled" }]);
  assert.match(await run("delivered ORD0099", store), /couldn't find order ORD0099/);
  assert.match(await run("delivered ORD0002", store), /is cancelled/);
  assert.match(await run("paid ORD0002 cash", store), /is cancelled/);
  assert.match(await run("dance", store), /didn't understand/);
  assert.match(await run("help", store), /Commands:/);
  assert.equal(patches.length, 0);
});

test("an ambiguous receipt code asks for the ORD code", async () => {
  const { store, patches } = makeStore([{ public_code: "VG-5000" }, { public_code: "VG-5000" }]);
  assert.match(await run("delivered VG-5000", store), /More than one order/);
  assert.equal(patches.length, 0);
});
