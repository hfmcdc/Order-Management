"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useApi } from "@/lib/useApi";
import { LoadingState, ErrorState, EmptyState } from "@/components/StateViews";
import { Customer } from "@/lib/types";

export default function CustomersPage() {
  const { data, loading, error, refresh } = useApi<{ customers: Customer[] }>("/api/customers");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [data, query]);

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="font-display font-700 text-2xl text-maroon-800">Customers</h1>
        <p className="text-maroon-700/70 text-sm mt-0.5">Search by name or phone.</p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search customers"
        className="touch-target rounded-card border border-clay-300 px-4 bg-ivory"
      />

      {loading && <LoadingState label="Loading customers…" />}
      {error && <ErrorState message={error} onRetry={refresh} />}

      {data && filtered.length === 0 && (
        <EmptyState title="No customers found" hint="Add a customer from the New Order page." />
      )}

      {data && filtered.length > 0 && (
        <div className="relative flex flex-col gap-2">
          <AnimatePresence initial={true} mode="popLayout">
            {filtered.map((c, i) => (
              <motion.div
                key={c.customer_id}
                layout={filtered.length <= 60 ? "position" : false}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 340,
                  damping: 30,
                  delay: Math.min(i, 10) * 0.03,
                }}
              >
                <Link
                  href={`/customers/${c.customer_id}`}
                  className="group lift rounded-card bg-ivory border border-clay-300/70 px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-maroon-800">{c.name}</p>
                    <p className="text-sm text-maroon-700/60">{c.phone}</p>
                  </div>
                  <span className="text-marigold-600 text-sm transition-transform duration-200 group-hover:translate-x-1">
                    View →
                  </span>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
