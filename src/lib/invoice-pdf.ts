import { BUSINESS_ADDRESS, BUSINESS_NAME, BUSINESS_PHONE } from "./business-info";
import { publicOrderCode } from "./public-order-code";

interface InvoiceOrder {
  order_id: string;
  order_date: string;
  total: number;
  customer: { name: string; phone: string } | null;
  items: { name: string; quantity: number; unit_price: number }[];
}

/**
 * Playfair Display is the app's heading font. jsPDF can't use web fonts, so
 * the static TTF files are fetched from /public/fonts and embedded. If they
 * are missing or fail to load, the invoice quietly falls back to Helvetica
 * so sharing never breaks.
 */
const SERIF_FILES = [
  { url: "/fonts/PlayfairDisplay-Regular.ttf", file: "PlayfairDisplay-Regular.ttf", style: "normal" },
  { url: "/fonts/PlayfairDisplay-Bold.ttf", file: "PlayfairDisplay-Bold.ttf", style: "bold" },
] as const;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function registerPlayfair(doc: any): Promise<boolean> {
  try {
    for (const f of SERIF_FILES) {
      const res = await fetch(f.url);
      if (!res.ok) return false;
      doc.addFileToVFS(f.file, bufferToBase64(await res.arrayBuffer()));
      doc.addFont(f.file, "PlayfairDisplay", f.style);
    }
    return true;
  } catch {
    return false;
  }
}

/** Fetches an image from /public and returns it as a data URL (or null on failure). */
async function loadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return `data:image/png;base64,${bufferToBase64(await res.arrayBuffer())}`;
  } catch {
    return null;
  }
}

// Logo artwork is 832x490 (see public/invoice-logo.png)
const LOGO_RATIO = 832 / 490;

/**
 * Builds a one-page invoice PDF entirely in the browser (no server round
 * trip, no external service) and returns it as a File, ready to hand to
 * navigator.share() or to download directly.
 */
export async function buildInvoicePdf(order: InvoiceOrder): Promise<File> {
  // jsPDF is loaded on demand so it never bloats pages that don't need it.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Words use Playfair Display; digits (phone, date, qty, prices) stay in
  // Helvetica because Playfair's default numerals are old-style (uneven
  // heights), which looks wrong in a price column.
  const hasSerif = await registerPlayfair(doc);
  const serif = (style: "normal" | "bold") =>
    doc.setFont(hasSerif ? "PlayfairDisplay" : "helvetica", style);
  const sans = (style: "normal" | "bold") => doc.setFont("helvetica", style);

  const marginX = 48;
  let y = 56;

  const [logo, watermark] = await Promise.all([
    loadImage("/invoice-logo.png"),
    loadImage("/invoice-watermark.png"),
  ]);

  // Black-and-white watermark, centred on the page and drawn first so it sits
  // behind everything else. Very low opacity keeps the text readable.
  if (watermark) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const wmW = 380;
    const wmH = wmW / LOGO_RATIO;
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
    doc.addImage(watermark, "PNG", (pageW - wmW) / 2, (pageH - wmH) / 2, wmW, wmH);
    doc.restoreGraphicsState();
  }

  // Small logo beside the business name
  const logoH = 52;
  const logoW = logoH * LOGO_RATIO;
  const textX = logo ? marginX + logoW + 14 : marginX;
  if (logo) doc.addImage(logo, "PNG", marginX, 38, logoW, logoH);

  serif("bold");
  doc.setFontSize(18);
  doc.setTextColor("#4A1526");
  doc.text(BUSINESS_NAME.toUpperCase(), textX, y);

  y += 20;
  serif("normal");
  doc.setFontSize(10);
  doc.setTextColor("#5C4A3F");
  doc.text(BUSINESS_ADDRESS, textX, y);
  y += 14;
  doc.text("Phone: ", textX, y);
  const phoneLabelWidth = doc.getTextWidth("Phone: "); // measured while the serif font is active
  sans("normal");
  doc.text(BUSINESS_PHONE, textX + phoneLabelWidth, y);

  y += logo ? 32 : 28;
  doc.setDrawColor("#B87333");
  doc.setLineWidth(1);
  doc.line(marginX, y, 547, y);

  // "Label: value" on one line — label in Playfair, value in Helvetica
  const labelValue = (label: string, value: string, y: number, bold = false) => {
    serif(bold ? "bold" : "normal");
    doc.text(label, marginX, y);
    const labelWidth = doc.getTextWidth(label); // measure before switching fonts
    sans(bold ? "bold" : "normal");
    doc.text(value, marginX + labelWidth, y);
  };

  y += 24;
  doc.setFontSize(11);
  doc.setTextColor("#4A1526");
  labelValue("Order: ", publicOrderCode(order.order_id), y, true);
  y += 16;
  labelValue("Customer: ", order.customer?.name ?? "", y);
  if (order.customer?.phone) {
    y += 16;
    labelValue("Phone: ", order.customer.phone, y);
  }
  y += 16;
  labelValue("Date: ", order.order_date, y);

  y += 24;
  serif("bold");
  doc.text("Item", marginX, y);
  doc.text("Qty", 340, y, { align: "right" });
  doc.text("Price", 420, y, { align: "right" });
  doc.text("Subtotal", 547, y, { align: "right" });
  y += 8;
  doc.setDrawColor("#D9C7A8");
  doc.line(marginX, y, 547, y);

  for (const item of order.items) {
    y += 20;
    serif("normal");
    doc.text(item.name, marginX, y);
    sans("normal");
    doc.text(String(item.quantity), 340, y, { align: "right" });
    doc.text(`Rs.${item.unit_price}`, 420, y, { align: "right" });
    doc.text(`Rs.${item.unit_price * item.quantity}`, 547, y, { align: "right" });
  }

  y += 16;
  doc.line(marginX, y, 547, y);
  y += 24;
  doc.setFontSize(13);
  const totalText = `Rs.${order.total}`;
  sans("bold");
  const totalWidth = doc.getTextWidth(totalText);
  doc.text(totalText, 547, y, { align: "right" });
  serif("bold");
  const totalLabelWidth = doc.getTextWidth("Total: ");
  doc.text("Total: ", 547 - totalWidth - totalLabelWidth, y);

  const blob = doc.output("blob");
  return new File([blob], `vaiga-${publicOrderCode(order.order_id)}.pdf`, { type: "application/pdf" });
}
