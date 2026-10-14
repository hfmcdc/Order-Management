"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Old single-receipt address: receipts now live at /receipts (compact, many
// per sheet). Kept so any saved link still works.
export default function ReceiptRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/receipts?ids=${encodeURIComponent(params.id)}`);
  }, [params.id, router]);
  return null;
}
