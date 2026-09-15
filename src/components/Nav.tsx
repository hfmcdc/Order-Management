"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";

const LINKS = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/orders", label: "Orders", icon: OrdersIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/production", label: "Production", icon: ProductionIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/boxes", label: "Boxes", icon: BoxIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop side rail */}
      <nav className="hidden md:flex md:flex-col md:w-56 md:shrink-0 border-r border-clay-300/60 bg-ivory px-4 py-6 gap-1">
        <div className="mb-6 px-2 flex items-center gap-2.5">
          <div className="w-9 h-9 relative shrink-0">
            <Image src="/logo.png" alt="Vaiga" fill sizes="36px" />
          </div>
          <div>
            <p className="font-display font-700 text-lg text-maroon-800 leading-tight">
              Vaiga
            </p>
            <p className="text-[11px] text-maroon-700/70 leading-tight">Diwali 2026</p>
          </div>
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
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 touch-target min-w-0 px-0.5",
              isActive(pathname, link.href) ? "text-marigold-600" : "text-maroon-700/60"
            )}
          >
            <link.icon />
            <span className="text-[9.5px] leading-none truncate">{link.label}</span>
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
function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.96 19a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 14.6a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.5a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.16 1.7 1.7 0 0 0 10.04 2.6V2.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 8.5c.12.51.55.9 1.06 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </svg>
  );
}
