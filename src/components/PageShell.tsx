"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";

// Screens that benefit from a laptop-width canvas (dense tables, charts).
// Every other page keeps its existing comfortable reading width.
const WIDE_ROUTES = ["/orders", "/sales"];

export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  const wide = WIDE_ROUTES.includes(normalized);

  return (
    <main
      className={clsx(
        "flex-1 min-w-0 pb-28 md:pb-10 px-5 md:px-10 pt-6 md:pt-10 w-full mx-auto",
        // max-width eases open/closed when you move between wide and normal pages
        "transition-[max-width] duration-500 ease-out",
        wide ? "max-w-5xl lg:max-w-[88rem]" : "max-w-5xl"
      )}
    >
      {children}
    </main>
  );
}
