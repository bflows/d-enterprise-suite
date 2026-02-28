"use client";

import { useState } from "react";
import { checkUserByEmail, createEmployee } from "@/lib/api/company";
import type { CreateEmployeeBody, CheckEmailResponse } from "@/lib/api/company";
import { ALL_ROLE_SLUGS } from "@/types/auth";

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  technician: "Technician",
  dispatcher: "Dispatcher",
  admin: "Admin",
};

type Step = "email" | "existing" | "new";

export interface NewEmployeeFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function NewEmployeeForm({ onClose, onSuccess }: NewEmployeeFormProps) {
  const [step, setStep] = useState<Step>("email");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [existingUser, setExistingUser] = useState<CheckEmailResponse["user"] | null>(null);
  const [alreadyInCompany, setAlreadyInCompany] = useState(false);

  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [slug, setSlug] = useState<CreateEmployeeBody["slug"]>("employee");

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setIsCheckingEmail(true);
    try {
      const res = await checkUserByEmail(trimmed);
      setEmail(trimmed);
      if (res.exists) {
        if (res.alreadyInCompany) {
          setAlreadyInCompany(true);
          setExistingUser(res.user ?? null);
          setStep("existing");
        } else {
          setAlreadyInCompany(false);
          setExistingUser(res.user ?? null);
          setStep("existing");
        }
      } else {
        setStep("new");
        setExistingUser(null);
        setAlreadyInCompany(false);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Could not check email.";
      setError(message ?? "Could not check email.");
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setError(null);
    setAlreadyInCompany(false);
    setExistingUser(null);
  };

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const body: CreateEmployeeBody = {
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        slug: slug ?? "employee",
      };
      await createEmployee(body);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to create employee. Please try again.";
      setError(message ?? "Failed to create employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (alreadyInCompany) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const body: CreateEmployeeBody = {
        email,
        slug: slug ?? "employee",
      };
      await createEmployee(body);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to add employee. Please try again.";
      setError(message ?? "Failed to add employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const existingUserName =
    existingUser &&
    [existingUser.firstName, existingUser.lastName].filter(Boolean).join(" ");

  return (
    <div>
      {step === "email" && (
        <form onSubmit={handleCheckEmail}>
          {error && (
            <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <p className="text-neutral-800 text-p mt-4">
            Enter the person&apos;s email. If they already have an account, we&apos;ll add them to your company. If not, you&apos;ll set up their account.
          </p>
          <div className="mt-4">
            <label
              htmlFor="new-employee-email"
              className="text-neutral-800 text-sm"
            >
              Email
            </label>
            <input
              id="new-employee-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-900 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="name@company.com"
            />
          </div>
          <div className="flex flex-col gap-3 mt-4 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={isCheckingEmail}
              className="w-full rounded-lg bg-primary py-2 px-4 text-p font-bold cursor-pointer text-neutral-100 transition-colors duration-300 ease-in-out hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
            >
              {isCheckingEmail ? "Checking..." : "Continue"}
            </button>
          </div>
        </form>
      )}

      {step === "existing" && (
        <form onSubmit={handleSubmitExisting}>
          {error && (
            <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          )}
          {alreadyInCompany ? (
            <p className="text-neutral-800 text-p mt-4">
              This person is already an employee of your company. They cannot be added again.
            </p>
          ) : (
            <>
              <p className="text-neutral-800 text-p mt-4">
                <strong>{existingUserName || email}</strong> is already registered. Select a role to add them to your company.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="new-employee-role-existing"
                  className="text-neutral-800 text-sm"
                >
                  Role
                </label>
                <select
                  id="new-employee-role-existing"
                  value={slug ?? "employee"}
                  onChange={(e) =>
                    setSlug(e.target.value as CreateEmployeeBody["slug"])
                  }
                  className="mt-1 w-full rounded-lg border border-neutral-400 bg-white px-3 py-2 text-neutral-900 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ALL_ROLE_SLUGS.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleBack}
              className="text-neutral-800 bg-neutral-50 w-full rounded-lg border border-neutral-400 py-2 px-4 text-p cursor-pointer transition-colors duraiton-300 ease-in-out hover:bg-neutral-100 sm:w-auto"
            >
              Back
            </button>
            {!alreadyInCompany && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary py-2 px-4 text-p font-bold cursor-pointer text-neutral-100 transition-colors duration-300 ease-in-out hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
              >
                {isSubmitting ? "Adding..." : "Add employee"}
              </button>
            )}
          </div>
        </form>
      )}

      {step === "new" && (
        <form onSubmit={handleSubmitNew}>
          {error && (
            <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <p className="text-neutral-800 text-p">
            This email is not registered. Enter their details to create an account and add them as an employee.
          </p>
          <div className="mt-4">
            <label
              htmlFor="new-employee-email-readonly"
              className="text-neutral-800 text-sm"
            >
              Email
            </label>
            <input
              id="new-employee-email-readonly"
              type="email"
              value={email}
              readOnly
              className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p"
            />
          </div>

          <div className="mt-2">
            <label
              htmlFor="new-employee-password"
              className="text-neutral-800 text-sm"
            >
              Password
            </label>
            <input
              id="new-employee-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="At least 8 characters"
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="new-employee-firstName"
                className="text-neutral-800 text-sm"
              >
                First name
              </label>
              <input
                id="new-employee-firstName"
                type="text"
                autoComplete="given-name"
                required
                minLength={3}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="John"
              />
            </div>
            <div>
              <label
                htmlFor="new-employee-lastName"
                className="text-neutral-800 text-sm"
              >
                Last name
              </label>
              <input
                id="new-employee-lastName"
                type="text"
                autoComplete="family-name"
                required
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
              htmlFor="new-employee-phone"
              className="text-neutral-800 text-sm"
            >
              Phone number
            </label>
            <input
              id="new-employee-phone"
              type="tel"
              autoComplete="tel"
              required
              minLength={10}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-400 bg-white px-3 py-2 text-neutral-900 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="At least 10 digits"
            />
          </div>

          <div className="mt-2">
            <label
              htmlFor="new-employee-role"
              className="text-neutral-800 text-sm"
            >
              Role
            </label>
            <select
              id="new-employee-role"
              value={slug ?? "employee"}
              onChange={(e) =>
                setSlug(e.target.value as CreateEmployeeBody["slug"])
              }
              className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {ALL_ROLE_SLUGS.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role] ?? role}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleBack}
              className="w-full rounded-lg border border-neutral-400 bg-neutral-50 py-2 px-4 text-p font-medium text-neutral-800 hover:bg-neutral-100 sm:w-auto"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-2 px-4 text-p font-bold cursor-pointer text-neutral-100 transition-colors duration-300 ease-in-out hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting ? "Creating..." : "Create employee"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
