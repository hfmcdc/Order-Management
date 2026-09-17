// ---------------------------------------------------------------------------
// Google Sheets data layer.
//
// This module is the ONLY place in the app that talks to the Google Sheets
// API. It is imported exclusively from server-side code (API routes /
// server actions) — the service account credentials never reach the
// browser (spec section 27).
//
// Concurrency approach (spec section 28): we never overwrite an entire
// sheet. Appends read the sheet first to compute the next safe ID, then
// append a single row. Updates locate the row by its ID column and patch
// only that row's range. This is not full optimistic-locking, but it
// avoids the destructive "rewrite the whole tab" pattern that would risk
// clobbering concurrent edits.
// ---------------------------------------------------------------------------

import { google, sheets_v4 } from "googleapis";

const SHEET_TABS = {
  Customers: "Customers",
  Products: "Products",
  Boxes: "Boxes",
  BoxContents: "BoxContents",
  Orders: "Orders",
  OrderItems: "OrderItems",
} as const;

export type SheetTab = keyof typeof SHEET_TABS;

// Column order per tab — must match the spec exactly. This is the
// single source of truth for how JS objects map to spreadsheet columns.
export const SHEET_COLUMNS: Record<SheetTab, string[]> = {
  Customers: ["customer_id", "name", "phone", "address", "created_at", "updated_at"],
  Products: ["product_id", "name", "price", "active", "category"],
  Boxes: ["box_id", "name", "price", "description", "active"],
  BoxContents: ["box_id", "product_id", "quantity"],
  Orders: [
    "order_id",
    "customer_id",
    "order_date",
    "fulfillment_type",
    "fulfillment_date",
    "status",
    "payment_status",
    "notes",
    "created_at",
    "updated_at",
  ],
  OrderItems: [
    "order_item_id",
    "order_id",
    "item_type",
    "product_id",
    "box_id",
    "quantity",
    "unit_price",
  ],
};

// The column that uniquely identifies a row, used for updates/lookups.
const ID_COLUMN: Record<SheetTab, string> = {
  Customers: "customer_id",
  Products: "product_id",
  Boxes: "box_id",
  BoxContents: "box_id", // composite key in practice; see updateBoxContents below
  Orders: "order_id",
  OrderItems: "order_item_id",
};

const ID_PREFIX: Record<SheetTab, string> = {
  Customers: "CUST",
  Products: "PROD",
  Boxes: "BOX",
  BoxContents: "",
  Orders: "ORD",
  OrderItems: "OI",
};

let cachedClient: sheets_v4.Sheets | null = null;

function assertEnv() {
  const missing = ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "GOOGLE_SHEET_ID"].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new SheetsConfigError(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "Copy .env.example to .env.local and fill in your Google service account details."
    );
  }
}

export class SheetsConfigError extends Error {}
export class SheetsApiError extends Error {}

function getClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;
  assertEnv();

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // Private keys stored in env vars typically have literal \n sequences
    // that need to be converted back to real newlines.
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

function getSheetId(): string {
  assertEnv();
  return process.env.GOOGLE_SHEET_ID as string;
}

async function withErrorHandling<T>(action: () => Promise<T>, context: string): Promise<T> {
  const maxAttempts = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (err: any) {
      lastErr = err;
      const status = err?.code ?? err?.response?.status;
      // Only retry on transient errors (rate limiting / server hiccups) —
      // a real permission or not-found error won't fix itself by retrying.
      const isTransient = status === 429 || status === 500 || status === 503;
      if (!isTransient || attempt === maxAttempts) break;
      const delayMs = 400 * Math.pow(2, attempt - 1); // 400ms, 800ms
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  const message =
    lastErr?.errors?.[0]?.message ?? lastErr?.message ?? "Unknown Google Sheets error";
  throw new SheetsApiError(`${context}: ${message}`);
}

/** Read every row of a tab and return it as an array of typed objects. */
export async function readSheet<T extends Record<string, any>>(tab: SheetTab): Promise<T[]> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];
  const range = `${SHEET_TABS[tab]}!A2:${colLetter(columns.length)}`;

  const res = await withErrorHandling(
    () => client.spreadsheets.values.get({ spreadsheetId: getSheetId(), range }),
    `Failed to read ${tab}`
  );

  const rows = res.data.values ?? [];
  return rows
    .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
    .map((row) => rowToObject<T>(row, columns));
}

/** Append a single new row, generating a safe sequential ID first. */
export async function appendRow<T extends Record<string, any>>(
  tab: SheetTab,
  data: Omit<T, never>
): Promise<T> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];

  let record: any = { ...data };
  const idColumn = ID_COLUMN[tab];
  if (idColumn && !record[idColumn]) {
    record[idColumn] = await nextId(tab);
  }

  const values = [columns.map((col) => stringifyCell(record[col]))];

  await withErrorHandling(
    () =>
      client.spreadsheets.values.append({
        spreadsheetId: getSheetId(),
        range: `${SHEET_TABS[tab]}!A:A`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      }),
    `Failed to add row to ${tab}`
  );

  return record as T;
}

