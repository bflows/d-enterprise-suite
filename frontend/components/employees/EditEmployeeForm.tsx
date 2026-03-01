"use client";

import { useState, useEffect } from "react";
import { updateEmployee } from "@/lib/api/company";
import type { UpdateEmployeeBody } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";
import { ALL_ROLE_SLUGS } from "@/types/auth";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  technician: "Technician",
  dispatcher: "Dispatcher",
  admin: "Admin",
};

export interface EditEmployeeFormProps {
  employee: EmployeeListItem;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditEmployeeForm({
  employee,
  onClose,
  onSuccess,
}: EditEmployeeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(employee.user.firstName ?? "");
  const [lastName, setLastName] = useState(employee.user.lastName ?? "");
  const [phoneNumber, setPhoneNumber] = useState(employee.user.phoneNumber ?? "");
  const [email, setEmail] = useState(employee.user.email ?? "");
  const [role, setRole] = useState(employee.roleSlug ?? "employee");
  const [password, setPassword] = useState("");

  useEffect(() => {
    setFirstName(employee.user.firstName ?? "");
    setLastName(employee.user.lastName ?? "");
    setPhoneNumber(employee.user.phoneNumber ?? "");
    setEmail(employee.user.email ?? "");
    setRole(employee.roleSlug ?? "employee");
    setPassword("");
  }, [employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const body: UpdateEmployeeBody = {
        userId: employee.userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase() || undefined,
        role: role as UpdateEmployeeBody["role"],
      };
      if (password.trim().length > 0) {
        body.password = password;
      }
      await updateEmployee(body);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to update employee. Please try again.";
      setError(message ?? "Failed to update employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <p className="text-neutral-800 text-p mt-2">
        Update the employee&apos;s details below. Leave password blank to keep the current password.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-employee-firstName"
            className="text-neutral-800 text-sm"
          >
            First name
          </label>
          <input
            id="edit-employee-firstName"
            type="text"
            autoComplete="given-name"
            minLength={3}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="John"
          />
        </div>
        <div>
          <label
            htmlFor="edit-employee-lastName"
            className="text-neutral-800 text-sm"
          >
            Last name
          </label>
          <input
            id="edit-employee-lastName"
            type="text"
            autoComplete="family-name"
            minLength={3}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="mt-2">
        <label
          htmlFor="edit-employee-email"
          className="text-neutral-800 text-sm"
        >
          Email
        </label>
        <input
          id="edit-employee-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="name@company.com"
        />
      </div>

      <div className="mt-2">
        <label
          htmlFor="edit-employee-phone"
          className="text-neutral-800 text-sm"
        >
          Phone number
        </label>
        <input
          id="edit-employee-phone"
          type="tel"
          autoComplete="tel"
          minLength={10}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-white px-3 py-2 text-neutral-900 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="At least 10 digits"
        />
      </div>

      <div className="mt-2">
        <label
          htmlFor="edit-employee-role"
          className="text-neutral-800 text-sm"
        >
          Role
        </label>
        <select
          id="edit-employee-role"
          value={role}
          onChange={(e) => setRole((e.target.value ?? "employee") as NonNullable<UpdateEmployeeBody["role"]>)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {ALL_ROLE_SLUGS.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r] ?? r}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2">
        <label
          htmlFor="edit-employee-password"
          className="text-neutral-800 text-sm"
        >
          New password (optional)
        </label>
        <input
          id="edit-employee-password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Leave blank to keep current password"
        />
      </div>

      <div className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-neutral-400 bg-neutral-50 py-2 px-4 text-p font-medium cursor-pointer text-neutral-800 hover:bg-neutral-100 sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary py-2 px-4 text-p font-bold cursor-pointer text-neutral-100 transition-colors duration-300 ease-in-out hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
