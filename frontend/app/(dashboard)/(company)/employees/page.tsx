import RequireRole from "@/components/auth/RequireRole";
import EmployeesTable from "@/components/employees/EmployeesTable";
import { ROLE_SLUGS } from "@/types/auth";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Employees | Daddy Enterprise Suite",
  description: "Built by Daddy Company",
};

export default function EmployeesPage() {
  return (
    <RequireRole allowedRoles={[ROLE_SLUGS.ADMIN]}>
      <div>
        <h1 className="text-neutral-900 text-h4 font-bold">Employees</h1>
        {/* Mobile */}
        {/* Desktop, laptop, tablet */}
        <div className="hidden sm:block">
          <EmployeesTable />
        </div>
      </div>
    </RequireRole>
  );
}
