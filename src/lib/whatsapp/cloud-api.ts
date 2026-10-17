// Helpers for Meta's WhatsApp Cloud API. The pure pieces (signature check,
// allow-list, payload parsing) are separate from sendText so they can be
// tested without any network.

import { createHmac, timingSafeEqual } from "crypto";

// Graph API version used for sending replies. Meta supports each version for
// roughly two years; bump this when you see a deprecation notice.
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** "+91 98765 43210, 919…" -> Set of digit-only numbers. Empty env -> empty set. */
export function parseAllowedNumbers(env: string | undefined): Set<string> {
  return new Set(
    (env ?? "")
      .split(",")
      .map(digitsOnly)
      .filter(Boolean)
  );
}

export function isAllowedSender(from: string, allowed: Set<string>): boolean {
  return allowed.has(digitsOnly(from));
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Meta's GET verification: does the token they sent match ours? */
export function verifyToken(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  return safeEqual(provided, expected);
}

/** Checks the X-Hub-Signature-256 header against the raw request body. */
export function verifySignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  return safeEqual(header.slice("sha256=".length), expected);
}

export interface IncomingMessage {
  id: string;
  from: string; // digits only, as Meta sends it
  type: string; // "text", "image", ...
  text?: string;
}

/** Pulls messages out of Meta's nested webhook payload (ignores delivery receipts etc.). */
export function extractMessages(payload: any): IncomingMessage[] {
  const out: IncomingMessage[] = [];
  if (payload?.object !== "whatsapp_business_account") return out;
  for (const entry of payload.entry ?? []) {
    for (const change of entry?.changes ?? []) {
      for (const m of change?.value?.messages ?? []) {
        if (!m?.from || !m?.id) continue;
        out.push({
          id: String(m.id),
          from: digitsOnly(String(m.from)),
          type: String(m.type ?? ""),
          text: m.type === "text" ? String(m.text?.body ?? "") : undefined,
        });
      }
    }
  }
  return out;
}

export async function sendText(to: string, body: string): Promise<void> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error("WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set.");
  }
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!res.ok) {
    // Never log the token; the response body from Meta explains what's wrong.
    throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  }
}
