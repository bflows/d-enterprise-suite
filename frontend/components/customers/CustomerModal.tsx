"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { createCustomer, updateCustomer } from "@/lib/api/customers";
import type { CreateCustomerBody, CustomerListItem, UpdateCustomerBody } from "@/lib/api/customers";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string | null;
  mode: "create" | "edit";
  customer?: CustomerListItem | null;
  onSuccess?: () => void;
  title?: string;
}

interface CustomerFormState {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  zipCode: string;
  email: string;
  leadSource: string;
  notes: string;
}

const EMPTY_FORM: CustomerFormState = {
  firstName: "",
  lastName: "",
  phone: "",
  address: "",
  address2: "",
  city: "",
  zipCode: "",
  email: "",
  leadSource: "",
  notes: "",
};

function toFormState(customer?: CustomerListItem | null): CustomerFormState {
  if (!customer) return EMPTY_FORM;
  return {
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    address2: customer.address2 ?? "",
    city: customer.city ?? "",
    zipCode: customer.zipCode ?? "",
    email: customer.email ?? "",
    leadSource: customer.leadSource ?? "",
    notes: customer.notes ?? "",
  };
}

export default function CustomerModal({
  isOpen,
  onClose,
  companyId,
  mode,
  customer,
  onSuccess,
  title,
}: CustomerModalProps) {
  const isEditMode = mode === "edit";
  const initialForm = useMemo(
    () => toFormState(isEditMode ? customer : null),
    [customer, isEditMode]
  );
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setIsSubmitting(false);
    setForm(initialForm);
  }, [initialForm, isOpen]);

  const canSubmit = useMemo(() => {
    if (isSubmitting || !companyId) return false;
    if (isEditMode && !customer) return false;
    return Boolean(
      form.firstName.trim() &&
      form.lastName.trim() &&
      form.phone.trim() &&
      form.address.trim()
    );
  }, [companyId, customer, form.address, form.firstName, form.lastName, form.phone, isEditMode, isSubmitting]);

  const setField = (field: keyof CustomerFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const getFieldBorderClass = (field: keyof CustomerFormState) =>
    form[field] !== initialForm[field] ? "border-neutral-300" : "border-neutral-200";

  const handleSubmit = async () => {
    if (!companyId) {
      setError("No company selected.");
      return;
    }
    if (isEditMode && !customer) {
      setError("Customer not found.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEditMode && customer) {
        const body: UpdateCustomerBody = {
          companyId,
          id: customer.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          email: form.email.trim() || null,
          leadSource: form.leadSource.trim() || null,
          address2: form.address2.trim() || null,
          city: form.city.trim() || null,
          zipCode: form.zipCode.trim() || null,
          notes: form.notes.trim() || null,
        };
        await updateCustomer(body);
      } else {
        const body: CreateCustomerBody = {
          companyId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
        };
        if (form.email.trim()) body.email = form.email.trim();
        if (form.leadSource.trim()) body.leadSource = form.leadSource.trim();
        if (form.address2.trim()) body.address2 = form.address2.trim();
        if (form.city.trim()) body.city = form.city.trim();
        if (form.zipCode.trim()) body.zipCode = form.zipCode.trim();
        if (form.notes.trim()) body.notes = form.notes.trim();
        await createCustomer(body);
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : isEditMode
              ? "Failed to update customer. Please try again."
              : "Failed to create customer. Please try again.";
      setError(
        message ??
          (isEditMode
            ? "Failed to update customer. Please try again."
            : "Failed to create customer. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (isEditMode ? "Edit Customer" : "New Customer")}
      primaryAction={{
        label: isSubmitting
          ? (isEditMode ? "Saving..." : "Creating...")
          : (isEditMode ? "Save changes" : "Create customer"),
        onClick: () => {
          void handleSubmit();
        },
        disabled: !canSubmit,
      }}
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer-firstName" className="text-neutral-800 text-sm">
              First name <span className="text-red-600">*</span>
            </label>
            <input
              id="customer-firstName"
              type="text"
              autoComplete="given-name"
              required
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("firstName")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="customer-lastName" className="text-neutral-800 text-sm">
              Last name <span className="text-red-600">*</span>
            </label>
            <input
              id="customer-lastName"
              type="text"
              autoComplete="family-name"
              required
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("lastName")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label htmlFor="customer-phone" className="text-neutral-800 text-sm">
            Phone <span className="text-red-600">*</span>
          </label>
          <input
            id="customer-phone"
            type="tel"
            autoComplete="tel"
            required
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("phone")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
            placeholder="(555) 123-4567"
          />
        </div>

        <div>
          <label htmlFor="customer-address" className="text-neutral-800 text-sm">
            Address <span className="text-red-600">*</span>
          </label>
          <input
            id="customer-address"
            type="text"
            autoComplete="street-address"
            required
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("address")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
            placeholder="123 Main St"
          />
        </div>

        <div>
          <label htmlFor="customer-address2" className="text-neutral-800 text-sm">
            Address line 2 <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            id="customer-address2"
            type="text"
            autoComplete="address-line2"
            value={form.address2}
            onChange={(e) => setField("address2", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("address2")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
            placeholder="Apt 4B"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer-city" className="text-neutral-800 text-sm">
              City <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              id="customer-city"
              type="text"
              autoComplete="address-level2"
              value={form.city}
              onChange={(e) => setField("city", e.target.value)}
              className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("city")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="Springfield"
            />
          </div>
          <div>
            <label htmlFor="customer-zipCode" className="text-neutral-800 text-sm">
              ZIP <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              id="customer-zipCode"
              type="text"
              autoComplete="postal-code"
              value={form.zipCode}
              onChange={(e) => setField("zipCode", e.target.value)}
              className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("zipCode")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
              placeholder="62701"
            />
          </div>
        </div>

        <div>
          <label htmlFor="customer-email" className="text-neutral-800 text-sm">
            Email <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            id="customer-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("email")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label htmlFor="customer-leadSource" className="text-neutral-800 text-sm">
            Lead source <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            id="customer-leadSource"
            type="text"
            value={form.leadSource}
            onChange={(e) => setField("leadSource", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("leadSource")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary`}
            placeholder="Website, referral, etc."
          />
        </div>

        <div>
          <label htmlFor="customer-notes" className="text-neutral-800 text-sm">
            Notes <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            id="customer-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            className={`mt-1 w-full rounded-lg border ${getFieldBorderClass("notes")} bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y`}
            placeholder="Internal notes..."
          />
        </div>
      </div>
    </Modal>
  );
}
