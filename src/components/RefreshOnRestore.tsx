"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Server renders this tab has already shown. Seeing one again means the router restored the
// page from its cache (browser Back/Forward), so the data may be stale: fetch it again.
const shown = new Set<string>();

export default function RefreshOnRestore({ renderId }: { renderId: string }) {
  const router = useRouter();
  useEffect(() => {
    if (shown.has(renderId)) router.refresh();
    else shown.add(renderId);
  }, [renderId, router]);
  return null;
}
