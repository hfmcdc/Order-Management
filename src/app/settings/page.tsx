"use client";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">Settings</h1>
        <p className="text-maroon-700/70 text-sm mt-0.5">Export your data as a backup or for records.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display font-600 text-lg text-maroon-800">Export data</h2>
        <div className="rounded-card border border-clay-300/70 bg-white p-4 flex flex-col gap-3">
          <ExportButton href="/api/export/orders" label="Export Orders CSV" />
          <ExportButton href="/api/export/customers" label="Export Customers CSV" />
          <ExportButton href="/api/export/products" label="Export Products CSV" />
        </div>
        <p className="text-xs text-maroon-700/60">
          Files download directly to your device. No customer or order data is sent anywhere else.
        </p>
      </section>
    </div>
  );
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="touch-target rounded-card border border-clay-300 bg-clay-100/40 px-4 flex items-center justify-between text-maroon-800 font-medium hover:bg-clay-100"
    >
      {label}
      <span className="text-marigold-600 text-sm">Download</span>
    </a>
  );
}
