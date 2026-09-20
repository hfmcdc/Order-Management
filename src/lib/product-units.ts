import { ProductUnit } from "./types";

/**
 * Collapses duplicate units for the same product+label down to one —
 * keeping the last one in the list. Google Sheets has no unique
 * constraint, so a retried save after a transient failure can leave a
 * broken duplicate behind (e.g. an earlier attempt that partially wrote a
 * row with a blank price before erroring, followed by a successful retry
 * that created a second, correct row). Without this, a lookup by
 * product+label could silently pick the broken one even though the UI
 * displays the good one, giving a real order a ₹0 line — exactly that bug
 * is why this exists.
 */
export function dedupeProductUnits(units: ProductUnit[]): ProductUnit[] {
  const byKey = new Map<string, ProductUnit>();
  for (const unit of units) {
    byKey.set(`${unit.product_id}::${unit.label}`, unit);
  }
  return [...byKey.values()];
}
