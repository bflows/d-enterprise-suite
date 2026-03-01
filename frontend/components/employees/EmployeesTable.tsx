"use client";

import { LuUserRoundMinus, LuUserRoundPen, LuUserRoundPlus, LuUserRoundSearch } from "react-icons/lu";
import { useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { selectCurrentCompanyId } from "@/features/auth/authSlice";
import { getEmployees, terminateEmployee } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";
import { useEffect, useState, useCallback } from "react";
import NewEmployeeModal from "@/components/employees/NewEmployeeModal";
import NewEmployeeForm from "@/components/employees/NewEmployeeForm";
import Link from "next/link";

export default function EmployeesTable() {
  const companyId = useSelector((state: RootState) =>
    selectCurrentCompanyId(state)
  );
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<EmployeeListItem | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const loadEmployees = useCallback(() => {
    if (!companyId) {
      setLoading(false);
      setEmployees([]);
      return;
    }
    setLoading(true);
    setError(null);
    getEmployees(companyId)
      .then((res) => setEmployees(res.employees))
      .catch((err) => {
        setError(
          err.response?.data?.message ?? err.message ?? "Failed to load employees"
        );
        setEmployees([]);
      })
      .finally(() => setLoading(false));
  }, [companyId]);

  useEffect(() => {
    queueMicrotask(() => loadEmployees());
  }, [loadEmployees]);

  const openRemoveConfirm = (emp: EmployeeListItem) => {
    setRemoveError(null);
    setRemoveTarget(emp);
  };

  const closeRemoveConfirm = () => {
    if (!removing) {
      setRemoveTarget(null);
      setRemoveError(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget || !companyId) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      await terminateEmployee(removeTarget.userId);
      setRemoveTarget(null);
      setRemoveError(null);
      loadEmployees();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string }; message?: string } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to remove employee";
      setRemoveError(msg);
    } finally {
      setRemoving(false);
    }
  };

  const displayName = (emp: EmployeeListItem) =>
    [emp.user.firstName, emp.user.lastName].filter(Boolean).join(" ") || "—";

  return (
    <div className="bg-neutral-50 border border-neutral-400 overflow-hidden rounded-lg py-8 px-10 mt-8">
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
        <div>
          <div className="flex justify-between">
            <div className="relative flex items-center">
              <LuUserRoundSearch className="absolute text-neutral-600 size-6 left-4" />
              <input
                type="text"
                placeholder="Name or phone"
                className="bg-neutral-100 text-neutral-600 text-p w-48 border border-neutral-400 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:border focus:ring focus:ring-primary focus:border-primary placeholder:text-neutral-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="bg-primary text-neutral-100 py-2 px-4 rounded-lg w-fit flex items-center gap-x-2 cursor-pointer transition-colors duraiton-300 ease-in-out hover:bg-primary/90"
            >
              <LuUserRoundPlus className="size-6" />
              <p className="text-p font-bold">New Employee</p>
            </button>
          </div>
          <NewEmployeeModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="New Employee"
          >
            <NewEmployeeForm
              onClose={() => setModalOpen(false)}
              onSuccess={() => {
                loadEmployees();
              }}
            />
          </NewEmployeeModal>
          <NewEmployeeModal
            open={!!removeTarget}
            onClose={closeRemoveConfirm}
            title="Remove employee"
          >
            <div className="space-y-4">
              {removeTarget && (
                <p className="text-p text-neutral-800">
                  Remove <strong>{displayName(removeTarget)}</strong> from this company?
                  {removeTarget.user.email && (
                    <> ({removeTarget.user.email})</>
                  )}
                  {" "}
                  They will be removed from the company. If they are not employed elsewhere, their account will be deleted.
                </p>
              )}
              {removeError && (
                <p className="text-p text-red-600">{removeError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRemoveConfirm}
                  disabled={removing}
                  className="px-4 py-2 rounded-lg border border-neutral-400 text-neutral-800 text-p cursor-pointer hover:bg-neutral-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemove}
                  disabled={removing}
                  className="px-4 py-2 rounded-lg bg-secondary text-neutral-100 text-p font-bold cursor-pointer hover:bg-secondary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {removing ? (
                    <>
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      Removing...
                    </>
                  ) : (
                    "Remove"
                  )}
                </button>
              </div>
            </div>
          </NewEmployeeModal>
          <table className="w-full table-auto mt-6">
            <thead>
              <tr>
                <th className="text-left text-neutral-600 text-p font-normal">
                  Name
                </th>
                <th className="text-left text-neutral-600 text-p font-normal">
                  Phone
                </th>
                <th className="text-left text-neutral-600 text-p font-normal hidden lg:table-cell">
                  Email
                </th>
                <th className="text-left text-neutral-600 text-p font-normal">
                  Position
                </th>
                <th className="text-left text-neutral-600 text-p font-normal">
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
                    <td className="text-neutral-800 text-p text-left pt-4">
                      {[emp.user.firstName, emp.user.lastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </td>
                    <td className="text-neutral-800 text-p text-left pt-4">
                      {emp.user.phoneNumber || "—"}
                    </td>
                    <td className="text-neutral-800 text-p text-left pt-4 hidden lg:table-cell">
                      {emp.user.email || "—"}
                    </td>
                    <td className="text-neutral-800 text-p text-left pt-4 capitalize">
                      {emp.roleSlug || "—"}
                    </td>
                    <td className=" text-left pt-6 flex items-center gap-x-2">
                      <Link href='/edit-employee'>
                        <LuUserRoundPen className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out hover:text-primary" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openRemoveConfirm(emp)}
                        className="p-0 border-0 bg-transparent cursor-pointer"
                        aria-label={`Remove ${displayName(emp)}`}
                      >
                        <LuUserRoundMinus className="text-neutral-600 size-6 transition-colors duration-300 ease-in-out hover:text-secondary" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}