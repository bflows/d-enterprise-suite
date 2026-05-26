"use client";

import { useState, useEffect, useCallback } from "react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { updateEmployee } from "@/lib/api/company";
import type { UpdateEmployeeBody } from "@/lib/api/company";
import type { EmployeeListItem } from "@/lib/api/company";
import { ALL_ROLE_SLUGS, SCHEDULABLE_ROLE_SLUGS } from "@/types/auth";
import {
  listAvailabilityByEmployee,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from "@/lib/api/availability";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  technician: "Technician",
  dispatcher: "Dispatcher",
  admin: "Admin",
};

/** Form slot for weekly availability (id present when loaded from server). */
interface AvailabilityFormSlot {
  id?: string;
  dayOfWeek: number;
  startTimeMinutes: number;
  endTimeMinutes: number;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeStringToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

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

  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilityFormSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [loadedAvailabilityIds, setLoadedAvailabilityIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFirstName(employee.user.firstName ?? "");
    setLastName(employee.user.lastName ?? "");
    setPhoneNumber(employee.user.phoneNumber ?? "");
    setEmail(employee.user.email ?? "");
    setRole(employee.roleSlug ?? "employee");
    setPassword("");
  }, [employee]);

  const loadAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const res = await listAvailabilityByEmployee(employee.id);
      setAvailabilitySlots(
        res.availabilities.map((a) => ({
          id: a.id,
          dayOfWeek: a.dayOfWeek,
          startTimeMinutes: a.startTimeMinutes,
          endTimeMinutes: a.endTimeMinutes,
        }))
      );
      setLoadedAvailabilityIds(new Set(res.availabilities.map((a) => a.id)));
    } catch {
      setAvailabilityError(null);
      setAvailabilitySlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [employee.id]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

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

      await syncAvailability();

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

  async function syncAvailability() {
    for (const slot of availabilitySlots) {
      if (slot.endTimeMinutes <= slot.startTimeMinutes) {
        throw new Error(
          `Invalid time range on ${DAY_NAMES[slot.dayOfWeek]}: end time must be after start time.`
        );
      }
    }
    const currentIds = new Set(
      availabilitySlots.filter((s) => s.id).map((s) => s.id as string)
    );
    const toDelete = [...loadedAvailabilityIds].filter((id) => !currentIds.has(id));
    for (const id of toDelete) {
      await deleteAvailability(id);
    }
    for (const slot of availabilitySlots) {
      if (slot.id && loadedAvailabilityIds.has(slot.id)) {
        await updateAvailability({
          id: slot.id,
          dayOfWeek: slot.dayOfWeek,
          startTimeMinutes: slot.startTimeMinutes,
          endTimeMinutes: slot.endTimeMinutes,
        });
      } else {
        await createAvailability({
          employeeId: employee.id,
          dayOfWeek: slot.dayOfWeek,
          startTimeMinutes: slot.startTimeMinutes,
          endTimeMinutes: slot.endTimeMinutes,
        });
      }
    }
  }

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

      <div className="mt-6 border-t border-neutral-300 pt-6">
        <h3 className="text-neutral-800 text-p font-semibold mb-1">
          Weekly availability
        </h3>
        <p className="text-neutral-600 text-sm mb-3">
          {SCHEDULABLE_ROLE_SLUGS.includes(role as (typeof SCHEDULABLE_ROLE_SLUGS)[number])
            ? "Set recurring available days and times. Admins and technicians with availability can be assigned to jobs on the schedule."
            : "Set recurring available days and times. This schedule repeats every week until you change it."}
        </p>
        {availabilityError && (
          <p className="text-red-600 text-sm mb-2">{availabilityError}</p>
        )}
        {!availabilityLoading && availabilitySlots.length === 0 && (
          <p className="text-neutral-600 text-sm mb-2">
            You need to add slots to view them first.
          </p>
        )}
        {availabilityLoading ? (
          <p className="text-neutral-600 text-sm py-2">Loading availability...</p>
        ) : (
          <>
            <ul className="space-y-3">
              {availabilitySlots.map((slot, index) => (
                <li
                  key={slot.id ?? `new-${index}`}
                  className="flex flex-wrap items-center gap-2"
                >
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => {
                      const day = Number(e.target.value);
                      setAvailabilitySlots((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, dayOfWeek: day } : s
                        )
                      );
                    }}
                    className="rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-30"
                  >
                    {DAY_NAMES.map((name, d) => (
                      <option key={d} value={d}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={minutesToTimeString(slot.startTimeMinutes)}
                    onChange={(e) => {
                      const start = timeStringToMinutes(e.target.value);
                      setAvailabilitySlots((prev) =>
                        prev.map((s, i) =>
                          i === index
                            ? { ...s, startTimeMinutes: start }
                            : s
                        )
                      );
                    }}
                    className="rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-neutral-500 text-sm">to</span>
                  <input
                    type="time"
                    value={minutesToTimeString(slot.endTimeMinutes)}
                    onChange={(e) => {
                      const end = timeStringToMinutes(e.target.value);
                      setAvailabilitySlots((prev) =>
                        prev.map((s, i) =>
                          i === index ? { ...s, endTimeMinutes: end } : s
                        )
                      );
                    }}
                    className="rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setAvailabilitySlots((prev) => prev.filter((_, i) => i !== index))
                    }
                    className="p-2 rounded-lg text-neutral-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                    aria-label="Remove slot"
                  >
                    <LuTrash2 className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() =>
                setAvailabilitySlots((prev) => [
                  ...prev,
                  { dayOfWeek: 1, startTimeMinutes: 540, endTimeMinutes: 1020 },
                ])
              }
              className="mt-3 flex items-center gap-2 rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 cursor-pointer transition-colors"
            >
              <LuPlus className="size-4" />
              Add slot
            </button>
          </>
        )}
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
