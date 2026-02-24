"use client";

import RequireRole from "@/components/auth/RequireRole";
import { ROLE_SLUGS } from "@/types/auth";

/**
 * Example role-protected route: only users with the admin role can view this page.
 */
export default function AdminPage() {
  return (
    <RequireRole allowedRoles={[ROLE_SLUGS.ADMIN]}>
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Admin</h1>
        <p className="mt-1 text-neutral-600">
          This page is only visible to users with the <strong>admin</strong> role.
          You can add company management, user lists, or settings here.
        </p>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Role-based access:</strong> The dashboard layout shows the &quot;Admin&quot;
          link only when the user has the admin role. This page additionally
          guards the route with <code className="rounded bg-amber-100 px-1">RequireRole</code> so
          direct URL access returns a redirect to the dashboard if the user
          doesn&apos;t have the required role.
        </div>
      </div>
    </RequireRole>
  );
}
