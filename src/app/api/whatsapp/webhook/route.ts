import { NextRequest, NextResponse } from "next/server";
import {
  extractMessages,
  isAllowedSender,
  parseAllowedNumbers,
  sendText,
  verifySignature,
  verifyToken,
} from "@/lib/whatsapp/cloud-api";
import { HELP_TEXT, runCommand } from "@/lib/whatsapp/handler";
import { sheetsOrderStore } from "@/lib/whatsapp/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Meta redelivers a webhook if we're slow or fail. The commands themselves
// are idempotent ("already delivered" changes nothing), and this remembers
// recent message ids as a second line of defence (best effort per instance).
const seen = new Map<string, number>();
function alreadySeen(id: string): boolean {
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 10 * 60_000) seen.delete(k);
  if (seen.has(id)) return true;
  seen.set(id, now);
  return false;
}

const mask = (n: string) => `…${n.slice(-4)}`;

// GET: Meta's one-time webhook verification handshake.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const ok =
    p.get("hub.mode") === "subscribe" &&
    verifyToken(p.get("hub.verify_token"), process.env.WHATSAPP_VERIFY_TOKEN);
  if (!ok) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(p.get("hub.challenge") ?? "", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// POST: incoming WhatsApp messages.
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // The allow-list alone can be spoofed by anyone who finds this URL, so
  // every request must carry Meta's signature, made with the App Secret.
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    if (!verifySignature(raw, req.headers.get("x-hub-signature-256"), appSecret)) {
      return new NextResponse("Invalid signature", { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    console.error("WhatsApp webhook refused: WHATSAPP_APP_SECRET is not set.");
    return new NextResponse("Webhook not configured", { status: 503 });
  } else {
    console.warn("WHATSAPP_APP_SECRET not set — skipping signature check (development only).");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  const allowed = parseAllowedNumbers(process.env.WHATSAPP_ALLOWED_NUMBERS);
  if (allowed.size === 0) console.warn("WHATSAPP_ALLOWED_NUMBERS is empty — ignoring all messages.");

  for (const msg of extractMessages(payload)) {
    try {
      if (alreadySeen(msg.id)) continue;
      if (!isAllowedSender(msg.from, allowed)) {
        console.warn(`WhatsApp message from unlisted number ${mask(msg.from)} ignored.`);
        continue; // no reply: don't confirm to strangers that the bot exists
      }
      const reply =
        msg.type === "text"
          ? await runCommand(msg.text ?? "", msg.from, sheetsOrderStore)
          : `I only understand text messages.\n\n${HELP_TEXT}`;
      await sendText(msg.from, reply);
    } catch (err) {
      console.error(`WhatsApp message ${msg.id} failed:`, err);
      try {
        await sendText(msg.from, "Sorry, something went wrong on my side. Please try again in a moment.");
      } catch {
        /* nothing more we can do */
      }
    }
  }

  // Always 200 once the request is authentic, so Meta doesn't retry endlessly.
  return NextResponse.json({ ok: true });
}
