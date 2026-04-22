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
    <div>
      <h1 className="text-neutral-900 text-h4 font-bold">Inbox</h1>
    </div>
  );
}
