// ---------------------------------------------------------------------------
// Typed conversion of raw Google Sheets cells into JS values.
//
// Why this is column-aware: Sheets hands everything back as text. The old
// parser turned ANY numeric-looking text into a number, which silently broke
// text fields that merely look like numbers:
//   - a unit label "250"          -> became 250, so `label === "250"` failed
//                                    and the line priced at ₹0
//   - a phone "9497661379"        -> became a number, so `phone.replace(...)`
//                                    crashed saving/searching customers
// Now only the columns that are genuinely numeric are converted; everything
// else stays exactly the text that was typed.
// ---------------------------------------------------------------------------

const NUMERIC_COLUMNS = new Set(["price", "quantity", "unit_price"]);
const BOOLEAN_COLUMNS = new Set(["active", "individual_sale"]);

// Columns holding ISO dates/timestamps. Rows written before the app switched
// to RAW input could have been auto-converted by Sheets into a date serial
// (days since 1899-12-30); this recovers a readable date from that.
const DATE_COLUMNS = new Set(["order_date", "fulfillment_date", "created_at", "updated_at"]);

export function serialToIsoDate(serial: number): string {
  const ms = (serial - 25569) * 86400 * 1000; // 25569 = days between 1899-12-30 and 1970-01-01
  return new Date(ms).toISOString().slice(0, 10);
}

const NUMBER_LIKE = /^-?\d+(\.\d+)?$/;

export function parseCellForColumn(column: string, raw: unknown): string | number | boolean {
  if (raw === undefined || raw === null || raw === "") return "";

  if (BOOLEAN_COLUMNS.has(column)) {
    if (raw === true || raw === "TRUE" || raw === "true") return true;
    if (raw === false || raw === "FALSE" || raw === "false") return false;
    return String(raw);
  }

  if (NUMERIC_COLUMNS.has(column)) {
    const n = typeof raw === "number" ? raw : Number(String(raw).trim());
    return Number.isFinite(n) ? n : String(raw);
  }

  const text = String(raw);

  if (DATE_COLUMNS.has(column) && NUMBER_LIKE.test(text) && Number(text) > 10000) {
    return serialToIsoDate(Number(text));
  }

  return text;
}

export function rowToObject<T>(row: any[], columns: string[]): T {
  const obj: Record<string, string | number | boolean> = {};
  columns.forEach((col, idx) => {
    obj[col] = parseCellForColumn(col, row[idx]);
  });
  return obj as unknown as T;
}
