"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";

const ALL_LINKS = [
  { href: "/", label: "Dashboard", icon: HomeIcon },
  { href: "/orders", label: "Orders", icon: OrdersIcon },
  { href: "/customers", label: "Customers", icon: CustomersIcon },
  { href: "/production", label: "Production", icon: ProductionIcon },
  { href: "/products", label: "Products", icon: ProductsIcon },
  { href: "/boxes", label: "Boxes", icon: BoxIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

// The 3 most-used destinations get a direct, spacious bottom-nav slot.
// Everything else lives one tap away in "More" — this is the actual fix
// for "congested, hard to find": fewer, bigger targets, not more squeezed in.
const PRIMARY_MOBILE_LINKS = ALL_LINKS.filter((l) =>
  ["/", "/orders", "/customers"].includes(l.href)
);
const MORE_LINKS = ALL_LINKS.filter(
  (l) => !["/", "/orders", "/customers"].includes(l.href)
);

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

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
        {ALL_LINKS.map((link) => (
          <NavLink key={link.href} link={link} active={isActive(pathname, link.href)} />
        ))}
        <Link
          href="/orders/new"
          className="mt-4 touch-target flex items-center justify-center gap-2 rounded-card bg-marigold-500 text-white font-semibold px-4 shadow-sm hover:bg-marigold-600 transition-colors"
        >
          + New Order
        </Link>
      </nav>

      {/* Mobile bottom nav — 3 spacious slots + a raised center action + More */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-sm shadow-[0_-2px_16px_rgba(51,8,16,0.08)] flex items-stretch justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {PRIMARY_MOBILE_LINKS.slice(0, 2).map((link) => (
          <MobileNavLink key={link.href} link={link} active={isActive(pathname, link.href)} />
        ))}

        {/* Raised center action, Instagram/TikTok-style — the single most
            important action gets the most prominent spot, not squeezed
            in as a 7th equal-weight icon. */}
        <div className="flex-1 flex items-start justify-center -mt-6">
          <button
            onClick={() => router.push("/orders/new")}
            aria-label="New order"
            className="w-14 h-14 rounded-full bg-marigold-500 text-white flex items-center justify-center shadow-lg shadow-marigold-500/30 active:scale-95 transition-transform"
          >
            <PlusIcon />
          </button>
        </div>

        {PRIMARY_MOBILE_LINKS.slice(2).map((link) => (
          <MobileNavLink key={link.href} link={link} active={isActive(pathname, link.href)} />
        ))}

        <button
          onClick={() => setShowMore(true)}
          className={clsx(
            "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 touch-target min-w-0",
            MORE_LINKS.some((l) => isActive(pathname, l.href)) ? "text-marigold-600" : "text-maroon-700/55"
          )}
        >
          <MoreIcon />
          <span className="text-[11px] leading-none">More</span>
        </button>
      </nav>

      {/* More sheet */}
      {showMore && (
        <div
          className="no-print md:hidden fixed inset-0 z-40 bg-black/35 flex items-end"
          onClick={() => setShowMore(false)}
        >
          <div
            className="w-full bg-white rounded-t-[28px] px-3 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(51,8,16,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-clay-300 mx-auto mb-4" />
            <div className="flex flex-col gap-1">
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setShowMore(false)}
                  className={clsx(
                    "touch-target flex items-center gap-3 rounded-2xl px-4 text-base font-medium",
                    isActive(pathname, link.href)
                      ? "bg-marigold-100 text-maroon-800"
                      : "text-maroon-800 active:bg-clay-100"
                  )}
                >
                  <link.icon />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavLink({ link, active }: { link: (typeof ALL_LINKS)[number]; active: boolean }) {
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

function MobileNavLink({ link, active }: { link: (typeof ALL_LINKS)[number]; active: boolean }) {
  return (
    <Link
      href={link.href}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-1.5 touch-target min-w-0"
    >
      <span
        className={clsx(
          "w-11 h-8 flex items-center justify-center rounded-full transition-colors",
          active ? "bg-marigold-100 text-marigold-600" : "text-maroon-700/55"
        )}
      >
        <link.icon />
      </span>
      <span className={clsx("text-[11px] leading-none", active ? "text-marigold-600 font-medium" : "text-maroon-700/55")}>
        {link.label}
      </span>
    </Link>
  );
}

// Small inline icons (no external icon library needed for a handful of glyphs)
function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function OrdersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
    </svg>
  );
}
function CustomersIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
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
function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
function MoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}