/**
 * Append multiple rows in a single API call. Used when saving an order's
 * line items so a partially-failed order can't leave a half-written state
 * from many sequential calls.
 */
export async function appendRows<T extends Record<string, any>>(
  tab: SheetTab,
  dataList: Omit<T, never>[]
): Promise<T[]> {
  if (dataList.length === 0) return [];
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];
  const idColumn = ID_COLUMN[tab];

  let nextNumericId = idColumn ? await nextIdNumber(tab) : 0;
  const records: any[] = dataList.map((data) => {
    const record: any = { ...data };
    if (idColumn && !record[idColumn]) {
      record[idColumn] = `${ID_PREFIX[tab]}${String(nextNumericId).padStart(4, "0")}`;
      nextNumericId += 1;
    }
    return record;
  });

  const values = records.map((record) => columns.map((col) => stringifyCell(record[col])));

  await withErrorHandling(
    () =>
      client.spreadsheets.values.append({
        spreadsheetId: getSheetId(),
        range: `${SHEET_TABS[tab]}!A:A`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values },
      }),
    `Failed to add rows to ${tab}`
  );

  return records as T[];
}

/**
 * Update specific fields on the row identified by its ID. Only rewrites
 * that one row's range, never the whole sheet.
 */
export async function updateRow<T extends Record<string, any>>(
  tab: SheetTab,
  id: string,
  patch: Partial<T>
): Promise<void> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];
  const idColumn = ID_COLUMN[tab];

  // One read gives us both the row's position AND its current values —
  // previously this was two separate reads, which doubled API calls per
  // update and left a race window between "find the row" and "read its
  // current values" if anything else touched the sheet in between.
  const rawRows = await readSheetRaw(tab);
  const rowIndex = rawRows.findIndex((row) => {
    const record = rowToObject<any>(row, columns);
    return record[idColumn] === id;
  });
  if (rowIndex === -1) {
    throw new SheetsApiError(`Could not find ${tab} row with ${idColumn}=${id}`);
  }
  const existing = rowToObject<any>(rawRows[rowIndex], columns);

  // Strip any keys whose value is `undefined` from the patch — callers
  // often build patch objects from destructured request bodies where an
  // omitted field still shows up as an explicit `undefined` key, and
  // spreading that over `existing` would otherwise blank the column out.
  const definedPatch = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  );
  const merged = { ...existing, ...definedPatch };

  const values = [columns.map((col) => stringifyCell(merged[col]))];
  const range = `${SHEET_TABS[tab]}!A${rowIndex + 2}:${colLetter(columns.length)}${rowIndex + 2}`;

  await withErrorHandling(
    () =>
      client.spreadsheets.values.update({
        spreadsheetId: getSheetId(),
        range,
        valueInputOption: "RAW",
        requestBody: { values },
      }),
    `Failed to update ${tab} row ${id}`
  );
}

/**
 * Permanently delete the row identified by its ID from a tab. Used sparingly
 * — most of the app prefers soft-deletes (status = Cancelled) per the
 * original design, but the business owner asked for a real delete option
 * on orders as well, so this exists as an explicit, deliberate action.
 */
export async function deleteRow(tab: SheetTab, id: string): Promise<void> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];
  const idColumn = ID_COLUMN[tab];

  const allRows = await readSheetRaw(tab);
  const rowIndex = allRows.findIndex((row) => {
    const record = rowToObject<any>(row, columns);
    return record[idColumn] === id;
  });
  if (rowIndex === -1) return; // already gone — nothing to do

  const sheetIdNumeric = await getTabSheetId(tab);
  await withErrorHandling(
    () =>
      client.spreadsheets.batchUpdate({
        spreadsheetId: getSheetId(),
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetIdNumeric,
                  dimension: "ROWS",
                  startIndex: rowIndex + 1, // +1 for header row
                  endIndex: rowIndex + 2,
                },
              },
            },
          ],
        },
      }),
    `Failed to delete ${tab} row ${id}`
  );
}

/** Delete every row in a tab matching a predicate — used to clean up an
 * order's line items when the order itself is permanently deleted. */
export async function deleteRowsWhere(
  tab: SheetTab,
  predicate: (record: any) => boolean
): Promise<void> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];

  const allRows = await readSheetRaw(tab);
  const rowsToDelete: number[] = [];
  allRows.forEach((row, idx) => {
    const record = rowToObject<any>(row, columns);
    if (predicate(record)) rowsToDelete.push(idx);
  });
  if (rowsToDelete.length === 0) return;

  const sheetIdNumeric = await getTabSheetId(tab);
  const requests = rowsToDelete
    .sort((a, b) => b - a)
    .map((idx) => ({
      deleteDimension: {
        range: {
          sheetId: sheetIdNumeric,
          dimension: "ROWS",
          startIndex: idx + 1,
          endIndex: idx + 2,
        },
      },
    }));

  await withErrorHandling(
    () =>
      client.spreadsheets.batchUpdate({
        spreadsheetId: getSheetId(),
        requestBody: { requests },
      }),
    `Failed to delete rows from ${tab}`
  );
}

