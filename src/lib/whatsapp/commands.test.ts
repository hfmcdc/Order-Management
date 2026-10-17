import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeOrderCode, parseCommand } from "./commands";

test("normalizeOrderCode accepts the common ways of typing a code", () => {
  assert.equal(normalizeOrderCode("ORD0002"), "ORD0002");
  assert.equal(normalizeOrderCode("ord0002"), "ORD0002");
  assert.equal(normalizeOrderCode("ORD-2"), "ORD0002");
  assert.equal(normalizeOrderCode("0002"), "ORD0002");
  assert.equal(normalizeOrderCode("2"), "ORD0002");
  assert.equal(normalizeOrderCode("ORD0002."), "ORD0002");
  assert.equal(normalizeOrderCode("vg-4821"), "VG-4821");
  assert.equal(normalizeOrderCode("VG4821"), "VG-4821");
  assert.equal(normalizeOrderCode("hello"), null);
  assert.equal(normalizeOrderCode("ORD"), null);
});

test("status / delivered", () => {
  assert.deepEqual(parseCommand("status ORD0002"), { kind: "status", code: "ORD0002" });
  assert.deepEqual(parseCommand("  STATUS   ord0002  "), { kind: "status", code: "ORD0002" });
  assert.deepEqual(parseCommand("delivered ORD0002"), { kind: "delivered", code: "ORD0002" });
  assert.deepEqual(parseCommand("Delivered ORD 0002"), { kind: "delivered", code: "ORD0002" });
  assert.deepEqual(parseCommand("delivered VG-4821"), { kind: "delivered", code: "VG-4821" });
});

test("paid with cash / upi in any case", () => {
  assert.deepEqual(parseCommand("paid ORD0002 cash"), { kind: "paid", code: "ORD0002", method: "Cash" });
  assert.deepEqual(parseCommand("paid ORD0002 upi"), { kind: "paid", code: "ORD0002", method: "UPI" });
  assert.deepEqual(parseCommand("PAID ord0002 UPI."), { kind: "paid", code: "ORD0002", method: "UPI" });
});

test("paid with a missing or invalid method is an error, not a guess", () => {
  assert.deepEqual(parseCommand("paid ORD0002"), { kind: "error", reason: "missing_method", code: "ORD0002" });
  assert.deepEqual(parseCommand("paid ORD0002 gpay"), {
    kind: "error",
    reason: "invalid_method",
    code: "ORD0002",
    given: "gpay",
  });
  assert.deepEqual(parseCommand("paid ORD0002 cash upi"), { kind: "error", reason: "usage", command: "paid" });
});

test("missing or bad codes", () => {
  assert.deepEqual(parseCommand("delivered"), { kind: "error", reason: "usage", command: "delivered" });
  assert.deepEqual(parseCommand("status"), { kind: "error", reason: "usage", command: "status" });
  assert.deepEqual(parseCommand("paid"), { kind: "error", reason: "usage", command: "paid" });
  assert.deepEqual(parseCommand("delivered banana"), { kind: "error", reason: "bad_code", given: "banana" });
  assert.deepEqual(parseCommand("delivered ORD0002 now"), { kind: "error", reason: "usage", command: "delivered" });
});

test("help and unknown", () => {
  for (const t of ["help", "HELP", "hi", "menu", "?", "/help"]) {
    assert.deepEqual(parseCommand(t), { kind: "help" }, t);
  }
  assert.deepEqual(parseCommand("cancel ORD0002"), { kind: "unknown", text: "cancel ORD0002" });
  assert.deepEqual(parseCommand("   "), { kind: "unknown", text: "" });
});
