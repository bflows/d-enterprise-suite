"use client";

import { useState } from "react";
import { updateCustomer } from "@/lib/api/customers";
import type { UpdateCustomerBody } from "@/lib/api/customers";
import type { CustomerListItem } from "@/lib/api/customers";

export interface EditCustomerFormProps {
  companyId: string;
  customer: CustomerListItem;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditCustomerForm({
  companyId,
  customer,
  onClose,
  onSuccess,
}: EditCustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(customer.address);
  const [address2, setAddress2] = useState(customer.address2 ?? "");
  const [email, setEmail] = useState(customer.email ?? "");
  const [leadSource, setLeadSource] = useState(customer.leadSource ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const body: UpdateCustomerBody = {
        companyId,
        id: customer.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        address: address.trim(),
      };
      if (email.trim()) body.email = email.trim();
      else body.email = null;
      if (leadSource.trim()) body.leadSource = leadSource.trim();
      else body.leadSource = null;
      if (address2.trim()) body.address2 = address2.trim();
      else body.address2 = null;
      if (notes.trim()) body.notes = notes.trim();
      else body.notes = null;

      await updateCustomer(body);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to update customer. Please try again.";
      setError(message ?? "Failed to update customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-800 rounded-lg px-4 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="edit-customer-firstName" className="text-neutral-800 text-sm">
            First name <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-customer-firstName"
            type="text"
            autoComplete="given-name"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="John"
          />
        </div>
        <div>
          <label htmlFor="edit-customer-lastName" className="text-neutral-800 text-sm">
            Last name <span className="text-red-600">*</span>
          </label>
          <input
            id="edit-customer-lastName"
            type="text"
            autoComplete="family-name"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label htmlFor="edit-customer-phone" className="text-neutral-800 text-sm">
          Phone <span className="text-red-600">*</span>
        </label>
        <input
          id="edit-customer-phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label htmlFor="edit-customer-address" className="text-neutral-800 text-sm">
          Address <span className="text-red-600">*</span>
        </label>
        <input
          id="edit-customer-address"
          type="text"
          autoComplete="street-address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="123 Main St"
        />
      </div>

      <div>
        <label htmlFor="edit-customer-address2" className="text-neutral-800 text-sm">
          Address line 2 <span className="text-neutral-400">(optional)</span>
        </label>
        <input
          id="edit-customer-address2"
          type="text"
          autoComplete="address-line2"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Apt 4B"
        />
      </div>

      <div>
        <label htmlFor="edit-customer-email" className="text-neutral-800 text-sm">
          Email <span className="text-neutral-400">(optional)</span>
        </label>
        <input
          id="edit-customer-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="john@example.com"
        />
      </div>

      <div>
        <label htmlFor="edit-customer-leadSource" className="text-neutral-800 text-sm">
          Lead source <span className="text-neutral-400">(optional)</span>
        </label>
        <input
          id="edit-customer-leadSource"
          type="text"
          value={leadSource}
          onChange={(e) => setLeadSource(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Website, referral, etc."
        />
      </div>

      <div>
        <label htmlFor="edit-customer-notes" className="text-neutral-800 text-sm">
          Notes <span className="text-neutral-400">(optional)</span>
        </label>
        <textarea
          id="edit-customer-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border border-neutral-400 bg-neutral-50 px-3 py-2 text-neutral-800 text-p focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          placeholder="Internal notes..."
        />
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border cursor-pointer border-neutral-400 bg-neutral-50 py-2 px-4 text-p font-medium text-neutral-800 hover:bg-neutral-100 sm:w-auto"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary py-2 px-4 text-p font-bold cursor-pointer text-neutral-100 transition-colors duration-300 ease-in-out hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
