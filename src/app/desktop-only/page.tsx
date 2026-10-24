import Link from "next/link";

// Shown instead of /sales on phones and tablets.
export default function DesktopOnlyPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-clay-100 text-2xl text-marigold-600">
        ▭
      </div>
      <h1 className="font-display font-700 text-xl text-maroon-800">Sales is available on a laptop</h1>
      <p className="max-w-sm text-sm text-maroon-700/70">
        Open Vaiga Order Manager on a laptop or desktop computer to see sales, payments and trends.
      </p>
      <Link
        href="/"
        className="press touch-target flex items-center rounded-full bg-marigold-500 px-6 font-semibold text-ink"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
