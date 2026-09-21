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
 * Builds a one-page invoice PDF entirely in the browser (no server round
 * trip, no external service) and returns it as a File, ready to hand to
 * navigator.share() or to download directly.
 */
export async function buildInvoicePdf(order: InvoiceOrder): Promise<File> {
  // jsPDF is loaded on demand so it never bloats pages that don't need it.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const marginX = 48;
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#4A0D17");
  doc.text(BUSINESS_NAME.toUpperCase(), marginX, y);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#333333");
  doc.text(BUSINESS_ADDRESS, marginX, y);
  y += 14;
  doc.text(`Phone: ${BUSINESS_PHONE}`, marginX, y);

  y += 28;
  doc.setDrawColor("#E0AA3E");
  doc.setLineWidth(1);
  doc.line(marginX, y, 547, y);

  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor("#000000");
  doc.text(`Order: ${publicOrderCode(order.order_id)}`, marginX, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.text(`Customer: ${order.customer?.name ?? ""}`, marginX, y);
  if (order.customer?.phone) {
    y += 16;
    doc.text(`Phone: ${order.customer.phone}`, marginX, y);
  }
  y += 16;
  doc.text(`Date: ${order.order_date}`, marginX, y);

  y += 24;
  doc.setFont("helvetica", "bold");
  doc.text("Item", marginX, y);
  doc.text("Qty", 340, y, { align: "right" });
  doc.text("Price", 420, y, { align: "right" });
  doc.text("Subtotal", 547, y, { align: "right" });
  y += 8;
  doc.setDrawColor("#CCCCCC");
  doc.line(marginX, y, 547, y);

  doc.setFont("helvetica", "normal");
  for (const item of order.items) {
    y += 20;
    doc.text(item.name, marginX, y);
    doc.text(String(item.quantity), 340, y, { align: "right" });
    doc.text(`Rs.${item.unit_price}`, 420, y, { align: "right" });
    doc.text(`Rs.${item.unit_price * item.quantity}`, 547, y, { align: "right" });
  }

  y += 16;
  doc.line(marginX, y, 547, y);
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Total: Rs.${order.total}`, 547, y, { align: "right" });

  const blob = doc.output("blob");
  return new File([blob], `vaiga-${publicOrderCode(order.order_id)}.pdf`, { type: "application/pdf" });
}
