"use client";

import RequireRole from "@/components/auth/RequireRole";
import { ROLE_SLUGS } from "@/types/auth";
import Link from "next/link";
import { LuUserRoundPlus } from "react-icons/lu";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getEmployees } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";
import { useEffect, useState } from "react";

export default function EmployeesPage() {
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) {
      queueMicrotask(() => {
        setLoading(false);
        setEmployees([]);
      });
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    getEmployees(companyId)
      .then((res) => {
        if (!cancelled) {
          setEmployees(res.employees);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message ?? err.message ?? "Failed to load employees"
          );
          setEmployees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return (
    <RequireRole allowedRoles={[ROLE_SLUGS.ADMIN]}>
      <div>
        <div className="flex justify-between items-center">
          <h1 className="text-neutral-900 text-h4 font-bold">Employees</h1>
          <Link
            href="/add-employee"
            className="bg-primary text-neutral-100 py-2 px-4 rounded-lg flex items-center gap-x-2 transition-colors duraiton-300 ease-in-out hover:bg-primary/90"
          >
            <LuUserRoundPlus className="size-6" />
            <p className="text-p font-bold">Add Employee</p>
          </Link>
        </div>

        <div className="bg-neutral-50 border border-neutral-400 overflow-hidden rounded-lg py-8 px-12 mt-8">
          {loading ? (
            <div className="flex justify-center">
              <div className="text-center">
                <div className="inline-block size-8 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                <p className="text-neutral-800 text-p mt-2">
                  Loading employees...
                </p>
              </div>
            </div>
          ) : error ? (
            <p className="text-neutral-600 text-p py-6">{error}</p>
          ) : (
            <table className="w-full table-auto">
              <thead>
                <tr>
                  <th className="w-72 text-left text-neutral-600 text-p">
                    Name
                  </th>
                  <th className="w-60 text-left text-neutral-600 text-p">
                    Phone
                  </th>
                  <th className="w-72 text-left text-neutral-600 text-p">
                    Email
                  </th>
                  <th className="w-72 text-left text-neutral-600 text-p">
                    Position
                  </th>
                  <th className="w-60 text-left text-neutral-600 text-p">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-neutral-800 text-p text-center pt-6"
                    >
                      No employees yet. Add an employee to get started.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id}>
                      <td className="text-neutral-800 text-p text-left pt-6">
                        {[emp.user.firstName, emp.user.lastName]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </td>
                      <td className="text-neutral-800 text-p text-left pt-6">
                        {emp.user.phoneNumber || "—"}
                      </td>
                      <td className="text-neutral-800 text-p text-left pt-6">
                        {emp.user.email || "—"}
                      </td>
                      <td className="text-neutral-800 text-p text-left pt-6 capitalize">
                        {emp.roleSlug || "—"}
                      </td>
                      <td className="text-neutral-800 text-p text-left pt-6">
                        Update Delete
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </RequireRole>
  );
}
