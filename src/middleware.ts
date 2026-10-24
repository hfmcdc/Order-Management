import { NextRequest, NextResponse } from "next/server";
import { isMobileUserAgent } from "@/lib/mobile";

// Sales is a laptop-only screen. On phones/tablets, the page URL shows a
// "desktop only" message instead, and the data endpoint refuses to answer.
export function middleware(req: NextRequest) {
  if (!isMobileUserAgent(req.headers.get("user-agent"))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sales is only available on a laptop or desktop." }, { status: 403 });
  }
  return NextResponse.rewrite(new URL("/desktop-only", req.url));
}

export const config = { matcher: ["/sales", "/api/sales"] };
