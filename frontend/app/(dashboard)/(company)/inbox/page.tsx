"use client";

import { Suspense } from "react";
import RequireRole from "@/components/auth/RequireRole";
import InboxView from "@/components/inbox/InboxView";
import { ROLE_SLUGS } from "@/types/auth";

function InboxPageContent() {
  return (
    <RequireRole
      allowedRoles={[ROLE_SLUGS.ADMIN, ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.TECHNICIAN]}
    >
      <InboxView />
    </RequireRole>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center">
          <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-p font-bold mt-2 text-neutral-600">Loading inbox...</p>
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}
