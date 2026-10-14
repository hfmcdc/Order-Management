"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BUSINESS_ADDRESS, BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/business-info";
import { publicOrderCode } from "@/lib/public-order-code";
import "./receipt.css";

export interface ReceiptItem {
  order_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface ReceiptOrder {
  order_id: string;
  order_date: string; // ISO date
  customer: { name: string; phone?: string } | null;
  items: ReceiptItem[];
  total: number;
}

const COLS = 2;
const ROWS = 4; // 2 x 4 = 8 receipts per A4 sheet
const TALL_AFTER_ITEMS = 9; // more items than this -> receipt uses two rows
const BASE_FONT_PX = 9.5;
const MIN_FONT_PX = 5;

const money = (n: number) =>
  `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface Placed {
  order: ReceiptOrder;
  col: number;
  row: number;
  span: number;
}

// First-fit packing onto sheets of COLS x ROWS cells. Most receipts take one
// cell; a long order takes two stacked cells so its text stays readable.
function pack(orders: ReceiptOrder[]): Placed[][] {
  const sheets: Placed[][] = [];
  const used: boolean[][][] = [];
  const free = (g: boolean[][], r: number, c: number, span: number) => {
    for (let i = 0; i < span; i++) if (r + i >= ROWS || g[r + i][c]) return false;
    return true;
  };
  for (const order of orders) {
    const span = order.items.length > TALL_AFTER_ITEMS ? 2 : 1;
    let done = false;
    for (let s = 0; s < sheets.length && !done; s++) {
      for (let r = 0; r < ROWS && !done; r++) {
        for (let c = 0; c < COLS && !done; c++) {
          if (free(used[s], r, c, span)) {
            for (let i = 0; i < span; i++) used[s][r + i][c] = true;
            sheets[s].push({ order, col: c, row: r, span });
            done = true;
          }
        }
      }
    }
    if (!done) {
      const g = Array.from({ length: ROWS }, () => Array<boolean>(COLS).fill(false));
      for (let i = 0; i < span; i++) g[i][0] = true;
      used.push(g);
      sheets.push([{ order, col: 0, row: 0, span }]);
    }
  }
  return sheets;
}

function Slip({ order }: { order: ReceiptOrder }) {
  const phone = order.customer?.phone?.trim();
  return (
    <div className="rc-body">
      <h1 className="rc-shop">{BUSINESS_NAME.toUpperCase()}</h1>
      <p className="rc-sub">
        {BUSINESS_ADDRESS} · Phone: {BUSINESS_PHONE}
      </p>
      <hr className="rc-rule" />
      <div className="rc-row">
        <span>
          <span className="rc-label">Order:</span>
          {publicOrderCode(order.order_id)}
        </span>
        <span>
          <span className="rc-label">Date:</span>
          {formatDate(order.order_date)}
        </span>
      </div>
      {(order.customer?.name || phone) && (
        <div className="rc-row">
          <span>
            <span className="rc-label">Customer:</span>
            {order.customer?.name}
          </span>
          {phone && (
            <span>
              <span className="rc-label">Phone:</span>
              {phone}
            </span>
          )}
        </div>
      )}
      <table className="rc-items">
        <thead>
          <tr>
            <th className="item">Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.order_item_id}>
              <td className="item">{item.name}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unit_price)}</td>
              <td>{money(item.unit_price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rc-total">
        <span className="t">TOTAL</span>
        <span className="a">{money(order.total)}</span>
      </div>
      <p className="rc-thanks">
        <b>Thank you for your order!</b> Please visit again
      </p>
    </div>
  );
}

export default function ReceiptSheets({ orders }: { orders: ReceiptOrder[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const sheets = useMemo(() => pack(orders), [orders]);

  // Shrink each receipt's text until it fits inside its own cell.
  const fit = useCallback(() => {
    rootRef.current?.querySelectorAll<HTMLElement>(".rc-slip").forEach((slip) => {
      const body = slip.firstElementChild as HTMLElement | null;
      if (!body) return;
      const cs = getComputedStyle(slip);
      const avail = slip.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      let size = BASE_FONT_PX;
      body.style.fontSize = `${size}px`;
      while (body.offsetHeight > avail && size > MIN_FONT_PX) {
        size -= 0.25;
        body.style.fontSize = `${size}px`;
      }
    });
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [fit, sheets]);

  useEffect(() => {
    document.fonts?.ready.then(fit);
    window.addEventListener("beforeprint", fit);
    return () => window.removeEventListener("beforeprint", fit);
  }, [fit]);

  return (
    <div ref={rootRef}>
      {sheets.map((placed, i) => (
        <div className="rc-sheet" key={i}>
          <div className="rc-grid">
            {placed.map((p) => (
              <div
                key={p.order.order_id}
                className="rc-slip"
                style={{ gridColumn: p.col + 1, gridRow: `${p.row + 1} / span ${p.span}` }}
              >
                <Slip order={p.order} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
