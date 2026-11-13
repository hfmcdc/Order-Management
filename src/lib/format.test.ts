import { test } from "node:test";
import assert from "node:assert/strict";
import { compactInr, niceScale, percent } from "./format";

test("compactInr uses k / L / Cr", () => {
  assert.equal(compactInr(0), "₹0");
  assert.equal(compactInr(950), "₹950");
  assert.equal(compactInr(1500), "₹1.5k");
  assert.equal(compactInr(45000), "₹45k");
  assert.equal(compactInr(250000), "₹2.5L");
  assert.equal(compactInr(12000000), "₹1.2Cr");
});

test("niceScale always covers the data and lands on round steps", () => {
  for (const v of [1, 7, 130, 1400, 99999, 123456]) {
    const { max, step } = niceScale(v);
    assert.ok(max >= v, `${v} fits under ${max}`);
    assert.equal(max, step * 4);
    assert.ok([1, 2, 5].includes(step / Math.pow(10, Math.floor(Math.log10(step)))));
  }
  assert.equal(niceScale(1400).max, 2000);
  assert.equal(niceScale(0).max, 4);
});

test("percent handles zero", () => {
  assert.equal(percent(1, 4), 25);
  assert.equal(percent(5, 0), 0);
});
