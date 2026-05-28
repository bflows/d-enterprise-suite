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
        <div className="flex items-center justify-center h-[40vh] text-neutral-500">
          Loading inbox...
        </div>
      }
    >
      <InboxPageContent />
    </Suspense>
  );
}
