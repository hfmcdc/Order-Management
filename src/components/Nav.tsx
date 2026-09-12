"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/orders", label: "Orders", icon: OrdersIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/production", label: "Production", icon: ProductionIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/boxes", label: "Boxes", icon: BoxIcon },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop side rail */}
      <nav className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-clay-300/60 bg-ivory px-4 py-6 gap-1">
        <div className="mb-6 px-2">
          <p className="font-display font-700 text-lg text-maroon-800 leading-tight">
            Vaiga
          </p>
          <p className="text-xs text-maroon-700/70">Sweets &amp; Snacks — Diwali 2026</p>
        </div>
        {LINKS.map((link) => (
          <NavLink key={link.href} link={link} active={isActive(pathname, link.href)} />
        ))}
        <Link
          href="/orders/new"
          className="mt-4 touch-target flex items-center justify-center gap-2 rounded-card bg-marigold-500 text-white font-semibold px-4 shadow-sm hover:bg-marigold-600 transition-colors"
        >
          + New Order
        </Link>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-clay-300 flex items-stretch justify-around">
        {LINKS.slice(0, 5).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 touch-target",
              isActive(pathname, link.href) ? "text-marigold-600" : "text-maroon-700/60"
            )}
          >
            <link.icon />
            <span className="text-[11px] leading-none">{link.label}</span>
          </Link>
        ))}
      </nav>

      {/* Mobile floating New Order button */}
      <Link
        href="/orders/new"
        className="no-print md:hidden fixed bottom-20 right-4 z-30 rounded-full bg-marigold-500 text-white w-16 h-16 flex items-center justify-center shadow-lg text-3xl font-light active:scale-95 transition-transform"
        aria-label="New order"
      >
        +
      </Link>
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavLink({ link, active }: { link: (typeof LINKS)[number]; active: boolean }) {
  return (
    <Link
      href={link.href}
      className={clsx(
        "touch-target flex items-center gap-3 rounded-card px-3 text-sm font-medium transition-colors",
        active ? "bg-marigold-100 text-maroon-800" : "text-maroon-700/80 hover:bg-clay-100"
      )}
    >
      <link.icon />
      {link.label}
    </Link>
  );
}

// Small inline icons (no external icon library needed for a handful of glyphs)
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}
function CustomersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  );
}
function ProductionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 19V9l4 3 4-6 4 6 4-3v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ProductsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="9" r="5" />
      <circle cx="15.5" cy="15.5" r="3.2" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 8 12 4l9 4-9 4-9-4Z" strokeLinejoin="round" />
      <path d="M3 8v9l9 4 9-4V8M12 12v9" strokeLinejoin="round" />
    </svg>
  );
}
