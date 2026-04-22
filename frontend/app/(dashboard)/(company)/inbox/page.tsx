"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function InboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("newJob") === "1") {
      queueMicrotask(() => router.replace("/schedule?newJob=1", { scroll: false }));
      return;
    }
    if (searchParams.get("newCustomer") === "1") {
      queueMicrotask(() => router.replace("/customers?newCustomer=1", { scroll: false }));
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center h-[60vh]">
      <h1 className="text-h4 font-bold text-neutral-600">
        Coming soon...
      </h1>
    </div>
  );
}
