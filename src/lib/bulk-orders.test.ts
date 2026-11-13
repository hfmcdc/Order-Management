import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBulkRequest, MAX_BULK_ORDERS } from "./bulk-orders";

test("accepts a status change and de-duplicates ids", () => {
  const r = parseBulkRequest({ ids: ["A", "A", " B "], status: "Packed" });
  assert.deepEqual(r.ids, ["A", "B"]);
  assert.deepEqual(r.patch, { status: "Packed" });
});

test("marking Paid needs Cash or UPI", () => {
  assert.throws(() => parseBulkRequest({ ids: ["A"], payment_status: "Paid" }), /Cash or UPI/);
  const ok = parseBulkRequest({ ids: ["A"], payment_status: "Paid", payment_method: "UPI" });
  assert.deepEqual(ok.patch, { payment_status: "Paid", payment_method: "UPI" });
});

test("a payment method without Paid is rejected", () => {
  assert.throws(() => parseBulkRequest({ ids: ["A"], payment_status: "Partial", payment_method: "Cash" }), /only applies/);
});

test("rejects empty selection, nothing to apply, bad values, too many ids", () => {
  assert.throws(() => parseBulkRequest({ ids: [], status: "New" }), /at least one order/);
  assert.throws(() => parseBulkRequest({ ids: ["A"] }), /Choose a status/);
  assert.throws(() => parseBulkRequest({ ids: ["A"], status: "Nope" }), /isn't valid/);
  assert.throws(() => parseBulkRequest({ ids: ["A"], payment_status: "Nope" }), /isn't valid/);
  const many = Array.from({ length: MAX_BULK_ORDERS + 1 }, (_, i) => `O${i}`);
  assert.throws(() => parseBulkRequest({ ids: many, status: "New" }), /up to/);
});

test("status and payment can be changed together", () => {
  const r = parseBulkRequest({ ids: ["A"], status: "Delivered", payment_status: "Paid", payment_method: "Cash" });
  assert.deepEqual(r.patch, { status: "Delivered", payment_status: "Paid", payment_method: "Cash" });
});