/**
 * Replace all OrderItems belonging to an order: delete the old lines and
 * append the new ones. Used when editing an order's contents. This targets
 * only the affected rows (via a batch delete of specific row indices), not
 * the entire sheet.
 */
export async function replaceOrderItems<T extends Record<string, any>>(
  orderId: string,
  newItems: Omit<T, never>[]
): Promise<T[]> {
  const client = getClient();
  const tab: SheetTab = "OrderItems";
  const columns = SHEET_COLUMNS[tab];

  const allRows = await readSheetRaw(tab);
  const rowsToDelete: number[] = [];
  allRows.forEach((row, idx) => {
    const record = rowToObject<any>(row, columns);
    if (record.order_id === orderId) rowsToDelete.push(idx);
  });

  if (rowsToDelete.length > 0) {
    const sheetIdNumeric = await getTabSheetId(tab);
    // Delete from the bottom up so earlier indices stay valid.
    const requests = rowsToDelete
      .sort((a, b) => b - a)
      .map((idx) => ({
        deleteDimension: {
          range: {
            sheetId: sheetIdNumeric,
            dimension: "ROWS",
            startIndex: idx + 1, // +1 for header row
            endIndex: idx + 2,
          },
        },
      }));

    await withErrorHandling(
      () =>
        client.spreadsheets.batchUpdate({
          spreadsheetId: getSheetId(),
          requestBody: { requests },
        }),
      "Failed to remove old order items"
    );
  }

  return appendRows<T>(tab, newItems);
}

// ---- internal helpers ----

async function readSheetRaw(tab: SheetTab): Promise<string[][]> {
  const client = getClient();
  const columns = SHEET_COLUMNS[tab];
  const range = `${SHEET_TABS[tab]}!A2:${colLetter(columns.length)}`;
  const res = await withErrorHandling(
    () => client.spreadsheets.values.get({ spreadsheetId: getSheetId(), range }),
    `Failed to read ${tab}`
  );
  return (res.data.values as string[][]) ?? [];
}

async function nextIdNumber(tab: SheetTab): Promise<number> {
  const idColumn = ID_COLUMN[tab];
  const prefix = ID_PREFIX[tab];
  if (!idColumn) return 1;

  const rows = await readSheet<any>(tab);
  let max = 0;
  for (const row of rows) {
    const value = String(row[idColumn] ?? "");
    const match = value.startsWith(prefix) ? value.slice(prefix.length) : value;
    const num = parseInt(match, 10);
    if (!isNaN(num) && num > max) max = num;
  }
  return max + 1;
}

async function nextId(tab: SheetTab): Promise<string> {
  const n = await nextIdNumber(tab);
  return `${ID_PREFIX[tab]}${String(n).padStart(4, "0")}`;
}

const sheetIdCache = new Map<SheetTab, number>();
async function getTabSheetId(tab: SheetTab): Promise<number> {
  if (sheetIdCache.has(tab)) return sheetIdCache.get(tab)!;
  const client = getClient();
  const meta = await withErrorHandling(
    () => client.spreadsheets.get({ spreadsheetId: getSheetId() }),
    "Failed to read spreadsheet metadata"
  );
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === SHEET_TABS[tab]);
  const id = sheet?.properties?.sheetId;
  if (id === undefined || id === null) {
    throw new SheetsApiError(`Could not find a tab named "${SHEET_TABS[tab]}" in the spreadsheet`);
  }
  sheetIdCache.set(tab, id);
  return id;
}

// Columns that are meant to hold ISO date strings ("2026-09-15") or
// timestamps ("2026-09-15T12:00:00.000Z"). Rows written before this app
// switched to RAW input could have had these auto-converted by Google
// Sheets into its internal date serial number (days since 1899-12-30) —
// this recovers a readable date from that serial so old rows display
// correctly too, not just new ones.
const DATE_COLUMNS = new Set([
  "order_date",
  "fulfillment_date",
  "created_at",
  "updated_at",
]);

function serialToIsoDate(serial: number): string {
  const ms = (serial - 25569) * 86400 * 1000; // 25569 = days between 1899-12-30 and 1970-01-01
  return new Date(ms).toISOString().slice(0, 10);
}

function rowToObject<T>(row: any[], columns: string[]): T {
  const obj: any = {};
  columns.forEach((col, idx) => {
    let value = parseCell(row[idx]);
    if (DATE_COLUMNS.has(col) && typeof value === "number" && value > 10000) {
      value = serialToIsoDate(value);
    }
    obj[col] = value;
  });
  return obj as T;
}

function parseCell(value: any): any {
  if (value === undefined || value === "") return "";
  if (value === "TRUE") return true;
  if (value === "FALSE") return false;
  if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  return value;
}

function stringifyCell(value: any): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export { SHEET_TABS };
