import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRange, isIsoDate, mondayOf, endOfMonth, addDaysIso, daysInclusive, toLocalIso } from "./date-ranges";

test("isIsoDate rejects impossible dates", () => {
  assert.equal(isIsoDate("2026-10-31"), true);
  assert.equal(isIsoDate("2026-02-31"), false);
  assert.equal(isIsoDate("26-10-31"), false);
  assert.equal(isIsoDate(""), false);
});

test("presets resolve against a given 'today' (Sat 24 Oct 2026)", () => {
  const today = "2026-10-24";
  assert.deepEqual(resolveRange("today", today), { from: today, to: today });
  assert.deepEqual(resolveRange("week", today), { from: "2026-10-19", to: "2026-10-25" }); // Mon–Sun
  assert.deepEqual(resolveRange("month", today), { from: "2026-10-01", to: "2026-10-31" });
  assert.deepEqual(resolveRange("last30", today), { from: "2026-09-25", to: "2026-10-24" });
  assert.deepEqual(resolveRange("all", today), { from: "", to: "" });
});

test("custom range forgives a swapped pair", () => {
  assert.deepEqual(resolveRange("custom", "2026-10-24", { from: "2026-10-20", to: "2026-10-10" }), {
    from: "2026-10-10", to: "2026-10-20",
  });
});

test("helpers", () => {
  assert.equal(mondayOf("2026-10-25"), "2026-10-19"); // a Sunday
  assert.equal(mondayOf("2026-10-19"), "2026-10-19");
  assert.equal(endOfMonth("2028-02-10"), "2028-02-29");
  assert.equal(addDaysIso("2026-12-31", 1), "2027-01-01");
  assert.equal(daysInclusive("2026-10-01", "2026-10-31"), 31);
  assert.equal(toLocalIso(new Date(2026, 9, 5)), "2026-10-05");
});
