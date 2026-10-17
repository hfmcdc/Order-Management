// Pure command parsing for the WhatsApp bot. No I/O, so it is trivial to test.
//
//   status <order-code>
//   delivered <order-code>
//   paid <order-code> cash|upi
//   help

export type PaymentChoice = "Cash" | "UPI";

export type ParsedCommand =
  | { kind: "help" }
  | { kind: "status"; code: string }
  | { kind: "delivered"; code: string }
  | { kind: "paid"; code: string; method: PaymentChoice }
  | { kind: "error"; reason: "usage"; command: "status" | "delivered" | "paid" }
  | { kind: "error"; reason: "bad_code"; given: string }
  | { kind: "error"; reason: "missing_method"; code: string }
  | { kind: "error"; reason: "invalid_method"; code: string; given: string }
  | { kind: "unknown"; text: string };

const HELP_WORDS = new Set(["help", "hi", "hello", "menu", "?"]);

/**
 * Turns what a person might type into a canonical order code, or null.
 *   "ord2", "ORD-0002", "0002", "2" -> "ORD0002"   (internal order id)
 *   "vg-4821", "VG4821"             -> "VG-4821"   (the code printed on receipts)
 */
export function normalizeOrderCode(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase().replace(/[.,!;:]+$/, "");
  let m = cleaned.match(/^ORD-?(\d{1,6})$/) ?? cleaned.match(/^(\d{1,6})$/);
  if (m) return `ORD${m[1].padStart(4, "0")}`;
  m = cleaned.match(/^VG-?(\d{4})$/);
  if (m) return `VG-${m[1]}`;
  return null;
}

export function parseCommand(input: string): ParsedCommand {
  // "ORD 0002" / "VG 4821" typed with a space -> join so it stays one token.
  const text = input.trim().replace(/\b(ord|vg)\s+(?=\d)/gi, "$1");
  if (!text) return { kind: "unknown", text: "" };

  const tokens = text.split(/\s+/);
  const word = tokens[0].toLowerCase().replace(/^[/!]+/, "").replace(/[.,!]+$/, "");

  if (HELP_WORDS.has(word) && tokens.length === 1) return { kind: "help" };

  if (word === "status" || word === "delivered") {
    if (tokens.length !== 2) return { kind: "error", reason: "usage", command: word };
    const code = normalizeOrderCode(tokens[1]);
    if (!code) return { kind: "error", reason: "bad_code", given: tokens[1] };
    return { kind: word, code };
  }

  if (word === "paid") {
    if (tokens.length < 2) return { kind: "error", reason: "usage", command: "paid" };
    const code = normalizeOrderCode(tokens[1]);
    if (!code) return { kind: "error", reason: "bad_code", given: tokens[1] };
    if (tokens.length === 2) return { kind: "error", reason: "missing_method", code };
    if (tokens.length > 3) return { kind: "error", reason: "usage", command: "paid" };
    const method = tokens[2].toLowerCase().replace(/[.,!]+$/, "");
    if (method === "cash") return { kind: "paid", code, method: "Cash" };
    if (method === "upi") return { kind: "paid", code, method: "UPI" };
    return { kind: "error", reason: "invalid_method", code, given: tokens[2] };
  }

  return { kind: "unknown", text: input.trim() };
}
