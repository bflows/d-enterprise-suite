import RequireRole from "@/components/auth/RequireRole";
import CustomersTable from "@/components/customers/CustomersTable";
import { ROLE_SLUGS } from "@/types/auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers | Daddy Enterprise Suite",
  description: "Manage customers",
};

export default function CustomersPage() {
  return (
    <RequireRole allowedRoles={[ROLE_SLUGS.ADMIN, ROLE_SLUGS.DISPATCHER, ROLE_SLUGS.TECHNICIAN]}>
      <div>
        <h1 className="text-neutral-900 text-h4 font-bold">Customers</h1>
        <CustomersTable />
      </div>
    </RequireRole>
  );
}